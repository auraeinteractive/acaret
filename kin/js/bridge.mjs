import { canonicalizeKinPath, normalizeMountlist, sameKinVolume } from './kin-paths.mjs';

async function resultJson(response, fallback) {
    const result = await response.json().catch(() => ({}));
    if (!response.ok || ![ 'success', 'ok' ].includes(result.response)) {
        throw new Error(result.message || fallback || ('HTTP ' + response.status));
    }
    return result;
}

export async function readFile(path) {
    const kinPath = canonicalizeKinPath(path);
    const response = await fetch('/api/file/read', {
        method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json; charset=UTF-8' },
        body: JSON.stringify({ path: kinPath })
    });
    const result = await resultJson(response, 'Could not read ' + kinPath);
    if (result.encoding === 'base64') {
        const binary = atob(String(result.data || ''));
        return new TextDecoder('utf-8').decode(Uint8Array.from(binary, ch => ch.charCodeAt(0)));
    }
    return typeof result.data === 'string' ? result.data : '';
}

export async function writeFile(path, body) {
    const kinPath = canonicalizeKinPath(path);
    const text = String(body);
    // Kin's text route treats an empty body as missing. An empty base64 data
    // field is the supported way to truncate an existing file to zero bytes.
    const payload = JSON.stringify(text.length ? { path: kinPath, body: text } : { path: kinPath, data: '' });
    const response = await fetch('/api/file/write', {
        method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json; charset=UTF-8' },
        body: new Blob([payload], { type: 'application/json; charset=UTF-8' })
    });
    return resultJson(response, 'Could not write ' + kinPath);
}

export async function listDirectory(path) {
    const kinPath = canonicalizeKinPath(path);
    const response = await fetch('/api/dir', {
        method: 'POST', credentials: 'include', headers: { 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8' },
        body: new URLSearchParams({ path: kinPath }).toString()
    });
    const result = await resultJson(response, 'Could not list ' + kinPath);
    return Array.isArray(result.data) ? result.data : [];
}

export async function listKinVolumes() {
    return normalizeMountlist(await listDirectory('Mountlist:'));
}

async function command(name, values) {
    const response = await fetch('/api/commands/' + encodeURIComponent(name), {
        method: 'POST', credentials: 'include', headers: { 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8' },
        body: new URLSearchParams(values).toString()
    });
    return resultJson(response, name + ' failed');
}

export function makeDirectory(path) {
    return command('makedir', { path: canonicalizeKinPath(path) });
}

export function touchFile(path) {
    return command('touch', { path: canonicalizeKinPath(path) });
}

export function movePath(from, to) {
    const source = canonicalizeKinPath(from);
    const destination = canonicalizeKinPath(to);
    if (!sameKinVolume(source, destination)) throw new Error('KinDOS does not support cross-volume rename.');
    return command('move', { from: source, to: destination });
}

export function moveToTrash(path) {
    return command('delete', { path: canonicalizeKinPath(path), mode: 'TRASH' });
}

export async function runShellLine(line, cwd) {
    const response = await fetch('/api/kindos/shell-line', {
        method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ line: String(line), cwd: canonicalizeKinPath(cwd) })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.response !== 'ok') throw new Error(result.message || 'KinDOS execution failed.');
    return result;
}

export function launchRepositoryApp(packageId, params = {}) {
    if (parent !== window) parent.postMessage({ kinWorkspace: true, action: 'launchRepositoryApp', packageId, params }, window.location.origin);
}

export function launchVolumeApp(rootPath, entry, options = {}) {
    const volumeProgdir = canonicalizeKinPath(rootPath);
    const relativeEntry = String(entry || '').trim();
    if (!relativeEntry || relativeEntry.startsWith('/') || relativeEntry.includes(':') || relativeEntry.includes('\\') || relativeEntry.split('/').some(part => !part || part === '.' || part === '..')) {
        throw new Error('The application entry must be relative to the project folder.');
    }
    if (!globalThis.kin?.api?.send) throw new Error('Kin workspace launch API unavailable.');
    return globalThis.kin.api.send('openRepositoryWindow', {
        volumeProgdir,
        entry: relativeEntry,
        title: String(options.title || relativeEntry),
        width: Number(options.width) || 920,
        height: Number(options.height) || 640,
        quitOnClose: true
    });
}
