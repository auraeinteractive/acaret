#!/bin/bash

# Set the model name 
model="qwen2.5-coder"

# Check if a prompt is provided as a parameter
if [ -z "$1" ]; then
  echo "Usage: $0 <prompt>"
  exit 1
fi

# Set the prompt from the parameter
prompt="$1"

ollama_url="https://localhost:8089"

# Set the options and prepare the body
body="{ \"model\": \"$model\", \"prompt\": \"$prompt\", \"stream\": false, \"options\":{ \"temperature\":0 } }"

# Send a POST request to the Ollama server with the model and prompt
echo "$(curl -s -X POST "$ollama_url/api/generate" -H "Content-Type: application/json" -d "$body")"
response=$(curl -s -X POST "$ollama_url/api/generate" -H "Content-Type: application/json" -d "$body" --insecure)

# Extract the response from the JSON object
response_text=$(echo $response | jq -r '.response')

# Print the response text
echo "$response_text"
