#!/bin/bash
# Release Acaret Kin app
set -e

VERSION=${VERSION:-1.0.0}
KIN_PATH=${KIN_PATH:-~/Projects/Aurae/kin}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Building Acaret for Kin..."
echo "Kin path: $KIN_PATH"

if [ ! -d "$KIN_PATH" ]; then
    echo "Error: Kin path not found at $KIN_PATH"
    exit 1
fi

# Create app directory in Kin source
APP_DIR="$KIN_PATH/repository/Applications/Development/kin_acaret"
mkdir -p "$APP_DIR"

# Copy app files from kin/ directory
echo "Copying app files to $APP_DIR..."
cp -r "$SCRIPT_DIR/kin/"* "$APP_DIR/"

# Build acaret.cmd if source exists
CMD_DIR="$KIN_PATH/commands/acaret.cmd"
if [ -d "$SCRIPT_DIR/commands/acaret.cmd" ]; then
    mkdir -p "$CMD_DIR"
    cp -r "$SCRIPT_DIR/commands/acaret.cmd/"* "$CMD_DIR/"
    echo "Building acaret.cmd..."
    make -C "$CMD_DIR" || echo "acaret.cmd build skipped"
fi

# Build Kin (syncs repository to build/)
echo "Building Kin..."
cd "$KIN_PATH"
make

echo ""
echo "Done! Acaret installed to Kin."
echo "Run: cd $KIN_PATH/build && ./kin"
