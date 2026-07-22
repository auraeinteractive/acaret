import { canonicalizeKinPath, joinKinPath } from './kin-paths.mjs';

export { joinKinPath } from './kin-paths.mjs';
export const TEMPLATE_IDS = [ 'kinui-klade', 'kinui-json', 'kindos-js' ];

export function slugify(value) {
    return String(value || '').trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
}

export function validateProjectOptions(options) {
    const o = options || {};
    const errors = [];
    if (!TEMPLATE_IDS.includes(o.template)) errors.push('Choose a project template.');
    if (!String(o.name || '').trim()) errors.push('Enter a project name.');
    if (!/^[a-z][a-z0-9_-]*$/.test(String(o.id || ''))) errors.push('The project ID must start with a letter and contain only lowercase letters, numbers, hyphens, and underscores.');
    if (o.template !== 'kindos-js' && !String(o.version || '1').trim()) errors.push('Enter a manifest version.');
    if (o.template !== 'kindos-js' && o.icon) {
        const icon = String(o.icon).trim();
        if (icon.startsWith('/') || icon.includes(':') || icon.includes('\\') || icon.split('/').some(part => !part || part === '.' || part === '..')) {
            errors.push('The application icon must be a project-relative path.');
        }
    }
    if (o.template !== 'kindos-js' && o.singleInstance != null && typeof o.singleInstance !== 'boolean' && !/^[A-Za-z_][A-Za-z0-9_-]*$/.test(String(o.singleInstance || ''))) {
        errors.push('The single-instance query key is invalid.');
    }
    if (o.template !== 'kindos-js') {
        for (const [locale, metadata] of Object.entries(o.manifestLocales || {})) {
            if (!/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(locale)) errors.push('Manifest locale “' + locale + '” is invalid.');
            if (!String(metadata?.displayName || '').trim()) errors.push('Manifest locale “' + locale + '” requires a display name.');
            if (!String(metadata?.category || '').trim()) errors.push('Manifest locale “' + locale + '” requires a category.');
        }
    }
    try { canonicalizeKinPath(o.location); }
    catch (_error) { errors.push('Choose a valid mounted Kin destination such as Home:Projects or Work:Development.'); }
    return errors;
}

function manifestLocaleMetadata(o) {
    const locales = {};
    const source = Object.keys(o.manifestLocales || {}).length ? o.manifestLocales : {
        'en-US': { displayName: o.displayName || o.name, category: o.category || 'Development' },
        'nb-NO': { displayName: o.displayName || o.name, category: o.category === 'Development' || !o.category ? 'Utvikling' : o.category }
    };
    for (const [locale, metadata] of Object.entries(source)) {
        locales[locale] = Object.assign({}, metadata, {
            displayName: String(metadata?.displayName || o.displayName || o.name),
            category: String(metadata?.category || o.category || 'Development')
        });
    }
    return locales;
}

function manifest(o) {
    const locales = manifestLocaleMetadata(o);
    return JSON.stringify({
        id: o.id,
        category: o.category || 'Development',
        displayName: o.displayName || o.name,
        version: String(o.version || '1'),
        entry: 'main.js',
        ...(o.heroIcon ? { heroIcon: String(o.heroIcon) } : {}),
        ...(o.icon ? { icon: String(o.icon) } : {}),
        published: o.published !== false,
        adminOnly: o.adminOnly === true,
        ...(o.singleInstance ? { singleInstance: o.singleInstance } : {}),
        locales
    }, null, 2) + '\n';
}

function mainJs(o) {
    return `( function() {\n    function qp( name ) { try { return new URLSearchParams( location.search ).get( name ) || ''; } catch( _e ) { return ''; } }\n    if( !window.kin || !kin.classes || !kin.classes.Window ) { console.error( ${JSON.stringify(o.id + ': Kin app API unavailable')} ); return; }\n    new kin.classes.Window( {\n        entry: 'app.js', packageId: qp( 'kin_repo_package' ) || ${JSON.stringify(o.id)}, title: ${JSON.stringify(o.displayName || o.name)},\n        width: 800, height: 600, quitOnClose: true, module: true,\n        assets: [ { type: 'css', href: '../kin_ui/theme/kin-ui.css' }, { type: 'css', href: 'app-view.css' } ]\n    } );\n} )();\n`;
}

function appJs(o) {
    const source = o.template === 'kinui-klade'
        ? `const ui = await KinUI.createAppAsync( { root: host, url: new URL( './main.klade', import.meta.url ) } );`
        : `const response = await fetch( new URL( './ui.json', import.meta.url ), { cache: 'no-store' } );\n    if( !response.ok ) throw new Error( 'Could not load ui.json' );\n    const ui = await KinUI.createAppAsync( { root: host, spec: await response.json() } );`;
    return `import * as KinUI from '../kin_ui/kin-ui.js';\n\nasync function main() {\n    let host = document.getElementById( 'host' );\n    if( !host ) { host = document.createElement( 'div' ); host.id = 'host'; document.body.replaceChildren( host ); }\n    ${source}\n    ui.getById( 'welcome-action' )?.addEventListener( 'kin-press', () => {\n        ui.setAttrs( 'welcome-body', { text: 'Your Kin application is ready.' } );\n    } );\n}\n\nmain().catch( ( error ) => { console.error( error ); document.body.textContent = error.message || String( error ); } );\n`;
}

