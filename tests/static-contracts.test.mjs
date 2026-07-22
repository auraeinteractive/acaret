import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);

test('Acaret uses the standard KinUI module bootstrap', async () => {
    const manifest = JSON.parse(await readFile(new URL('kin/manifest.json', root), 'utf8'));
    const main = await readFile(new URL('kin/main-1.1.9.js', root), 'utf8');
    const bootstrap = await readFile(new URL('kin/app-1.1.9.mjs', root), 'utf8');
    const app = await readFile(new URL('kin/app.mjs', root), 'utf8');
    assert.equal(manifest.id, 'kin_acaret');
    assert.equal(manifest.entry, 'main-1.1.9.js');
    assert.match(main, /entry:\s*'app-1\.1\.9\.mjs'/);
    assert.match(main, /styles\/main-1\.1\.9\.css/);
    assert.match(bootstrap, /import '\.\/app\.mjs\?v=1\.1\.9'/);
    assert.match(main, /module:\s*true/);
    assert.match(app, /KinUI\.createAppAsync/);
    assert.match(app, /KinUI\.createElementFromIR/);
    assert.match(app, /registerKinUIForTypes\(\[ 'Input', 'Select', 'Switch' \]\)/);
    assert.match(app, /heroIconElement/);
    assert.match(app, /decorateChromeButtons/);
    assert.match(app, /uiUrl\.searchParams\.set\('v', '1\.1\.9'\)/);
    assert.match(app, /createAppAsync\(\{ root: document\.body, url: uiUrl, i18n: false \}\)/);
    assert.match(app, /requiredControl\(id\)\.addEventListener/);
    assert.match(app, /launchVolumeApp\(state\.project\.rootPath, state\.project\.entry/);
    await assert.rejects(access(new URL('kin/index.html', root)));
});

test('the complete interactive shell is a KinUI document', async () => {
    const documentValue = JSON.parse(await readFile(new URL('kin/ui.json', root), 'utf8'));
    assert.equal(documentValue.schema, 1);
    assert.equal(documentValue.root.type, 'Application');
    const types = [];
    function visit(node) {
        types.push(node.type);
        for (const child of node.children || []) visit(child);
        for (const panel of node.panels || []) for (const child of panel.children || []) visit(child);
    }
    visit(documentValue.root);
    for (const required of [ 'Application', 'Row', 'Column', 'ColumnResize', 'Button', 'Tabs', 'HierarchyTree', 'ScrollRegion', 'Text' ]) {
        assert.ok(types.includes(required), 'missing KinUI component ' + required);
    }
    assert.ok(Object.keys(documentValue.menus).length >= 4);
    assert.equal(types.filter(type => type === 'Button').length > 0, true);
    assert.doesNotMatch(JSON.stringify(documentValue), /main-toolbar|toolbar-project/);
    for (const id of [ 'folders-disks', 'folders-project', 'editor-language', 'editor-save-state', 'editor-position', 'editor-input-mode' ]) {
        assert.match(JSON.stringify(documentValue), new RegExp('"id":"?' + id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }
});

test('project browsing is focused and reversible', async () => {
    const app = await readFile(new URL('kin/app.mjs', root), 'utf8');
    assert.match(app, /browserMode:\s*'disks'/);
    assert.match(app, /async function showProject\(\)/);
    assert.match(app, /state\.tree = \[ root \]/);
    assert.match(app, /relativeKinPath\(state\.currentFolder \|\| state\.project\.rootPath, state\.project\.rootPath\)/);
    assert.match(app, /bindPress\('folders-project', showProject\)/);
});

test('editor status follows ACE state', async () => {
    const app = await readFile(new URL('kin/app.mjs', root), 'utf8');
    assert.match(app, /editorLanguage\(doc\.editor\)/);
    assert.match(app, /doc\.dirty \? 'Changed' : 'Saved'/);
    assert.match(app, /'Ln ' \+ \(cursor\.row \+ 1\) \+ ', Col ' \+ \(cursor\.column \+ 1\)/);
    assert.match(app, /getOverwrite\(\) \? 'OVR' : 'INS'/);
    assert.match(app, /changeCursor/);
    assert.match(app, /changeOverwrite/);
});

test('closable editor tabs reserve space for the close icon', async () => {
    const app = await readFile(new URL('kin/app.mjs', root), 'utf8');
    assert.match(app, /function installEditorTabLayoutFix\(\)/);
    assert.match(app, /\.tab-wrap\.has-close \{ min-width: 6rem; max-width: 14rem; \}/);
    assert.match(app, /padding-right: 2\.35rem !important/);
    assert.match(app, /\.tab-wrap\.has-close \.tab-label/);
});

test('output is a collapsed resizable drawer', async () => {
    const app = await readFile(new URL('kin/app.mjs', root), 'utf8');
    const documentValue = JSON.parse(await readFile(new URL('kin/ui.json', root), 'utf8'));
    const source = JSON.stringify(documentValue);
    assert.match(source, /"id":"output-resize-handle","hidden":true/);
    assert.match(source, /"id":"output-panel"[^}]*"hidden":true/);
    assert.match(app, /function setOutputExpanded\(expanded\)/);
    assert.match(app, /function setOutputHeight\(height\)/);
    assert.match(app, /function bindOutputResizer\(\)/);
    assert.match(app, /state\.outputHeight - delta/);
    assert.match(app, /panel\.style\.display = expanded \? '' : 'none'/);
    assert.match(app, /setOutputExpanded\(false\)/);
});

test('workspace columns use KinUI resize controls and persist widths', async () => {
    const app = await readFile(new URL('kin/app.mjs', root), 'utf8');
    const source = await readFile(new URL('kin/ui.json', root), 'utf8');
    assert.match(source, /"type": "ColumnResize", "id": "folders-editor-resize"/);
    assert.match(source, /"type": "ColumnResize", "id": "editor-tools-resize"/);
    assert.match(app, /kin-column-resize/);
    assert.match(app, /function bindColumnResizers\(\)/);
    assert.match(app, /localStorage\.setItem\('acaret\.pane\.' \+ name \+ '\.width'/);
    assert.match(app, /function setFoldersCollapsed\(collapsed\)/);
    assert.match(app, /foldersDragWidth = current \+ Number/);
    assert.doesNotMatch(app, /folders-collapse/);
    assert.match(app, /'view\.toggleFolders': \(\) => setFoldersCollapsed/);
    assert.match(app, /'view\.toggleTools': \(\) => setToolsCollapsed/);
});

test('View menu controls both side panels', async () => {
    const documentValue = JSON.parse(await readFile(new URL('kin/ui.json', root), 'utf8'));
    assert.deepEqual(documentValue.menus.View.map(item => item.command), [ 'view.toggleFolders', 'view.toggleTools' ]);
    const app = await readFile(new URL('kin/app.mjs', root), 'utf8');
    assert.match(app, /return value == null \? true : value === 'true'/);
});

test('Navigator is the default Tools tab', async () => {
    const documentValue = JSON.parse(await readFile(new URL('kin/ui.json', root), 'utf8'));
    let toolsTabs = null;
    function visit(node) {
        if (node.id === 'tool-tabs') toolsTabs = node;
        for (const child of node.children || []) visit(child);
        for (const panel of node.panels || []) for (const child of panel.children || []) visit(child);
    }
    visit(documentValue.root);
    assert.equal(toolsTabs.panels[0].id, 'navigator-tool');
});

test('disk and project navigation buttons have exclusive visibility', async () => {
    const app = await readFile(new URL('kin/app.mjs', root), 'utf8');
    assert.match(app, /const showDisksButton = inProject/);
    assert.match(app, /const showProjectButton = !inProject && !!state\.project/);
    assert.match(app, /disksButton\.style\.display = showDisksButton \? '' : 'none'/);
    assert.match(app, /projectButton\.style\.display = showProjectButton \? '' : 'none'/);
    assert.doesNotMatch(app, /folders-up|function goUp/);
});

test('every statically bound startup control exists in the KinUI document', async () => {
    const app = await readFile(new URL('kin/app.mjs', root), 'utf8');
    const documentValue = JSON.parse(await readFile(new URL('kin/ui.json', root), 'utf8'));
    const ids = new Set();
    function visit(node) {
        if (node.id) ids.add(node.id);
        for (const child of node.children || []) visit(child);
        for (const panel of node.panels || []) {
            if (panel.id) ids.add(panel.id);
            for (const child of panel.children || []) visit(child);
        }
    }
    visit(documentValue.root);
    const boundIds = Array.from(app.matchAll(/bindPress\('([^']+)'/g), match => match[1]);
    for (const id of [ ...boundIds, 'folders-tree', 'editor-tabs' ]) {
        assert.ok(ids.has(id), 'startup binding references missing KinUI component ' + id);
    }
});

test('application code does not recreate native interactive controls', async () => {
    const app = await readFile(new URL('kin/app.mjs', root), 'utf8');
    assert.doesNotMatch(app, /createElement\(\s*['"](?:button|input|select|textarea)['"]\s*\)/);
    assert.doesNotMatch(app, /innerHTML\s*=/);
});

test('Kin integration is centralized in the module bridge', async () => {
    const bridge = await readFile(new URL('kin/js/bridge.mjs', root), 'utf8');
    assert.match(bridge, /listDirectory\('Mountlist:'\)/);
    assert.match(bridge, /command\('touch'/);
    assert.match(bridge, /openRepositoryWindow/);
    assert.match(bridge, /volumeProgdir/);
    assert.match(bridge, /\/api\/kindos\/shell-line/);
    assert.match(bridge, /\/api\/commands\//);
    assert.match(bridge, /launchRepositoryApp/);
});

test('source contains no POSIX-style Kin root literals', async () => {
    const files = [ 'kin/app.mjs', 'kin/preview.mjs', 'kin/js/bridge.mjs', 'kin/js/project-model.mjs', 'kin/js/template-catalog.mjs' ];
    const source = (await Promise.all(files.map(file => readFile(new URL(file, root), 'utf8')))).join('\n');
    assert.doesNotMatch(source, /['"]\/(?:Home|Work|System):/);
    assert.doesNotMatch(source, /['"]\/(?:tmp|home|var)\//);
});
