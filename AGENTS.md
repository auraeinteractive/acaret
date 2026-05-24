# Acaret — Kin Code Editor

## Project Overview

Acaret is **Kin's code editor** — a pure JavaScript Kin repository app running in Kin's WebKit iframe system. It uses ACE Editor for code editing, Kin APIs for file I/O, menus, and dialogs, and Kin's messaging service for AI chat.

## Technology Stack

- **Runtime**: Kin workspace WebKit iframe (no C backend)
- **Editor**: ACE Editor (ajaxorg/ace-builds)
- **Frontend**: Plain JavaScript with custom HTML/CSS layout
- **Kin APIs**: `kin.classes.Window`, postMessage bridges, Kin HTTP APIs
- **AI**: Kin messaging service (via `ai.library`)

## Architecture

```
kin_acaret/
  manifest.json    # App descriptor (id: kin_acaret, entry: main.js)
  main.js           # IIFE entry → kin.classes.Window
  index.html        # HTML UI template
  js/
    signals.js      # Kin bridge (menus, file dialogs, file I/O)
    conversation.js  # AI chat client
    page-editor.js   # ACE Editor integration
    page-folders.js  # Kin file browser
    page-*.js        # Other panels
  styles/
    main.css        # App styling
    feather/        # Icon SVGs
  libs/ace/         # ACE editor
```

## Specs

See [specs/README.md](specs/README.md) for architecture and WBS documentation.

## Key Files

| File | Purpose |
|------|---------|
| `kin/main.js` | IIFE entry — creates `kin.classes.Window` |
| `kin/js/signals.js` | Kin API bridge: menus, file dialogs, Dormant Drive I/O |
| `kin/js/page-editor.js` | ACE Editor management (tabs, file ops) |
| `kin/manifest.json` | App registration |

## Kin Integration Points

### Menus
Registered via `postMessage({ kinAppRegisterMenus: true, instanceId, menus })` in `signals.js:registerKinMenus()`. Commands dispatched via `kinMenuCommand`.

### File Dialogs
Opened via `postMessage({ kinOpenFileDialog: true, mode: 'load'|'save', ... })`. Responses handled via `kinFileDialogResult`.

### File I/O
Uses Kin HTTP APIs: `POST /api/file/read`, `POST /api/file/write`, `POST /api/dir`.

### AI Chat
Currently uses direct Ollama HTTP calls (`conversation.js:sendMessageNow`). Target: route through Kin messaging service via `kin.api.sendPeerMessage()`.

## Building

```bash
./build-apps.sh              # Install to Kin build
make                         # Build acaret.cmd
./make-debian.sh             # Build .deb package
```

## Conventions

1. All Kin interactions go through `signals.js` (the bridge module)
2. Keep the custom HTML/CSS layout — don't convert to Kin UI declarative widgets
3. New features should use Kin APIs (not C backend or direct HTTP to external services)
4. AI features should eventually use Kin messaging service
