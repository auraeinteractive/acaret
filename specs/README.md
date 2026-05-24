# Acaret — Kin Code Editor

Acaret is **Kin's code editor** — a full-featured source code editor running as a Kin repository app. It uses ACE Editor for code editing, integrated AI chat via Kin's messaging service, and Kin-native file dialogs, menus, and file I/O.

## Docs

- [Architecture](architecture.md)
- [WBS: Kin Code Editor](wbs/01-kin-code-editor.md)

## Key Principles

- **Kin-native**: Uses Kin file dialogs, menus, UI theme, Dormant Drive file I/O, and messaging service
- **Pure web app**: No C backend — runs entirely in Kin's WebKit iframe system
- **Custom HTML layout**: Keeps its own UI (not Kin UI declarative widgets), but integrates Kin APIs
- **AI via Kin messaging**: Chat uses Kin's messaging service infrastructure
