# Acaret to Kin App - Porting Plan

## Overview

Transform Acaret from a GTK/WebKit desktop application into a pure Kin web application that runs in the Kin browser workspace.

## Current State (Acaret Desktop)

- **Backend**: C with custom OOP framework (`src/oop/`)
- **Frontend**: JavaScript with ACE Editor
- **GUI**: GTK 4.1 + WebKitGTK
- **Proxy**: Local proxy server for AI traffic
- **Build**: Makefile with gcc

## Target State (Acaret Kin App)

- **Backend**: C command (`System:Commands/acaret.cmd`) handling server-side operations
- **Frontend**: Pure JavaScript/HTML running in browser workspace
- **GUI**: Kin UI components or raw HTML/CSS
- **Storage**: Kin filesystem paths (`Home:`, `System:`)
- **IPC**: Kin IPC system for polykernel communication

## GTK/WebKitGTK Bindings to Port

### 1. Menu System (GTK Menu Bar)

**Current GTK Menu** (`src/gui/view.c` lines 238-316):
```
File  → New Project, Open Project, Save Project, Save Project As, Close Project
        ─────
        New, Open, Save, Save As, Close, Close all
        ─────
        Quit

Edit  → Cut, Copy, Paste, ─────, Record Macro, Store Macro, Run Macro

Settings → Edit Settings, Load Settings, Save Settings, ─────, About
```

**Kin Equivalent**:
- Register menus via `postMessage` to parent:
  ```javascript
  window.parent.postMessage({
    kinAppRegisterMenus: true,
    instanceId: window.id,
    menus: [/* menu items like kin._workspaceDefaultMenuItems */]
  }, '*');
  ```
- Handle commands via:
  ```javascript
  window.addEventListener('message', (e) => {
    if (e.data.kinMenuCommand) handleMenuCommand(e.data.command);
  });
  ```
- Commands sent back: `{ kinMenuCommand: true, command: 'file-new', ... }`

### 2. Keyboard Accelerators

**Current** (`src/gui/view.c` lines 464-476, `signals.c`):
```
Ctrl+N  → New File
Ctrl+O  → Open File
Ctrl+Shift+O → Open Project
Ctrl+S  → Save File
Ctrl+Shift+S → Save As
Ctrl+W  → Close File
Ctrl+Shift+W → Close All
Ctrl+Q  → Quit
```

**Kin Equivalent**: Implement in JavaScript:
```javascript
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'n') { e.preventDefault(); handleNewFile(); }
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault();
    e.shiftKey ? handleSaveAs() : handleSave();
  }
  // ...
});
```

### 3. File Dialogs (GTK File Chooser)

**Current** (`src/gui/signals.c` lines 315-351):
```c
GtkFileChooserDialog → Open/Save As dialogs
```

**Kin Equivalent**:
```javascript
window.parent.postMessage({
  kinOpenFileDialog: true,
  requestId: 'unique-id',
  mode: 'load', // or 'save'
  initialPath: 'Home:Projects',
  defaultFilename: 'untitled.txt'
}, '*');

// Listen for response:
window.addEventListener('message', (e) => {
  if (e.data.kinFileDialogResult?.requestId === 'unique-id') {
    if (e.data.cancelled) { /* handle cancel */ }
    else { const path = e.data.path; /* handle file */ }
  }
});
```

### 4. Alert/Confirm Dialogs

**Current** (`src/gui/signals.c` lines 1046-1117):
```c
GtkMessageDialog for alert/confirm via WebKit script-dialog
```

**Kin Equivalent**:
```javascript
// Alert
window.parent.postMessage({
  kinOpenAlert: true,
  requestId: 'alert-1',
  message: 'File saved!',
  title: 'Acaret'
}, '*');

// Confirm
window.parent.postMessage({
  kinOpenConfirm: true,
  requestId: 'confirm-1',
  message: 'Close without saving?',
  title: 'Confirm'
}, '*');
```

### 5. WebView JS↔C Bridge (WebKit Scripts)

**Current** (`src/gui/view.c` lines 393-440, `signals.c`):
```c
webkit_user_content_manager_register_script_message_handler()
webkit_web_view_evaluate_javascript()
```

**Kin Equivalent**:
```javascript
// C→JS: Use postMessage from workspace
window.addEventListener('message', (e) => {
  if (e.data.kinMenuCommand) {
    // Handle menu commands from parent
  }
});

// JS→C: HTTP API calls
const response = await fetch('/api/file/read', {
  method: 'POST',
  credentials: 'include',
  body: JSON.stringify({ path: 'Home:project.acaret' })
});
```

