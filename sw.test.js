const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('service worker retires Mercury caches without caching APIs or deleting unrelated caches', async () => {
    const events = {};
    const removed = [];
    let claimed = false;
    let activated = false;
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'public/sw.js'), 'utf8'), {
        self: {
            addEventListener: (name, callback) => { events[name] = callback; },
            skipWaiting: async () => { activated = true; },
            clients: { claim: async () => { claimed = true; } }
        },
        caches: { keys: async () => ['mercury-app-center-v1', 'other-app'], delete: async name => { removed.push(name); } }
    });
    let pending;
    const event = { waitUntil: promise => { pending = promise; } };
    events.install(event);
    await pending;
    events.activate(event);
    await pending;
    assert.equal(activated, true);
    assert.equal(claimed, true);
    assert.deepEqual(removed, ['mercury-app-center-v1']);
    assert.equal(events.fetch, undefined);
});