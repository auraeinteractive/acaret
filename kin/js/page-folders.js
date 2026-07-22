(function() {
    'use strict';
    window.currentFolder = 'Home:';
    window.toolbar = window.toolbar || {};

    function joinPath(folder, name) {
        const base = String(folder || 'Home:');
        return base + (base.endsWith(':') || base.endsWith('/') ? '' : '/') + name;
    }

    async function reportFailure(action) {
        try { await action(); }
        catch (error) { await window.kinAlert(error.message || String(error), { title: 'Folder operation failed' }); }
    }

    function parentPath(path) {
        let value = String(path || 'Home:').replace(/\/+$/, '');
        const colon = value.indexOf(':');
        const slash = value.lastIndexOf('/');
        if (slash <= colon) return value.slice(0, colon + 1);
        return value.slice(0, slash + 1);
    }

    function setHeader() {
        const header = document.getElementById('right_panel_header');
        const title = header.children[0], actions = header.children[1];
        title.className = 'folders'; title.replaceChildren();
        const label = document.createElement('span'); label.textContent = window.currentFolder; title.appendChild(label);
        actions.replaceChildren();
        [
            ['folders-refresh', 'Refresh', function() { window.refreshFolderStructure(window.currentFolder); }],
            ['file-new', 'New file', createFile], ['folders-new', 'New folder', createFolder],
            ['folders-back', 'Up', function() { window.refreshFolderStructure(parentPath(window.currentFolder)); }]
        ].forEach(function(def) {
            const button = document.createElement('button'); button.type = 'button'; button.className = def[0]; button.title = def[1];
            button.addEventListener('click', function() { void reportFailure(def[2]); }); actions.appendChild(button);
        });
    }

    async function createFile() {
        const name = await window.kinPrompt('File name', { title: 'New file', defaultValue: 'untitled.txt' });
        if (!name || /[\\/:]/.test(name) || name === '.' || name === '..') return;
        const path = joinPath(window.currentFolder, name.trim());
        await window.kinWriteFile(path, '');
        await window.refreshFolderStructure(window.currentFolder);
        await window.loadFileFromPath(path);
    }

    async function createFolder() {
        const name = await window.kinPrompt('Folder name', { title: 'New folder', defaultValue: 'folder' });
        if (!name || /[\\/:]/.test(name) || name === '.' || name === '..') return;
        await window.kinMakedir(joinPath(window.currentFolder, name.trim()));
        await window.refreshFolderStructure(window.currentFolder);
    }

    async function removePath(path, kind) {
        const ok = await window.kinConfirm('Move ' + kind + ' “' + path.split('/').pop() + '” to Trash?', {
            title: 'Move to Trash', confirmLabel: 'Move to Trash'
        });
        if (!ok) return;
        await window.kinDeleteToTrash(path);
        await window.refreshFolderStructure(window.currentFolder);
    }

    function rowFor(item) {
        const name = String(item.filename || item.name || '');
        const kind = String(item.type || item.fileType || '').trim().toLowerCase();
        const folder = kind === 'dir' || kind === 'directory' || kind === 'folder';
        const path = joinPath(window.currentFolder, name) + (folder ? '/' : '');
        const row = document.createElement('div'); row.className = folder ? 'folder' : 'file';
        const label = document.createElement('span'); label.textContent = name + (folder ? '/' : ''); row.appendChild(label);
        row.addEventListener('click', function(event) {
            event.preventDefault();
            document.querySelectorAll('#page_folders .active').forEach(function(el) { el.classList.remove('active'); });
            row.classList.add('active');
            if (folder) void reportFailure(function() { return window.refreshFolderStructure(path); });
            else if (/\.klade$/i.test(name)) window.openInKlade(path);
            else void reportFailure(function() { return window.loadFileFromPath(path); });
        });
        row.contextMenu = folder ? [
            { name: 'Open', action: function() { return window.refreshFolderStructure(path); } },
            { name: 'Move to Trash', action: function() { return removePath(path, 'folder'); } }
        ] : [
            { name: /\.klade$/i.test(name) ? 'Open in Klade' : 'Open', action: function() { return /\.klade$/i.test(name) ? window.openInKlade(path) : window.loadFileFromPath(path); } },
            { name: 'Open as JSON', action: function() { return window.loadFileFromPath(path, { forceText: true }); } },
            { name: 'Move to Trash', action: function() { return removePath(path, 'file'); } }
        ];
        return row;
    }

    window.refreshFolderStructure = async function(folder) {
        const page = document.getElementById('page_folders');
        window.currentFolder = String(folder || 'Home:');
        if (!window.currentFolder.endsWith(':') && !window.currentFolder.endsWith('/')) window.currentFolder += '/';
        setHeader(); page.replaceChildren();
        const status = document.createElement('div'); status.className = 'folder-status'; status.textContent = 'Loading…'; page.appendChild(status);
        try {
            const data = await window.kinListDirectory(window.currentFolder);
            page.replaceChildren();
            const visible = data.filter(function(item) {
                const name = String(item && (item.filename || item.name) || '');
                const kind = String(item && (item.type || item.fileType) || '').toLowerCase();
                return name && !name.startsWith('.') && (kind === 'file' || kind === 'dir' || kind === 'directory' || kind === 'folder');
            }).sort(function(a, b) {
                const ak = /dir|folder/i.test(a.type || a.fileType) ? 0 : 1;
                const bk = /dir|folder/i.test(b.type || b.fileType) ? 0 : 1;
                return ak - bk || String(a.filename || a.name).localeCompare(String(b.filename || b.name));
            });
            if (!visible.length) { status.textContent = 'This folder is empty.'; page.appendChild(status); }
            else visible.forEach(function(item) { page.appendChild(rowFor(item)); });
        } catch (error) {
            status.textContent = error.message || 'Could not load folder.'; status.classList.add('error'); page.replaceChildren(status);
        }
    };

    window.toolbar.folders = function() { setHeader(); };
})();
