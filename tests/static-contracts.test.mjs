import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('../', import.meta.url);
async function filesBelow(relative) {
    const base = new URL(relative, root);
    const names = await readdir(base, { withFileTypes: true });
    const result = [];
    for (const item of names) {
        const child = relative + item.name + (item.isDirectory() ? '/' : '');
        if (item.isDirectory() && item.name !== 'libs') result.push(...await filesBelow(child));
        else if (item.isFile() && /\.(html|js|mjs|css|json)$/.test(item.name)) result.push(child);
    }
    return result;
}

test('application surface contains no removed feature hooks', async () => {
    const files = await filesBelow('kin/');
    const text = (await Promise.all(files.map(file => readFile(new URL(file, root), 'utf8')))).join('\n');
    for (const hook of ['page_chat', 'btn-chat', 'page_shop', 'btn-shop', 'page_ai_tools', 'page_flow_nodes', 'page_version_control', 'conversation.js']) {
        assert.equal(text.includes(hook), false, 'found removed hook: ' + hook);
    }
});

test('manifest and runtime contracts remain aligned', async () => {
    const manifest = JSON.parse(await readFile(new URL('kin/manifest.json', root), 'utf8'));
    assert.equal(manifest.id, 'kin_acaret'); assert.equal(manifest.entry, 'main.js'); assert.equal(manifest.heroIcon, 'code-bracket');
    const signals = await readFile(new URL('kin/js/signals.js', root), 'utf8');
    assert.match(signals, /\/api\/kindos\/shell-line/);
    assert.match(signals, /launchRepositoryApp/);
});
