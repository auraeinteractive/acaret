#!/bin/bash

# Define the install.ini file path
INSTALL_INI="install.ini"

# Function to create or read the install path from install.ini
get_install_path() {
    if [ -f "$INSTALL_INI" ]; then
        # Read the existing install path from install.ini
        INSTALL_PATH=$(grep "install_path=" "$INSTALL_INI" | cut -d'=' -f2)
    else
        # Ask for the install path if it doesn't exist in install.ini
        read -p "Enter the installation path: " INSTALL_PATH
        echo "install_path=$INSTALL_PATH" > "$INSTALL_INI"
    fi

    # Check if the install path exists and is writable
    if [ ! -d "$INSTALL_PATH" ]; then
        mkdir -p "$INSTALL_PATH"
        if [ $? -ne 0 ]; then
            echo "Error: Could not create directory $INSTALL_PATH"
            exit 1
        fi
    fi

    # Ensure the install path is writable
    if [ ! -w "$INSTALL_PATH" ]; then
        echo "Error: No write permissions for directory $INSTALL_PATH"
        exit 1
    fi
}

# Get the install path
get_install_path

# Define the source and destination paths
SOURCE_DIR=$(pwd)
DEST_DIR="$INSTALL_PATH"

# Check if rsync is installed
if ! command -v rsync &> /dev/null; then
    echo "Error: rsync could not be found. Please install it first."
    exit 1
fi

# Check if pv is installed
if ! command -v pv &> /dev/null; then
    echo "Warning: pv (Pipe Viewer) is not installed. No progress bar will be shown."
fi

# Function to copy files and directories using rsync with verbose output
copy_files() {
    local src="$1"
    local dest="$2"

    # Get the total size of files to copy
    TOTAL_SIZE=$(du -sb "$src" | awk '{print $1}')

    if [ -z "$TOTAL_SIZE" ]; then
        echo "Error: Could not determine the total size of files to copy."
        return 1
    fi

    # Use rsync with pv for progress bar
    rsync --progress --info=progress2 "$src/" "$dest/"
}

# Function to log copied files and update their modification dates
log_and_update_files() {
    local src="$1"
    local dest="$2"

    echo "Copying files from $src to $dest:"
    find "$src" -type f | while read file; do
        relative_path="${file#$SOURCE_DIR/}"
        dest_file="$DEST_DIR/$relative_path"
        
        # Copy the file and update its modification date
        cp --preserve=all "$file" "$dest_file"
        echo "Copied $file to $dest_file"
    done
}

# Log and copy the required files and directories using rsync
log_and_update_files "./docs" "$DEST_DIR"
log_and_update_files "./assets" "$DEST_DIR"
log_and_update_files "./config" "$DEST_DIR"
cp -v *.png "$DEST_DIR/"
log_and_update_files "./acaret" "$DEST_DIR"

# Check for context menu feature and copy it if present
if [ -d "context_menu" ]; then
    log_and_update_files "./context_menu" "$DEST_DIR"
else
    echo "Warning: Context menu feature not found. Skipping installation."
fi

# Summary of what is done
echo "Installation summary:"
echo "Source directory: $SOURCE_DIR"
echo "Destination directory: $DEST_DIR"
echo "Copied files and directories:"
echo "- docs"
echo "- assets"
echo "- config"
echo "*.png"
echo "- acaret"

if [ -d "context_menu" ]; then
    echo "- context_menu"
fi

echo "Good luck with your installation!"