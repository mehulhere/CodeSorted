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
	Language      string `json:"language"` // ignored – container knows its language
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
	log.Println("🐍 Python-executor listening on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

func execHandler(w http.ResponseWriter, r *http.Request) {
	var req ExecRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Debug log
	log.Printf("Received request: FunctionName=%q, code length=%d, parser length=%d",
		req.FunctionName, len(req.Code), len(req.Parser))

	// Validate function name
	if req.FunctionName == "" || req.FunctionName == "." {
		http.Error(w, "Invalid function name provided. Function name cannot be empty or '.'", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), time.Duration(req.TimeLimitMs)*time.Millisecond)
	defer cancel()

	start := time.Now()

	// Check if the function actually exists in the code
	if !strings.Contains(req.Code, "def "+req.FunctionName+"(") {
		log.Printf("Warning: Function %q might not be defined in the code", req.FunctionName)
	}

	wrappedCode, err := wrapPythonCode(req)
	if err != nil {
		http.Error(w, fmt.Sprintf("failed to wrap code: %v", err), http.StatusInternalServerError)
		return
	}

	// Debug log - write the wrapped code to a file for inspection
	debugFile := "/tmp/debug-python-wrapped-code.py"
	if err := os.WriteFile(debugFile, []byte(wrappedCode), 0644); err != nil {
		log.Printf("Warning: Failed to write debug file: %v", err)
	} else {
		log.Printf("Wrote wrapped code to %s for debugging", debugFile)
	}

	out, status := runCode(ctx, wrappedCode, req.Input)
	execMs := int(time.Since(start).Milliseconds())

	res := ExecResult{
		Output:          out,
		Status:          status,
		ExecutionTimeMs: execMs,
		MemoryUsedKB:    0, // TODO: parse /usr/bin/time for real value
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(res)
}

func runCode(ctx context.Context, code, input string) (output, status string) {
	log.Println("Running code...")
	dir, _ := os.MkdirTemp("", "exec-*")
	defer os.RemoveAll(dir)

	script := filepath.Join(dir, "script.py")
	_ = os.WriteFile(script, []byte(code), 0644)

	cmd := exec.CommandContext(ctx, "python3", script)
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
		out := stderr.String()
		if strings.Contains(out, "SyntaxError") || strings.Contains(out, "IndentationError") {
			return out, "compilation_error"
		}
		return out, "runtime_error"
	}

	return stdout.String(), "success"
}

func wrapPythonCode(req ExecRequest) (string, error) {
	// Use provided parser or fallback to a minimal one
	parserCode := req.Parser
	if parserCode == "" {
		log.Printf("Warning: No parser provided, using minimal default parser")
		// Only provide a minimal parser that will fail with informative error
		parserCode = `
def parse_input(input_str):
    """Minimal default parser"""
    print(f"WARNING: No parser was provided by the backend. Input: {repr(input_str)}", file=sys.stderr)
    raise ValueError("No parser was provided by the backend. Please provide input examples in the request.")
`
	}

	// Ensure function name is not empty
	functionName := req.FunctionName
	if functionName == "" {
		functionName = "solution"
		log.Printf("Warning: Empty function name, using 'solution' as default")
	}

	const tpl = `
import json
import sys
import traceback

{{.Code}}

{{.ParserCode}}

def main():
    try:
        input_str = sys.stdin.read().strip()
        print(f"DEBUG: Input string: {repr(input_str)}", file=sys.stderr)
        
        # The parser should handle the input and return the appropriate arguments
        args = parse_input(input_str)
        print(f"DEBUG: Parsed args: {args}", file=sys.stderr)
        
        # Call the function with the provided arguments
        if isinstance(args, tuple):
            result = {{.FunctionName}}(*args)
        elif isinstance(args, dict):
            result = {{.FunctionName}}(**args)
        elif isinstance(args, list):
            result = {{.FunctionName}}(*args)
        else:
            result = {{.FunctionName}}(args)
        
        print(f"DEBUG: Function result: {result}", file=sys.stderr)
        
        if isinstance(result, (list, tuple, dict)):
            print(json.dumps(result))
        else:
            print(result)
    except Exception as e:
        print(f"Error during execution: {e}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)

if __name__ == "__main__":
    main()
`

	t := template.Must(template.New("python").Parse(tpl))
	var buf bytes.Buffer
	err := t.Execute(&buf, struct {
		Code         string
		FunctionName string
		ParserCode   string
	}{
		Code:         req.Code,
		FunctionName: functionName,
		ParserCode:   parserCode,
	})
	if err != nil {
		return "", err
	}

	// Log the template variables for debugging
	log.Printf("Template variables: FunctionName=%q, Code length=%d, Parser length=%d",
		functionName, len(req.Code), len(parserCode))

	// Save the generated code to debug file
	debugFile := "/tmp/debug-python-code.py"
	if err := os.WriteFile(debugFile, []byte(buf.String()), 0644); err != nil {
		log.Printf("Failed to write debug file: %v", err)
	} else {
		log.Printf("Wrote debug code to %s", debugFile)
	}

	return buf.String(), nil
}
