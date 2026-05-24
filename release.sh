#!/bin/bash
set -e

VERSION=${VERSION:-1.0.0}
KIN_PATH=${KIN_PATH:-~/Projects/Aurae/kin}

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Building Acaret for Kin..."
echo "Kin path: $KIN_PATH"

# Verify Kin path exists
if [ ! -d "$KIN_PATH" ]; then
    echo "Error: Kin path not found at $KIN_PATH"
    exit 1
fi

# Create app directory in Kin source
APP_DIR="$KIN_PATH/repository/Applications/Development/acaret"
mkdir -p "$APP_DIR"

# Copy app files from kin/ directory
echo "Copying app files to $APP_DIR..."
cp -r "$SCRIPT_DIR/kin/"* "$APP_DIR/"

# Update catalog.json
CATALOG="$KIN_PATH/repository/catalog.json"
if [ -f "$CATALOG" ]; then
    python3 << EOF
import json

with open("$CATALOG", "r") as f:
    catalog = json.load(f)

# Remove existing acaret entry if present
catalog["packages"] = [p for p in catalog.get("packages", []) if p.get("id") != "acaret"]

# Add acaret to catalog
catalog["packages"].append({
    "id": "acaret",
    "displayName": "Acaret",
    "version": "$VERSION",
    "entry": "index.html",
    "published": True,
    "category": "Development",
    "icon": "app.png"
})

with open("$CATALOG", "w") as f:
    json.dump(catalog, f, indent=2)

print("Updated catalog.json")
EOF
fi

# Build Kin (this syncs repository to build/)
echo "Building Kin (syncing repository)..."
cd "$KIN_PATH"
make

# Build acaret.cmd if source exists
ACARET_CMD_SOURCE="$SCRIPT_DIR/commands/acaret.cmd/main.c"
if [ -f "$ACARET_CMD_SOURCE" ]; then
    CMD_DIR="$KIN_PATH/commands/acaret.cmd"
    mkdir -p "$CMD_DIR"
    cp "$ACARET_CMD_SOURCE" "$CMD_DIR/"
    
    # Build and install acaret command
    echo "Building acaret.cmd..."
    mkdir -p "$CMD_DIR/obj"
    gcc -c "$CMD_DIR/main.c" \
        -I"$KIN_PATH/libraries/kin" \
        -o "$CMD_DIR/obj/main.o" \
        -Wall -g
    gcc "$CMD_DIR/obj/main.o" \
        -L"$KIN_PATH/build/libraries" \
        -l:kin.library \
        -Wl,-rpath='$ORIGIN/../libraries' \
        -ldl -lrt -lpthread \
        -o "$CMD_DIR/acaret"
    
    # Copy to build/commands/
    cp "$CMD_DIR/acaret" "$KIN_PATH/build/commands/acaret"
else
    echo "Skipping acaret.cmd build (source not found)"
fi

echo ""
echo "Done! Acaret installed to Kin."
echo "Run: cd $KIN_PATH/build && ./kin"