### 6. Custom URI Scheme (ihttp://)

**Current** (`src/gui/signals.c` lines 907-1044):
```c
webkit_web_context_register_uri_scheme(context, "ihttp", ...)
```

**Kin Equivalent**: Use `acaret.cmd` IPC or direct HTTP API:
```javascript
// Instead of ihttp:// proxy, use Kin HTTP service directly
const response = await fetch('/api/acaret/proxy', {
  method: 'POST',
  credentials: 'include',
  body: JSON.stringify({ url, method: 'POST', body })
});
```

### 7. Window Management (Title, Icon, Size)

**Current** (`src/gui/view.c`):
```c
gtk_window_set_title()
gtk_window_set_icon()
gtk_window_set_default_size()
```

**Kin Equivalent**: Workspace window frame is automatic. Configure in manifest:
```json
{
  "id": "acaret",
  "displayName": "Acaret",
  "icon": "app.png"
}
```

## Porting Steps

### Phase 1: Create Kin App Structure

```
repository/Applications/Development/acaret/
├── manifest.json      # App metadata
├── index.html         # Entry point
├── app.js            # Main app with menu registration
├── ui.json           # Optional Kin UI spec
└── assets/
    ├── js/
    │   ├── editor.js     # ACE Editor
    │   ├── file-ops.js   # File dialog wrappers
    │   └── menu.js       # Menu command handlers
    └── css/
        └── app.css
```

### Phase 2: Implement Menu System

1. Register menus on load
2. Handle `kinMenuCommand` messages
3. Map menu items to actions

### Phase 3: Implement Keyboard Shortcuts

1. Add `keydown` listener
2. Map Ctrl+N, Ctrl+S, etc. to functions

### Phase 4: Replace File Operations

1. Replace `open_file_dialog()` with Kin dialog API
2. Replace `webkit_web_view_evaluate_javascript` with direct JS calls
3. Replace file save with `/api/file/write`

### Phase 5: Create acaret.cmd

Handle IPC events for:
- `acaret_list_projects` - List projects in Home:Projects
- `acaret_ai_request` - Proxy AI requests
- `acaret_file_operation` - File read/write

### Phase 6: Remove GTK Dependencies

- Remove `src/gui/` directory
- Keep `src/proxy/` → port to Kin IPC
- Keep `src/system/` → session utilities

## File Mapping

| GTK/WebKit Component | Kin Equivalent |
|---------------------|----------------|
| `GtkMenuBar`, `GtkMenu` | `postMessage` menu registration |
| `gtk_file_chooser_dialog_new` | `kinOpenFileDialog` message |
| `gtk_message_dialog_new` | `kinOpenAlert`, `kinOpenConfirm` |
| `webkit_web_view_evaluate_javascript` | Direct JS function calls |
| `webkit_user_content_manager_register_script_message_handler` | `window.addEventListener('message')` |
| `webkit_web_context_register_uri_scheme` | HTTP API endpoints |
| `gtk_window_set_title/icon/size` | manifest.json + workspace frame |
| `gtk_accel_group` | `keydown` event listeners |
| `g_signal_connect` | `addEventListener` |
| `gtk_box_pack_start` | CSS flexbox/grid |

## Release

```bash
make release  # Creates releases/acaret_{version}.zip
```

The release contains two directories:
- `acaret/repository/Applications/Development/acaret/` - Kin app
- `acaret/commands/acaret.cmd/` - System command

Extract to Kin build directory:
```bash
# Extract app
unzip releases/acaret_*.zip 'acaret/repository/*' -d ~/kin/build/

# Extract command
cp -r acaret/commands/acaret.cmd ~/kin/build/commands/
```

**IMPORTANT**: Only modify files in `build/` directory. Never touch `repository/` in Kin folder.

## Testing

```bash
# Run Kin with development tree
cd ~/kin/build && ./kin

# Open workspace at http://localhost:9119
# Launch Acaret from the app catalog
```

## References

- Kin Web Frontend Patterns: `/home/hogne/Projects/Aurae/kin/specs/WEB_FRONTEND_PATTERNS.md`
- Kin UI Components: `/home/hogne/Projects/Aurae/kin/specs/KIN_UI.md`
- Markpad example: `/home/hogne/Projects/Aurae/kin/build/repository/Applications/Productivity/kin_markpad/`
