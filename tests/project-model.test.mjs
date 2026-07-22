import test from 'node:test';
import assert from 'node:assert/strict';
import {
    normalizeProject,
    projectEntryPath,
    projectUiPath,
    serializeProject,
    synchronizedManifest
} from '../kin/js/project-model.mjs';

test('schema-1 KinUI projects migrate from manifest metadata', () => {
    const project = normalizeProject(
        { schema: 1, name: 'Demo', kind: 'kinui-json', entry: 'main.js' },
        '/Work:Projects/demo/project.acaret',
        { id: 'demo', displayName: 'Demo', entry: 'main.js', category: 'Development' }
    );
    assert.equal(project.schema, 2);
    assert.equal(project.sourceSchema, 1);
    assert.equal(project.rootPath, 'Work:Projects/demo');
    assert.equal(project.packageId, 'demo');
    assert.equal(project.uiDocument, 'ui.json');
    assert.equal(projectEntryPath(project), 'Work:Projects/demo/main.js');
    assert.equal(projectUiPath(project), 'Work:Projects/demo/ui.json');
});

test('schema-2 serialization excludes runtime paths and QuickJS package fields', () => {
    const project = normalizeProject({ schema: 2, name: 'Tool', kind: 'kindos-js', entry: 'main.js' }, 'Home:scripts/tool/project.acaret');
    assert.deepEqual(serializeProject(project), { schema: 2, name: 'Tool', kind: 'kindos-js', entry: 'main.js' });
});

test('manifest synchronization preserves unrelated fields and writes editable manifest metadata', () => {
    const project = normalizeProject({
        schema: 2, name: 'Source project', displayName: 'New name', kind: 'kinui-klade', entry: 'main.js', packageId: 'new-id',
        category: 'Development', version: '7', heroIcon: 'sparkles', icon: 'app.png', published: true,
        adminOnly: false, singleInstance: 'mode', uiDocument: 'main.klade',
        manifestLocales: { 'nb-NO': { displayName: 'Nytt navn', category: 'Utvikling' } }
    }, 'Home:Projects/new-id/project.acaret');
    const manifest = synchronizedManifest(project, { customMetadata: { retained: true } });
    assert.equal(manifest.id, 'new-id');
    assert.equal(manifest.displayName, 'New name');
    assert.equal(manifest.version, '7');
    assert.equal(manifest.heroIcon, 'sparkles');
    assert.equal(manifest.icon, 'app.png');
    assert.equal(manifest.singleInstance, 'mode');
    assert.equal(manifest.locales['nb-NO'].displayName, 'Nytt navn');
    assert.equal(manifest.locales['nb-NO'].category, 'Utvikling');
    assert.deepEqual(manifest.customMetadata, { retained: true });
    assert.deepEqual(serializeProject(project).manifestLocales, {
        'nb-NO': { displayName: 'Nytt navn', category: 'Utvikling' }
    });
});

test('invalid project paths and identifiers fail validation', () => {
    assert.throws(() => normalizeProject({
        schema: 2, name: 'Bad', kind: 'kinui-json', entry: '../main.js', packageId: 'Bad ID', category: '', uiDocument: '/ui.json'
    }, 'Home:Projects/bad/project.acaret'));
});
