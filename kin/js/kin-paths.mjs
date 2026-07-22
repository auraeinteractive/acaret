const VOLUME_RE = /^[^\\/:\u0000-\u001f]+$/;

export function canonicalizeKinPath(input, options = {}) {
    let value = String(input == null ? '' : input).trim();
    if (!value) throw new Error('A Kin path is required.');

    // Some older workspace surfaces returned /Home:path. Repair that boundary
    // form, but never model a slash root internally.
    if (/^\/+[^\\/:]+:/.test(value)) value = value.replace(/^\/+/, '');

    const colon = value.indexOf(':');
    if (colon <= 0 || value.indexOf(':', colon + 1) !== -1) {
        throw new Error('Kin paths must use Volume:relative/path syntax.');
    }
    const volume = value.slice(0, colon);
    if (!VOLUME_RE.test(volume)) throw new Error('Invalid Kin volume name.');

    let relative = value.slice(colon + 1);
    relative = relative.replace(/^\/+/, '');
    if (relative.includes('\\')) throw new Error('Kin paths use forward slashes after the volume name.');
    const trailingSlash = relative.endsWith('/');
    const parts = relative ? relative.split('/') : [];
    if (parts.some((part, index) => !part && index !== parts.length - 1)) {
        throw new Error('Kin paths cannot contain empty path segments.');
    }
    if (parts.some(part => part === '.' || part === '..')) {
        throw new Error('Kin paths cannot contain . or .. traversal.');
    }
    const clean = parts.filter(Boolean).join('/');
    let result = volume + ':' + clean;
    if (clean && trailingSlash) result += '/';

    if (options.mounts && options.mounts.length) {
        const match = options.mounts.find(item => volumeName(item).toLowerCase() === (volume + ':').toLowerCase());
        if (!match) throw new Error('Kin volume “' + volume + ':” is not mounted.');
        result = volumeName(match) + result.slice(colon + 1);
    }
    return result;
}

export function volumeName(item) {
    const raw = typeof item === 'string' ? item : item && (item.filename || item.name);
    const value = String(raw || '').trim().replace(/^\/+/, '');
    return value.endsWith(':') ? value : value + ':';
}

export function normalizeMountlist(entries) {
    const seen = new Set();
    const result = [];
    for (const entry of Array.isArray(entries) ? entries : []) {
        const name = volumeName(entry);
        try { canonicalizeKinPath(name); } catch (_error) { continue; }
        const key = name.toLowerCase();
        if (seen.has(key) || key === 'mountlist:') continue;
        seen.add(key);
        result.push(Object.assign({}, entry, { filename: name }));
    }
    return result;
}

export function kinVolume(path) {
    const value = canonicalizeKinPath(path);
    return value.slice(0, value.indexOf(':') + 1);
}

export function isVolumeRoot(path) {
    const value = canonicalizeKinPath(path);
    return value.endsWith(':');
}

export function asKinDirectory(path) {
    const value = canonicalizeKinPath(path);
    return value.endsWith(':') || value.endsWith('/') ? value : value + '/';
}

export function joinKinPath(base, child) {
    const root = canonicalizeKinPath(base).replace(/\/+$/, '');
    const name = String(child == null ? '' : child).trim();
    if (!name || name.includes(':') || name.includes('\\') || name.startsWith('/')) {
        throw new Error('A relative Kin path is required.');
    }
    const joined = root + (root.endsWith(':') ? '' : '/') + name;
    return canonicalizeKinPath(joined);
}

export function kinBasename(path) {
    const value = canonicalizeKinPath(path).replace(/\/+$/, '');
    const colon = value.indexOf(':');
    const slash = value.lastIndexOf('/');
    return value.slice(Math.max(colon, slash) + 1);
}

export function kinDirname(path) {
    const value = canonicalizeKinPath(path).replace(/\/+$/, '');
    const colon = value.indexOf(':');
    const slash = value.lastIndexOf('/');
    if (slash < colon) return value.slice(0, colon + 1);
    return value.slice(0, slash + 1);
}

export function parentKinPath(path) {
    const value = asKinDirectory(path).replace(/\/+$/, '');
    if (value.endsWith(':')) return null;
    return kinDirname(value);
}

export function sameKinVolume(left, right) {
    return kinVolume(left).toLowerCase() === kinVolume(right).toLowerCase();
}

export function isWithinKinRoot(path, root) {
    const value = canonicalizeKinPath(path);
    const base = canonicalizeKinPath(root).replace(/\/+$/, '');
    if (!sameKinVolume(value, base)) return false;
    return value === base || value.startsWith(base + '/');
}

export function relativeKinPath(path, root) {
    const value = canonicalizeKinPath(path);
    const base = canonicalizeKinPath(root).replace(/\/+$/, '');
    if (!isWithinKinRoot(value, base)) throw new Error('Path is outside the project root.');
    return value === base ? '' : value.slice(base.length + 1);
}

export function validateRelativeProjectPath(input, label = 'Path') {
    const value = String(input == null ? '' : input).trim();
    if (!value || value.startsWith('/') || value.includes(':') || value.includes('\\')) {
        throw new Error(label + ' must be relative to the project root.');
    }
    const parts = value.split('/');
    if (parts.some(part => !part || part === '.' || part === '..')) {
        throw new Error(label + ' contains an invalid path segment.');
    }
    return parts.join('/');
}

export function validLeafName(input) {
    const value = String(input == null ? '' : input).trim();
    if (!value || value === '.' || value === '..' || /[\\/:]/.test(value)) {
        throw new Error('Names cannot be empty or contain \\, /, or :.');
    }
    return value;
}
