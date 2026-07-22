import * as KinUI from '../kin_ui/kin-ui.js';
import {
    kinWorkspaceAlert,
    kinWorkspaceConfirm,
    kinWorkspaceOpenFileDialog,
    kinWorkspacePrompt
} from '../kin_ui/workspace-dialogs.js';
import * as bridge from './js/bridge.mjs';
import {
    asKinDirectory,
    canonicalizeKinPath,
    isWithinKinRoot,
    joinKinPath,
    kinBasename,
    kinDirname,
    kinVolume,
    relativeKinPath,
    validLeafName,
    volumeName
} from './js/kin-paths.mjs';
import {
    normalizeProject,
    projectEntryPath,
    projectUiPath,
    serializeProject,
    synchronizedManifest,
    validateProject
} from './js/project-model.mjs';
import { generateProject, slugify } from './js/template-catalog.mjs';

const state = {
    ui: null,
    mounts: [],
    tree: [],
    browserMode: 'disks',
    selectedNode: null,
    currentFolder: null,
    project: null,
    manifest: null,
    projectText: '',
    manifestText: '',
    documents: new Map(),
    panelDocuments: new Map(),
    activeDocument: null,
    untitled: 0,
    locales: new Map(),
    deletedLocales: new Map(),
    localeSelection: '',
    toolTimer: 0,
    outputHeight: 210,
    paneWidths: { folders: 0, tools: 0 },
    foldersCollapsed: false,
    foldersExpandedWidth: 260,
    toolsCollapsed: false,
    toolsExpandedWidth: 340
};

function qp(name) {
    try { return new URLSearchParams(location.search).get(name) || ''; }
    catch (_error) { return ''; }
}

function setText(id, text) {
    state.ui.setAttrs(id, { text: String(text == null ? '' : text) });
}

function setStatus(text) {
    setText('status-main', text || 'Ready');
}

function requiredControl(id) {
    const node = state.ui?.getById(id);
    if (!node) throw new Error('KinUI document is missing required component “' + id + '”.');
    return node;
}

function control(type, props = {}, id = '') {
    return KinUI.createElementFromIR({ type, id: id || undefined, props, children: [] });
}

function stack(className = 'tool-stack') {
    const node = control('Column');
    node.className = className;
    return node;
}

function row() {
    const node = control('Row');
    node.className = 'tool-row';
    return node;
}

function textNode(text, className = '') {
    const node = control('Text', { text: String(text == null ? '' : text) });
    if (className) node.className = className;
    return node;
}

const BUTTON_ICONS = [
    [ /back to project/i, 'arrow-uturn-left' ], [ /all disks|disks/i, 'circle-stack' ],
    [ /^up$/i, 'arrow-up' ], [ /refresh/i, 'arrow-path' ], [ /new project|create project/i, 'folder-plus' ],
    [ /open project/i, 'folder-open' ], [ /new file|add file/i, 'document-plus' ],
    [ /new folder|add folder/i, 'folder-plus' ], [ /^save all$/i, 'document-check' ], [ /^save/i, 'check' ],
    [ /launch/i, 'rocket-launch' ], [ /preview/i, 'eye' ], [ /^run|quickjs/i, 'play' ],
    [ /rename|edit/i, 'pencil-square' ], [ /trash|remove|delete/i, 'trash' ],
    [ /clear/i, 'backspace' ], [ /close/i, 'x-mark' ], [ /output/i, 'command-line' ],
    [ /cancel/i, 'x-mark' ], [ /klade/i, 'arrow-top-right-on-square' ], [ /add|new/i, 'plus' ]
];

function iconForLabel(label) {
    return BUTTON_ICONS.find(([pattern]) => pattern.test(String(label || '')))?.[1] || 'cursor-arrow-rays';
}

function heroIconElement(name, size = 16) {
    return typeof globalThis.kin?.heroIconElement === 'function'
        ? globalThis.kin.heroIconElement(name, { size })
        : null;
}

function decorateButton(node, icon, label, size = 16) {
    if (!node) return;
    const visibleLabel = String(label || node.getAttribute('label') || '').replace(/_/g, '');
    node.setAttribute('label', '');
    node.setAttribute('aria-label', visibleLabel);
    node.setAttribute('title', visibleLabel);
    const content = document.createElement('span');
    content.className = 'button-content';
    const glyph = heroIconElement(icon || iconForLabel(visibleLabel), size);
    if (glyph) content.appendChild(glyph);
    const caption = document.createElement('span');
    caption.textContent = visibleLabel;
    content.appendChild(caption);
    node.replaceChildren(content);
}

function button(label, handler, options = {}) {
    const node = control('Button', { disabled: !!options.disabled });
    decorateButton(node, options.icon || iconForLabel(label), label, options.iconSize || 16);
    node.addEventListener('kin-press', () => void perform(handler));
    return node;
}

function field(host, label, value, onChange, options = {}) {
    host.appendChild(textNode(label, 'tool-label'));
    const input = control(options.select ? 'Select' : 'Input', options.select ? {
        value, options: options.options || [], disabled: !!options.disabled, ariaLabel: label
    } : {
        value, readonly: !!options.readonly, disabled: !!options.disabled,
        placeholder: options.placeholder || '', ariaLabel: label
    });
    input.addEventListener('kin-change', event => {
        if (event.detail?.name !== 'value') return;
        onChange(String(event.detail.newValue == null ? '' : event.detail.newValue));
    });
    host.appendChild(input);
    return input;
}

function switchField(host, label, checked, onChange) {
    const input = control('Switch', { label, checked: checked === true, ariaLabel: label });
    input.addEventListener('kin-change', event => {
        if (event.detail?.name === 'checked') onChange(event.detail.newValue === true);
    });
    host.appendChild(input);
    return input;
}

function renderManifestLocales(host, locales, onChange) {
    const section = stack();
    host.appendChild(section);
    const render = () => {
        section.replaceChildren(textNode('Manifest locales'));
        for (const locale of Object.keys(locales).sort()) {
            const metadata = locales[locale];
            section.appendChild(textNode(locale, 'tool-label'));
            field(section, 'Localized display name', metadata.displayName || '', value => {
                metadata.displayName = value;
                onChange();
            });
            field(section, 'Localized category', metadata.category || '', value => {
                metadata.category = value;
                onChange();
            });
            section.appendChild(button('Remove ' + locale, async () => {
                if (!await kinWorkspaceConfirm('Remove manifest locale “' + locale + '”?', { title: 'Manifest locales', confirmLabel: 'Remove' })) return;
                delete locales[locale];
                onChange();
                render();
            }));
        }
        section.appendChild(button('Add manifest locale', async () => {
            const answer = await kinWorkspacePrompt('Locale identifier', { title: 'Manifest locale', defaultValue: 'en-US' });
            if (answer == null) return;
            const locale = String(answer).trim();
            if (!/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(locale)) throw new Error('Use a locale identifier such as en-US or nb-NO.');
            if (locales[locale]) throw new Error('That manifest locale already exists.');
            locales[locale] = { displayName: '', category: '' };
            onChange();
            render();
        }));
    };
    render();
}

async function perform(action) {
    try { return typeof action === 'function' ? await action() : undefined; }
    catch (error) {
        if (error?.message !== 'cancel') {
            setStatus(error?.message || String(error));
            await kinWorkspaceAlert(error?.message || String(error), { title: 'Acaret' });
        }
        return false;
    }
}

async function loadClassicScript(relative) {
    const source = new URL(relative, import.meta.url).href;
    if (document.querySelector('script[data-acaret-src="' + source + '"]')) return;
    await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = source;
        script.charset = 'utf-8';
        script.dataset.acaretSrc = source;
        script.onload = resolve;
        script.onerror = () => reject(new Error('Could not load ' + relative));
        document.head.appendChild(script);
    });
}

