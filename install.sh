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

# Copy the required files and directories
cp -r ./docs "$DEST_DIR/"
cp -r ./assets "$DEST_DIR/"
cp -r ./config "$DEST_DIR/"
cp *.png "$DEST_DIR/"
cp -r ./acaret "$DEST_DIR/"

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

echo "Good luck with your installation!"
