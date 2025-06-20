/**
 * Input Parser Utilities
 * 
 * This file contains the template code that will be injected to handle
 * automatic parsing of input in different programming languages.
 */

/**
 * Generates Python parsing code for common input formats
 * @returns Python code for parsing input
 */
export const getPythonParser = (functionName: string): string => {
  return `
import sys
import json
import re
from typing import List, Dict, Any, Optional

def parse_input(input_str: str):
    """
    Parses various input formats commonly used in coding problems.
    Handles arrays, matrices, strings, integers, and more.
    """
    input_str = input_str.strip()
    
    # Check if input is a simple integer, float, or string
    if re.match(r'^-?\\d+$', input_str):
        return int(input_str)
    if re.match(r'^-?\\d+\\.\\d+$', input_str):
        return float(input_str)
    
    # Check for variable assignment format like "nums = [1,2,3], target = 9"
    if '=' in input_str:
        params = {}
        parts = input_str.split(',')
        
        # Handle each part (variable assignment)
        for part in parts:
            if '=' not in part:
                continue
                
            var_name, var_value = part.split('=', 1)
            var_name = var_name.strip()
            var_value = var_value.strip()
            
            # Try to evaluate the value (for arrays, etc.)
            try:
                # Replace "true"/"false" with Python's "True"/"False"
                var_value = var_value.replace("true", "True").replace("false", "False")
                params[var_name] = eval(var_value)
            except:
                # If eval fails, keep it as a string
                params[var_name] = var_value
        
        return params
    
    # Try to parse as JSON
    try:
        return json.loads(input_str)
    except:
        pass
    
    # If all else fails, return the input as a string
    return input_str

# Read input
input_data = parse_input(input().strip())

# Call the solution function with appropriate arguments
if isinstance(input_data, dict):
    # If input is a dictionary of parameters, unpack them
    result = ${functionName}(**input_data)
else:
    # Otherwise, pass the input directly
    result = ${functionName}(input_data)

# Print the result
if isinstance(result, (list, tuple)):
    print(json.dumps(result))
elif isinstance(result, dict):
    print(json.dumps(result))
else:
    print(result)
`
};

/**
 * Generates JavaScript parsing code for common input formats
 * @returns JavaScript code for parsing input
 */
export const getJavaScriptParser = (functionName: string): string => {
  return `
/**
 * Parses various input formats commonly used in coding problems.
 * @param {string} inputStr - Raw input string
 * @returns {any} Parsed input
 */
function parseInput(inputStr) {
  inputStr = inputStr.trim();
  
  // Check if input is a simple integer or float
  if (/^-?\\d+$/.test(inputStr)) {
    return parseInt(inputStr, 10);
  }
  if (/^-?\\d+\\.\\d+$/.test(inputStr)) {
    return parseFloat(inputStr);
  }
  
  // Check for variable assignment format like "nums = [1,2,3], target = 9"
  if (inputStr.includes('=')) {
    const params = {};
    const parts = inputStr.split(',');
    
    // Handle each part (variable assignment)
    for (const part of parts) {
      if (!part.includes('=')) continue;
      
      const [varName, varValue] = part.split('=', 2).map(s => s.trim());
      
      // Try to evaluate the value (for arrays, objects, etc.)
      try {
        // Make sure we're using proper JSON format for evaluation
        // Replace single quotes with double quotes, etc.
        const formattedValue = varValue
          .replace(/'/g, '"')
          .replace(/True/g, 'true')
          .replace(/False/g, 'false');
        
        params[varName] = JSON.parse(formattedValue);
      } catch (e) {
        // If JSON parse fails, try direct evaluation
        try {
          params[varName] = eval(varValue);
        } catch (e2) {
          // If eval fails too, keep it as a string
          params[varName] = varValue;
        }
      }
    }
    
    return params;
  }
  
  // Try to parse as JSON
  try {
    return JSON.parse(inputStr);
  } catch (e) {
    // If all else fails, return the input as a string
    return inputStr;
  }
}

// Read input from stdin
const input = require('readline')
  .createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

let inputData = '';
input.on('line', line => {
  inputData += line + '\\n';
});

input.on('close', () => {
  // Parse the input
  const parsedInput = parseInput(inputData);
  
  // Call the solution function with appropriate arguments
  let result;
  if (typeof parsedInput === 'object' && !Array.isArray(parsedInput)) {
    // If input is an object of parameters, unpack them
    result = ${functionName}(...Object.values(parsedInput));
  } else {
    // Otherwise, pass the input directly
    result = ${functionName}(parsedInput);
  }
  
  // Print the result
  if (Array.isArray(result) || typeof result === 'object') {
    console.log(JSON.stringify(result));
  } else {
    console.log(result);
  }
});
`
};

/**
 * Generates C++ parsing code for common input formats
 * @returns C++ code for parsing input
 */