function uiDocument(o) {
    return JSON.stringify({
        schema: 1,
        root: { type: 'Application', children: [ { type: 'Column', id: 'main-column', gap: '12px', padding: '16px', children: [
            { type: 'Text', id: 'welcome-body', text: { i18nKey: 'ui.welcome.body', fallback: 'Start building your Kin application.' } },
            { type: 'Button', id: 'welcome-action', label: { i18nKey: 'ui.welcome.action', fallback: '_Continue' } }
        ] } ] }
    }, null, 2) + '\n';
}

function locale(o, norwegian) {
    return JSON.stringify({
        'manifest.displayName': o.displayName || o.name,
        'manifest.category': norwegian ? 'Utvikling' : (o.category || 'Development'),
        'ui.welcome.body': norwegian ? 'Begynn å bygge Kin-applikasjonen din.' : 'Start building your Kin application.',
        'ui.welcome.action': norwegian ? '_Fortsett' : '_Continue'
    }, null, 2) + '\n';
}

function descriptor(o) {
    return JSON.stringify({
        schema: 2, name: o.name, kind: o.template, entry: 'main.js',
        ...(o.template === 'kindos-js' ? {} : {
            packageId: o.id,
            displayName: o.displayName || o.name,
            category: o.category || 'Development',
            version: String(o.version || '1'),
            heroIcon: String(o.heroIcon || ''),
            icon: String(o.icon || ''),
            published: o.published !== false,
            adminOnly: o.adminOnly === true,
            singleInstance: o.singleInstance ?? false,
            manifestLocales: manifestLocaleMetadata(o),
            uiDocument: o.template === 'kinui-klade' ? 'main.klade' : 'ui.json'
        })
    }, null, 2) + '\n';
}

export function generateProject(options) {
    const o = Object.assign({}, options, { name: String(options.name).trim(), id: slugify(options.id) });
    const errors = validateProjectOptions(o); if (errors.length) throw new Error(errors.join('\n'));
    const rootPath = joinKinPath(o.location, o.id);
    if (o.template === 'kindos-js') {
        const script = `import { echo, date, time, cwd } from "kin:sys";\nimport { dir } from "kin:dos";\n\necho( \`KinDOS JavaScript — \${date()} \${time()}\` );\nconst workingDirectory = cwd();\necho( \`Working directory: \${workingDirectory}\` );\necho( JSON.stringify( dir( workingDirectory ), null, 2 ) );\n`;
        return {
            rootPath,
            entryPath: joinKinPath(rootPath, 'main.js'),
            descriptorPath: joinKinPath(rootPath, 'project.acaret'),
            project: JSON.parse(descriptor(o)),
            directories: [],
            files: [
                { path: 'main.js', body: script },
                { path: 'README.md', body: `# ${o.name}\n\nRun this restricted QuickJS module with:\n\n\`\`\`text\njsexec ${joinKinPath(rootPath, 'main.js')}\n\`\`\`\n\nKinDOS JavaScript is not Node.js. Use \`kin:sys\`, \`kin:dos\`, relative \`.js\` imports, or complete Kin paths.\n` },
                { path: 'project.acaret', body: descriptor(o) }
            ]
        };
    }
    const uiName = o.template === 'kinui-klade' ? 'main.klade' : 'ui.json';
    return {
        rootPath,
        entryPath: joinKinPath(rootPath, 'main.js'),
        descriptorPath: joinKinPath(rootPath, 'project.acaret'),
        project: JSON.parse(descriptor(o)),
        directories: [ 'locale' ],
        files: [
            { path: 'manifest.json', body: manifest(o) }, { path: 'main.js', body: mainJs(o) },
            { path: 'app.js', body: appJs(o) },
            { path: 'app-view.css', body: `html, body, #host, kin-ui-app { width: 100%; height: 100%; margin: 0; min-height: 0; }\nbody { background: var(--KinPenWindow); color: var(--KinPenText); }\n` },
            { path: uiName, body: uiDocument(o) }, { path: 'locale/en-US.json', body: locale(o, false) },
            { path: 'locale/nb-NO.json', body: locale(o, true) },
            { path: 'README.md', body: `# ${o.name}\n\nKinUI application generated by Acaret. Use **Launch app** in Acaret while developing from this KinDOS folder. Copy the completed package into the Kin repository when it is ready to be installed or published as \`${o.id}\`.\n` },
            { path: 'project.acaret', body: descriptor(o) }
        ]
    };
}
