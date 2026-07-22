import * as KinUI from '../kin_ui/kin-ui.js';
import { kinWorkspaceAlert } from '../kin_ui/workspace-dialogs.js';
import { generateProject, joinKinPath, slugify, validateProjectOptions } from './js/template-catalog.mjs';

const PEER = new URLSearchParams(location.search).get('kin_peer_instance') || '';
const INSTANCE = new URLSearchParams(location.search).get('kin_app_instance') || '';
let selectedTemplate = 'kinui-klade';
let ui;

async function apiJson(path, options, fallback) {
    const response = await fetch(path, options);
    const result = await response.json().catch(() => ({}));
    if (!response.ok || (result.response !== 'success' && result.response !== 'ok')) throw new Error(result.message || fallback);
    return result;
}
async function list(path) {
    return apiJson('/api/dir', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ path }).toString() }, 'Could not inspect destination');
}
async function mkdir(path) {
    return apiJson('/api/commands/makedir', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ path }).toString() }, 'Could not create folder');
}
async function write(path, body) {
    const payload = JSON.stringify({ path, body });
    return apiJson('/api/file/write', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json; charset=UTF-8' }, body: new Blob([payload], { type: 'application/json; charset=UTF-8' }) }, 'Could not write file');
}

function value(id) { return String(ui.getAttr(id, 'value') || '').trim(); }
function setText(id, text) { ui.setAttrs(id, { text: String(text || '') }); }
function templateLabel(id) { return { 'kinui-klade': 'KinUI App — Klade', 'kinui-json': 'KinUI App — JSON', 'kindos-js': 'KinDOS QuickJS Module' }[id]; }

function syncDerivedId() {
    const id = slugify(value('project-name'));
    if (!value('project-id') || ui.getById('project-id').dataset.auto === 'true') {
        ui.setAttrs('project-id', { value: id }); ui.getById('project-id').dataset.auto = 'true';
    }
    updatePreview();
}
function options() {
    return { template: selectedTemplate, name: value('project-name'), id: value('project-id'), location: value('project-location'), category: value('project-category') || 'Development' };
}
function updatePreview() {
    const o = options(); const errors = validateProjectOptions(o);
    if (errors.length) { setText('project-preview', errors[0]); return; }
    try {
        const project = generateProject(o);
        setText('project-preview', templateLabel(selectedTemplate) + '\n' + project.rootPath + '\n\n' + project.files.map(file => '• ' + file.path).join('\n'));
    } catch (error) { setText('project-preview', error.message); }
}

async function createProject() {
    try {
        const generated = generateProject(options());
        try {
            const existing = await list(generated.rootPath);
            if (Array.isArray(existing.data) && existing.data.length) throw new Error('The destination folder is not empty. Choose a new project ID or location.');
        } catch (error) {
            if (/not empty/i.test(error.message)) throw error;
            await mkdir(generated.rootPath);
        }
        for (const dir of generated.directories) await mkdir(joinKinPath(generated.rootPath, dir));
        let completed = 0;
        for (const file of generated.files) {
            setText('project-status', 'Writing ' + file.path + '…');
            await write(joinKinPath(generated.rootPath, file.path), file.body); completed++;
            ui.setAttrs('project-progress', { value: String(Math.round(completed / generated.files.length * 100)) });
        }
        setText('project-status', 'Project created.');
        if (PEER && window.kin?.api?.sendPeerMessage) kin.api.sendPeerMessage(PEER, 'acaret.project-created', generated);
        if (window.kin?.api?.send && INSTANCE) await kin.api.send('closeWindow', { instanceId: INSTANCE });
    } catch (error) {
        setText('project-status', error.message); await kinWorkspaceAlert(error.message, { title: 'New project' });
    }
}

async function main() {
    const spec = { type: 'Application', children: [ { type: 'Row', id: 'wizard-layout', gap: '18px', padding: '18px', children: [
        { type: 'Column', id: 'template-list', gap: '8px', children: [
            { type: 'Text', text: 'Choose a template' },
            { type: 'Button', id: 'template-klade', label: 'KinUI App — _Klade' },
            { type: 'Button', id: 'template-json', label: 'KinUI App — _JSON' },
            { type: 'Button', id: 'template-script', label: 'KinDOS _QuickJS Module' }
        ] },
        { type: 'Column', id: 'project-form', gap: '9px', children: [
            { type: 'Text', text: 'Project details' },
            { type: 'Input', id: 'project-name', label: 'Name', value: 'My Kin App' },
            { type: 'Input', id: 'project-id', label: 'Project ID', value: 'my-kin-app' },
            { type: 'Input', id: 'project-location', label: 'Location', value: 'Home:Projects' },
            { type: 'Input', id: 'project-category', label: 'Category', value: 'Development' },
            { type: 'Progress', id: 'project-progress', value: '0', max: '100' },
            { type: 'Text', id: 'project-status', text: '' },
            { type: 'Button', id: 'project-create', label: '_Create project' }
        ] },
        { type: 'ScrollRegion', id: 'preview-region', children: [ { type: 'Text', id: 'project-preview', text: '' } ] }
    ] } ] };
    ui = await KinUI.createAppAsync({ root: document.body, spec });
    ui.getById('project-id').dataset.auto = 'true';
    ui.getById('project-name').addEventListener('kin-change', syncDerivedId);
    ui.getById('project-id').addEventListener('kin-change', () => { ui.getById('project-id').dataset.auto = 'false'; updatePreview(); });
    ['project-location', 'project-category'].forEach(id => ui.getById(id).addEventListener('kin-change', updatePreview));
    [['template-klade', 'kinui-klade'], ['template-json', 'kinui-json'], ['template-script', 'kindos-js']].forEach(([id, template]) => {
        ui.getById(id).addEventListener('kin-press', () => {
            selectedTemplate = template;
            if (template === 'kindos-js' && value('project-location') === 'Home:Projects') ui.setAttrs('project-location', { value: 'Home:scripts' });
            if (template !== 'kindos-js' && value('project-location') === 'Home:scripts') ui.setAttrs('project-location', { value: 'Home:Projects' });
            updatePreview();
        });
    });
    ui.getById('project-create').addEventListener('kin-press', createProject);
    updatePreview();
}

main().catch(error => { console.error(error); document.body.textContent = error.message || String(error); });
