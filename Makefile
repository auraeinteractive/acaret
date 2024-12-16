# Compiler and flags
CC = gcc
CFLAGS = -Wall -g `pkg-config --cflags webkit2gtk-4.1`
LDFLAGS = `pkg-config --libs webkit2gtk-4.1`

# Source and object directories
SRC_DIR = src
OBJ_DIR = obj

# Source files
SRC_FILES := $(wildcard $(SRC_DIR)/*.c) $(wildcard $(SRC_DIR)/oop/*.c) $(wildcard $(SRC_DIR)/gui/*.c)
OBJ_FILES := $(SRC_FILES:$(SRC_DIR)/%.c=$(OBJ_DIR)/%.o)

# Output executable
OUTPUT = aide

# Default target
all: $(OUTPUT)

# Link object files to create the executable
$(OUTPUT): $(OBJ_FILES)
	$(CC) $(OBJ_FILES) -o $(OUTPUT) $(LDFLAGS)

# Compile source files into object files
$(OBJ_DIR)/%.o: $(SRC_DIR)/%.c
	@mkdir -p $(dir $@)  # Ensure the obj directory exists
	$(CC) $(CFLAGS) -c $< -o $@

# Clean up object files and executable
clean:
	@rm -rf $(OBJ_DIR) $(OUTPUT)

# Optionally, add a distclean rule to remove all files except the source
distclean: clean
	@rm -f Makefile
