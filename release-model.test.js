const { test } = require('node:test');
const assert = require('node:assert/strict');
const { selectReleases, selectProjects } = require('./public/release-model');

const projects = [
    { id: 'first', name: 'Mercury Mobile', versions: [
        { id: 'prod', version: '2.4.0', buildNumber: '101', platform: 'android', environment: 'production', uploadedAt: '2026-09-14' },
        { id: 'test', version: '2.4.0', buildNumber: '102', platform: 'android', environment: 'test', uploadedAt: '2026-09-15' },
        { id: 'ios', version: '3.0', platform: 'ios', url: 'https://testflight.apple.com/join/example', uploadedAt: '2026-09-16' }
    ] },
    { id: 'second', name: 'Living Room', versions: [
        { id: 'tv', version: '1.2', platform: 'onvotv', environment: 'regression', notes: 'Playback fix', uploadedAt: '2026-09-13' }
    ] },
    { id: 'empty', name: 'New project' }
];

test('keeps separate builds and environments with the same version number', () => {
    assert.deepEqual(selectReleases(projects).map(entry => entry.version.id), ['ios', 'test', 'prod', 'tv']);
});
test('combines project, platform, environment and build search', () => {
    assert.deepEqual(selectReleases(projects, { projectId: 'first', platform: 'android', environment: 'test', query: '102' })
        .map(entry => entry.version.id), ['test']);
});
test('search finds project names, release notes and platform labels across all projects', () => {
    assert.equal(selectReleases(projects, { query: 'MERCURY' }).length, 3);
    assert.equal(selectReleases(projects, { query: 'playback' })[0].version.id, 'tv');
    assert.equal(selectReleases(projects, { query: 'Onvo TV' })[0].version.id, 'tv');
});
test('handles empty projects, no matches and oldest ordering', () => {
    assert.equal(selectReleases(projects, { projectId: 'empty' }).length, 0);
    assert.equal(selectReleases(projects, { query: 'absent' }).length, 0);
    assert.equal(selectReleases(projects, { sort: 'oldest' })[0].version.id, 'tv');
    assert.equal(selectProjects(projects, ' NEW ')[0].id, 'empty');
});