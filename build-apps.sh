#!/bin/bash
# Install Acaret Kin app to Kin build directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="$SCRIPT_DIR/kin"
BUILD_DIR="$SCRIPT_DIR/build/repository/Applications/Development"
CONFIG_FILE="$SCRIPT_DIR/.config.ini"

KIN_BUILD_PATH=""

load_config() {
    if [ -f "$CONFIG_FILE" ]; then
        KIN_BUILD_PATH=$(grep "^KIN_BUILD_PATH=" "$CONFIG_FILE" 2>/dev/null | head -1 | cut -d'=' -f2-)
    fi
}

save_config() {
    if [ -n "$KIN_BUILD_PATH" ]; then
        echo "KIN_BUILD_PATH=$KIN_BUILD_PATH" > "$CONFIG_FILE"
        echo "Saved Kin build path to config: $KIN_BUILD_PATH"
    fi
}

prompt_kin_path() {
    echo ""
    echo "Enter the path to your Kin build directory (e.g. /home/user/Projects/kin/build):"
    echo -n "> "
    read -r KIN_BUILD_PATH
    KIN_BUILD_PATH=$(echo "$KIN_BUILD_PATH" | sed 's:/*$::')
    if [ -z "$KIN_BUILD_PATH" ]; then
        echo "No path provided. Skipping install."
        return 1
    fi
    if [ ! -d "$KIN_BUILD_PATH" ]; then
        echo "Error: Directory does not exist: $KIN_BUILD_PATH"
        return 1
    fi
    return 0
}

install_to_kin() {
    if [ -z "$KIN_BUILD_PATH" ]; then return; fi

    KIN_REPO_DIR="$KIN_BUILD_PATH/repository/Applications"
    if [ ! -d "$KIN_REPO_DIR" ]; then
        KIN_REPO_DIR="$KIN_BUILD_PATH/applications"
    fi
    if [ ! -d "$KIN_REPO_DIR" ]; then
        echo "Error: Kin repository directory not found"
        return
    fi

    echo "Installing Acaret to Kin build..."
    mkdir -p "$KIN_REPO_DIR/Development"
    rsync -av --delete "$SOURCE_DIR/" "$KIN_REPO_DIR/Development/kin_acaret/"
    echo "Acaret installed to Kin build."
}

load_config

echo ""
echo "=== Acaret Build Script ==="
echo ""

if [ -z "$KIN_BUILD_PATH" ]; then
    if prompt_kin_path; then
        save_config
    fi
else
    echo "Using Kin build path from config: $KIN_BUILD_PATH"
fi

echo ""
echo "=== Building local copy ==="
mkdir -p "$BUILD_DIR"
if [ -d "$SOURCE_DIR" ]; then
    rsync -av --delete "$SOURCE_DIR/" "$BUILD_DIR/kin_acaret/"
    echo "Done. Apps built to $BUILD_DIR"
else
    echo "Error: No kin/ directory found at $SOURCE_DIR"
    exit 1
fi

echo ""
echo "=== Installing to Kin build ==="
if [ -n "$KIN_BUILD_PATH" ]; then
    install_to_kin
fi

echo ""
echo "=== Build complete ==="
