# WBS: Kin Code Editor

## 1. Project setup
- [x] Create `specs/` directory with README, architecture, WBS
- [x] Create `AGENTS.md` referencing specs/
- [x] Create `debian/changelog`
- [x] Create `make-debian.sh`
- [x] Create `build-apps.sh`

## 2. Kin app structure
- [x] Create `kin/main.js` (IIFE entry)
- [x] Update `kin/manifest.json` (id: kin_acaret, entry: main.js)
- [ ] Load Kin UI theme CSS
- [x] Fix CSS asset paths to be relative

## 3. Kin menus
- [x] Register File/Edit/Settings menus via `kinAppRegisterMenus`
- [x] Handle menu commands via `kinMenuCommand`
- [ ] Add keyboard shortcut hints to menu items

## 4. Kin file dialogs
- [x] File Open → `kinOpenFileDialog` (load mode)
- [x] File Save As → `kinOpenFileDialog` (save mode)
- [x] Save with existing path → write directly
- [x] Handle `kinFileDialogResult` response

## 5. Kin file I/O
- [x] Read file via `POST /api/file/read`
- [x] Write file via `POST /api/file/write`
- [x] Directory listing via `POST /api/dir`
- [ ] Large file chunked upload support
- [ ] Dormant Drive protocol as alternative

## 6. AI integration
- [x] Chat UI with streaming
- [ ] Route AI calls through Kin messaging service (replaces direct Ollama)
- [ ] Use Kin `[Agents]` config for model settings

## 7. C backend removal
- [ ] Remove `src/` directory
- [ ] Remove C-specific build from Makefile
- [ ] Simplify release process

## 8. Deb packaging
- [ ] `make-debian.sh` builds `kin-acaret_<version>_<arch>.deb`
- [ ] postinst installs app to Kin runtime repo
- [ ] postinst builds `acaret.cmd`