export const getCppParser = (functionName: string): string => {
  return `
#include <iostream>
#include <string>
#include <vector>
#include <sstream>
#include <map>
#include <algorithm>
#include <cctype>
#include <regex>

// Utility function to trim whitespace
std::string trim(const std::string& str) {
    size_t first = str.find_first_not_of(" \\t\\n\\r");
    if (first == std::string::npos) return "";
    size_t last = str.find_last_not_of(" \\t\\n\\r");
    return str.substr(first, last - first + 1);
}

// Parse array from string like "[1,2,3]"
std::vector<int> parseIntArray(const std::string& str) {
    std::vector<int> result;
    std::string trimmed = trim(str);
    
    // Remove brackets
    if (trimmed.front() == '[' && trimmed.back() == ']') {
        trimmed = trimmed.substr(1, trimmed.size() - 2);
    }
    
    std::stringstream ss(trimmed);
    std::string item;
    
    while (std::getline(ss, item, ',')) {
        result.push_back(std::stoi(trim(item)));
    }
    
    return result;
}

int main() {
    std::string input;
    std::getline(std::cin, input);
    input = trim(input);
    
    // Check for variable assignment format like "nums = [1,2,3], target = 9"
    if (input.find('=') != std::string::npos) {
        std::vector<int> nums;
        int target = 0;
        
        // Parse "nums = [1,2,3], target = 9" format
        size_t numsPos = input.find("nums = ");
        size_t targetPos = input.find("target = ");
        
        if (numsPos != std::string::npos && targetPos != std::string::npos) {
            size_t numsStart = numsPos + 7; // Length of "nums = "
            size_t numsEnd = input.find(',', numsStart);
            std::string numsStr = input.substr(numsStart, numsEnd - numsStart);
            
            size_t targetStart = targetPos + 9; // Length of "target = "
            std::string targetStr = input.substr(targetStart);
            
            nums = parseIntArray(numsStr);
            target = std::stoi(trim(targetStr));
            
            // Call the solution function
            auto result = ${functionName}(nums, target);
            
            // Print the result
            std::cout << "[";
            for (size_t i = 0; i < result.size(); ++i) {
                std::cout << result[i];
                if (i < result.size() - 1) std::cout << ",";
            }
            std::cout << "]" << std::endl;
            
            return 0;
        }
    }
    
    // Handle simpler inputs...
    // This is a basic implementation; extend as needed for other input formats
    
    return 0;
}
`
};

/**
 * Generates Java parsing code for common input formats
 * @returns Java code for parsing input
 */
export const getJavaParser = (functionName: string): string => {
  return `
import java.util.*;
import java.io.*;
import java.util.regex.*;

public class Solution {
    /**
     * Parses various input formats commonly used in coding problems.
     */
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String input = br.readLine().trim();
        
        // Solution instance
        Solution solution = new Solution();
        
        // Check for variable assignment format like "nums = [1,2,3], target = 9"
        if (input.contains("=")) {
            // Handle "nums = [1,2,3], target = 9" format
            if (input.contains("nums =") && input.contains("target =")) {
                // Extract nums array
                Pattern numsPattern = Pattern.compile("nums = \\[(.*?)\\]");
                Matcher numsMatcher = numsPattern.matcher(input);
                
                // Extract target value
                Pattern targetPattern = Pattern.compile("target = (\\d+)");
                Matcher targetMatcher = targetPattern.matcher(input);
                
                if (numsMatcher.find() && targetMatcher.find()) {
                    String[] numsStr = numsMatcher.group(1).split(",");
                    int[] nums = new int[numsStr.length];
                    
                    for (int i = 0; i < numsStr.length; i++) {
                        nums[i] = Integer.parseInt(numsStr[i].trim());
                    }
                    
                    int target = Integer.parseInt(targetMatcher.group(1).trim());
                    
                    // Call the solution method
                    int[] result = solution.${functionName}(nums, target);
                    
                    // Print the result
                    System.out.print("[");
                    for (int i = 0; i < result.length; i++) {
                        System.out.print(result[i]);
                        if (i < result.length - 1) {
                            System.out.print(",");
                        }
                    }
                    System.out.println("]");
                }
            }
        } else {
            // Handle other input formats...
            // This is a basic implementation; extend as needed
        }
    }
    
    // The solution method would be defined here
    // public int[] ${functionName}(int[] nums, int target) { ... }
}
`
};

/**
 * Get parser code for the specified language and function name
 */
export const getParserCode = (language: string, functionName: string = 'solution'): string => {
  switch (language.toLowerCase()) {
    case 'python':
      return getPythonParser(functionName);
    case 'javascript':
    case 'js':
      return getJavaScriptParser(functionName);
    case 'cpp':
    case 'c++':
      return getCppParser(functionName);
    case 'java':
      return getJavaParser(functionName);
    default:
      return ''; // No parser for unknown languages
  }
}; 