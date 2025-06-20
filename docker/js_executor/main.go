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
	log.Println("🟢 JS-executor listening on :8080")
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

	wrappedCode, err := wrapJSCode(req)
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

	script := filepath.Join(dir, "script.js")
	_ = os.WriteFile(script, []byte(code), 0644)

	cmd := exec.CommandContext(ctx, "node", script)
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

func wrapJSCode(req ExecRequest) (string, error) {
	// Use provided parser or fallback to default
	parserCode := req.Parser
	if parserCode == "" {
		// Default parser as fallback
		parserCode = `
function parseInput(inputStr) {
    inputStr = inputStr.trim();
    if (inputStr.includes('=')) {
        const params = {};
        const parts = inputStr.split(',').map(s => s.trim());
        for (const part of parts) {
            const [key, value] = part.split('=').map(s => s.trim());
            try {
                params[key] = JSON.parse(value);
            } catch {
                params[key] = value;
            }
        }
        return [params.nums, params.target];
    }
    try {
        return [JSON.parse(inputStr)];
    } catch {
        return [inputStr];
    }
}
`
	}

	const tpl = `
{{.Code}}

const fs = require('fs');

{{.ParserCode}}

function main() {
    const inputStr = fs.readFileSync(0, 'utf-8').trim();
    const args = parseInput(inputStr);
    
    let result;
    if (Array.isArray(args)) {
        result = {{.FunctionName}}(...args);
    } else if (typeof args === 'object' && args !== null) {
        result = {{.FunctionName}}(args);
    } else {
        result = {{.FunctionName}}(args);
    }
    
    if (typeof result === 'object') {
        console.log(JSON.stringify(result));
    } else {
        console.log(result);
    }
}

main();
`
	t := template.Must(template.New("js").Parse(tpl))
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
