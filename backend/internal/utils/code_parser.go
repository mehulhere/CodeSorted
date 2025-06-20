package utils

import (
	"fmt"
	"log"
	"path"
	"regexp"
	"strings"
	"text/template"
)

// Template for different languages
const (
	// Python template
	pythonTemplate = `
import json
import sys
from typing import List, Dict, Any, Tuple, Set, Optional, Union

{{if .HasFunction}}
{{.SolutionCode}}

def main():
    # Parse input
    input_str = input().strip()
    
    # Use the adaptive parser function
    args = parse_input(input_str)
    
    # Call the solution function with unpacked arguments
    result = {{.FunctionName}}(*args)
    
    # Format and print the output
    print_output(result)

def parse_input(input_str: str) -> list:
    """Parse input string into appropriate arguments for the solution function"""
    # Special handling for common input formats
    
    # Check if input is in form: nums = [1,2,3], target = 9
    pattern = r'(\w+)\s*=\s*([^,]+)(?:,\s*(\w+)\s*=\s*([^,]+))?'
    matches = re.findall(pattern, input_str)
    
    if matches:
        args = []
        for match in matches:
            param_name, param_value = match[0], match[1]
            try:
                # Try to evaluate the value (for lists, numbers, etc.)
                args.append(eval(param_value))
            except:
                # If eval fails, use the string as is
                args.append(param_value)
        return args
    
    # Standard array input like [1,2,3]
    if input_str.startswith('[') and input_str.endswith(']'):
        try:
            return [json.loads(input_str)]
        except:
            pass
            
    # Multiple values separated by spaces or commas
    # Try to parse as JSON first
    try:
        return [json.loads(input_str)]
    except:
        # Split by space or comma and try to convert to appropriate types
        values = re.split(r'[,\s]+', input_str.strip())
        args = []
        for val in values:
            try:
                # Try to convert to int
                args.append(int(val))
            except ValueError:
                try:
                    # Try to convert to float
                    args.append(float(val))
                except ValueError:
                    # Keep as string
                    args.append(val)
        return args

def print_output(result: Any) -> None:
    """Format and print the output based on its type"""
    if isinstance(result, (list, tuple)):
        # Format list/tuple output
        print(json.dumps(result))
    elif isinstance(result, dict):
        # Format dictionary output
        print(json.dumps(result))
    else:
        # For simple types
        print(result)

if __name__ == "__main__":
    main()
{{else}}
def main():
    # Your code here - implement your solution
    pass

if __name__ == "__main__":
    main()
{{end}}
`

	// JavaScript template
	jsTemplate = `
{{if .HasFunction}}
{{.SolutionCode}}

function main() {
    // Read input from stdin
    const input = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    input.question('', (inputStr) => {
        // Parse input
        const args = parseInput(inputStr);
        
        // Call the solution function with spread arguments
        const result = {{.FunctionName}}(...args);
        
        // Format and print the output
        printOutput(result);
        
        input.close();
    });
}

function parseInput(inputStr) {
    // Trim whitespace
    inputStr = inputStr.trim();
    
    // Pattern for "key = value" format
    const pattern = /(\w+)\s*=\s*([^,]+)(?:,\s*(\w+)\s*=\s*([^,]+))?/g;
    let match;
    const args = [];
    
    // Check for key=value pattern
    let matches = [...inputStr.matchAll(pattern)];
    if (matches.length > 0) {
        for (const match of matches) {
            const [, paramName, paramValue] = match;
            try {
                // Try to evaluate the value
                args.push(eval(paramValue));
            } catch (e) {
                // If eval fails, use the string as is
                args.push(paramValue);
            }
        }
        return args;
    }
    
    // Try to parse as JSON array
    if (inputStr.startsWith('[') && inputStr.endsWith(']')) {
        try {
            return [JSON.parse(inputStr)];
        } catch (e) {
            // If parsing fails, continue to other methods
        }
    }
    
    // Try to parse the entire input as JSON
    try {
        return [JSON.parse(inputStr)];
    } catch (e) {
        // Split by spaces or commas and convert to appropriate types
        const values = inputStr.split(/[\s,]+/).filter(Boolean);
        return values.map(val => {
            // Try to convert to number
            if (!isNaN(val)) {
                return Number(val);
            }
            return val;
        });
    }
}

function printOutput(result) {
    if (Array.isArray(result) || typeof result === 'object') {
        console.log(JSON.stringify(result));
    } else {
        console.log(result);
    }
}

main();
{{else}}
function main() {
    // Your code here - implement your solution
}

main();
{{end}}
`

	// C++ template
	cppTemplate = `
#include <iostream>
#include <vector>
#include <string>
#include <sstream>
#include <map>
#include <algorithm>
#include <regex>

{{if .HasFunction}}
{{.SolutionCode}}

// Helper function to trim whitespace from a string
std::string trim(const std::string& str) {
    size_t first = str.find_first_not_of(" \t\n\r");
    if (first == std::string::npos) return "";
    size_t last = str.find_last_not_of(" \t\n\r");
    return str.substr(first, (last - first + 1));
}

// Helper function to split a string by a delimiter
std::vector<std::string> split(const std::string& str, char delimiter) {
    std::vector<std::string> tokens;
    std::string token;
    std::istringstream tokenStream(str);
    while (std::getline(tokenStream, token, delimiter)) {
        tokens.push_back(trim(token));
    }
    return tokens;
}

// Function to parse string to integer
int parseToInt(const std::string& str) {
    return std::stoi(trim(str));
}

// Function to parse array-like string "[1,2,3]" to vector
std::vector<int> parseArray(std::string str) {
    std::vector<int> result;
    // Remove brackets
    str = str.substr(1, str.length() - 2);
    
    // Split by comma
    auto elements = split(str, ',');
    
    // Convert each element to integer
    for (const auto& elem : elements) {
        result.push_back(parseToInt(elem));
    }
    
    return result;
}

// Function to parse key-value pairs like "nums = [1,2,3], target = 9"
std::map<std::string, std::string> parseKeyValuePairs(const std::string& input) {
    std::map<std::string, std::string> result;
    
    std::regex pattern("(\\w+)\\s*=\\s*([^,]+)(?:,\\s*)?");
    
    auto words_begin = std::sregex_iterator(input.begin(), input.end(), pattern);
    auto words_end = std::sregex_iterator();

    for (std::sregex_iterator i = words_begin; i != words_end; ++i) {
        std::smatch match = *i;
        std::string key = match[1].str();
        std::string value = match[2].str();
        result[key] = trim(value);
    }
    
    return result;
}

// Function to print vector
template<typename T>
void printVector(const std::vector<T>& vec) {
    std::cout << "[";
    for (size_t i = 0; i < vec.size(); ++i) {
        std::cout << vec[i];
        if (i < vec.size() - 1) {
            std::cout << ",";
        }
    }
    std::cout << "]";
}

int main() {
    // Read input
    std::string input;
    std::getline(std::cin, input);
    
    // Check if input follows the "key = value" pattern
    auto keyValuePairs = parseKeyValuePairs(input);
    
    // Example usage for Two Sum problem
    if (keyValuePairs.find("nums") != keyValuePairs.end() && 
        keyValuePairs.find("target") != keyValuePairs.end()) {
        
        auto nums = parseArray(keyValuePairs["nums"]);
        int target = parseToInt(keyValuePairs["target"]);
        
        // Call the solution function
        auto result = {{.FunctionName}}(nums, target);
        
        // Print the result
        printVector(result);
    }
    // Add more patterns as needed for different problem types
    
    return 0;
}
{{else}}
int main() {
    // Your code here - implement your solution
    return 0;
}
{{end}}
`

	// Java template
	javaTemplate = `
import java.util.*;
import java.io.*;
import java.util.regex.*;

{{if .HasFunction}}
public class Solution {
    {{.SolutionCode}}
    
    public static void main(String[] args) throws Exception {
        // Read input
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String input = br.readLine().trim();
        
        // Parse the input
        Object[] parsedInput = parseInput(input);
        
        // Call the solution method based on input format
        // This example assumes a two-sum like problem
        if (parsedInput.length >= 2 && parsedInput[0] instanceof int[] && parsedInput[1] instanceof Integer) {
            int[] nums = (int[]) parsedInput[0];
            int target = (Integer) parsedInput[1];
            
            // Call the solution
            int[] result = {{.FunctionName}}(nums, target);
            
            // Print the result
            printResult(result);
        }
        // Add more cases as needed for different problem types
    }
    
    private static Object[] parseInput(String input) {
        // Check if input follows key-value format like "nums = [1,2,3], target = 9"
        Pattern pattern = Pattern.compile("(\\w+)\\s*=\\s*([^,]+)(?:,\\s*)?");
        Matcher matcher = pattern.matcher(input);
        
        Map<String, String> keyValuePairs = new HashMap<>();
        while (matcher.find()) {
            String key = matcher.group(1);
            String value = matcher.group(2).trim();
            keyValuePairs.put(key, value);
        }
        
        if (!keyValuePairs.isEmpty()) {
            List<Object> args = new ArrayList<>();
            
            // Example handling for a two-sum like problem
            if (keyValuePairs.containsKey("nums") && keyValuePairs.containsKey("target")) {
                String numsStr = keyValuePairs.get("nums");
                int[] nums = parseIntArray(numsStr);
                args.add(nums);
                
                int target = Integer.parseInt(keyValuePairs.get("target"));
                args.add(target);
            }
            
            return args.toArray();
        }
        
        // Default case: try to parse as JSON array
        if (input.startsWith("[") && input.endsWith("]")) {
            return new Object[] { parseIntArray(input) };
        }
        
        // Simple space or comma separated values
        String[] parts = input.split("[,\\s]+");
        List<Object> args = new ArrayList<>();
        
        for (String part : parts) {
            try {
                args.add(Integer.parseInt(part));
            } catch (NumberFormatException e) {
                try {
                    args.add(Double.parseDouble(part));
                } catch (NumberFormatException e2) {
                    args.add(part);
                }
            }
        }
        
        return args.toArray();
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
}
{{else}}
public class Solution {
    public static void main(String[] args) {
        // Your code here - implement your solution
    }
}
{{end}}
`
)

