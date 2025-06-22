package ai

import (
	"backend/internal/types"
	"encoding/json"
	"fmt"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/lambda"
)

// LambdaExecutionRequest is the structure sent to the Lambda function
type LambdaExecutionRequest struct {
	Language     string `json:"language"`
	Code         string `json:"code"`
	Input        string `json:"input"`
	TimeLimitMs  int    `json:"time_limit_ms"`
	FunctionName string `json:"function_name,omitempty"`
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
		Language:     execReq.Language,
		Code:         execReq.Code,
		Input:        execReq.Input,
		TimeLimitMs:  execReq.TimeLimitMs,
		FunctionName: execReq.FunctionName,
	}

	// Convert the request to JSON
	payload, err := json.Marshal(lambdaReq)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal Lambda request: %w", err)
	}

	// Set up the Lambda invocation input
	req := &lambda.InvokeInput{
		FunctionName: aws.String("python-code-executor"), // Name of your Lambda function
		Payload:      payload,
	}

	// Invoke the Lambda function
	resp, err := svc.Invoke(req)
	if err != nil {
		return nil, fmt.Errorf("failed to invoke Lambda function: %w", err)
	}

	// Check if Lambda execution had an error
	if resp.FunctionError != nil {
		return nil, fmt.Errorf("Lambda function error: %s", *resp.FunctionError)
	}

	// Parse the Lambda response
	var lambdaResp LambdaExecutionResponse
	if err := json.Unmarshal(resp.Payload, &lambdaResp); err != nil {
		return nil, fmt.Errorf("failed to unmarshal Lambda response: %w", err)
	}

	// Convert to ExecutionResult
	result := &types.ExecutionResult{
		Output:          lambdaResp.Output,
		ExecutionTimeMs: lambdaResp.ExecutionTimeMs,
		MemoryUsedKB:    lambdaResp.MemoryUsedKB,
		Status:          lambdaResp.Status,
	}

	return result, nil
}
