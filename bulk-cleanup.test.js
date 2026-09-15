const { test } = require('node:test');
const assert = require('node:assert/strict');
const { candidates, validateSelection } = require('./public/bulk-cleanup-model');
const project = { id: 'project', versions: [
    { id: 'new-test', version: '1.0', platform: 'android', environment: 'test', uploadedAt: '2026-09-10T12:00:00Z' },
    { id: 'old-test', version: '1.0', platform: 'android', environment: 'test', uploadedAt: '2026-01-10T12:00:00Z' },
    { id: 'old-prod', version: '1.0', platform: 'android', environment: 'production', uploadedAt: '2026-02-10T12:00:00Z' },
    { id: 'new-prod', version: '2.0', platform: 'android', environment: 'production', uploadedAt: '2026-08-10T12:00:00Z' },
    { id: 'ios', platform: 'ios', uploadedAt: '2026-01-01T12:00:00Z' },
    { id: 'invalid', platform: 'android', uploadedAt: 'invalid' }
] };
test('oldest first without losing duplicate version labels; protects latest per platform and environment', () => {
    const result = candidates(project);
    assert.deepEqual(result.versions.map(version => version.id), ['old-test', 'old-prod']);
    assert.equal(result.protectedCount, 3);
});
test('date cutoff, count and explicit protection toggle work together', () => {
    assert.deepEqual(candidates(project, { before: '2026-02-01' }).versions.map(version => version.id), ['old-test']);
    assert.equal(candidates(project, { limit: 1 }).versions.length, 1);
    assert.equal(candidates(project, { keepLatest: false }).versions[0].id, 'ios');
    assert.equal(candidates(null).versions.length, 0);
});
test('latest timestamp ties are all protected', () => {
    assert.equal(candidates({ versions: [project.versions[0], { ...project.versions[0], id: 'tie' }] }).versions.length, 0);
});
test('preflight rejects changed, missing and newly protected selected records', () => {
    const selection = candidates(project).versions;
    assert.equal(validateSelection(project, selection, {}), true);
    assert.equal(validateSelection(project, [], {}), false);
    const changed = structuredClone(project);
    changed.versions.find(version => version.id === 'old-test').file = 'different.apk';
    assert.equal(validateSelection(changed, selection, {}), false);
    const missing = { versions: project.versions.filter(version => version.id !== 'old-test') };
    assert.equal(validateSelection(missing, selection, {}), false);
    const nowLatest = { versions: project.versions.filter(version => version.id !== 'new-test') };
    assert.equal(validateSelection(nowLatest, selection, {}), false);
});