// CodeWrapperOptions contains options for code wrapper generation
type CodeWrapperOptions struct {
	Language     string
	SolutionCode string
	FunctionName string
	HasFunction  bool
}

// GenerateCodeWrapper creates a code wrapper based on the provided options
func GenerateCodeWrapper(opts CodeWrapperOptions) (string, error) {
	var templateStr string

	// Choose template based on language
	switch strings.ToLower(opts.Language) {
	case "python":
		templateStr = pythonTemplate
	case "javascript", "js":
		templateStr = jsTemplate
	case "cpp", "c++":
		templateStr = cppTemplate
	case "java":
		templateStr = javaTemplate
	default:
		return "", fmt.Errorf("unsupported language: %s", opts.Language)
	}

	// Parse the template
	tmpl, err := template.New("code").Parse(templateStr)
	if err != nil {
		return "", fmt.Errorf("error parsing template: %w", err)
	}

	// Execute the template with the provided options
	var output strings.Builder
	err = tmpl.Execute(&output, opts)
	if err != nil {
		return "", fmt.Errorf("error executing template: %w", err)
	}

	return output.String(), nil
}

// ExtractFunctionName extracts the function name from problem ID/name
// e.g., "two_sum" -> "twoSum" or "TS001" -> "twoSum"
func ExtractFunctionName(problemId string) string {
	// Log input
	log.Printf("ExtractFunctionName called with problemId: %q", problemId)

	// Handle empty problem ID
	if problemId == "" {
		log.Printf("Empty problem ID, using default function name: twoSum")
		return "twoSum"
	}

	// Special case handling for specific problem IDs
	problemMap := map[string]string{
		"TS001": "twoSum",
		// Add more mappings as needed
	}

	// Check if we have a direct mapping
	if name, exists := problemMap[problemId]; exists {
		log.Printf("Found direct mapping for problem ID %q -> %q", problemId, name)
		return name
	}

	// If file extension exists, remove it
	problemId = strings.TrimSuffix(path.Base(problemId), path.Ext(problemId))
	log.Printf("After trimming suffix: %q", problemId)

	// Replace hyphens with underscores
	problemId = strings.ReplaceAll(problemId, "-", "_")
	log.Printf("After replacing hyphens: %q", problemId)

	// Convert to camelCase
	parts := strings.Split(problemId, "_")
	for i := 1; i < len(parts); i++ {
		if len(parts[i]) > 0 {
			parts[i] = strings.ToUpper(parts[i][0:1]) + parts[i][1:]
		}
	}

	result := strings.Join(parts, "")
	log.Printf("Final function name: %q", result)

	// Ensure non-empty result with fallback
	if result == "" || result == "." {
		result = "twoSum"
		log.Printf("Invalid result, using default: %q", result)
	}

	return result
}

