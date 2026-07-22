(function() {
    'use strict';

    const documents = new Map();
    let nextEditorId = 1;
    let toolbarInitialized = false;
    let previewVisible = false;
    window.currentEditor = null;
    window.editorDocuments = documents;
    window.toolbar = window.toolbar || {};

    function basename(path) {
        const value = String(path || '').replace(/\/+$/, '');
        return value.slice(Math.max(value.lastIndexOf('/'), value.lastIndexOf(':')) + 1) || 'New file';
    }

    function dirname(path) {
        const value = String(path || '');
        const slash = value.lastIndexOf('/');
        const colon = value.indexOf(':');
        if (slash > colon) return value.slice(0, slash + 1);
        return colon >= 0 ? value.slice(0, colon + 1) : '';
    }

    function extension(filename) {
        const value = String(filename || '');
        const dot = value.lastIndexOf('.');
        return dot >= 0 ? value.slice(dot + 1).toLowerCase() : '';
    }

    function modeForFilename(filename) {
        if (filename === 'Makefile') return 'ace/mode/makefile';
        const modes = {
            ini: 'ini', conf: 'json', yml: 'yaml', yaml: 'yaml', js: 'javascript', mjs: 'javascript',
            cjs: 'javascript', jsx: 'javascript', html: 'html', htm: 'html', css: 'css', json: 'json',
            klade: 'json', acaret: 'json', xml: 'xml', php: 'php', py: 'python', rb: 'ruby', h: 'c_cpp',
            c: 'c_cpp', cpp: 'c_cpp', cc: 'c_cpp', java: 'java', swift: 'swift', go: 'golang', rs: 'rust',
            ts: 'typescript', vue: 'vue', md: 'markdown', markdown: 'markdown', bash: 'sh', sh: 'sh'
        };
        return 'ace/mode/' + (modes[extension(filename)] || 'plain_text');
    }

    window.setEditorPath = function(editor, kinPath) {
        editor.kinPath = String(kinPath || '');
        editor.filename = editor.kinPath ? basename(editor.kinPath) : 'New file';
        editor.path = editor.kinPath ? dirname(editor.kinPath) : '';
        editor.session.setMode(modeForFilename(editor.filename));
    };

    function ensureToolbar() {
        const host = document.getElementById('top_toolbar');
        if (toolbarInitialized && host.querySelector('.TopTabs')) return;
        toolbarInitialized = true;
        host.replaceChildren();
        const tabs = document.createElement('div');
        tabs.className = 'TopTabs';
        const options = document.createElement('div');
        options.className = 'TopTabOption';
        const preview = document.createElement('button');
        preview.type = 'button'; preview.className = 'taboption preview'; preview.textContent = 'Preview';
        preview.addEventListener('click', function() { togglePreview(); });
        const klade = document.createElement('button');
        klade.type = 'button'; klade.className = 'taboption klade'; klade.textContent = 'Open in Klade';
        klade.addEventListener('click', async function() {
            if (!window.currentEditor || !window.currentEditor.kinPath) return;
            if (!window.currentEditor.document_saved && !await window.saveCurrentFile(false)) return;
            window.openInKlade(window.currentEditor.kinPath);
        });
        const run = document.createElement('button');
        run.type = 'button'; run.className = 'taboption run'; run.textContent = 'Run in KinDOS';
        run.addEventListener('click', window.runCurrentInKinDOS);
        const add = document.createElement('button');
        add.type = 'button'; add.className = 'taboption add'; add.textContent = 'New file';
        add.addEventListener('click', function() { window.newEditor(); });
        options.append(preview, klade, run, add);
        host.append(tabs, options);
        tabs.addEventListener('wheel', function(event) {
            if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) tabs.scrollLeft += event.deltaY;
            else tabs.scrollLeft += event.deltaX;
            event.preventDefault();
        }, { passive: false });
    }

    function activate(editor) {
        if (!editor || !documents.has(editor.editorId)) return;
        hidePreview();
        window.currentEditor = editor;
        documents.forEach(function(candidate) {
            candidate.tab.classList.toggle('active', candidate === editor);
            candidate.container.classList.toggle('active', candidate === editor);
        });
        updateBottomBar();
        if (window.toolbar.navigator) window.toolbar.navigator();
        if (document.getElementById('page_tags').classList.contains('active') && window.toolbar.tags) window.toolbar.tags();
        editor.resize(); editor.focus();
    }

    window.updateEditorTabLabel = function(editor) {
        if (!editor || !editor.tab) return;
        const label = editor.tab.querySelector('.label');
        label.textContent = editor.filename || 'New file';
        editor.tab.classList.toggle('dirty', !editor.document_saved);
        editor.tab.title = (editor.kinPath || editor.filename) + (editor.document_saved ? '' : ' — modified');
    };

    window.updateBottomBar = function() {
        const info = document.querySelector('#bottombar .bottom-info');
        if (!window.currentEditor) { info.replaceChildren(); return; }
        const mode = modeForFilename(window.currentEditor.filename).split('/').pop().replace('_', '/');
        info.replaceChildren();
        [ 'Editing: ' + mode, window.currentEditor.document_saved ? 'Saved.' : 'Not saved.',
          window.currentProject && window.currentProject.name ? 'Project: ' + window.currentProject.name : 'No project.'
        ].forEach(function(value) { const item = document.createElement('div'); item.textContent = value; info.appendChild(item); });
        document.body.classList.toggle('filetype-md', /\.(md|markdown)$/i.test(window.currentEditor.filename));
        document.body.classList.toggle('filetype-klade', /\.klade$/i.test(window.currentEditor.filename));
        document.body.classList.toggle('filetype-js', /\.js$/i.test(window.currentEditor.filename));
    };

    window.toolbar.editor = function() {
        ensureToolbar();
        const tabs = document.querySelector('#top_toolbar .TopTabs');
        documents.forEach(function(editor) { if (editor.tab.parentNode !== tabs) tabs.appendChild(editor.tab); });
        if (!documents.size) window.newEditor();
        else if (!window.currentEditor || !documents.has(window.currentEditor.editorId)) activate(documents.values().next().value);
    };

    window.newEditor = function(filename, path) {
        ensureToolbar();
        const kinPath = path && filename ? String(path).replace(/\/?$/, '/') + filename : (path && !filename ? String(path) : '');
        if (kinPath) {
            for (const editor of documents.values()) {
                if (editor.kinPath === kinPath) { activate(editor); return editor; }
            }
        }
        const container = document.createElement('pre');
        const id = nextEditorId++;
        container.setAttribute('editor', String(id));
        document.getElementById('page_editor').appendChild(container);
        const editor = ace.edit(container);
        editor.editorId = id; editor.container = container; editor.document_saved = false;
        window.setEditorPath(editor, kinPath);
        if (!kinPath && filename) editor.filename = filename;
        editor.setTheme('ace/theme/twilight');
        editor.setOptions({ fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace', fontSize: '14px', wrap: true });
        editor.session.setMode(modeForFilename(editor.filename));
        const tab = document.createElement('div');
        tab.className = 'TopTab'; tab.setAttribute('editor', String(id)); tab.editor = editor; editor.tab = tab;
        const close = document.createElement('button');
        close.type = 'button'; close.className = 'close'; close.setAttribute('aria-label', 'Close file');
        const label = document.createElement('span'); label.className = 'label';
        tab.append(close, label);
        tab.addEventListener('click', function() { activate(editor); });
        close.addEventListener('click', function(event) { event.stopPropagation(); void window.closeFile(editor); });
        document.querySelector('#top_toolbar .TopTabs').appendChild(tab);
        documents.set(id, editor);
        editor.on('change', function() {
            editor.document_saved = false;
            window.updateEditorTabLabel(editor);
            if (editor === window.currentEditor) updateBottomBar();
        });
        window.updateEditorTabLabel(editor);
        activate(editor);
        return editor;
    };

    window.loadTextFile = function(content, kinPath) {
        for (const editor of documents.values()) {
            if (editor.kinPath === kinPath) { activate(editor); return editor; }
        }
        const editor = Array.from(documents.values()).find(function(candidate) {
            return !candidate.kinPath && !candidate.getValue() && documents.size === 1;
        }) || window.newEditor();
        activate(editor);
        window.setEditorPath(editor, kinPath);
        editor.setValue(String(content || ''), -1);
        editor.session.getUndoManager().reset();
        editor.document_saved = true;
        editor.clearSelection();
        window.updateEditorTabLabel(editor); updateBottomBar();
        return editor;
    };

    async function mayClose(editor) {
        if (!editor || editor.document_saved) return true;
        return window.kinConfirm('Close “' + editor.filename + '” without saving?', {
            title: 'Unsaved changes', confirmLabel: 'Discard'
        });
    }

    window.closeFile = async function(editor, skipPrompt) {
        if (!editor || !documents.has(editor.editorId)) return false;
        if (!skipPrompt && !await mayClose(editor)) return false;
        const ordered = Array.from(documents.values());
        const index = ordered.indexOf(editor);
        const replacement = ordered[index + 1] || ordered[index - 1] || null;
        documents.delete(editor.editorId);
        editor.tab.remove(); editor.destroy(); editor.container.remove();
        if (window.currentEditor === editor) window.currentEditor = null;
        if (replacement) activate(replacement); else window.newEditor();
        return true;
    };

    window.closeFileAll = async function() {
        const dirty = Array.from(documents.values()).filter(function(editor) { return !editor.document_saved; });
        if (dirty.length && !await window.kinConfirm('Close ' + dirty.length + ' unsaved document(s)?', {
            title: 'Unsaved changes', confirmLabel: 'Discard all'
        })) return false;
        const items = Array.from(documents.values());
        for (const editor of items) await window.closeFile(editor, true);
        return true;
    };

    function hidePreview() {
        previewVisible = false; document.body.classList.remove('file-preview');
        const host = document.getElementById('page_preview'); host.classList.remove('showing'); host.replaceChildren();
    }

    function togglePreview() {
        if (previewVisible) { hidePreview(); return; }
        if (!window.currentEditor || !/\.(md|markdown)$/i.test(window.currentEditor.filename)) return;
        const iframe = document.createElement('iframe');
        iframe.setAttribute('sandbox', ''); iframe.title = 'Markdown preview';
        const html = new showdown.Converter({ tables: true, strikethrough: true }).makeHtml(window.currentEditor.getValue());
        iframe.srcdoc = '<!doctype html><meta charset="utf-8"><style>body{font:16px system-ui;line-height:1.55;padding:24px;color:#222}pre{white-space:pre-wrap;background:#eee;padding:12px}img{max-width:100%}</style>' + html;
        const host = document.getElementById('page_preview'); host.replaceChildren(iframe); host.classList.add('showing');
        document.body.classList.add('file-preview'); previewVisible = true;
    }

    window.openInKlade = function(path) {
        if (path) window.launchKinApp('klade', { kin_open_path: path });
    };

    function quoteShell(value) { return '"' + String(value).replace(/([\\"])/g, '\\$1') + '"'; }
    window.quoteKinShellArg = quoteShell;

    function showOutput(result, command) {
        const panel = document.getElementById('output_panel'); panel.classList.add('showing');
        document.body.classList.add('output-showing');
        panel.querySelector('.output-command').textContent = '$ ' + command;
        panel.querySelector('.output-stdout').textContent = result.stdout || '';
        panel.querySelector('.output-stderr').textContent = result.stderr || '';
        panel.querySelector('.output-status').textContent = 'Exit ' + result.exit_code + (result.truncated ? ' · output truncated' : '');
    }

    window.runCurrentInKinDOS = async function() {
        const editor = window.currentEditor;
        if (!editor || !/\.js$/i.test(editor.filename)) {
            await window.kinAlert('Run in KinDOS requires a JavaScript (.js) file.', { title: 'Run' }); return;
        }
        if ((!editor.kinPath || !editor.document_saved) && !await window.saveCurrentFile(!editor.kinPath)) return;
        const command = 'jsexec ' + quoteShell(editor.kinPath);
        const panel = document.getElementById('output_panel'); panel.classList.add('showing'); document.body.classList.add('output-showing');
        panel.querySelector('.output-command').textContent = '$ ' + command;
        panel.querySelector('.output-status').textContent = 'Running…';
        panel.querySelector('.output-stdout').textContent = ''; panel.querySelector('.output-stderr').textContent = '';
        try { showOutput(await window.kinRunShellLine(command, dirname(editor.kinPath)), command); }
        catch (error) { showOutput({ stdout: '', stderr: error.message, exit_code: 'error' }, command); }
    };

    window.editorClipboardAction = async function(action) {
        const editor = window.currentEditor; if (!editor) return;
        if (!navigator.clipboard) { editor.execCommand(action); return; }
        if (action === 'paste') { editor.insert(await navigator.clipboard.readText()); return; }
        const text = editor.getSelectedText(); if (!text) return;
        await navigator.clipboard.writeText(text);
        if (action === 'cut') editor.session.remove(editor.getSelectionRange());
    };

    window.resizeAllEditors = function() { documents.forEach(function(editor) { editor.resize(); }); };
    window.addEventListener('resize', window.resizeAllEditors);

    document.addEventListener('click', function(event) {
        if (event.target.id === 'output_toggle') {
            const showing = document.getElementById('output_panel').classList.toggle('showing');
            document.body.classList.toggle('output-showing', showing); window.resizeAllEditors();
        }
        else if (event.target.classList.contains('output-close')) { document.getElementById('output_panel').classList.remove('showing'); document.body.classList.remove('output-showing'); }
        else if (event.target.classList.contains('output-clear')) {
            document.querySelectorAll('#output_panel pre').forEach(function(pre) { pre.textContent = ''; });
            document.querySelector('#output_panel .output-status').textContent = '';
        }
    });
})();
