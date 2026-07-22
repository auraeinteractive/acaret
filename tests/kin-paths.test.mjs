import test from 'node:test';
import assert from 'node:assert/strict';
import {
    asKinDirectory,
    canonicalizeKinPath,
    isWithinKinRoot,
    joinKinPath,
    kinBasename,
    kinDirname,
    normalizeMountlist,
    parentKinPath,
    relativeKinPath,
    sameKinVolume,
    validateRelativeProjectPath
} from '../kin/js/kin-paths.mjs';

const mounts = normalizeMountlist([
    { filename: 'System:', kind: 'volume' },
    { filename: 'Home:', kind: 'volume' },
    { filename: 'Work:', kind: 'custom' },
    { filename: 'Commands:', kind: 'assign' },
    { filename: 'work:', kind: 'duplicate' },
    { filename: 'Trash:', kind: 'trash' }
]);

test('mountlist preserves arbitrary disks and assigns without duplicates', () => {
    assert.deepEqual(mounts.map(item => item.filename), [ 'System:', 'Home:', 'Work:', 'Commands:', 'Trash:' ]);
});

test('canonical Kin paths have no slash root', () => {
    assert.equal(canonicalizeKinPath('Home:'), 'Home:');
    assert.equal(canonicalizeKinPath('Home:scripts/'), 'Home:scripts/');
    assert.equal(canonicalizeKinPath('/Home:scripts/'), 'Home:scripts/');
    assert.equal(canonicalizeKinPath('Work:/Projects/demo'), 'Work:Projects/demo');
    assert.equal(canonicalizeKinPath('work:Projects', { mounts }), 'Work:Projects');
});

test('joining and parents follow volume semantics', () => {
    assert.equal(joinKinPath('Home:', 'scripts'), 'Home:scripts');
    assert.equal(joinKinPath('Work:Projects/', 'demo/main.js'), 'Work:Projects/demo/main.js');
    assert.equal(asKinDirectory('Work:Projects'), 'Work:Projects/');
    assert.equal(parentKinPath('Work:Projects/demo/'), 'Work:Projects/');
    assert.equal(parentKinPath('Work:Projects/'), 'Work:');
    assert.equal(parentKinPath('Work:'), null);
    assert.equal(kinDirname('Commands:mountlist'), 'Commands:');
    assert.equal(kinBasename('Home:scripts/daily.js'), 'daily.js');
});

test('project containment never crosses disks', () => {
    assert.equal(isWithinKinRoot('Work:demo/src/main.js', 'Work:demo'), true);
    assert.equal(isWithinKinRoot('Home:demo/src/main.js', 'Work:demo'), false);
    assert.equal(relativeKinPath('Work:demo/src/main.js', 'Work:demo'), 'src/main.js');
    assert.equal(sameKinVolume('WORK:a', 'Work:b'), true);
    assert.equal(sameKinVolume('Work:a', 'Home:a'), false);
});

test('invalid POSIX, traversal, and malformed paths are rejected', () => {
    for (const value of [ '/', '/tmp', 'Home:../secret', 'Home:foo//bar', 'Home:foo\\bar', ':foo', 'Home:foo:bar' ]) {
        assert.throws(() => canonicalizeKinPath(value), undefined, value);
    }
    for (const value of [ '/main.js', '../main.js', 'Work:main.js', 'foo\\bar', 'foo//bar' ]) {
        assert.throws(() => validateRelativeProjectPath(value), undefined, value);
    }
    assert.throws(() => canonicalizeKinPath('Archive:file', { mounts }), /not mounted/);
});
