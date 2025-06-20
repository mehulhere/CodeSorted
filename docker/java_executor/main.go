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
	log.Println("☕ Java-executor listening on :8080")
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

	wrappedCode, err := wrapJavaCode(req)
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

	source := filepath.Join(dir, "Main.java")
	_ = os.WriteFile(source, []byte(code), 0644)

	// Compile
	compileCmd := exec.Command("javac", source)
	var compileOut bytes.Buffer
	compileCmd.Stderr = &compileOut
	if err := compileCmd.Run(); err != nil {
		return compileOut.String(), "compilation_error"
	}

	// Run
	cmd := exec.CommandContext(ctx, "java", "-cp", dir, "Main")
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

func wrapJavaCode(req ExecRequest) (string, error) {
	// Use provided parser or fallback to default
	parserCode := req.Parser
	if parserCode == "" {
		// Default parser as fallback
		parserCode = `
    private static Object[] parseInput(String input) {
        // Handle "nums = [2,7,11,15], target = 9" format
        if (input.contains("=")) {
            Map<String, Object> keyValuePairs = new HashMap<>();
            String[] parts = input.split(",");
            for (String part : parts) {
                String[] keyValue = part.split("=");
                String key = keyValue[0].trim();
                String value = keyValue[1].trim();
                
                if (value.startsWith("[") && value.endsWith("]")) {
                    keyValuePairs.put(key, parseIntArray(value));
                } else {
                    try {
                        keyValuePairs.put(key, Integer.parseInt(value));
                    } catch (NumberFormatException e) {
                        keyValuePairs.put(key, value);
                    }
                }
            }
            
            if (keyValuePairs.containsKey("nums") && keyValuePairs.containsKey("target")) {
                return new Object[] { keyValuePairs.get("nums"), keyValuePairs.get("target") };
            }
            return keyValuePairs.values().toArray();
        }
        
        // Otherwise try to parse as just an array
        if (input.startsWith("[") && input.endsWith("]")) {
            return new Object[] { parseIntArray(input) };
        }
        
        return new Object[] { input };
    }
    
    private static int[] parseIntArray(String arrayStr) {
        arrayStr = arrayStr.trim();
        if (arrayStr.startsWith("[")) {
            arrayStr = arrayStr.substring(1, arrayStr.length() - 1);
        }
        
        String[] elements = arrayStr.split(",");
        int[] result = new int[elements.length];
        
        for (int i = 0; i < elements.length; i++) {
            result[i] = Integer.parseInt(elements[i].trim());
        }
        
        return result;
    }
    
    private static void printResult(Object result) {
        if (result instanceof int[]) {
            int[] array = (int[]) result;
            System.out.print("[");
            for (int i = 0; i < array.length; i++) {
                System.out.print(array[i]);
                if (i < array.length - 1) {
                    System.out.print(",");
                }
            }
            System.out.print("]");
        } else {
            System.out.println(result);
        }
    }
`
	}

	const tpl = `
import java.util.*;

public class Main {
    {{.Code}}

    {{.ParserCode}}

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        String line = scanner.nextLine();
        scanner.close();

        Object[] parsedInput = parseInput(line);
        int[] nums = (int[]) parsedInput[0];
        int target = (int) parsedInput[1];
        
        int[] result = new Main().{{.FunctionName}}(nums, target);
        printResult(result);
    }
}
`
	t := template.Must(template.New("java").Parse(tpl))
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
