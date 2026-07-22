import * as KinUI from '../kin_ui/kin-ui.js';
import { kinWorkspaceAlert } from '../kin_ui/workspace-dialogs.js';
import { readFile } from './js/bridge.mjs';
import { canonicalizeKinPath } from './js/kin-paths.mjs';

async function main() {
    const path = canonicalizeKinPath(new URLSearchParams(location.search).get('kin_open_path') || '');
    const source = await readFile(path);
    const mode = new URLSearchParams(location.search).get('acaret_preview_mode') || 'kinui';
    if (mode === 'markdown') {
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = new URL('./js/showdown.min.js', import.meta.url).href;
            script.onload = resolve;
            script.onerror = () => reject(new Error('Could not load Markdown preview support.'));
            document.head.appendChild(script);
        });
        const ui = await KinUI.createAppAsync({
            root: document.body,
            spec: { type: 'Application', children: [ { type: 'Column', id: 'preview-host', padding: '0' } ] }
        });
        const iframe = document.createElement('iframe');
        iframe.className = 'markdown-preview';
        iframe.title = 'Markdown preview';
        iframe.setAttribute('sandbox', '');
        const html = new globalThis.showdown.Converter({ tables: true, strikethrough: true, tasklists: true }).makeHtml(source);
        iframe.srcdoc = '<!doctype html><meta charset="utf-8"><style>body{font:16px system-ui;line-height:1.55;padding:24px;color:#222;background:#fff}pre{white-space:pre-wrap;background:#eee;padding:12px;border-radius:6px}img{max-width:100%}table{border-collapse:collapse}td,th{border:1px solid #bbb;padding:6px}</style>' + html;
        ui.getById('preview-host').appendChild(iframe);
        return;
    }
    if (source.trimStart().startsWith('<')) {
        await KinUI.createAppAsync({ root: document.body, xml: source });
    } else {
        await KinUI.createAppAsync({ root: document.body, spec: JSON.parse(source) });
    }
}

main().catch(async error => {
    console.error(error);
    document.body.textContent = error?.message || String(error);
    await kinWorkspaceAlert(error?.message || String(error), { title: 'KinUI Preview' });
});
