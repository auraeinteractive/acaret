import { canonicalizeKinPath, joinKinPath, kinDirname, validateRelativeProjectPath } from './kin-paths.mjs';

export const PROJECT_SCHEMA = 2;
export const PROJECT_KINDS = [ 'kinui-klade', 'kinui-json', 'kindos-js' ];

function manifestLocales(value) {
    const output = {};
    for (const [locale, metadata] of Object.entries(value && typeof value === 'object' ? value : {})) {
        if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) continue;
        output[String(locale)] = Object.assign({}, metadata, {
            displayName: String(metadata.displayName || ''),
            category: String(metadata.category || '')
        });
    }
    return output;
}

export function defaultUiDocument(kind) {
    return kind === 'kinui-klade' ? 'main.klade' : kind === 'kinui-json' ? 'ui.json' : '';
}

export function normalizeProject(raw, descriptorPath, manifest = null) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('project.acaret must contain a JSON object.');
    const descriptor = canonicalizeKinPath(descriptorPath);
    const rootPath = kinDirname(descriptor).replace(/\/$/, '');
    const kind = String(raw.kind || '').trim();
    if (!PROJECT_KINDS.includes(kind)) throw new Error('Unsupported Acaret project kind.');

    const packageId = kind === 'kindos-js' ? '' : String(raw.packageId || manifest?.id || '').trim();
    const category = kind === 'kindos-js' ? '' : String(raw.category || manifest?.category || 'Development').trim();
    const project = {
        schema: PROJECT_SCHEMA,
        sourceSchema: Number(raw.schema || 1),
        name: String(raw.name || manifest?.displayName || 'Unnamed project').trim(),
        displayName: kind === 'kindos-js' ? '' : String(raw.displayName || manifest?.displayName || raw.name || 'Unnamed project').trim(),
        kind,
        entry: validateRelativeProjectPath(raw.entry || manifest?.entry || 'main.js', 'Entry'),
        packageId,
        category,
        version: kind === 'kindos-js' ? '' : String(raw.version || manifest?.version || '1').trim(),
        heroIcon: kind === 'kindos-js' ? '' : String(raw.heroIcon || manifest?.heroIcon || '').trim(),
        icon: kind === 'kindos-js' ? '' : String(raw.icon || manifest?.icon || '').trim(),
        published: kind === 'kindos-js' ? false : (raw.published ?? manifest?.published ?? true) === true,
        adminOnly: kind === 'kindos-js' ? false : (raw.adminOnly ?? manifest?.adminOnly ?? false) === true,
        singleInstance: kind === 'kindos-js' ? false : (raw.singleInstance ?? manifest?.singleInstance ?? false),
        manifestLocales: kind === 'kindos-js' ? {} : manifestLocales(raw.manifestLocales || manifest?.locales),
        uiDocument: kind === 'kindos-js' ? '' : validateRelativeProjectPath(raw.uiDocument || defaultUiDocument(kind), 'UI document'),
        descriptorPath: descriptor,
        rootPath,
        dirty: false
    };
    validateProject(project);
    return project;
}

export function validateProject(project) {
    if (!project || typeof project !== 'object') throw new Error('No project is open.');
    if (!String(project.name || '').trim()) throw new Error('Project name is required.');
    if (!PROJECT_KINDS.includes(project.kind)) throw new Error('Unsupported project kind.');
    validateRelativeProjectPath(project.entry, 'Entry');
    if (project.kind !== 'kindos-js') {
        if (!/^[a-z][a-z0-9_-]*$/.test(String(project.packageId || ''))) {
            throw new Error('Package ID must start with a lowercase letter and contain only lowercase letters, numbers, hyphens, or underscores.');
        }
        if (!String(project.displayName || '').trim()) throw new Error('Manifest display name is required.');
        if (!String(project.category || '').trim()) throw new Error('Category is required.');
        if (!String(project.version || '').trim()) throw new Error('Version is required.');
        if (project.icon) validateRelativeProjectPath(project.icon, 'Icon');
        if (typeof project.singleInstance !== 'boolean' && !/^[A-Za-z_][A-Za-z0-9_-]*$/.test(String(project.singleInstance || ''))) {
            throw new Error('Single-instance query key must contain only letters, numbers, underscores, and hyphens.');
        }
        for (const [locale, metadata] of Object.entries(project.manifestLocales || {})) {
            if (!/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(locale)) throw new Error('Invalid manifest locale “' + locale + '”.');
            if (!metadata || typeof metadata !== 'object') throw new Error('Manifest locale metadata must be an object.');
            if (!String(metadata.displayName || '').trim()) throw new Error('Manifest locale “' + locale + '” requires a display name.');
            if (!String(metadata.category || '').trim()) throw new Error('Manifest locale “' + locale + '” requires a category.');
        }
        validateRelativeProjectPath(project.uiDocument, 'UI document');
    }
    return project;
}

export function serializeProject(project) {
    validateProject(project);
    const output = {
        schema: PROJECT_SCHEMA,
        name: String(project.name).trim(),
        kind: project.kind,
        entry: validateRelativeProjectPath(project.entry, 'Entry')
    };
    if (project.kind !== 'kindos-js') {
        output.packageId = String(project.packageId).trim();
        output.displayName = String(project.displayName).trim();
        output.category = String(project.category).trim();
        output.version = String(project.version).trim();
        output.heroIcon = String(project.heroIcon || '').trim();
        output.icon = String(project.icon || '').trim();
        output.published = project.published === true;
        output.adminOnly = project.adminOnly === true;
        output.singleInstance = project.singleInstance;
        output.manifestLocales = manifestLocales(project.manifestLocales);
        output.uiDocument = validateRelativeProjectPath(project.uiDocument, 'UI document');
    }
    return output;
}

export function synchronizedManifest(project, current = {}) {
    if (project.kind === 'kindos-js') return null;
    validateProject(project);
    const locales = manifestLocales(project.manifestLocales);
    const output = Object.assign({}, current, {
        id: project.packageId,
        displayName: project.displayName,
        entry: project.entry,
        category: project.category,
        version: project.version,
        published: project.published === true,
        adminOnly: project.adminOnly === true,
        locales
    });
    if (project.heroIcon) output.heroIcon = project.heroIcon;
    else delete output.heroIcon;
    if (project.icon) output.icon = project.icon;
    else delete output.icon;
    if (project.singleInstance) output.singleInstance = project.singleInstance;
    else delete output.singleInstance;
    return output;
}

export function projectEntryPath(project) {
    return joinKinPath(project.rootPath, project.entry);
}

export function projectUiPath(project) {
    return project.uiDocument ? joinKinPath(project.rootPath, project.uiDocument) : '';
}