function modeForPath(path) {
    const name = String(path || '').split(/[:/]/).pop() || '';
    if (name === 'Makefile') return 'ace/mode/makefile';
    const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
    const modes = {
        js: 'javascript', mjs: 'javascript', cjs: 'javascript', jsx: 'javascript', ts: 'typescript',
        html: 'html', htm: 'html', css: 'css', json: 'json', klade: 'json', acaret: 'json',
        xml: 'xml', yml: 'yaml', yaml: 'yaml', md: 'markdown', markdown: 'markdown', sh: 'sh',
        bash: 'sh', py: 'python', rb: 'ruby', c: 'c_cpp', h: 'c_cpp', cpp: 'c_cpp', cc: 'c_cpp',
        java: 'java', go: 'golang', rs: 'rust', php: 'php', swift: 'swift', vue: 'vue', ini: 'ini'
    };
    return 'ace/mode/' + (modes[ext] || 'plain_text');
}

function editorTabs() { return state.ui.getById('editor-tabs'); }

function installEditorTabLayoutFix() {
    const tabs = requiredControl('editor-tabs');
    if (!tabs.shadowRoot || tabs.shadowRoot.querySelector('[data-acaret-tab-layout]')) return;
    const style = document.createElement('style');
    style.setAttribute('data-acaret-tab-layout', '');
    style.textContent = `
        .tab-wrap.has-close { min-width: 6rem; max-width: 14rem; }
        .tab-wrap.has-close .tab {
            width: 100%;
            min-width: 0;
            box-sizing: border-box;
            padding-right: 2.35rem !important;
        }
        .tab-wrap.has-close .tab-content {
            display: flex;
            width: 100%;
            min-width: 0;
            overflow: hidden;
        }
        .tab-wrap.has-close .tab-label {
            flex: 1 1 auto;
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
    `;
    tabs.shadowRoot.appendChild(style);
}

function selectedDocumentFromTabs() {
    const panels = Array.from(editorTabs().querySelectorAll('kin-tab-panel:not([data-kin-suppress-tab])'));
    const panel = panels[Number(editorTabs().kinGet('selectedIndex')) || 0];
    return state.panelDocuments.get(panel) || null;
}

function updateDocumentLabel(documentState) {
    const base = documentState.path ? kinBasename(documentState.path) : documentState.name;
    documentState.panel.setAttribute('label', (documentState.dirty ? '● ' : '') + base);
    documentState.panel.title = (documentState.path || base) + (documentState.dirty ? ' — modified' : '');
    editorTabs().kin_refresh();
}

function editorLanguage(editor) {
    const id = String(editor?.session?.getMode()?.$id || 'ace/mode/plain_text');
    const name = id.split('/').pop() || 'plain_text';
    const labels = {
        plain_text: 'Plain text', c_cpp: 'C/C++', golang: 'Go', sh: 'Shell',
        javascript: 'JavaScript', typescript: 'TypeScript', json: 'JSON', html: 'HTML',
        css: 'CSS', xml: 'XML', yaml: 'YAML', markdown: 'Markdown', makefile: 'Makefile'
    };
    return labels[name] || name.replace(/_/g, ' ').replace(/^./, character => character.toUpperCase());
}

function updateEditorStatus() {
    const doc = state.activeDocument;
    if (!doc) {
        setText('editor-language', 'No file');
        setText('editor-save-state', '');
        setText('editor-position', '');
        setText('editor-input-mode', '');
        return;
    }
    const cursor = doc.editor.getCursorPosition();
    setText('editor-language', editorLanguage(doc.editor));
    setText('editor-save-state', doc.dirty ? 'Changed' : 'Saved');
    setText('editor-position', 'Ln ' + (cursor.row + 1) + ', Col ' + (cursor.column + 1));
    setText('editor-input-mode', doc.editor.getOverwrite() ? 'OVR' : 'INS');
}

function setActiveDocument(documentState) {
    state.activeDocument = documentState || selectedDocumentFromTabs();
    const doc = state.activeDocument;
    updateEditorStatus();
    if (doc) {
        requestAnimationFrame(() => { doc.editor.resize(); doc.editor.focus(); });
    }
    scheduleEditorTools();
}

