import json
import time
import sys
import os
import subprocess
import traceback

def lambda_handler(event, context):
    """
    AWS Lambda handler for executing Python code.
    
    Expected event format:
    {
        "code": "print('Hello, World!')",
        "input": "optional input string",
        "time_limit_ms": 10000
    }
    
    Returns:
    {
        "output": "execution output or error message",
        "execution_time_ms": execution time in milliseconds,
        "memory_used_kb": memory usage in KB,
        "status": "success", "runtime_error", "time_limit_exceeded", or "compilation_error"
    }
    """
    try:
        # Extract parameters from event
        code = event.get('code', '')
        input_data = event.get('input', '')
        time_limit_ms = event.get('time_limit_ms', 10000)  # Default 10 seconds
        
        if not code:
            return {
                "status": "compilation_error",
                "output": "No code provided",
                "execution_time_ms": 0,
                "memory_used_kb": 0
            }
        
        # Set a timeout slightly less than Lambda's timeout
        execution_timeout = min(time_limit_ms / 1000, 8)  # Max 8 seconds
        
        # Create a temporary file for the code
        with open("/tmp/code.py", "w") as f:
            f.write(code)
        
        # Create a temporary file for the input
        with open("/tmp/input.txt", "w") as f:
            f.write(input_data)
        
        # Start timing
        start_time = time.time()
        
        # Execute the code in a subprocess with timeout
        try:
            # Use subprocess to execute the code with input
            process = subprocess.Popen(
                ["python3", "/tmp/code.py"],
                stdin=open("/tmp/input.txt", "r"),
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            # Wait for the process to complete with timeout
            stdout, stderr = process.communicate(timeout=execution_timeout)
            
            # Calculate execution time
            execution_time = int((time.time() - start_time) * 1000)  # Convert to ms
            
            # Get memory usage (approximate)
            try:
                memory_used = int(os.popen('ps -o rss= -p %d' % os.getpid()).read().strip() or '0')
            except:
                memory_used = 0
            
            # Determine status based on return code
            if process.returncode == 0:
                status = "success"
                output = stdout
            else:
                status = "runtime_error"
                output = stderr
                
            return {
                "status": status,
                "output": output,
                "execution_time_ms": execution_time,
                "memory_used_kb": memory_used
            }
            
        except subprocess.TimeoutExpired:
            # Kill the process if it times out
            try:
                process.kill()
                _, _ = process.communicate()
            except:
                pass
                
            return {
                "status": "time_limit_exceeded",
                "output": "Execution timed out after {} seconds".format(execution_timeout),
                "execution_time_ms": time_limit_ms,
                "memory_used_kb": 0
            }
            
    except Exception as e:
        # Catch and format any other exceptions
        error_message = traceback.format_exc()
        print(f"Error executing code: {error_message}")
        
        return {
            "status": "compilation_error",
            "output": str(e),
            "execution_time_ms": 0,
            "memory_used_kb": 0
        }

# For local testing
if __name__ == "__main__":
    test_event = {
        "code": "print('Hello, World!')",
        "input": "",
        "time_limit_ms": 5000
    }
    print(json.dumps(lambda_handler(test_event, None), indent=2)) 