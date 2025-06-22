package ai

import (
	"backend/internal/types"
	"encoding/json"
	"fmt"
	"log"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/lambda"
)

// LambdaExecutionRequest is the structure sent to the Lambda function
type LambdaExecutionRequest struct {
	Code        string `json:"code"`
	Input       string `json:"input"`
	TimeLimitMs int    `json:"time_limit_ms"`
}

// LambdaExecutionResponse is the structure received from the Lambda function
type LambdaExecutionResponse struct {
	Output          string `json:"output"`
	ExecutionTimeMs int    `json:"execution_time_ms"`
	MemoryUsedKB    int    `json:"memory_used_kb"`
	Status          string `json:"status"`
}

// ExecuteCodeWithLambda runs Python code using AWS Lambda
func ExecuteCodeWithLambda(execReq types.ExecutionRequest) (*types.ExecutionResult, error) {
	// Create a new session in the specified region
	sess, err := session.NewSession(&aws.Config{
		Region: aws.String("ap-south-1"), // Use the region where your Lambda is deployed
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create AWS session: %w", err)
	}

	// Create a new Lambda service client
	svc := lambda.New(sess)

	// Prepare the request payload for Lambda
	lambdaReq := LambdaExecutionRequest{
		Code:        execReq.Code,
		Input:       execReq.Input,
		TimeLimitMs: execReq.TimeLimitMs,
	}

	// Convert the request to JSON
	payload, err := json.Marshal(lambdaReq)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal Lambda request: %w", err)
	}

	log.Printf("Invoking Lambda with payload: %s", string(payload))

	// Set up the Lambda invocation input
	req := &lambda.InvokeInput{
		FunctionName:   aws.String("python-code-executor-zip"), // Use the new ZIP-based Lambda function
		Payload:        payload,
		InvocationType: aws.String("RequestResponse"), // Synchronous invocation
	}

	// Invoke the Lambda function
	resp, err := svc.Invoke(req)
	if err != nil {
		return nil, fmt.Errorf("failed to invoke Lambda function: %w", err)
	}

	log.Printf("Lambda response status code: %d", resp.StatusCode)

	// Check if Lambda execution had an error
	if resp.FunctionError != nil {
		log.Printf("Lambda function error: %s", *resp.FunctionError)

		// Try to parse the error payload for more details
		var errorResp struct {
			ErrorMessage string   `json:"errorMessage"`
			ErrorType    string   `json:"errorType"`
			StackTrace   []string `json:"stackTrace,omitempty"`
		}

		if err := json.Unmarshal(resp.Payload, &errorResp); err == nil && errorResp.ErrorMessage != "" {
			log.Printf("Lambda error details: %s (%s)", errorResp.ErrorMessage, errorResp.ErrorType)
			return nil, fmt.Errorf("Lambda function error (%s): %s", *resp.FunctionError, errorResp.ErrorMessage)
		}

		// Fallback to generic error
		return nil, fmt.Errorf("Lambda function error: %s", *resp.FunctionError)
	}

	// Log the raw response payload for debugging
	log.Printf("Lambda raw response: %s", string(resp.Payload))

	// Parse the Lambda response
	var lambdaResp LambdaExecutionResponse
	if err := json.Unmarshal(resp.Payload, &lambdaResp); err != nil {
		return nil, fmt.Errorf("failed to unmarshal Lambda response: %w", err)
	}

	// Map Lambda status to our status
	status := lambdaResp.Status
	if status == "" {
		status = "error"
	}

	// Convert to ExecutionResult
	result := &types.ExecutionResult{
		Output:          lambdaResp.Output,
		ExecutionTimeMs: lambdaResp.ExecutionTimeMs,
		MemoryUsedKB:    lambdaResp.MemoryUsedKB,
		Status:          status,
	}

	return result, nil
}
