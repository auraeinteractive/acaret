# Agent Development Guide for Acaret

## Project Overview

Acaret is an AI development environment - a GTK/WebKit desktop application built in C with JavaScript frontend.

## Technology Stack

- **Backend**: C with custom OOP framework (`src/oop/`)
- **Frontend**: JavaScript with ACE Editor
- **GUI**: GTK 4.1 + WebKitGTK
- **Build**: Makefile with gcc

## Building

```bash
make        # Full build (executable, certs, ace editor)
make clean  # Clean build artifacts
```

## Key Directories

- `src/` - C source code
  - `gui/` - GTK/WebKit GUI components
  - `oop/` - Custom OOP object system
  - `proxy/` - Local proxy server
  - `system/` - Session and system utilities
- `assets/` - JS, CSS, and frontend assets
- `config/` - SSL certificates (auto-generated)
- `docs/` - Documentation

## OOP System (src/oop/)

The codebase uses a custom `mlObject` OOP system:

```c
typedef struct mlObject {
    struct mlObject *parent;           // Parent class for inheritance
    mlMethodEntry *method_table;       // Method table
    int method_count;                  
    mlAttributeEntry *attributes;      // Attribute table
    int attribute_count;               
    mlEvent *events;                   // Event handlers
    int event_count;                   
} mlObject;
```

Key functions:
- `mlDoMethod(obj, "methodName", data)` - Call a method
- `mlDoSuperMethod(obj, "methodName", data)` - Call parent method
- `mlAddEvent(obj, "eventName", callback)` - Register event handler
- `mlSetAttribute(obj, "key", value)` - Set attribute
- `myGetAttribute(obj, "key")` - Get attribute

## Creating New Objects

Example from `src/gui/view.c`:

```c
mlObject *mlViewCreate(mlObject *parent) {
    mlView *view = mlObjectCreateWithSize(sizeof(mlObject), sizeof(mlView), parent);
    // Initialize GTK window, WebView, etc.
    // Add methods to method table
    return (mlObject *)view;
}
```

## Code Conventions

- C code uses custom `mlObject` OOP system with `mlDoMethod()` for method calls
- GTK signals via `mlAddEvent()`
- Proxy server handles HTTP/HTTPS traffic with mutex-protected network operations
- JavaScript frontend communicates via signals to C backend

## Building

```bash
make        # Full build (executable, certs, ace editor)
make clean  # Clean build artifacts
make release  # Create release zip for Kin repository
```

## Release

```bash
make release  # Creates releases/acaret_{version}.zip
```

The release contains:
- `acaret/` executable, assets, config (standalone desktop app)
- `acaret/repository/Applications/Development/acaret/` (Kin app)
- `acaret/commands/acaret.cmd/` (System command)

Extract the zip into the Kin repository:
```bash
# Extract app
unzip releases/acaret_*.zip 'acaret/repository/*' -d ~/kin/

# Extract command (build it in Kin context)
cp -r acaret/commands/acaret.cmd ~/kin/commands/
cd ~/kin/commands/acaret.cmd && make
```

## Testing

Run `make && ./acaret` or use test scripts in project root.

## Conventions for Changes

1. C changes: Follow existing signal/callback patterns
2. GUI changes: Use WebKit HTML/JS approach
3. Build system changes: Update Makefile
4. Test after changes to verify proxy and GUI still work
