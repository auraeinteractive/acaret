# Compiler and flags
CC = gcc
CFLAGS = -Wall -g `pkg-config --cflags webkit2gtk-4.1`
LDFLAGS = `pkg-config --libs webkit2gtk-4.1` -lssl -lcrypto

# Source and object directories
SRC_DIR = src
OBJ_DIR = obj
CONFIG_DIR = config

# Source files
SRC_FILES := $(wildcard $(SRC_DIR)/*.c) $(wildcard $(SRC_DIR)/oop/*.c) $(wildcard $(SRC_DIR)/gui/*.c) $(wildcard $(SRC_DIR)/proxy/*.c) $(wildcard $(SRC_DIR)/system/*.c)
OBJ_FILES := $(SRC_FILES:$(SRC_DIR)/%.c=$(OBJ_DIR)/%.o)

# Output executable
OUTPUT = acaret

# Assets directory (excluding libs)
ASSETS_DIR = assets
ACE_DIR = $(ASSETS_DIR)/libs/ace
ACE_REPO = https://github.com/ajaxorg/ace-builds.git
ACE_BRANCH = master

# Temporary directory for tracking
TMP_DIR = tmp
ACE_CHECKSUM_FILE = $(TMP_DIR)/ace_checksum

# Certificate and key files
CERT_FILE = $(CONFIG_DIR)/cert.pem
KEY_FILE = $(CONFIG_DIR)/key.pem

# Default target
all: $(OUTPUT) certs ace

# Link object files to create the executable
$(OUTPUT): $(OBJ_FILES)
	$(CC) $(OBJ_FILES) -o $(OUTPUT) $(LDFLAGS)

# Compile source files into object files
$(OBJ_DIR)/%.o: $(SRC_DIR)/%.c
	@mkdir -p $(dir $@)  # Ensure the obj directory exists
	$(CC) $(CFLAGS) -c $< -o $@

# Generate self-signed certificates
certs: $(CERT_FILE) $(KEY_FILE)

$(CERT_FILE) $(KEY_FILE):
	@mkdir -p $(CONFIG_DIR)
	@echo "Generating self-signed SSL certificate and key in $(CONFIG_DIR)..."
	@openssl req -x509 -newkey rsa:2048 -keyout $(KEY_FILE) -out $(CERT_FILE) -days 365 -nodes -subj "/CN=localhost"
	@echo "Certificates generated: $(CERT_FILE), $(KEY_FILE)"

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

# Clean up object files, executable, Ace editor, and certificates
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

# Clean certificates
clean-certs:
	@rm -rf $(CONFIG_DIR)
	@echo "Certificates cleaned."

# Optionally, add a distclean rule to remove all files except the source
distclean: clean clean-certs
	@rm -f Makefile

.PHONY: all clean clean-certs distclean ace certs

