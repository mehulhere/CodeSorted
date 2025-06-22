#!/bin/bash

# Set variables
LAMBDA_FUNCTION_NAME="python-code-executor"
REGION="ap-south-1"  # Change to your region

echo "Deploying Python code executor Lambda function..."

# Create deployment package
echo "Creating deployment package..."
cd "$(dirname "$0")"
zip -r python_executor.zip python_executor_lambda.py
if [ $? -ne 0 ]; then
    echo "Failed to create deployment package"
    exit 1
fi

# Check if function exists
aws lambda get-function --function-name $LAMBDA_FUNCTION_NAME --region $REGION &> /dev/null
if [ $? -eq 0 ]; then
    # Update existing function
    echo "Updating existing Lambda function..."
    aws lambda update-function-code \
        --function-name $LAMBDA_FUNCTION_NAME \
        --zip-file fileb://python_executor.zip \
        --region $REGION
    
    # Update function configuration
    echo "Updating Lambda function configuration..."
    aws lambda update-function-configuration \
        --function-name $LAMBDA_FUNCTION_NAME \
        --timeout 10 \
        --memory-size 256 \
        --region $REGION
else
    # Create new function
    echo "Creating new Lambda function..."
    aws lambda create-function \
        --function-name $LAMBDA_FUNCTION_NAME \
        --runtime python3.9 \
        --handler python_executor_lambda.lambda_handler \
        --zip-file fileb://python_executor.zip \
        --role "arn:aws:iam::YOUR_ACCOUNT_ID:role/lambda-execution-role" \
        --timeout 10 \
        --memory-size 256 \
        --region $REGION
    
    echo "NOTE: You need to replace 'YOUR_ACCOUNT_ID' with your actual AWS account ID"
    echo "and make sure the lambda-execution-role exists or create it first."
fi

echo "Deployment completed!" 