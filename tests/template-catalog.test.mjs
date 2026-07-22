import test from 'node:test';
import assert from 'node:assert/strict';
import { generateProject, joinKinPath, slugify, validateProjectOptions } from '../kin/js/template-catalog.mjs';

test('Kin paths and project identifiers are normalized', () => {
    assert.equal(joinKinPath('Home:Projects/', 'demo'), 'Home:Projects/demo');
    assert.throws(() => joinKinPath('Home:Projects/', '/demo'));
    assert.equal(joinKinPath('Home:', 'demo'), 'Home:demo');
    assert.equal(slugify(' My Kin App! '), 'my-kin-app');
    assert.deepEqual(validateProjectOptions({ template: 'kindos-js', name: 'Demo', id: 'demo', location: 'Home:scripts' }), []);
    assert.ok(validateProjectOptions({ template: 'unknown', name: '', id: '../bad', location: '/tmp' }).length >= 3);
});

for (const template of ['kinui-klade', 'kinui-json', 'kindos-js']) {
    test(template + ' produces a valid schema-2 project', () => {
        const generated = generateProject({ template, name: 'Demo', id: 'demo', location: 'Home:Projects', category: 'Development' });
        assert.equal(generated.rootPath, 'Home:Projects/demo');
        assert.equal(generated.project.schema, 2);
        assert.equal(generated.project.kind, template);
        assert.ok(generated.files.some(file => file.path === 'project.acaret'));
        for (const file of generated.files.filter(file => /\.json$|\.klade$|\.acaret$/.test(file.path))) assert.doesNotThrow(() => JSON.parse(file.body));
    });
}

test('KinUI templates use KinUI and the selected UI document', () => {
    const klade = generateProject({
        template: 'kinui-klade', name: 'Demo source', displayName: 'Demo', id: 'demo', location: 'Home:Projects',
        category: 'Office', version: '4', heroIcon: 'pencil-square', icon: 'app.png', published: true,
        adminOnly: false, singleInstance: 'mode', manifestLocales: {
            'en-US': { displayName: 'Demo', category: 'Office' },
            'nb-NO': { displayName: 'Demo', category: 'Kontor' }
        }
    });
    assert.ok(klade.files.some(file => file.path === 'main.klade'));
    assert.match(klade.files.find(file => file.path === 'app.js').body, /createAppAsync/);
    const manifest = JSON.parse(klade.files.find(file => file.path === 'manifest.json').body);
    assert.equal(manifest.displayName, 'Demo');
    assert.equal(manifest.category, 'Office');
    assert.equal(manifest.version, '4');
    assert.equal(manifest.heroIcon, 'pencil-square');
    assert.equal(manifest.icon, 'app.png');
    assert.equal(manifest.singleInstance, 'mode');
    assert.equal(manifest.locales['nb-NO'].category, 'Kontor');
    const json = generateProject({ template: 'kinui-json', name: 'Demo', id: 'demo', location: 'Home:Projects' });
    assert.ok(json.files.some(file => file.path === 'ui.json'));
    assert.equal(json.project.packageId, 'demo');
    assert.equal(json.project.uiDocument, 'ui.json');
});

test('QuickJS template targets KinDOS rather than Node.js', () => {
    const generated = generateProject({ template: 'kindos-js', name: 'Tool', id: 'tool', location: 'Home:scripts' });
    const source = generated.files.find(file => file.path === 'main.js').body;
    assert.match(source, /kin:sys/); assert.match(source, /kin:dos/);
    assert.match(source, /cwd\(\)/);
    assert.doesNotMatch(source, /Home:/);
    assert.doesNotMatch(source, /node:|require\s*\(/);
});
