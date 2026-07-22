# Acaret user guide

Acaret is Kin's source-code editor. It combines ACE multi-file editing with Kin-native file dialogs, project templates, a folder browser, Markdown preview, translations, tags, and source navigation.

## Files and folders

Use **File → Open File…** or the Folders panel to open a file. `.klade` files launch in Klade by default; use **Open as JSON** in their context menu to edit the document source. New files and folders can be created from the Folders header, and deletion moves items to Kin's Trash.

Tabs show a dot when a document has unsaved changes. Save and close operations use Kin dialogs and protect unsaved work.

## Projects

Choose **File → New from Template…** to create one of three focused project types:

- KinUI application with a Klade interface
- KinUI application with a JSON interface
- KinDOS QuickJS module

Each project receives a schema-1 `project.acaret` descriptor. Opening a descriptor sets the project root and opens its entry file.

## Klade and KinDOS

Saved `.klade` documents can be opened in the Klade application from the editor toolbar. Saved `.js` files can be run with `jsexec` through **Run → Run in KinDOS**; stdout, stderr, and the exit status appear in the Output panel.

## Navigation tools

Markdown files have a sandboxed Preview action. Tags recognizes `//tag: name` markers. Navigator lists common function, method, and selector declarations. Translations edits the project descriptor's languages, namespaces, keys, and values; save the project to persist changes.
