package main

import (
	"bytes"
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

type ExecRequest struct {
	Code          string `json:"code"`
	Input         string `json:"input"`
	TimeLimitMs   int    `json:"time_limit_ms"`
	MemoryLimitKB int    `json:"memory_limit_kb"`
	Language      string `json:"language"` // ignored – container knows its language
}

type ExecResult struct {
	Output          string `json:"output"`
	ExecutionTimeMs int    `json:"execution_time_ms"`
	MemoryUsedKB    int    `json:"memory_used_kb"`
	Status          string `json:"status"`
}

func main() {
	http.HandleFunc("/execute", execHandler)
	log.Println("🐍 Python-executor listening on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

func execHandler(w http.ResponseWriter, r *http.Request) {
	var req ExecRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// // Debug log
	// log.Printf("Received request: FunctionName=%q, code length=%d, parser length=%d",
	// 	req.FunctionName, len(req.Code), len(req.Parser))

	// // Validate function name
	// if req.FunctionName == "" || req.FunctionName == "." {
	// 	http.Error(w, "Invalid function name provided. Function name cannot be empty or '.'", http.StatusBadRequest)
	// 	return
	// }

	ctx, cancel := context.WithTimeout(r.Context(), time.Duration(req.TimeLimitMs)*time.Millisecond)
	defer cancel()

	start := time.Now()

	log.Printf("Code: %s", req.Code)
	log.Printf("Input: %s", req.Input)

	out, status := runCode(ctx, req.Code, req.Input)
	execMs := int(time.Since(start).Milliseconds())

	res := ExecResult{
		Output:          out,
		Status:          status,
		ExecutionTimeMs: execMs,
		MemoryUsedKB:    0, // TODO: parse /usr/bin/time for real value
	}

	log.Printf("Output: %s", out)
	log.Printf("Status: %s", status)

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(res)
}

func runCode(ctx context.Context, code, input string) (output, status string) {
	log.Println("Running code...")
	dir, _ := os.MkdirTemp("", "exec-*")
	defer os.RemoveAll(dir)

	script := filepath.Join(dir, "code.py")
	_ = os.WriteFile(script, []byte(code), 0644)

	log.Printf("Input: %s", input)
	cmd := exec.CommandContext(ctx, "python3", script)
	if input != "" {
		cmd.Stdin = strings.NewReader(input)
	}

	var stdout, stderr bytes.Buffer
	cmd.Stdout, cmd.Stderr = &stdout, &stderr

	err := cmd.Run()

	// Always capture stderr for debugging purposes, even on success
	if stderr.Len() > 0 {
		log.Printf("Stderr: %s", stderr.String())
	}

	if err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			return "time limit exceeded", "time_limit_exceeded"
		}
		// Prioritize stderr for more informative error messages
		if stderr.Len() > 0 {
			return stderr.String(), "runtime_error"
		}
		return err.Error(), "runtime_error"
	}

	// This part is for when cmd.Run() succeeds but there's still output on stderr
	// (e.g., warnings from libraries)
	if stderr.Len() > 0 {
		// Decide if stderr content should be treated as a failure or just informational
		// For now, we'll treat any stderr output as a runtime_error if stdout is empty.
		if stdout.Len() == 0 {
			return stderr.String(), "runtime_error"
		}
	}

	return stdout.String(), "success"
}
