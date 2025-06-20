package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"text/template"
	"time"
)

type ExecRequest struct {
	Code          string `json:"code"`
	Input         string `json:"input"`
	TimeLimitMs   int    `json:"time_limit_ms"`
	MemoryLimitKB int    `json:"memory_limit_kb"`
	Language      string `json:"language"`
	FunctionName  string `json:"function_name"`
	Parser        string `json:"parser"` // Parser code provided by the backend
}

type ExecResult struct {
	Output          string `json:"output"`
	ExecutionTimeMs int    `json:"execution_time_ms"`
	MemoryUsedKB    int    `json:"memory_used_kb"`
	Status          string `json:"status"`
}

func main() {
	http.HandleFunc("/execute", execHandler)
	log.Println("🔵 C++-executor listening on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

func execHandler(w http.ResponseWriter, r *http.Request) {
	var req ExecRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), time.Duration(req.TimeLimitMs)*time.Millisecond)
	defer cancel()

	start := time.Now()

	wrappedCode, err := wrapCPPCode(req)
	if err != nil {
		http.Error(w, fmt.Sprintf("failed to wrap code: %v", err), http.StatusInternalServerError)
		return
	}

	out, status := runCode(ctx, wrappedCode, req.Input)
	execMs := int(time.Since(start).Milliseconds())

	res := ExecResult{
		Output:          out,
		Status:          status,
		ExecutionTimeMs: execMs,
		MemoryUsedKB:    0,
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(res)
}

func runCode(ctx context.Context, code, input string) (output, status string) {
	log.Println("Running code...")
	dir, _ := os.MkdirTemp("", "exec-*")
	defer os.RemoveAll(dir)

	source := filepath.Join(dir, "source.cpp")
	exe := filepath.Join(dir, "main")
	_ = os.WriteFile(source, []byte(code), 0644)

	// Compile
	compileCmd := exec.Command("g++", "-o", exe, source, "-std=c++17")
	var compileOut bytes.Buffer
	compileCmd.Stderr = &compileOut
	if err := compileCmd.Run(); err != nil {
		return compileOut.String(), "compilation_error"
	}

	// Run
	cmd := exec.CommandContext(ctx, exe)
	if input != "" {
		cmd.Stdin = strings.NewReader(input)
	}
	var stdout, stderr bytes.Buffer
	cmd.Stdout, cmd.Stderr = &stdout, &stderr

	if err := cmd.Run(); err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			return "time limit exceeded", "time_limit_exceeded"
		}
		if stderr.Len() > 0 {
			return stderr.String(), "runtime_error"
		}
		return err.Error(), "runtime_error"
	}

	if stderr.Len() > 0 {
		return stderr.String(), "runtime_error"
	}

	return stdout.String(), "success"
}

func wrapCPPCode(req ExecRequest) (string, error) {
	// Use provided parser or fallback to default
	parserCode := req.Parser
	if parserCode == "" {
		// Default parser as fallback
		parserCode = `
// Parse input in format "nums = [2,7,11,15], target = 9"
std::pair<std::vector<int>, int> parseInput(const std::string& line) {
    std::vector<int> nums;
    int target = 0;

    std::string processedLine = line;
    std::replace(processedLine.begin(), processedLine.end(), ',', ' ');
    std::replace(processedLine.begin(), processedLine.end(), '[', ' ');
    std::replace(processedLine.begin(), processedLine.end(), ']', ' ');
    
    std::stringstream ss(processedLine);
    std::string temp;
    int num;
    
    ss >> temp; // "nums"
    ss >> temp; // "="
    
    while(ss >> num) {
        nums.push_back(num);
        ss >> temp; // consume comma or spaces
        if (temp == "target") {
            ss >> temp; // consume "="
            ss >> target;
            break;
        }
    }
    
    return {nums, target};
}
`
	}

	const tpl = `
#include <iostream>
#include <vector>
#include <string>
#include <sstream>
#include <algorithm>

{{.Code}}

{{.ParserCode}}

void printVector(const std::vector<int>& vec) {
    std::cout << "[";
    for (size_t i = 0; i < vec.size(); ++i) {
        std::cout << vec[i];
        if (i < vec.size() - 1) {
            std::cout << ",";
        }
    }
    std::cout << "]" << std::endl;
}

int main() {
    std::string line;
    std::getline(std::cin, line);

    auto [nums, target] = parseInput(line);
    std::vector<int> result = {{.FunctionName}}(nums, target);
    printVector(result);

    return 0;
}
`
	t := template.Must(template.New("cpp").Parse(tpl))
	var buf bytes.Buffer
	err := t.Execute(&buf, struct {
		Code         string
		FunctionName string
		ParserCode   string
	}{
		Code:         req.Code,
		FunctionName: req.FunctionName,
		ParserCode:   parserCode,
	})
	if err != nil {
		return "", err
	}
	return buf.String(), nil
}