function createDocument(content = '', path = '') {
    const canonicalPath = path ? canonicalizeKinPath(path, { mounts: state.mounts }) : '';
    if (canonicalPath && state.documents.has(canonicalPath)) {
        const existing = state.documents.get(canonicalPath);
        selectDocument(existing);
        return existing;
    }

    const name = canonicalPath ? kinBasename(canonicalPath) : 'Untitled ' + (++state.untitled);
    const panel = control('TabPanel', { label: name, closable: true });
    panel.style.setProperty('--kin-ui-pad', '0');
    const host = document.createElement('div');
    host.className = 'ace-host';
    panel.appendChild(host);
    editorTabs().appendChild(panel);
    editorTabs().kin_refresh();

    const editor = globalThis.ace.edit(host);
    editor.setTheme('ace/theme/twilight');
    editor.setOptions({ fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace', fontSize: '14px', wrap: true });
    editor.session.setMode(modeForPath(canonicalPath || name));
    editor.setValue(String(content), -1);
    editor.session.getUndoManager().reset();
    editor.clearSelection();

    const documentState = { panel, host, editor, path: canonicalPath, name, dirty: false, savedText: String(content) };
    if (canonicalPath) state.documents.set(canonicalPath, documentState);
    else state.documents.set('untitled:' + state.untitled, documentState);
    state.panelDocuments.set(panel, documentState);
    editor.on('change', () => {
        documentState.dirty = editor.getValue() !== documentState.savedText;
        updateDocumentLabel(documentState);
        if (state.activeDocument === documentState) setActiveDocument(documentState);
        scheduleEditorTools();
    });
    editor.selection.on('changeCursor', () => {
        if (state.activeDocument === documentState) updateEditorStatus();
    });
    editor.on('changeOverwrite', () => {
        if (state.activeDocument === documentState) updateEditorStatus();
    });
    updateDocumentLabel(documentState);
    selectDocument(documentState);
    return documentState;
}

function documentKey(doc) {
    for (const [key, value] of state.documents) if (value === doc) return key;
    return '';
}

function selectDocument(doc) {
    const panels = Array.from(editorTabs().querySelectorAll('kin-tab-panel:not([data-kin-suppress-tab])'));
    const index = panels.indexOf(doc.panel);
    if (index >= 0) editorTabs().select(index);
    setActiveDocument(doc);
}

async function openFile(path) {
    const canonical = canonicalizeKinPath(path, { mounts: state.mounts });
    if (state.documents.has(canonical)) {
        selectDocument(state.documents.get(canonical));
        return state.documents.get(canonical);
    }
    setStatus('Opening ' + canonical + '…');
    const content = await bridge.readFile(canonical);
    const doc = createDocument(content, canonical);
    setStatus('Opened ' + canonical);
    return doc;
}

async function chooseSavePath(doc) {
    const initialPath = doc.path ? kinDirname(doc.path) : state.project?.rootPath || state.currentFolder || state.mounts[0]?.filename || 'Mountlist:';
    const result = await kinWorkspaceOpenFileDialog({ mode: 'save', initialPath, defaultFilename: doc.path ? kinBasename(doc.path) : 'untitled.txt' });
    return canonicalizeKinPath(result.path || result.paths?.[0], { mounts: state.mounts });
}

async function saveDocument(doc = state.activeDocument, saveAs = false) {
    if (!doc) return false;
    const target = saveAs || !doc.path ? await chooseSavePath(doc) : doc.path;
    await bridge.writeFile(target, doc.editor.getValue());
    const oldKey = documentKey(doc);
    if (oldKey) state.documents.delete(oldKey);
    doc.path = target;
    doc.name = kinBasename(target);
    doc.savedText = doc.editor.getValue();
    doc.dirty = false;
    doc.editor.session.setMode(modeForPath(target));
    state.documents.set(target, doc);
    updateDocumentLabel(doc);
    setActiveDocument(doc);
    await refreshFolderSelection(false);
    setStatus('Saved ' + target);
    return true;
}

async function closeDocument(doc, force = false) {
    if (!doc) return true;
    if (doc.dirty && !force) {
        const discard = await kinWorkspaceConfirm('Discard unsaved changes in “' + (doc.path || doc.name) + '”?', {
            title: 'Unsaved changes', confirmLabel: 'Discard'
        });
        if (!discard) return false;
    }
    const key = documentKey(doc);
    if (key) state.documents.delete(key);
    state.panelDocuments.delete(doc.panel);
    doc.editor.destroy();
    doc.panel.remove();
    editorTabs().kin_refresh();
    state.activeDocument = selectedDocumentFromTabs();
    setActiveDocument(state.activeDocument);
    return true;
}

async function closeAllDocuments(force = false) {
    for (const doc of Array.from(state.documents.values())) {
        if (!await closeDocument(doc, force)) return false;
    }
    return true;
}

function dirtySummary() {
    const files = Array.from(state.documents.values()).filter(doc => doc.dirty).length;
    const locales = Array.from(state.locales.values()).filter(locale => locale.dirty).length + state.deletedLocales.size;
    const settings = state.project?.dirty ? 1 : 0;
    return { files, locales, settings, total: files + locales + settings };
}

async function confirmReplaceWorkspace() {
    const dirty = dirtySummary();
    if (!dirty.total) return true;
    return kinWorkspaceConfirm(
        'Discard unsaved workspace changes?\n\nFiles: ' + dirty.files + '\nProject settings: ' + dirty.settings + '\nLocales: ' + dirty.locales,
        { title: 'Switch project', confirmLabel: 'Discard changes' }
    );
}

function treeFind(nodes, id) {
    for (const node of nodes) {
        if (node.id === id) return node;
        const found = Array.isArray(node.children) ? treeFind(node.children, id) : null;
        if (found) return found;
    }
    return null;
}

function setTree() {
    state.ui.getById('folders-tree').setData(state.tree);
}

function updateFolderChrome() {
    const inProject = state.browserMode === 'project' && !!state.project;
    const disksButton = requiredControl('folders-disks');
    const projectButton = requiredControl('folders-project');
    const showDisksButton = inProject;
    const showProjectButton = !inProject && !!state.project;
    disksButton.toggleAttribute('hidden', !showDisksButton);
    projectButton.toggleAttribute('hidden', !showProjectButton);
    disksButton.style.display = showDisksButton ? '' : 'none';
    projectButton.style.display = showProjectButton ? '' : 'none';
    if (inProject) {
        if (state.tree[0] && state.tree[0].title !== state.project.name) {
            state.tree[0].title = state.project.name;
            setTree();
        }
        let relative = '';
        try { relative = relativeKinPath(state.currentFolder || state.project.rootPath, state.project.rootPath).replace(/\/$/, ''); }
        catch (_error) { relative = ''; }
        setText('folders-path', state.project.name + (relative ? ' · ' + relative + '/' : ''));
    } else {
        setText('folders-path', state.currentFolder || 'Mounted disks');
    }
}

function mountNode(mount) {
    const name = volumeName(mount);
    return {
        id: name, type: 'volume', title: name, meta: String(mount.kind || mount.type || 'volume'),
        icon: name.toLowerCase() === 'trash:' ? 'trash' : 'circle-stack', hasChildren: true, expanded: false
    };
}

async function refreshMountlist() {
    const currentNames = new Set(state.mounts.map(item => volumeName(item).toLowerCase()));
    state.mounts = await bridge.listKinVolumes();
    if (state.browserMode === 'disks') {
        const old = new Map(state.tree.map(node => [node.id.toLowerCase(), node]));
        state.tree = state.mounts.map(mount => old.get(volumeName(mount).toLowerCase()) || mountNode(mount));
        setTree();
    }
    if (state.currentFolder && !state.mounts.some(item => volumeName(item).toLowerCase() === kinVolume(state.currentFolder).toLowerCase())) {
        state.currentFolder = null;
        state.selectedNode = null;
        setStatus('The previously selected KinDOS volume is no longer mounted.');
    } else if (currentNames.size) setStatus('Mounted disks refreshed.');
    updateFolderChrome();
}

function directoryEntries(parent, entries) {
    return entries.map(entry => {
        const name = String(entry?.filename || entry?.name || '').trim();
        if (!name) return null;
        const kind = String(entry.type || entry.fileType || '').toLowerCase();
        const folder = kind === 'dir' || kind === 'directory' || kind === 'folder' || entry.kind === 'volume';
        let path;
        try { path = joinKinPath(parent, name); } catch (_error) { return null; }
        return {
            id: path, type: folder ? 'folder' : 'file', title: name, meta: folder ? 'folder' : '',
            icon: folder ? 'folder' : 'document-text', hasChildren: folder, expanded: false
        };
    }).filter(Boolean).sort((left, right) => {
        const lf = left.type === 'folder' ? 0 : 1;
        const rf = right.type === 'folder' ? 0 : 1;
        return lf - rf || left.title.localeCompare(right.title);
    });
}

async function loadNodeChildren(node, force = false) {
    if (!node || node.type === 'file') return;
    if (Array.isArray(node.children) && !force) return;
    node.children = directoryEntries(node.id, await bridge.listDirectory(node.id));
}

async function revealPath(path) {
    const canonical = canonicalizeKinPath(path, { mounts: state.mounts });
    const inProject = state.browserMode === 'project' && state.project && isWithinKinRoot(canonical, state.project.rootPath);
    const root = inProject ? state.project.rootPath : kinVolume(canonical);
    let node = treeFind(state.tree, root);
    if (!node) {
        if (state.browserMode === 'project') await showDisks();
        node = treeFind(state.tree, kinVolume(canonical));
    }
    if (!node) throw new Error('Kin volume “' + kinVolume(canonical) + '” is not mounted.');
    node.expanded = true;
    await loadNodeChildren(node);
    const relative = inProject
        ? relativeKinPath(canonical, state.project.rootPath).replace(/\/$/, '')
        : canonical.slice(kinVolume(canonical).length).replace(/\/$/, '');
    let current = root;
    for (const segment of relative ? relative.split('/') : []) {
        current = joinKinPath(current, segment);
        const child = treeFind(node.children || [], current);
        if (!child || child.type === 'file') break;
        child.expanded = true;
        await loadNodeChildren(child);
        node = child;
    }
    state.currentFolder = asKinDirectory(canonical);
    updateFolderChrome();
    setTree();
}

async function refreshFolderSelection(updateMounts = true) {
    if (updateMounts) await refreshMountlist();
    if (!state.currentFolder) { setTree(); return; }
    const node = treeFind(state.tree, state.currentFolder.replace(/\/$/, '')) || treeFind(state.tree, state.currentFolder);
    if (node) {
        await loadNodeChildren(node, true);
        node.expanded = true;
        setTree();
    } else await revealPath(state.currentFolder);
}

function selectedDirectory() {
    const node = state.selectedNode;
    if (node?.type === 'volume' || node?.type === 'folder') return asKinDirectory(node.id);
    if (node?.type === 'file') return kinDirname(node.id);
    return state.currentFolder || state.project?.rootPath || null;
}

async function ensureLeafAvailable(directory, name) {
    const entries = await bridge.listDirectory(directory);
    const wanted = String(name).toLowerCase();
    if (entries.some(entry => String(entry?.filename || entry?.name || '').toLowerCase() === wanted)) {
        throw new Error('“' + name + '” already exists in ' + directory);
    }
}

async function createFileInTree() {
    const directory = selectedDirectory();
    if (!directory) throw new Error('Select a mounted disk or folder first.');
    const answer = await kinWorkspacePrompt('File name', { title: 'New file', defaultValue: 'untitled.txt' });
    if (answer == null) return;
    const name = validLeafName(answer);
    await ensureLeafAvailable(directory, name);
    const path = joinKinPath(directory, name);
    await bridge.touchFile(path);
    await revealPath(directory);
    await refreshFolderSelection(false);
    await openFile(path);
}

async function createFolderInTree() {
    const directory = selectedDirectory();
    if (!directory) throw new Error('Select a mounted disk or folder first.');
    const answer = await kinWorkspacePrompt('Folder name', { title: 'New folder', defaultValue: 'folder' });
    if (answer == null) return;
    const name = validLeafName(answer);
    await ensureLeafAvailable(directory, name);
    await bridge.makeDirectory(joinKinPath(directory, name));
    await revealPath(directory);
    await refreshFolderSelection(false);
}

function replaceOpenPathPrefix(from, to) {
    const updates = [];
    for (const [key, doc] of state.documents) {
        if (!doc.path || (doc.path !== from && !doc.path.startsWith(from.replace(/\/$/, '') + '/'))) continue;
        const next = to + doc.path.slice(from.length);
        updates.push([key, doc, next]);
    }
    for (const [key, doc, next] of updates) {
        state.documents.delete(key);
        doc.path = next;
        doc.name = kinBasename(next);
        state.documents.set(next, doc);
        updateDocumentLabel(doc);
    }
}

async function renameSelected() {
    const node = state.selectedNode;
    if (!node || node.type === 'volume') throw new Error('Select a file or folder to rename.');
    if (state.project && (node.id === state.project.descriptorPath || isWithinKinRoot(state.project.rootPath, node.id))) {
        throw new Error('Close the active project before renaming its descriptor, root, or a containing folder.');
    }
    const answer = await kinWorkspacePrompt('New name', { title: 'Rename', defaultValue: kinBasename(node.id) });
    if (answer == null) return;
    const destination = joinKinPath(kinDirname(node.id), validLeafName(answer));
    await bridge.movePath(node.id, destination);
    replaceOpenPathPrefix(node.id, destination);
    state.selectedNode = null;
    state.currentFolder = kinDirname(destination);
    await refreshFolderSelection(false);
    setStatus('Renamed to ' + destination);
}

async function trashSelected() {
    const node = state.selectedNode;
    if (!node || node.type === 'volume') throw new Error('Select a file or folder to move to Trash.');
    if (state.project && (node.id === state.project.descriptorPath || isWithinKinRoot(state.project.rootPath, node.id))) {
        throw new Error('Close the active project before moving its descriptor or root to Trash.');
    }
    const affected = Array.from(state.documents.values()).filter(doc => doc.path && (doc.path === node.id || doc.path.startsWith(node.id.replace(/\/$/, '') + '/')));
    const dirty = affected.filter(doc => doc.dirty);
    const message = 'Move “' + kinBasename(node.id) + '” to its KinDOS Trash?' + (dirty.length ? '\n\nThis also closes ' + dirty.length + ' modified editor tab(s).' : '');
    if (!await kinWorkspaceConfirm(message, { title: 'Move to Trash', confirmLabel: 'Move to Trash' })) return;
    await bridge.moveToTrash(node.id);
    for (const doc of affected) await closeDocument(doc, true);
    state.currentFolder = kinDirname(node.id);
    state.selectedNode = null;
    await refreshFolderSelection(false);
}

async function showDisks() {
    state.browserMode = 'disks';
    state.currentFolder = null;
    state.selectedNode = null;
    await refreshMountlist();
}

async function showProject() {
    if (!state.project) return;
    state.browserMode = 'project';
    state.currentFolder = asKinDirectory(state.project.rootPath);
    state.selectedNode = null;
    const root = {
        id: state.project.rootPath,
        type: 'folder',
        title: state.project.name,
        meta: 'project',
        icon: 'folder-open',
        hasChildren: true,
        expanded: true
    };
    await loadNodeChildren(root, true);
    state.tree = [ root ];
    setTree();
    updateFolderChrome();
}

async function readOptionalJson(path) {
    try {
        const text = await bridge.readFile(path);
        return { text, value: JSON.parse(text) };
    } catch (_error) { return { text: '', value: null }; }
}

async function loadLocales(project) {
    state.locales.clear();
    state.deletedLocales.clear();
    state.localeSelection = '';
    if (!project || project.kind === 'kindos-js') return;
    const directory = joinKinPath(project.rootPath, 'locale');
    let entries;
    try { entries = await bridge.listDirectory(directory); }
    catch (_error) { return; }
    for (const entry of entries) {
        const filename = String(entry.filename || entry.name || '');
        if (!/\.json$/i.test(filename)) continue;
        const path = joinKinPath(directory, filename);
        try {
            const text = await bridge.readFile(path);
            const data = JSON.parse(text);
            if (!data || typeof data !== 'object' || Array.isArray(data)) continue;
            const id = filename.replace(/\.json$/i, '');
            state.locales.set(id, { id, path, data, savedText: JSON.stringify(data, null, 2) + '\n', dirty: false, created: false });
        } catch (_error) { /* invalid locale remains source-editable in ACE */ }
    }
    state.localeSelection = state.locales.keys().next().value || '';
}

async function openProjectPath(path, options = {}) {
    const descriptorPath = canonicalizeKinPath(path, { mounts: state.mounts });
    if (!/\.acaret$/i.test(descriptorPath)) throw new Error('Choose a project.acaret descriptor.');
    if (!options.skipConfirm && !await confirmReplaceWorkspace()) return false;
    const projectText = await bridge.readFile(descriptorPath);
    const raw = JSON.parse(projectText);
    const root = kinDirname(descriptorPath).replace(/\/$/, '');
    const manifestResult = await readOptionalJson(joinKinPath(root, 'manifest.json'));
    const project = normalizeProject(raw, descriptorPath, manifestResult.value);
    await closeAllDocuments(true);
    state.project = project;
    state.manifest = manifestResult.value || {};
    state.projectText = projectText;
    state.manifestText = manifestResult.text;
    await loadLocales(project);
    await showProject();
    renderProjectTool();
    renderTranslations();
    await openFile(projectEntryPath(project));
    setStatus('Opened project ' + project.name);
    return true;
}

async function openProjectDialog() {
    const result = await kinWorkspaceOpenFileDialog({ mode: 'load', initialPath: state.project?.rootPath || state.currentFolder || 'Mountlist:', preferredExtensions: [ 'acaret' ] });
    return openProjectPath(result.path || result.paths?.[0]);
}

function markProjectDirty() {
    if (!state.project) return;
    state.project.dirty = true;
    updateFolderChrome();
}

async function saveProject() {
    if (!state.project) return true;
    validateProject(state.project);
    const descriptorText = JSON.stringify(serializeProject(state.project), null, 2) + '\n';
    if (state.project.kind === 'kindos-js') {
        await bridge.writeFile(state.project.descriptorPath, descriptorText);
    } else {
        const nextManifest = synchronizedManifest(state.project, state.manifest || {});
        const manifestText = JSON.stringify(nextManifest, null, 2) + '\n';
        const manifestPath = joinKinPath(state.project.rootPath, 'manifest.json');
        await bridge.writeFile(manifestPath, manifestText);
        try { await bridge.writeFile(state.project.descriptorPath, descriptorText); }
        catch (error) {
            if (state.manifestText) await bridge.writeFile(manifestPath, state.manifestText).catch(() => {});
            throw error;
        }
        state.manifest = nextManifest;
        state.manifestText = manifestText;
    }
    state.projectText = descriptorText;
    state.project.sourceSchema = 2;
    state.project.dirty = false;
    updateFolderChrome();
    setStatus('Saved project settings.');
    renderProjectTool();
    return true;
}

async function saveLocales() {
    for (const locale of state.deletedLocales.values()) await bridge.moveToTrash(locale.path);
    state.deletedLocales.clear();
    for (const locale of state.locales.values()) {
        if (!locale.dirty) continue;
        if (locale.created) {
            const directory = kinDirname(locale.path);
            try { await bridge.listDirectory(directory); }
            catch (_error) { await bridge.makeDirectory(directory); }
        }
        const text = JSON.stringify(locale.data, null, 2) + '\n';
        await bridge.writeFile(locale.path, text);
        locale.savedText = text;
        locale.dirty = false;
        locale.created = false;
    }
}

async function saveAll() {
    for (const doc of Array.from(state.documents.values())) if (doc.dirty || !doc.path) {
        if (!await saveDocument(doc, false)) return false;
    }
    if (state.project?.dirty || state.project?.sourceSchema < 2) await saveProject();
    await saveLocales();
    renderTranslations();
    setStatus('All changes saved.');
    return true;
}

function renderProjectTool() {
    const host = state.ui.getById('project-tool-content');
    host.replaceChildren();
    const content = stack();
    host.appendChild(content);
    const project = state.project;
    if (!project) {
        content.append(textNode('No project is open.', 'tool-empty'));
        const actions = row();
        actions.append(button('New project', renderNewProjectTool), button('Open project', openProjectDialog));
        content.appendChild(actions);
        return;
    }
    content.append(textNode(project.name), textNode(project.rootPath), textNode('Type: ' + project.kind));
    field(content, 'Project name', project.name, value => { project.name = value; markProjectDirty(); });
    if (project.kind !== 'kindos-js') {
        field(content, 'Package ID', project.packageId, value => { project.packageId = value.trim(); markProjectDirty(); });
        field(content, 'Display name', project.displayName, value => { project.displayName = value; markProjectDirty(); });
        field(content, 'Category', project.category, value => { project.category = value; markProjectDirty(); });
        field(content, 'Version', project.version, value => { project.version = value.trim(); markProjectDirty(); });
        field(content, 'Heroicon name', project.heroIcon, value => { project.heroIcon = value.trim(); markProjectDirty(); });
        field(content, 'Application icon path', project.icon, value => { project.icon = value.trim(); markProjectDirty(); }, { placeholder: 'app.png' });
        switchField(content, 'Published', project.published, value => { project.published = value; markProjectDirty(); });
        switchField(content, 'Administrator only', project.adminOnly, value => { project.adminOnly = value; markProjectDirty(); });
        const policy = typeof project.singleInstance === 'string' ? 'query' : project.singleInstance ? 'single' : 'multiple';
        field(content, 'Instance policy', policy, value => {
            project.singleInstance = value === 'single' ? true : value === 'query' ? 'mode' : false;
            markProjectDirty();
            renderProjectTool();
        }, { select: true, options: [
            { value: 'multiple', label: 'Allow multiple instances' },
            { value: 'single', label: 'Single instance' },
            { value: 'query', label: 'Single except query key' }
        ] });
        if (typeof project.singleInstance === 'string') {
            field(content, 'Instance exception query key', project.singleInstance, value => {
                project.singleInstance = value.trim();
                markProjectDirty();
            }, { placeholder: 'mode' });
        }
    }
    field(content, 'Entry file', project.entry, value => { project.entry = value.trim(); markProjectDirty(); });
    if (project.kind !== 'kindos-js') {
        field(content, 'UI document', project.uiDocument, value => { project.uiDocument = value.trim(); markProjectDirty(); });
        renderManifestLocales(content, project.manifestLocales, markProjectDirty);
    }
    const actions = row();
    actions.append(button('Save project', saveProject), button('Save all', saveAll));
    if (project.kind !== 'kindos-js') {
        actions.append(button('Preview UI', previewProject), button('Launch app', launchApp));
        if (project.kind === 'kinui-klade') actions.append(button('Open in Klade', openProjectInKlade));
    } else actions.append(button('Run', runProject));
    content.appendChild(actions);
}

function writableMountOptions() {
    return state.mounts.filter(item => ![ 'trash:', 'mountlist:' ].includes(volumeName(item).toLowerCase()))
        .map(item => ({ value: volumeName(item), label: volumeName(item) + ' · ' + String(item.kind || item.type || 'volume') }));
}

function renderNewProjectTool() {
    const host = state.ui.getById('project-tool-content');
    host.replaceChildren();
    const content = stack();
    host.appendChild(content);
    content.appendChild(textNode('New Kin project'));
    const mountOptions = writableMountOptions();
    const activeVolume = state.currentFolder ? kinVolume(state.currentFolder) : '';
    const defaultVolume = mountOptions.find(item => item.value.toLowerCase() === activeVolume.toLowerCase())?.value
        || mountOptions[0]?.value || '';
    const defaultFolder = state.currentFolder && activeVolume.toLowerCase() === defaultVolume.toLowerCase()
        ? relativeKinPath(state.currentFolder, defaultVolume).replace(/\/$/, '')
        : '';
    const form = {
        template: 'kinui-klade', name: 'My Kin App', displayName: 'My Kin App', id: 'my-kin-app', volume: defaultVolume,
        folder: defaultFolder, category: 'Development', version: '1', heroIcon: 'code-bracket', icon: '',
        published: true, adminOnly: false, singleInstancePolicy: 'multiple', singleInstanceQuery: 'mode',
        manifestLocales: {
            'en-US': { displayName: 'My Kin App', category: 'Development' },
            'nb-NO': { displayName: 'My Kin App', category: 'Utvikling' }
        },
        autoId: true, autoDisplayName: true
    };
    field(content, 'Template', form.template, value => { form.template = value; }, {
        select: true,
        options: [
            { value: 'kinui-klade', label: 'KinUI App — Klade' },
            { value: 'kinui-json', label: 'KinUI App — JSON' },
            { value: 'kindos-js', label: 'KinDOS QuickJS Module' }
        ]
    });
    const nameInput = field(content, 'Name', form.name, value => {
        const previous = form.name;
        form.name = value;
        if (form.autoDisplayName) form.displayName = value;
        for (const metadata of Object.values(form.manifestLocales)) {
            if (!metadata.displayName || metadata.displayName === previous) metadata.displayName = value;
        }
        if (form.autoId) { form.id = slugify(value); idInput.kinSet('value', form.id); }
    });
    const idInput = field(content, 'Project ID', form.id, value => { form.id = value; form.autoId = false; });
    let syncingDisplayName = false;
    const displayNameInput = field(content, 'Display name', form.displayName, value => {
        form.displayName = value;
        if (!syncingDisplayName) form.autoDisplayName = false;
    });
    nameInput.addEventListener('kin-change', event => {
        if (event.detail?.name === 'value' && form.autoDisplayName) {
            syncingDisplayName = true;
            displayNameInput.kinSet('value', form.displayName);
            syncingDisplayName = false;
        }
    });
    field(content, 'KinDOS disk or assign', form.volume, value => { form.volume = value; }, { select: true, options: mountOptions });
    field(content, 'Parent folder', form.folder, value => { form.folder = value.trim(); }, { placeholder: 'Projects' });
    field(content, 'Category', form.category, value => { form.category = value; });
    field(content, 'Version', form.version, value => { form.version = value.trim(); });
    field(content, 'Heroicon name', form.heroIcon, value => { form.heroIcon = value.trim(); });
    field(content, 'Application icon path', form.icon, value => { form.icon = value.trim(); }, { placeholder: 'app.png' });
    switchField(content, 'Published', form.published, value => { form.published = value; });
    switchField(content, 'Administrator only', form.adminOnly, value => { form.adminOnly = value; });
    field(content, 'Instance policy', form.singleInstancePolicy, value => { form.singleInstancePolicy = value; }, {
        select: true,
        options: [
            { value: 'multiple', label: 'Allow multiple instances' },
            { value: 'single', label: 'Single instance' },
            { value: 'query', label: 'Single except query key' }
        ]
    });
    field(content, 'Instance exception query key', form.singleInstanceQuery, value => { form.singleInstanceQuery = value.trim(); }, { placeholder: 'mode' });
    renderManifestLocales(content, form.manifestLocales, () => {});
    const status = textNode('The project will be created on a mounted KinDOS volume.');
    content.appendChild(status);
    const actions = row();
    actions.append(button('Create project', async () => {
        if (!await confirmReplaceWorkspace()) return;
        if (!form.volume) throw new Error('Choose a mounted KinDOS disk or assign.');
        const location = form.folder ? joinKinPath(form.volume, form.folder) : canonicalizeKinPath(form.volume);
        try { await bridge.listDirectory(location); }
        catch (_error) { throw new Error('The selected parent folder does not exist: ' + location); }
        const generated = generateProject({
            template: form.template, name: form.name, displayName: form.displayName, id: form.id, location, category: form.category,
            version: form.version, heroIcon: form.heroIcon, icon: form.icon, published: form.published,
            adminOnly: form.adminOnly,
            singleInstance: form.singleInstancePolicy === 'single' ? true : form.singleInstancePolicy === 'query' ? form.singleInstanceQuery : false,
            manifestLocales: form.manifestLocales
        });
        let exists = false;
        try { await bridge.listDirectory(generated.rootPath); exists = true; } catch (_error) { /* missing is expected */ }
        if (exists) throw new Error('The project destination already exists.');
        status.kinSet('text', 'Creating ' + generated.rootPath + '…');
        let rootCreated = false;
        try {
            await bridge.makeDirectory(generated.rootPath);
            rootCreated = true;
            for (const directory of generated.directories) await bridge.makeDirectory(joinKinPath(generated.rootPath, directory));
            for (let index = 0; index < generated.files.length; index++) {
                const file = generated.files[index];
                status.kinSet('text', 'Writing ' + file.path + ' (' + (index + 1) + '/' + generated.files.length + ')…');
                await bridge.writeFile(joinKinPath(generated.rootPath, file.path), file.body);
            }
        } catch (error) {
            if (rootCreated) await bridge.moveToTrash(generated.rootPath).catch(() => {});
            throw error;
        }
        await refreshMountlist();
        await openProjectPath(generated.descriptorPath, { skipConfirm: true });
    }), button('Cancel', renderProjectTool));
    content.appendChild(actions);
    nameInput.focus();
}

function allLocaleKeys() {
    const keys = new Set();
    for (const locale of state.locales.values()) Object.keys(locale.data).forEach(key => keys.add(key));
    return Array.from(keys).sort();
}

function markLocaleDirty(locale) {
    locale.dirty = true;
    renderTranslations();
}

function renderTranslations() {
    const host = state.ui.getById('translations-tool-content');
    host.replaceChildren();
    const content = stack();
    host.appendChild(content);
    if (!state.project || state.project.kind === 'kindos-js') {
        content.appendChild(textNode('Translations are available for KinUI projects.', 'tool-empty'));
        return;
    }
    const options = Array.from(state.locales.keys()).sort().map(id => ({ value: id, label: id + (state.locales.get(id).dirty ? ' · modified' : '') }));
    const top = row();
    if (options.length) {
        const select = control('Select', { value: state.localeSelection || options[0].value, options, ariaLabel: 'Locale' });
        select.addEventListener('kin-change', event => {
            if (event.detail?.name === 'value') { state.localeSelection = String(event.detail.newValue); renderTranslations(); }
        });
        top.appendChild(select);
    }
    top.append(button('Add locale', async () => {
        const answer = await kinWorkspacePrompt('Locale identifier', { title: 'Add locale', defaultValue: 'en-US' });
        if (answer == null) return;
        const id = String(answer).trim();
        if (!/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(id)) throw new Error('Use a locale identifier such as en-US or nb-NO.');
        if (state.locales.has(id)) throw new Error('That locale already exists.');
        state.deletedLocales.delete(id);
        const path = joinKinPath(state.project.rootPath, 'locale/' + id + '.json');
        state.locales.set(id, { id, path, data: {}, savedText: '', dirty: true, created: true });
        state.localeSelection = id;
        renderTranslations();
    }), button('Remove locale', async () => {
        const locale = state.locales.get(state.localeSelection);
        if (!locale) return;
        if (!await kinWorkspaceConfirm('Remove locale “' + locale.id + '”?', { title: 'Translations', confirmLabel: 'Remove' })) return;
        if (!locale.created) state.deletedLocales.set(locale.id, locale);
        state.locales.delete(locale.id);
        state.localeSelection = state.locales.keys().next().value || '';
        renderTranslations();
    }, { disabled: !state.localeSelection }), button('Add key', async () => {
        if (!state.locales.size) throw new Error('Add a locale first.');
        const answer = await kinWorkspacePrompt('Translation key', { title: 'Add key', defaultValue: 'ui.welcome' });
        if (answer == null) return;
        const key = String(answer).trim();
        if (!key || /\s/.test(key)) throw new Error('Translation keys cannot be empty or contain whitespace.');
        for (const locale of state.locales.values()) { if (!(key in locale.data)) locale.data[key] = ''; locale.dirty = true; }
        renderTranslations();
    }));
    content.appendChild(top);
    const locale = state.locales.get(state.localeSelection);
    if (!locale) {
        content.appendChild(textNode('No locale files yet.', 'tool-empty'));
        return;
    }
    for (const key of allLocaleKeys()) {
        content.appendChild(textNode(key, 'tool-label'));
        const itemRow = row();
        const input = control('Input', { value: String(locale.data[key] ?? ''), ariaLabel: key });
        input.style.flex = '1 1 180px';
        input.addEventListener('kin-change', event => {
            if (event.detail?.name !== 'value') return;
            locale.data[key] = String(event.detail.newValue ?? '');
            locale.dirty = true;
        });
        itemRow.append(input, button('Rename', async () => {
            const answer = await kinWorkspacePrompt('New translation key', { title: 'Rename key', defaultValue: key });
            if (answer == null || answer === key) return;
            const next = String(answer).trim();
            if (!next || /\s/.test(next)) throw new Error('Translation keys cannot be empty or contain whitespace.');
            for (const candidate of state.locales.values()) {
                if (next in candidate.data) throw new Error('Translation key “' + next + '” already exists.');
                candidate.data[next] = candidate.data[key] ?? '';
                delete candidate.data[key];
                candidate.dirty = true;
            }
            renderTranslations();
        }), button('Remove', async () => {
            if (!await kinWorkspaceConfirm('Remove translation key “' + key + '” from every locale?', { title: 'Translations', confirmLabel: 'Remove' })) return;
            for (const candidate of state.locales.values()) { delete candidate.data[key]; candidate.dirty = true; }
            renderTranslations();
        }));
        content.appendChild(itemRow);
    }
    content.appendChild(button('Save locale files', async () => { await saveLocales(); renderTranslations(); }));
}

function tagItems(doc) {
    if (!doc) return [];
    const output = [];
    const regex = /^\s*\/\/\s*tag\s*:\s*([^\n(]+)/gim;
    let match;
    while ((match = regex.exec(doc.editor.getValue()))) output.push({ label: match[1].trim(), needle: match[0].trim() });
    return output;
}

function navigatorItems(doc) {
    if (!doc) return [];
    const source = doc.editor.getValue();
    const extension = (doc.path || doc.name).split('.').pop().toLowerCase();
    const patterns = {
        js: /^\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm,
        mjs: /^\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm,
        c: /^\s*(?!if\b|for\b|while\b)(?:[A-Za-z_]\w*[\s*]+)+([A-Za-z_]\w*)\s*\([^;]*\)\s*\{/gm,
        cpp: /^\s*(?!if\b|for\b|while\b)(?:[A-Za-z_]\w*[\s*]+)+([A-Za-z_]\w*)\s*\([^;]*\)\s*\{/gm,
        py: /^\s*def\s+([A-Za-z_]\w*)\s*\(/gm,
        java: /^\s*(?:public|private|protected|static|final|\s)+[\w<>\[\]]+\s+([A-Za-z_]\w*)\s*\(/gm,
        css: /^\s*([^@\n][^{]+)\s*\{/gm
    };
    const regex = patterns[extension];
    if (!regex) return [];
    const output = [];
    let match;
    while ((match = regex.exec(source))) output.push({ label: match[1].trim(), needle: match[0].trim() });
    return output;
}

function renderJumpList(hostId, items, emptyText) {
    const host = state.ui.getById(hostId);
    host.replaceChildren();
    const content = stack('tool-list');
    host.appendChild(content);
    if (!items.length) { content.appendChild(textNode(emptyText, 'tool-empty')); return; }
    for (const item of items) content.appendChild(button(item.label, () => {
        const doc = state.activeDocument;
        if (!doc) return;
        const range = doc.editor.find(item.needle, { backwards: false, caseSensitive: true, wholeWord: false });
        if (range) { doc.editor.selection.setRange(range); doc.editor.scrollToLine(range.start.row, true, true); doc.editor.focus(); }
    }));
}

function scheduleEditorTools() {
    clearTimeout(state.toolTimer);
    state.toolTimer = setTimeout(() => {
        renderJumpList('tags-tool-content', tagItems(state.activeDocument), 'No // tag: markers in the active file.');
        renderJumpList('navigator-tool-content', navigatorItems(state.activeDocument), 'No supported symbols in the active file.');
    }, 150);
}

function showOutput(result, command = '') {
    setOutputExpanded(true);
    setText('output-command', command ? '$ ' + command : '');
    setText('output-stdout', result?.stdout || '');
    setText('output-stderr', result?.stderr || '');
    setText('output-state', result?.exit_code == null ? '' : 'Exit ' + result.exit_code + (result.truncated ? ' · truncated' : ''));
}

function setOutputExpanded(expanded) {
    const panel = requiredControl('output-panel');
    const handle = requiredControl('output-resize-handle');
    panel.toggleAttribute('hidden', !expanded);
    handle.toggleAttribute('hidden', !expanded);
    panel.style.display = expanded ? '' : 'none';
    handle.style.display = expanded ? '' : 'none';
    if (expanded) setOutputHeight(state.outputHeight);
    requestAnimationFrame(() => state.documents.forEach(doc => doc.editor.resize()));
}

function setOutputHeight(height) {
    const panel = requiredControl('output-panel');
    const available = Math.max(120, document.body.clientHeight - 180);
    state.outputHeight = Math.max(96, Math.min(available, Math.round(Number(height) || 210)));
    panel.style.flexBasis = state.outputHeight + 'px';
    panel.style.height = state.outputHeight + 'px';
}

function bindOutputResizer() {
    const handle = requiredControl('output-resize-handle');
    let lastY = 0;
    const move = event => {
        const delta = event.clientY - lastY;
        lastY = event.clientY;
        setOutputHeight(state.outputHeight - delta);
        state.documents.forEach(doc => doc.editor.resize());
    };
    const stop = () => {
        handle.classList.remove('is-dragging');
        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', stop);
        document.removeEventListener('pointercancel', stop);
    };
    handle.addEventListener('pointerdown', event => {
        if (event.button !== 0) return;
        lastY = event.clientY;
        handle.classList.add('is-dragging');
        document.addEventListener('pointermove', move);
        document.addEventListener('pointerup', stop);
        document.addEventListener('pointercancel', stop);
        event.preventDefault();
    });
}

function paneWidthPreference(name) {
    try { return Number(localStorage.getItem('acaret.pane.' + name + '.width')) || 0; }
    catch (_error) { return 0; }
}

function savePaneWidthPreference(name, width) {
    try { localStorage.setItem('acaret.pane.' + name + '.width', String(Math.round(width))); }
    catch (_error) { /* preferences are optional */ }
}

function saveFoldersCollapsedPreference(collapsed) {
    try { localStorage.setItem('acaret.pane.folders.collapsed', collapsed ? 'true' : 'false'); }
    catch (_error) { /* preferences are optional */ }
}

function foldersCollapsedPreference() {
    try {
        const value = localStorage.getItem('acaret.pane.folders.collapsed');
        return value == null ? true : value === 'true';
    } catch (_error) { return true; }
}

function setFoldersCollapsed(collapsed) {
    const pane = requiredControl('folders-pane');
    const next = !!collapsed;
    if (next && !state.foldersCollapsed) {
        const current = pane.getBoundingClientRect().width;
        if (current >= 180) state.foldersExpandedWidth = current;
    }
    state.foldersCollapsed = next;
    pane.toggleAttribute('data-collapsed', next);
    if (next) {
        state.paneWidths.folders = 0;
        pane.style.display = 'none';
        pane.style.flexBasis = '0';
        pane.style.width = '0';
    } else {
        const width = Math.max(180, state.foldersExpandedWidth || paneWidthPreference('folders') || 260);
        state.paneWidths.folders = width;
        pane.style.display = '';
        pane.style.flexBasis = width + 'px';
        pane.style.width = width + 'px';
    }
    saveFoldersCollapsedPreference(next);
    state.documents.forEach(doc => doc.editor.resize());
}

function toolsCollapsedPreference() {
    try {
        const value = localStorage.getItem('acaret.pane.tools.collapsed');
        return value == null ? true : value === 'true';
    } catch (_error) { return true; }
}

function setToolsCollapsed(collapsed) {
    const pane = requiredControl('tools-pane');
    const resize = requiredControl('editor-tools-resize');
    const next = !!collapsed;
    if (next && !state.toolsCollapsed) {
        const current = pane.getBoundingClientRect().width;
        if (current >= 220) state.toolsExpandedWidth = current;
    }
    state.toolsCollapsed = next;
    pane.toggleAttribute('data-collapsed', next);
    resize.toggleAttribute('data-collapsed', next);
    pane.style.display = next ? 'none' : '';
    resize.style.display = next ? 'none' : '';
    if (!next) {
        const width = Math.max(220, state.toolsExpandedWidth || paneWidthPreference('tools') || 340);
        state.paneWidths.tools = width;
        pane.style.flexBasis = width + 'px';
        pane.style.width = width + 'px';
    }
    try { localStorage.setItem('acaret.pane.tools.collapsed', next ? 'true' : 'false'); }
    catch (_error) { /* preferences are optional */ }
    state.documents.forEach(doc => doc.editor.resize());
}

function setPaneWidth(name, width) {
    const pane = requiredControl(name === 'folders' ? 'folders-pane' : 'tools-pane');
    const workspace = requiredControl('workspace');
    const other = requiredControl(name === 'folders' ? 'tools-pane' : 'folders-pane');
    if (name === 'folders' && width < 110) {
        setFoldersCollapsed(true);
        return;
    }
    if (name === 'folders' && state.foldersCollapsed) {
        state.foldersCollapsed = false;
        pane.removeAttribute('data-collapsed');
        pane.style.display = '';
        saveFoldersCollapsedPreference(false);
    }
    const minimum = name === 'folders' ? 180 : 220;
    const maximum = Math.max(minimum, workspace.clientWidth - other.getBoundingClientRect().width - 320 - 16);
    const next = Math.max(minimum, Math.min(maximum, Math.round(width)));
    state.paneWidths[name] = next;
    if (name === 'folders') state.foldersExpandedWidth = next;
    if (name === 'tools') state.toolsExpandedWidth = next;
    pane.style.flexBasis = next + 'px';
    pane.style.width = next + 'px';
    state.documents.forEach(doc => doc.editor.resize());
}

function bindColumnResizers() {
    const foldersPane = requiredControl('folders-pane');
    const toolsPane = requiredControl('tools-pane');
    const foldersResize = requiredControl('folders-editor-resize');
    const toolsResize = requiredControl('editor-tools-resize');
    const storedFolders = paneWidthPreference('folders');
    const storedTools = paneWidthPreference('tools');
    let foldersDragWidth = 0;
    if (storedFolders) setPaneWidth('folders', storedFolders);
    if (storedTools) setPaneWidth('tools', storedTools);
    if (foldersCollapsedPreference()) setFoldersCollapsed(true);
    if (toolsCollapsedPreference()) setToolsCollapsed(true);

    foldersResize.addEventListener('kin-column-resize', event => {
        const current = foldersDragWidth || state.paneWidths.folders || foldersPane.getBoundingClientRect().width;
        foldersDragWidth = current + Number(event.detail?.deltaX || 0);
        setPaneWidth('folders', foldersDragWidth);
    });
    toolsResize.addEventListener('kin-column-resize', event => {
        const current = state.paneWidths.tools || toolsPane.getBoundingClientRect().width;
        setPaneWidth('tools', current - Number(event.detail?.deltaX || 0));
    });
    foldersResize.addEventListener('kin-column-resize-end', () => {
        if (!state.foldersCollapsed) {
            savePaneWidthPreference('folders', state.paneWidths.folders || foldersPane.getBoundingClientRect().width);
        }
        foldersDragWidth = 0;
    });
    toolsResize.addEventListener('kin-column-resize-end', () => {
        savePaneWidthPreference('tools', state.paneWidths.tools || toolsPane.getBoundingClientRect().width);
    });
}

function quoteShell(value) {
    return '"' + String(value).replace(/([\\"])/g, '\\$1') + '"';
}

async function runProject() {
    if (!state.project) throw new Error('Open a project first.');
    if (state.project.kind !== 'kindos-js') return launchApp();
    if (!await saveAll()) return;
    const entry = projectEntryPath(state.project);
    const command = 'jsexec ' + quoteShell(entry);
    showOutput({ stdout: '', stderr: '', exit_code: null }, command);
    setText('output-state', 'Running…');
    try { showOutput(await bridge.runShellLine(command, state.project.rootPath), command); }
    catch (error) { showOutput({ stdout: '', stderr: error.message, exit_code: 'error' }, command); }
}

async function previewProject() {
    if (!state.project || state.project.kind === 'kindos-js') throw new Error('Preview requires a KinUI project.');
    if (!await saveAll()) return;
    if (!window.kin?.classes?.Window) throw new Error('Kin window API unavailable.');
    new kin.classes.Window({
        entry: 'preview.mjs', packageId: 'kin_acaret', title: (state.project.displayName || state.project.name) + ' — KinUI Preview',
        width: 900, height: 680, module: true, quitOnClose: false,
        assets: [ { type: 'css', href: '../kin_ui/theme/kin-ui.css' }, { type: 'css', href: 'styles/preview.css' } ],
        query: { kin_open_path: projectUiPath(state.project) }
    });
}

async function previewCurrent() {
    const doc = state.activeDocument;
    if (doc && /\.(md|markdown)$/i.test(doc.path || doc.name)) {
        if (!await saveDocument(doc, false)) return;
        if (!window.kin?.classes?.Window) throw new Error('Kin window API unavailable.');
        new kin.classes.Window({
            entry: 'preview.mjs', packageId: 'kin_acaret', title: kinBasename(doc.path) + ' — Markdown Preview',
            width: 900, height: 680, module: true, quitOnClose: false,
            assets: [ { type: 'css', href: '../kin_ui/theme/kin-ui.css' }, { type: 'css', href: 'styles/preview.css' } ],
            query: { kin_open_path: doc.path, acaret_preview_mode: 'markdown' }
        });
        return;
    }
    return previewProject();
}

async function launchApp() {
    if (!state.project || state.project.kind === 'kindos-js') throw new Error('Launch requires a KinUI application project.');
    if (!await saveAll()) return;
    await bridge.launchVolumeApp(state.project.rootPath, state.project.entry, { title: state.project.displayName || state.project.name });
    setStatus('Launched ' + (state.project.displayName || state.project.name) + ' from ' + state.project.rootPath + '.');
}

async function openProjectInKlade() {
    if (!state.project || state.project.kind !== 'kinui-klade') throw new Error('This project does not use a Klade document.');
    if (!await saveAll()) return;
    bridge.launchRepositoryApp('klade', { kin_open_path: projectUiPath(state.project) });
}

async function openFileDialog() {
    const result = await kinWorkspaceOpenFileDialog({ mode: 'load', initialPath: state.currentFolder || state.project?.rootPath || 'Mountlist:' });
    return openFile(result.path || result.paths?.[0]);
}

function bindPress(id, handler) {
    requiredControl(id).addEventListener('kin-press', () => void perform(handler));
}

function decorateChromeButtons() {
    const buttons = [
        [ 'folders-disks', 'circle-stack' ], [ 'folders-project', 'arrow-uturn-left' ],
        [ 'folders-refresh', 'arrow-path' ],
        [ 'folders-new-file', 'document-plus' ], [ 'folders-new-folder', 'folder-plus' ],
        [ 'folders-rename', 'pencil-square' ], [ 'folders-trash', 'trash' ],
        [ 'output-clear', 'backspace' ], [ 'output-close', 'x-mark' ],
        [ 'output-toggle', 'command-line' ]
    ];
    for (const [id, icon] of buttons) {
        const node = state.ui.getById(id);
        decorateButton(node, icon, node?.getAttribute('label'));
    }
}

function bindMenus() {
    const actions = {
        'file.new': () => createDocument(),
        'project.new': renderNewProjectTool,
        'file.open': openFileDialog,
        'project.open': openProjectDialog,
        'file.save': () => saveDocument(state.activeDocument, false),
        'file.saveAs': () => saveDocument(state.activeDocument, true),
        'file.saveAll': saveAll,
        'file.close': () => closeDocument(state.activeDocument),
        'file.closeAll': () => closeAllDocuments(false),
        'edit.undo': () => state.activeDocument?.editor.execCommand('undo'),
        'edit.redo': () => state.activeDocument?.editor.execCommand('redo'),
        'edit.find': () => state.activeDocument?.editor.execCommand('find'),
        'edit.cut': () => clipboardAction('cut'),
        'edit.copy': () => clipboardAction('copy'),
        'edit.paste': () => clipboardAction('paste'),
        'view.toggleFolders': () => setFoldersCollapsed(!state.foldersCollapsed),
        'view.toggleTools': () => setToolsCollapsed(!state.toolsCollapsed),
        'run.project': runProject,
        'run.preview': previewCurrent,
        'run.launch': launchApp,
        'help.about': () => kinWorkspaceAlert('Acaret 1.1.9\n\nKinUI code editor and KinDOS project workspace.', { title: 'About Acaret' })
    };
    for (const [command, action] of Object.entries(actions)) state.ui.onMenuCommand(command, () => void perform(action));
}

async function clipboardAction(action) {
    const editor = state.activeDocument?.editor;
    if (!editor) return;
    if (!navigator.clipboard) { editor.execCommand(action); return; }
    if (action === 'paste') { editor.insert(await navigator.clipboard.readText()); return; }
    const value = editor.getSelectedText();
    if (!value) return;
    await navigator.clipboard.writeText(value);
    if (action === 'cut') editor.session.remove(editor.getSelectionRange());
}

function bindUi() {
    bindPress('folders-disks', showDisks);
    bindPress('folders-project', showProject);
    bindPress('folders-refresh', refreshFolderSelection);
    bindPress('folders-new-file', createFileInTree);
    bindPress('folders-new-folder', createFolderInTree);
    bindPress('folders-rename', renameSelected);
    bindPress('folders-trash', trashSelected);
    bindPress('output-toggle', () => {
        const panel = state.ui.getById('output-panel');
        setOutputExpanded(panel.hasAttribute('hidden'));
    });
    bindPress('output-close', () => setOutputExpanded(false));
    bindPress('output-clear', () => showOutput({ stdout: '', stderr: '', exit_code: null }));

    const tree = requiredControl('folders-tree');
    tree.addEventListener('kin-hierarchy-toggle', event => void perform(async () => {
        const node = treeFind(state.tree, event.detail.id);
        if (!node) return;
        node.expanded = !!event.detail.expanded;
        if (node.expanded) await loadNodeChildren(node);
        setTree();
    }));
    tree.addEventListener('kin-hierarchy-select', event => void perform(async () => {
        const node = treeFind(state.tree, event.detail.id) || event.detail.node;
        state.selectedNode = node;
        if (node.type === 'file') await openFile(node.id);
        else {
            state.currentFolder = asKinDirectory(node.id);
            updateFolderChrome();
        }
    }));

    editorTabs().addEventListener('kin-change', event => {
        if (event.detail?.name === 'selectedIndex') setActiveDocument(selectedDocumentFromTabs());
    });
    editorTabs().addEventListener('kin-tab-close', event => {
        const doc = state.panelDocuments.get(event.detail.panel);
        if (!doc) return;
        event.preventDefault();
        void perform(() => closeDocument(doc));
    });
    bindOutputResizer();
    bindColumnResizers();
    bindMenus();
}

async function start() {
    await loadClassicScript('./libs/ace/src-noconflict/ace.js');
    await KinUI.registerKinUIForTypes([ 'Input', 'Select', 'Switch' ]);
    const uiUrl = new URL('./ui.json', import.meta.url);
    uiUrl.searchParams.set('v', '1.1.9');
    state.ui = await KinUI.createAppAsync({ root: document.body, url: uiUrl, i18n: false });
    installEditorTabLayoutFix();
    decorateChromeButtons();
    bindUi();
    setOutputExpanded(false);
    renderProjectTool();
    renderTranslations();
    scheduleEditorTools();
    await refreshMountlist();
    const openPath = qp('kin_open_path') || qp('path');
    if (openPath) {
        const canonical = canonicalizeKinPath(openPath, { mounts: state.mounts });
        if (/\.acaret$/i.test(canonical)) await openProjectPath(canonical);
        else await openFile(canonical);
    }
    window.addEventListener('resize', () => state.documents.forEach(doc => doc.editor.resize()));
    window.addEventListener('beforeunload', event => {
        if (!dirtySummary().total) return;
        event.preventDefault();
        event.returnValue = '';
    });
    setStatus('Ready. ' + state.mounts.length + ' KinDOS disk(s) and assign(s) available.');
}

start().catch(error => {
    console.error(error);
    document.body.textContent = error?.message || String(error);
});
