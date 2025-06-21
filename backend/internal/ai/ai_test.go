package ai

import (
	"context"
	"encoding/json"
	"strings"
	"testing"
)

func TestTruncateForLogging(t *testing.T) {
	testCases := []struct {
		name     string
		input    string
		maxLen   int
		expected string
	}{
		{
			name:     "Short string, no truncation",
			input:    "Hello, world!",
			maxLen:   20,
			expected: "Hello, world!",
		},
		{
			name:     "Long string, truncated",
			input:    "This is a very long string that should be truncated for logging purposes",
			maxLen:   20,
			expected: "This is a ...g purposes",
		},
		{
			name:     "Exactly at limit",
			input:    "12345678901234567890",
			maxLen:   20,
			expected: "12345678901234567890",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result := TruncateForLogging(tc.input, tc.maxLen)
			if result != tc.expected {
				t.Errorf("Expected: %s, Got: %s", tc.expected, result)
			}
		})
	}
}

func TestFixPythonExpressions(t *testing.T) {
	testCases := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name: "Handle string multiplication",
			input: `{
				"test_case_1": {
					"input": "a" * 50000,
					"python": false
				}
			}`,
			expected: `{
				"test_case_1": {
					"input": "a", "python": true
				}
			}`,
		},
		{
			name: "Handle string concatenation",
			input: `{
				"test_case_1": {
					"input": "a" * 25000 + "b" * 25000,
					"python": false
				}
			}`,
			expected: `{
				"test_case_1": {
					"input": "ab", "python": true
				}
			}`,
		},
		{
			name: "Evaluate quoted string repetition",
			input: `{
				"test_case_1": {
					"input": "'abc' * 3"
				}
			}`,
			expected: `{
				"test_case_1": {
					"input": "abcabcabc"
				}
			}`,
		},
		{
			name: "Evaluate quoted string repetition with concatenation",
			input: `{
				"test_case_1": {
					"input": "'abc' * 3 + 'def'"
				}
			}`,
			expected: `{
				"test_case_1": {
					"input": "abcabcabcdef"
				}
			}`,
		},
		{
			name: "Handle list comprehension",
			input: `{
				"test_case_1": {
					"input": "''.join([chr(i) codesorted(32, 127)]) * 100"
				}
			}`,
			expected: `{
				"test_case_1": {
					"input": "''.join([chr(i) codesorted(32, 127)]) * 100", "python": true
				}
			}`,
		},
		{
			name: "Handle complex Python expression",
			input: `{
				"test_case_1": {
					"input": "''.join([chr(i % 26 + ord('a')) codesorted(100000)])"
				}
			}`,
			expected: `{
				"test_case_1": {
					"input": "''.join([chr(i % 26 + ord('a')) codesorted(100000)])", "python": true
				}
			}`,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result := fixPythonExpressions(tc.input)

			// Normalize whitespace for comparison
			normalizedResult := normalizeWhitespace(result)
			normalizedExpected := normalizeWhitespace(tc.expected)

			if normalizedResult != normalizedExpected {
				t.Errorf("Expected: %s\nGot: %s", normalizedExpected, normalizedResult)
			}

			// Verify the result is valid JSON
			var resultJSON map[string]interface{}
			if err := json.Unmarshal([]byte(result), &resultJSON); err != nil {
				t.Errorf("Result is not valid JSON: %v", err)
			}
		})
	}
}

// normalizeWhitespace removes all whitespace for easier comparison
func normalizeWhitespace(s string) string {
	s = strings.ReplaceAll(s, " ", "")
	s = strings.ReplaceAll(s, "\n", "")
	s = strings.ReplaceAll(s, "\t", "")
	return s
}

func TestCleanJSONString(t *testing.T) {
	testCases := []struct {
		name  string
		input string
		check func(t *testing.T, result string)
	}{
		{
			name:  "Handle asterisks",
			input: `{"key": "value", "comment": "*** important ***"}`,
			check: func(t *testing.T, result string) {
				if strings.Contains(result, "*") {
					t.Errorf("Result should not contain asterisks: %s", result)
				}
			},
		},
		{
			name:  "Handle trailing commas in objects",
			input: `{"key1": "value1", "key2": "value2",}`,
			check: func(t *testing.T, result string) {
				// Try to parse the result as JSON
				var obj map[string]interface{}
				if err := json.Unmarshal([]byte(result), &obj); err != nil {
					t.Errorf("Result should be valid JSON: %v", err)
				}
			},
		},
		{
			name:  "Handle trailing commas in arrays",
			input: `{"array": [1, 2, 3,]}`,
			check: func(t *testing.T, result string) {
				// Try to parse the result as JSON
				var obj map[string]interface{}
				if err := json.Unmarshal([]byte(result), &obj); err != nil {
					t.Errorf("Result should be valid JSON: %v", err)
				}
			},
		},
		{
			name:  "Handle Python booleans",
			input: `{"key": "value", "python": True}`,
			check: func(t *testing.T, result string) {
				if strings.Contains(result, "True") {
					t.Errorf("Result should not contain Python boolean 'True': %s", result)
				}
				if !strings.Contains(result, "true") {
					t.Errorf("Result should contain JSON boolean 'true': %s", result)
				}
			},
		},
		{
			name:  "Handle non-printable characters",
			input: "{\n\t\"key\": \"value\",\n\t\"bad\": \"\u0000\"\n}",
			check: func(t *testing.T, result string) {
				// Try to parse the result as JSON
				var obj map[string]interface{}
				if err := json.Unmarshal([]byte(result), &obj); err != nil {
					t.Errorf("Result should be valid JSON: %v", err)
				}
			},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result := cleanJSONString(tc.input)
			tc.check(t, result)
		})
	}
}

func TestGenerateTestCases_MockResponse(t *testing.T) {
	// Skip if no AI client is available
	if client == nil {
		t.Skip("Skipping test: AI client not initialized")
	}

	// Test with a simple problem statement
	ctx := context.Background()
	problemStatement := "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target."

	testCases, err := GenerateTestCases(ctx, problemStatement)

	if err != nil {
		t.Fatalf("GenerateTestCases failed: %v", err)
	}

	if testCases == nil {
		t.Fatal("Expected non-nil test cases")
	}

	// Check that we have some test cases
	if len(testCases) == 0 {
		t.Fatal("Expected at least one test case")
	}

	t.Logf("Successfully generated %d test cases", len(testCases))
}
