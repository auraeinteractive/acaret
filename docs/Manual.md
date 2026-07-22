# Acaret user guide

Acaret is Kin's KinUI source and project editor. It combines ACE multi-file editing with mounted KinDOS disks, project templates, previews, translations, tags, and source navigation.

## Disks, folders, and paths

KinDOS uses named disks and assigns rather than a Unix root. Paths look like `Home:`, `Work:Projects/`, or `System:Commands/mountlist`; `/Home:` and `/` are not Kin paths.

With no project open, the Folders pane gets its roots from the current account's mountlist. After opening a project it instead shows only the project root and its project-relative subfolders and files. **All disks** temporarily opens every mounted standard volume, custom disk, assign, shared volume, and application-provided drive; **Back to project** restores the focused project tree. Expand or collapse tree nodes to navigate the hierarchy.

Select a folder before creating a file or folder. Rename stays on the same disk because KinDOS does not support cross-volume rename. Trash uses the selected item's owning volume.

Buttons use Kin's standard Heroicons. The status strip directly below the code editor reports the current language mode, Saved/Changed state, cursor line and column, and INS/OVR input mode.

Drag the KinUI separators between Folders, the editor, and Tools to choose comfortable pane widths. Acaret remembers the Folders and Tools widths for the current browser profile.

Folders and Tools start collapsed for a new browser profile. Use **View → Toggle folder panel** to restore or collapse Folders, and **View → Toggle right panel** for Tools. A collapsed Folders pane consumes no width; its KinUI separator remains available so dragging right restores the remembered width. Acaret remembers later visibility choices. Navigator is the default Tools tab.

Output is collapsed by default and opens from the **Output** button. When open, drag the horizontal separator above it to change the drawer height; **Close** returns it to the compact button.

## Editing

Use **File → Open File…** or select a file in Folders. ACE tabs show a marker when modified. Save All writes source buffers, project settings, and locale files; cancelled or failed writes remain dirty.

`.klade` files open as JSON source in Acaret. A KinUI/Klade project also offers **Open in Klade** for visual editing. Markdown and KinUI documents have explicit preview workflows.

## Projects

Choose **New project** to create:

- KinUI application with a Klade interface
- KinUI application with a JSON interface
- KinDOS QuickJS module

Choose any appropriate mounted disk or assign and a parent folder. Each project receives a schema-2 `project.acaret` descriptor. Opening the descriptor focuses its root and opens its configured entry.

Project settings edit the project name and entry plus the usual Kin repository manifest fields: package ID, display name, category, version, Heroicon, application icon, published/admin flags, single-instance policy, and localized display-name/category metadata. These fields are synchronized with `manifest.json`.

## Preview and execution

- KinUI Preview mounts the saved `.klade` or `ui.json` through KinUI in a separate window.
- Launch App starts the saved application directly from its KinDOS project folder. The project does not need to be installed in the repository.
- QuickJS Run saves changes and executes the configured entry with `jsexec`, using the project root as its working directory. Output shows stdout, stderr, exit status, and truncation.

## Project tools

- **Translations** edits real `locale/<locale>.json` files, including locale and key management.
- **Tags** recognizes `// tag: name` markers and navigates to them.
- **Navigator** lists supported declarations from the active source buffer and jumps to the selected symbol.
