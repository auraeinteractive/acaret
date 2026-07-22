# Acaret — Kin Code Editor

## Project Overview

Acaret is Kin's KinUI-based source and project editor. It runs as a pure JavaScript repository application, uses ACE for source buffers, and uses Kin APIs for workspace dialogs, mounted-volume discovery, file I/O, app launch, and KinDOS execution.

## Technology Stack

- Runtime: Kin workspace WebKit iframe
- UI: declarative KinUI Web Components
- Editor: ACE Editor
- Filesystem: KinDOS mounted volumes and assigns (`Home:`, `Work:`, `System:`, etc.)
- Tools: Klade for visual `.klade` editing and KinDOS QuickJS for scripts

## Architecture

```text
kin/
  manifest.json          App descriptor
  main.js                Classic bootstrap that opens the module window
  app.mjs                KinUI workspace and controllers
  preview.mjs            KinUI document preview window
  ui.json                Declarative KinUI application shell
  js/
    bridge.mjs           Kin file, directory, mountlist, move, Trash, launch, and shell APIs
    kin-paths.mjs        KinDOS volume-path model
    project-model.mjs    Schema-2 project validation and manifest synchronization
    template-catalog.mjs KinUI and QuickJS project generators
  styles/main.css        Layout and ACE/content-host styling only
  libs/ace/              ACE editor distribution
```

## Kin Integration

- KinUI owns application menus and workspace dialog integration.
- `bridge.mjs` is the only module that calls Kin file, directory, command, and shell HTTP APIs.
- Available disks and assigns come from `POST /api/dir` with `Mountlist:`.
- Kin paths always use `Volume:relative/path`; there is no `/` root and no `/Home:` form.
- Rename uses `/api/commands/move` and must remain on one volume.
- `.klade` source is editable in ACE and can explicitly launch Klade.
- QuickJS project entries run through `/api/kindos/shell-line` with `jsexec`.

## Building

```bash
npm test
./build-apps.sh
make
./make-debian.sh
```

## Conventions

1. Use KinUI components for all interactive application chrome.
2. Keep ACE, preview frames, and output as content surfaces hosted by KinUI.
3. Route Kin interactions through `bridge.mjs` or KinUI workspace helpers.
4. Treat mountlist as authoritative; never hard-code a fixed set of KinDOS disks.
5. Use `kin-paths.mjs`; never use POSIX or URL path semantics for Kin paths.
6. Keep generated projects aligned with KinUI, Klade, and QuickJS runtime contracts.
