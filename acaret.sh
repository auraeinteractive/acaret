#!/bin/bash

# Get the absolute path of the script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Change to the script's directory
cd "$SCRIPT_DIR"

# Run ./acaret
./acaret
