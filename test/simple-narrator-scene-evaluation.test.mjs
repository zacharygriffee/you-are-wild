import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(TEST_DIR, '..');
const source = await readFile(
  resolve(REPO_ROOT, 'optional-mods/sources/you-are-wild-narration.js'),
  'utf8'
);
const evaluation = JSON.parse(await readFile(
  resolve(TEST_DIR, 'fixtures/simple-narrator-scenes.json'),
  'utf8'
));

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function forbiddenCredentialKeys(value, path = '$', findings = []) {
  if (!value || typeof value !== 'object') return findings;
  for (const [key, child] of Object.entries(value)) {
    const compact = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    if ([
      'apikey',
      'authorization',
      'credential',
      'encryptedcredential',
      'password',
      'privatekey',
      'secret'
    ].some(token => compact === token || compact.endsWith(token))) {
      findings.push(`${path}.${key}`);
    }
    forbiddenCredentialKeys(child, `${path}.${key}`, findings);
  }
  return findings;
}

async function exercise(fixture) {
  const hooks = new Map();
  const orchestrators = [];
  const requests = [];
  const publications = [];
  const updates = [];
  const contextQueries = [];
  const connectionQueries = [];
  const availableConnections = [
    fixture.connection,
    {
      id: 'unselected:decoy',
      providerId: 'another-adapter',
      displayName: 'Another text connection',
      modelId: 'another-model',
      capabilities: ['text.generate']
    }
  ];
  const settings = {
    enabled: true,
    providerConnection: fixture.connection.id,
    ...fixture.settings
  };
  const MODS = {
    getSetting(key, fallback) {
      return Promise.resolve(Object.hasOwn(settings, key) ? settings[key] : fallback);
    },
    registerNarrationOrchestrator(orchestrator) {
      orchestrators.push(orchestrator);
    },
    registerHook(event, callback) {
      hooks.set(event, callback);
    },
    ownsNarrationExchange() {
      return Promise.resolve(true);
    },
    getNarrationContext(options) {
      contextQueries.push(clone(options));
      return clone(fixture.context);
    },
    getCachedTileNarration() {
      return null;
    },
    publishNarration(record) {
      const stored = clone(record);
      publications.push(stored);
      return stored;
    },
    updateNarration(id, patch) {
      updates.push({ id, patch: clone(patch) });
    },
    cacheTileNarration() {},
    ai: {
      listConnections(capability) {
        connectionQueries.push(capability);
        return clone(availableConnections);
      },
      cancelPending() {},
      async generate(request) {
        requests.push(clone(request));
        return {
          text: `Fixture narration: ${fixture.id}`,
          providerId: fixture.connection.providerId,
          modelId: fixture.connection.modelId
        };
      }
    }
  };

  new Function('MODS', source)(MODS);
  assert.equal(orchestrators.length, 1);
  const active = await orchestrators[0].isActive();
  hooks.get('onSceneBeat')(clone(fixture.envelope));
  await hooks.get('onSceneExchangeClosed')(clone(fixture.envelope));
  return {
    request: requests[0],
    publication: publications[0],
    update: updates[0],
    contextQueries,
    connectionQueries,
    active,
    requestCount: requests.length
  };
}

test('Simple Narrator scene fixtures are versioned and cover multiple opaque host transports', () => {
  assert.equal(evaluation.schema, 'yaw-simple-narrator-evaluation-v1');
  assert.equal(evaluation.fixtures.length, 3);
  assert.equal(new Set(evaluation.fixtures.map(fixture => fixture.connection.providerId)).size, 3);
  assert.equal(new Set(evaluation.fixtures.map(fixture => fixture.connection.id)).size, 3);
});

for (const fixture of evaluation.fixtures) {
  test(`Simple Narrator preserves bounded scene JSON: ${fixture.id}`, async () => {
    const result = await exercise(fixture);
    assert.equal(result.active, true);
    assert.equal(result.requestCount, 1);
    assert.equal(result.request.capability, 'narration');
    assert.equal(result.request.providerConnectionId, fixture.connection.id);
    assert.equal(result.request.profileId, fixture.expect.profile);
    assert.equal(result.request.maxCharacters, fixture.settings.maxCharacters);
    assert.deepEqual(result.request.input.context, fixture.context);
    assert.equal(result.request.input.format, 'plain-text');
    assert.equal(result.request.input.posture, fixture.expect.inputPosture);
    assert.equal(result.request.input.profile, fixture.expect.profile);
    assert.equal(result.request.input.viewpointMode, 'player');
    assert.equal(result.request.input.narrationPerspective, fixture.expect.perspective);
    assert.deepEqual(result.contextQueries, [{
      exchangeId: fixture.envelope.exchangeId,
      recentBeatLimit: fixture.settings.recentBeatLimit,
      activityLimit: 6
    }]);
    assert.ok(result.connectionQueries.length >= 2);
    assert.ok(result.connectionQueries.every(capability => capability === 'text.generate'));
    for (const fragment of fixture.expect.instructionFragments) {
      assert.ok(result.request.instructions.includes(fragment), `Missing instruction fragment: ${fragment}`);
    }
    assert.ok(result.request.instructions.length <= 2000);
    assert.equal(result.publication.outputRating, fixture.expect.outputRating);
    assert.equal(result.update.patch.status, 'ready');
    assert.equal(result.update.patch.providerId, fixture.connection.providerId);
    assert.equal(result.update.patch.modelId, fixture.connection.modelId);
    assert.deepEqual(forbiddenCredentialKeys(result.request), []);
    assert.equal(Object.hasOwn(result.request, 'connection'), false);
    assert.equal(Object.hasOwn(result.request, 'endpoint'), false);
  });
}

test('Simple Narrator declines unavailable connection IDs without issuing a request', async () => {
  const fixture = clone(evaluation.fixtures[0]);
  fixture.settings.providerConnection = 'missing:connection';
  fixture.connection.id = 'different:connection';
  const result = await exercise(fixture);
  assert.equal(result.active, false);
  assert.equal(result.requestCount, 0);
  assert.equal(result.request, undefined);
  assert.equal(result.publication, undefined);
});