// ExtractFunctionFromCode attempts to find the function definition in the code
// Returns the function name if found, or an empty string if not found
func ExtractFunctionFromCode(code, language string) string {
	var functionNameRegex *regexp.Regexp

	switch strings.ToLower(language) {
	case "python":
		// Match "def function_name("
		functionNameRegex = regexp.MustCompile(`def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(`)
	case "javascript", "js":
		// Match "function function_name(" or "const function_name = ("
		functionNameRegex = regexp.MustCompile(`(?:function\s+([a-zA-Z_][a-zA-Z0-9_]*)|const\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*\([^)]*\)\s*=>)`)
	case "cpp", "c++":
		// Simplified match for C++ function declarations
		functionNameRegex = regexp.MustCompile(`(?:\w+\s+)+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(`)
	case "java":
		// Match for Java method declarations
		functionNameRegex = regexp.MustCompile(`(?:public|private|protected|static|\s) +[\w\<\>\[\]]+\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(`)
	default:
		return ""
	}

	matches := functionNameRegex.FindStringSubmatch(code)
	if len(matches) > 1 {
		for i := 1; i < len(matches); i++ {
			if matches[i] != "" {
				return matches[i]
			}
		}
	}

	return ""
}

// PrepareCodeWithParser takes user code and wraps it with proper input parser
// and output formatter for the given language and problem name
func PrepareCodeWithParser(code, language, problemId string) (string, error) {
	// Extract function name from problem ID
	expectedFunctionName := ExtractFunctionName(problemId)

	// Try to find actual function name in the code
	actualFunctionName := ExtractFunctionFromCode(code, language)

	// If we found a function name in the code, use that; otherwise use the expected name
	functionName := actualFunctionName
	if functionName == "" {
		functionName = expectedFunctionName
	}

	// Generate code wrapper
	options := CodeWrapperOptions{
		Language:     language,
		SolutionCode: code,
		FunctionName: functionName,
		HasFunction:  actualFunctionName != "",
	}

	return GenerateCodeWrapper(options)
}
