# Input Parser System

## Overview

The input parser system automatically handles common input formats for coding challenges, allowing users to focus on solving the actual problem rather than writing boilerplate parsing code.

## Features

- Automatic parsing of various input formats:
  - Variable assignments (e.g., `nums = [1,2,3], target = 9`)
  - Arrays, matrices, and other data structures
  - Simple values (integers, strings)
- Supports multiple programming languages:
  - Python
  - JavaScript
  - C++
  - Java
- Automatically calls the user's solution function with the correct arguments
- Formats and outputs the results

## How It Works

1. When a user submits their code with the parser enabled, the system:
   - Injects the appropriate parser code for the selected language
   - Handles the input parsing
   - Calls the user's solution function
   - Formats and displays the output

2. This allows users to focus solely on implementing the solution function without worrying about the I/O handling.

## Example

### With Parser (User code)

```python
def twoSum(nums, target):
    num_map = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in num_map:
            return [num_map[complement], i]
        num_map[num] = i
    return []
```

### Without Parser (User code)

```python
def twoSum(nums, target):
    num_map = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in num_map:
            return [num_map[complement], i]
        num_map[num] = i
    return []

# Parse input in the expected format
# Input format: nums = [2,7,11,15], target = 9
input_str = input().strip()
parts = input_str.split(", target = ")
nums_str = parts[0].replace("nums = ", "")
nums = eval(nums_str)
target = int(parts[1])

# Call the solution function and print the result
result = twoSum(nums, target)
print(result)
```

## Implementation Details

The parser templates are defined in `inputParser.ts` and are injected based on the language selected by the user. The actual injection is handled by the backend during code execution and submission. 