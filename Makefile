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

# Assets directory (excluding libs)
ASSETS_DIR = assets
ACE_DIR = $(ASSETS_DIR)/libs/ace
ACE_REPO = https://github.com/ajaxorg/ace-builds.git
ACE_BRANCH = master

# Temporary directory for tracking
TMP_DIR = tmp
ACE_CHECKSUM_FILE = $(TMP_DIR)/ace_checksum

# Default target
all: $(OUTPUT) ace

# Link object files to create the executable
$(OUTPUT): $(OBJ_FILES)
	$(CC) $(OBJ_FILES) -o $(OUTPUT) $(LDFLAGS)

# Compile source files into object files
$(OBJ_DIR)/%.o: $(SRC_DIR)/%.c
	@mkdir -p $(dir $@)  # Ensure the obj directory exists
	$(CC) $(CFLAGS) -c $< -o $@

# Clone Ace editor repository only if needed
ace: $(ACE_CHECKSUM_FILE)

$(ACE_CHECKSUM_FILE):
	@mkdir -p $(TMP_DIR)
	@if [ ! -d "$(ACE_DIR)" ]; then \
		echo "Cloning Ace editor repository..."; \
		git clone --depth 1 --branch $(ACE_BRANCH) $(ACE_REPO) $(ACE_DIR); \
		echo "Cloning completed."; \
		echo "Copying src-min-noconflict to $(ACE_DIR)"; \
		cp -r $(ACE_DIR)/src-min-noconflict/* $(ACE_DIR)/; \
		rm -rf $(ACE_DIR)/src-min-noconflict; \
		du -sb $(ACE_DIR) | cut -f1 > $(ACE_CHECKSUM_FILE); \
		echo "Ace editor installed into $(ACE_DIR)."; \
	else \
		CURRENT_SIZE=$$(du -sb $(ACE_DIR) | cut -f1); \
		SAVED_SIZE=$$(cat $(ACE_CHECKSUM_FILE) 2>/dev/null || echo 0); \
		if [ "$$CURRENT_SIZE" != "$$SAVED_SIZE" ]; then \
			echo "Ace directory exists but size mismatch. Reinstalling..."; \
			rm -rf $(ACE_DIR); \
			$(MAKE) ace; \
		else \
			echo "Ace editor is already up-to-date."; \
		fi \
	fi

# Clean up object files, executable, and Ace editor
# Clean up object files, executable, and Ace editor
clean:
	@rm -rf $(OBJ_DIR) $(OUTPUT)
	@if [ -d "$(ACE_DIR)" ]; then \
		rm -rf $(ACE_DIR); \
	else \
		echo "No Ace directory to clean."; \
	fi
	@if [ -f "$(ACE_CHECKSUM_FILE)" ]; then \
		rm -f $(ACE_CHECKSUM_FILE); \
	else \
		echo "No checksum file to clean."; \
	fi

# Optionally, add a distclean rule to remove all files except the source
distclean: clean
	@rm -f Makefile

.PHONY: all clean distclean ace

