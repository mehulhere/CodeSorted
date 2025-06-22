package handlers

import (
	"backend/internal/ai"
	"backend/internal/database"
	"backend/internal/types"
	"backend/internal/utils"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"
)

func runCodeAgainstTestCases(ctx context.Context, language, problemID, userCode string, testCases []string) (*types.ExecuteCodeResult, error) {
	// Fetch the parser and solution code from the database
	artifacts, err := database.GetGeneratedCode(ctx, problemID, language)
	if err != nil {
		log.Printf("Failed to get generated code for problem '%s': %v", problemID, err)
		return nil, fmt.Errorf("could not find solution artifacts for this problem")
	}

	var fullCode string
	if language == "python" {
		escapedUserCode := strings.ReplaceAll(userCode, `"""`, `\"\"\"`)
		indent := "    "
		indentedInputParser := indent + strings.ReplaceAll(strings.TrimSpace(artifacts.InputParserCode), "\n", "\n"+indent)
		indentedOutputParser := indent + strings.ReplaceAll(strings.TrimSpace(artifacts.OutputParserCode), "\n", "\n"+indent)
		fullCode = fmt.Sprintf(`
import sys
import types
import traceback

def execute_user_code():
    user_code_str = """
%s
"""
    # Create a fake module to execute user's code in
    module_name = 'user_solution'
    user_module = types.ModuleType(module_name)
    user_module.__file__ = f'{module_name}.py'

    # Compile the user's code with a fake filename for better tracebacks
    filename = 'user_solution.py'
    code_obj = compile(user_code_str, filename, 'exec')

    # Execute user's code in the module's namespace
    # This populates the module with any functions the user defined
    exec(code_obj, user_module.__dict__)
    
    # Make the user's functions available to the parser/caller code
    globals().update(user_module.__dict__)

# ====== PARSER CODE ======
# This part reads from stdin and prepares function arguments
%s
    
# ====== OUTPUT CODE ======
# This part calls the user's function with prepared arguments and prints the result
%s

try:
    execute_user_code()
except Exception:
    exc_type, exc_value, exc_tb = sys.exc_info()
    tb_list = traceback.format_exception(exc_type, exc_value, exc_tb)
    
    cleaned_traceback = []
    # Find the start of the user's code in the traceback
    for i, line in enumerate(tb_list):
        if "user_solution.py" in line:
            cleaned_traceback = tb_list[i:]
            break
            
    # Prepend the "Traceback..." header, which is always the first element
    if cleaned_traceback:
        final_tb = [tb_list[0]] + cleaned_traceback
    else:
        # If user's file not in trace, the error is in the wrapper. Show full trace.
        final_tb = tb_list

    sys.stderr.write("".join(final_tb))
    sys.exit(1)
`, escapedUserCode, indentedInputParser, indentedOutputParser)
	} else {
		fullCode = fmt.Sprintf(`
# ====== PARSER CODE ======
%s

# ====== USER-PROVIDED SOLUTION ======
%s

# ====== OUTPUT CODE ======
%s
`,
			artifacts.InputParserCode,
			userCode,
			artifacts.OutputParserCode,
		)
	}

	result := &types.ExecuteCodeResult{
		Status:  "processing",
		Results: make([]types.TestCaseResult, len(testCases)),
	}

	var maxExecutionTime int64
	hasError := false

	for i, testInput := range testCases {
		execResult, err := ai.ExecuteCode(language, fullCode, testInput)

		// Initialize the result with default values
		result.Results[i] = types.TestCaseResult{
			Status: "error",
		}

		if err != nil {
			result.Results[i].Error = err.Error()
			hasError = true
			continue
		}

		// Check if execResult is nil before accessing its fields
		if execResult == nil {
			result.Results[i].Error = "Execution result is nil"
			hasError = true
			continue
		}

		// Now it's safe to access execResult fields
		result.Results[i].ExecutionTimeMs = int64(execResult.ExecutionTimeMs)
		result.Results[i].MemoryUsedKB = execResult.MemoryUsedKB
		result.Results[i].Status = execResult.Status

		if execResult.Status == "success" {
			result.Results[i].Stdout = execResult.Output
		} else {
			result.Results[i].Stderr = execResult.Output
			hasError = true
		}

		if result.Results[i].ExecutionTimeMs > maxExecutionTime {
			maxExecutionTime = result.Results[i].ExecutionTimeMs
		}
	}

	if hasError {
		result.Status = "error"
	} else {
		result.Status = "success"
	}
	result.ExecutionTimeMs = maxExecutionTime

	if len(result.Results) > 0 {
		result.Stdout = result.Results[0].Stdout
		result.Stderr = result.Results[0].Stderr
	}

	return result, nil
}

func ExecuteCodeHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.SendJSONError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var payload types.ExecuteCodePayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		utils.SendJSONError(w, "Invalid request payload", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	if payload.Code == "" || payload.Language == "" || payload.ProblemId == "" {
		utils.SendJSONError(w, "Fields 'code', 'language', and 'problemId' are required", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()

	testCases := payload.TestCases
	if len(testCases) == 0 {
		testCases = []string{payload.Stdin}
	}

	result, err := runCodeAgainstTestCases(ctx, payload.Language, payload.ProblemId, payload.Code, testCases)
	if err != nil {
		utils.SendJSONError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}
