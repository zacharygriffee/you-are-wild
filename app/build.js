#!/usr/bin/env node
/**
 * Build script for You Are Wild
 * Assembles separate JS modules into a single HTML file for distribution
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const SRC_DIR = path.join(__dirname, 'src');
const TEMPLATE = path.join(__dirname, 'template.html');
const RELEASE_FILE = path.join(__dirname, 'release.json');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const OUTPUT = path.join(DIST_DIR, 'you-are-wild.html');
const HOSTED_OUTPUT = path.join(DIST_DIR, 'you-are-wild.hosted.html');
const BUNDLED_TILESET = path.join(ROOT_DIR, 'media', 'basic-tileset-v1.png');
const BUNDLED_TILESET_OVERLAYS = path.join(ROOT_DIR, 'media', 'basic-tileset-overlays-v1.png');
const BUNDLED_TILESET_MATERIALS = path.join(ROOT_DIR, 'media', 'terrain-sand-seamless-v1.png');
const PLACEHOLDER = '<!-- SCRIPTS_PLACEHOLDER -->';
const GENERATED_BANNER = '<!-- GENERATED FILE. Do not edit directly. Edit app/src and run npm run build. -->';
const FIRST_PARTY_PACKAGE_MIRRORS = [
  'you-are-wild-elemental-species.yawmod.json',
  'you-are-wild-explicit-narration.yawmod.json',
  'you-are-wild-explicit.yawmod.json',
  'you-are-wild-french-preview.yawmod.json',
  'you-are-wild-narration-diagnostics.yawmod.json',
  'you-are-wild-narration.yawmod.json',
  'you-are-wild-template-narration.yawmod.json',
  'you-are-wild-waystone-recovery.yawmod.json'
];
const SITE_RELEASE_MIRROR = path.join(ROOT_DIR, 'site', 'release.json');
const SITE_HOST_MANIFEST = path.join(ROOT_DIR, 'site', 'public', 'yaw-host.json');

function loadRelease() {
  let release;
  try {
    release = JSON.parse(fs.readFileSync(RELEASE_FILE, 'utf8'));
  } catch (error) {
    throw new Error(`release.json is missing or invalid: ${error.message}`);
  }
  if (!/^\d+\.\d+\.\d+$/.test(String(release.version || ''))) throw new Error('release.json version must use numeric semver');
  if (!['draft', 'candidate', 'released'].includes(String(release.status || ''))) {
    throw new Error('release.json status must be draft, candidate, or released');
  }
  const hasReleaseDate = /^\d{4}-\d{2}-\d{2}$/.test(String(release.releasedAt || ''));
  if (release.status === 'released' && !hasReleaseDate) {
    throw new Error('released release.json records require releasedAt in YYYY-MM-DD format');
  }
  if (release.status !== 'released' && release.releasedAt !== null && !hasReleaseDate) {
    throw new Error('development release.json releasedAt must be null or use YYYY-MM-DD');
  }
  if (release.channel === 'public-preview' && release.status !== 'released') {
    throw new Error('public-preview release.json records must use released status');
  }
  if (!Number.isInteger(release.saveSchema) || release.saveSchema < 1) throw new Error('release.json saveSchema must be a positive integer');
  if (!Number.isInteger(release.moduleApi) || release.moduleApi < 1) throw new Error('release.json moduleApi must be a positive integer');
  const packageMirrors = [
    path.join(__dirname, 'package.json'),
    path.join(ROOT_DIR, 'site', 'package.json')
  ].filter(fs.existsSync);
  for (const file of packageMirrors) {
    const mirrored = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (mirrored.version !== release.version) {
      throw new Error(`${path.relative(ROOT_DIR, file)} version must mirror release.json (${release.version})`);
    }
  }
  const optionalDir = path.join(ROOT_DIR, 'optional-mods');
  if (fs.existsSync(optionalDir)) {
    for (const name of FIRST_PARTY_PACKAGE_MIRRORS) {
      const file = path.join(optionalDir, name);
      if (!fs.existsSync(file)) throw new Error(`Missing first-party package mirror: ${path.relative(ROOT_DIR, file)}`);
      const packageData = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (packageData.gameVersion && packageData.gameVersion !== release.version) {
        throw new Error(`${path.relative(ROOT_DIR, file)} gameVersion must mirror release.json (${release.version})`);
      }
    }
  }
  if (fs.existsSync(SITE_RELEASE_MIRROR)) {
    const siteRelease = JSON.parse(fs.readFileSync(SITE_RELEASE_MIRROR, 'utf8'));
    for (const key of ['version', 'status', 'releasedAt', 'channel', 'saveSchema', 'moduleApi']) {
      if (siteRelease[key] !== release[key]) {
        throw new Error(`${path.relative(ROOT_DIR, SITE_RELEASE_MIRROR)} ${key} must mirror app/release.json`);
      }
    }
  }
  if (fs.existsSync(SITE_HOST_MANIFEST)) {
    const hostManifest = JSON.parse(fs.readFileSync(SITE_HOST_MANIFEST, 'utf8'));
    if (hostManifest.schema !== 'yaw-host-modules-v1' || !Array.isArray(hostManifest.catalog)) {
      throw new Error(`${path.relative(ROOT_DIR, SITE_HOST_MANIFEST)} must contain a valid host catalog`);
    }
    for (const entry of hostManifest.catalog) {
      const packagePath = path.join(ROOT_DIR, 'site', 'public', String(entry.url || '').replace(/^\/+/, ''));
      if (!fs.existsSync(packagePath)) {
        throw new Error(`Missing hosted package advertised by ${entry.id}: ${path.relative(ROOT_DIR, packagePath)}`);
      }
      const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      if (packageData.packageId !== entry.id) {
        throw new Error(`${path.relative(ROOT_DIR, packagePath)} packageId must match host catalog entry ${entry.id}`);
      }
      if (packageData.module?.manifest?.version !== entry.version) {
        throw new Error(`${path.relative(ROOT_DIR, packagePath)} version must match host catalog (${entry.version})`);
      }
      if (packageData.gameVersion !== release.version) {
        throw new Error(`${path.relative(ROOT_DIR, packagePath)} gameVersion must mirror release.json (${release.version})`);
      }
    }
  }
  return release;
}

const SCRIPT_ORDER = [
  'src/core/serialization.js',
  'src/core/world-generation.js',
  'src/core/traversal-system.js',
  'src/core/asset-manifest.js',
  'src/core/startup-readiness.js',
  'src/core/storage-system.js',
  'src/core/media-contract.js',
  'src/core/media-indexeddb-store.js',
  'src/core/media-http-providers.js',
  'src/core/media-repository.js',
  'src/core/asset-bundle-v1.js',
  'src/core/tileset-pack-v1.js',
  'src/core/tileset-runtime.js',
  'src/core/sprite-pack-v1.js',
  'src/core/sprite-runtime.js',
  'src/core/world-state.js',
  'src/core/world-store.js',
  'src/core/world-random.js',
  'src/core/encounter-preferences.js',
  'src/core/create-flow.js',
  'src/core/map-visuals.js',
  'src/core/large-map.js',
  'src/core/desktop-play-surface.js',
  'src/core/local-map.js',
  'src/core/tile-resources.js',
  'src/core/center-context.js',
  'src/core/recovery-modes.js',
  'src/core/defeat-recovery.js',
  'src/core/log-view.js',
  'src/core/story-events.js',
  'src/core/narration-system.js',
  'src/core/host-capabilities.js',
  'src/core/puter-provider.js',
  'src/core/openai-compatible-provider.js',
  'src/core/managed-service-provider.js',
  'src/core/balance-system.js',
  'src/core/tile-event-feed.js',
  'src/core/structure-navigation.js',
  'src/core/movement-flow.js',
  'src/core/resource-ledger.js',
  'src/core/combat-techniques.js',
  'src/core/sub-actions.js',
  'src/core/ui-text.js',
  'src/core/action-ui.js',
  'src/core/action-rules.js',
  'src/core/species-system.js',
  'src/core/unit-lifecycle.js',
  'src/core/unit-containers.js',
  'src/core/unit-containment.js',
  'src/core/time-system.js',
  'src/core/multi-interaction-system.js',
  'src/core/interaction-plan.js',
  'src/core/interaction-dispatch.js',
  'src/core/interaction-state.js',
  'src/core/companion-behavior.js',
  'src/core/exploration-selection.js',
  'src/core/marked-target-actions.js',
  'src/core/recruitment-flow.js',
  'src/core/panel-interactions.js',
  'src/core/panel-commands.js',
  'src/core/unit-stats.js',
  'src/core/unit-card-status.js',
  'src/core/combat-state-roll.js',
  'src/core/combat-rules.js',
  'src/core/combat-status.js',
  'src/core/combat-turns.js',
  'src/core/combat-lifecycle.js',
  'src/core/combat-actions.js',
  'src/core/combat-targeting.js',
  'src/core/combat-resolution.js',
  'src/core/combat-allies.js',
  'src/core/combat-enemies.js',
  'src/core/combat-sync.js',
  'src/core/combat-planning.js',
  'src/core/combat-mobility.js',
  'src/core/combat-feed.js',
  'src/core/combat-intents.js',
  'src/core/mobile-combat-toolbelt.js',
  'src/core/combat-actor-state.js',
  'src/core/tactical-card.js',
  'src/core/mobile-unit-chip.js',
    'src/core/unit-card.js',
    'src/core/item-registry.js',
    'src/core/item-effects.js',
    'src/core/equipment-system.js',
  'src/core/merchant-system.js',
  'src/core/inventory-panel.js',
  'src/core/trade-flow.js',
  'src/core/perk-effects.js',
  'src/core/perk-registry.js',
  'src/core/perk-flow.js',
  'src/core/stats-panel.js',
  'src/core/quest-contract.js',
  'src/core/quest-flow.js',
  'src/core/quest-panel.js',
  'src/core/transaction-window.js',
  'src/core/mobile-unit-strips.js',
  'src/core/panel-rendering.js',
  'src/core/panel-shell.js',
  'src/core/unit-selection.js',
  'src/core/party-management.js',
  'src/core/focus-trap.js',
  'src/core/intent-menu.js',
  'src/core/dialog-flow.js',
  'src/core/content-access.js',
  'src/core/tutorial-system.js',
  'src/core/settings-flow.js',
  'src/core/settings-data-flow.js',
  'src/core/mobile-gestures.js',
  'src/core/mobile-context-menu.js',
  'src/core/save-manager.js',
  'src/core/save-metadata.js',
  'src/core/save-persistence.js',
  'src/core/save-slot-flow.js',
  'src/core/save-load-flow.js',
  'src/core/combat-scene.js',
  'src/core/scene-shell.js',
  'src/core/combat-save-state.js',
  'src/core/app.js',
  'src/ui/settings-nav.js',
  'src/core/module-system.js',
  'src/ui/mod-ui.js',
  'src/ui/provider-ui.js',
  'src/core/content-system.js',
  'src/core/marketplace.js',
  'src/ui/market-screen.js',
  'src/ui/market-nav.js',
  'src/ui/global-nav.js',
];

function lint() {
  console.log('Linting all JS modules...\n');
  let errors = 0;
  let totalLines = 0;
  const expectedFiles = new Set(SCRIPT_ORDER.map(relPath => path.join(__dirname, relPath)));
  const discoveredFiles = [];

  function collectJs(dir) {
    for (const entry of fs.readdirSync(dir)) {
      const fullPath = path.join(dir, entry);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        collectJs(fullPath);
      } else if (entry.endsWith('.js')) {
        discoveredFiles.push(fullPath);
      }
    }
  }

  collectJs(SRC_DIR);

  for (const file of discoveredFiles) {
    if (!expectedFiles.has(file)) {
      console.error(`  ✗ ${path.relative(__dirname, file)} - missing from SCRIPT_ORDER`);
      errors++;
    }
  }

  for (const relPath of SCRIPT_ORDER) {
    const fullPath = path.join(__dirname, relPath);
    if (!fs.existsSync(fullPath)) {
      console.error(`  ✗ ${relPath} - FILE NOT FOUND`);
      errors++;
      continue;
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split('\n').length;
    totalLines += lines;

    try {
      new Function(content);
      console.log(`  ✓ ${relPath} (${lines} lines)`);
    } catch (e) {
      console.error(`  ✗ ${relPath} - ${e.message.split('\n')[0]}`);
      errors++;
    }
  }

  console.log(`\nLint results: ${SCRIPT_ORDER.length - errors}/${SCRIPT_ORDER.length} modules passed`);
  console.log(`Total lines: ${totalLines}`);
  return errors === 0;
}

function tilesetBootstrap(release, mode = 'embedded') {
  const graphicsMode = "new URLSearchParams(window.location.search).get('graphics') === 'emoji' ? 'emoji' : 'tileset'";
  const commonStart = `window.YAW_RELEASE = Object.freeze(${JSON.stringify(release)});\nwindow.YAW_GRAPHICS_MODE = ${graphicsMode};\nwindow.YAW_BUNDLED_TILESET_URL = '';\nwindow.YAW_BUNDLED_TILESET_OVERLAY_URL = '';\nwindow.YAW_BUNDLED_TILESET_MATERIAL_URL = '';`;
  const disabledResult = `if (window.YAW_GRAPHICS_MODE === 'emoji') return Promise.resolve({ disabled: true, mode: 'emoji' });`;

  if (mode === 'external') {
    const urls = [
      './assets/basic-tileset-v1.png',
      './assets/basic-tileset-overlays-v1.png',
      './assets/terrain-sand-seamless-v1.png'
    ];
    return `<script>\n${commonStart}\nwindow.YAW_PREPARE_BUNDLED_TILESET = () => {\n  ${disabledResult}\n  const urls = ${JSON.stringify(urls)};\n  return Promise.all(urls.map(url => fetch(url, { credentials: 'same-origin' }).then(async response => {\n    if (!response.ok) throw new Error(\`Bundled tileset request failed with HTTP \${response.status}\`);\n    await response.blob();\n    return url;\n  })))\n    .then(([terrainUrl, overlayUrl, materialUrl]) => {\n      window.YAW_BUNDLED_TILESET_URL = terrainUrl;\n      window.YAW_BUNDLED_TILESET_OVERLAY_URL = overlayUrl;\n      window.YAW_BUNDLED_TILESET_MATERIAL_URL = materialUrl;\n      return { terrainUrl, overlayUrl, materialUrl, mode: 'external' };\n    })\n    .catch(error => {\n      console.warn('Hosted Tileset Pack atlases could not be prepared; emoji fallback remains active.', error);\n      return null;\n    });\n};\nwindow.YAW_BUNDLED_TILESET_READY = window.YAW_PREPARE_BUNDLED_TILESET();\n</script>`;
  }

  const bundledTilesetBase64 = fs.readFileSync(BUNDLED_TILESET).toString('base64');
  const bundledTilesetOverlayBase64 = fs.readFileSync(BUNDLED_TILESET_OVERLAYS).toString('base64');
  const bundledTilesetMaterialBase64 = fs.readFileSync(BUNDLED_TILESET_MATERIALS).toString('base64');
  return `<script>\n${commonStart}\nwindow.YAW_PREPARE_BUNDLED_TILESET = () => {\n  ${disabledResult}\n  return Promise.all([\n    fetch(${JSON.stringify(`data:image/png;base64,${bundledTilesetBase64}`)}).then(response => response.blob()).then(blob => URL.createObjectURL(blob)),\n    fetch(${JSON.stringify(`data:image/png;base64,${bundledTilesetOverlayBase64}`)}).then(response => response.blob()).then(blob => URL.createObjectURL(blob)),\n    fetch(${JSON.stringify(`data:image/png;base64,${bundledTilesetMaterialBase64}`)}).then(response => response.blob()).then(blob => URL.createObjectURL(blob))\n  ])\n    .then(([terrainUrl, overlayUrl, materialUrl]) => {\n      if (window.YAW_BUNDLED_TILESET_URL) URL.revokeObjectURL(window.YAW_BUNDLED_TILESET_URL);\n      if (window.YAW_BUNDLED_TILESET_OVERLAY_URL) URL.revokeObjectURL(window.YAW_BUNDLED_TILESET_OVERLAY_URL);\n      if (window.YAW_BUNDLED_TILESET_MATERIAL_URL) URL.revokeObjectURL(window.YAW_BUNDLED_TILESET_MATERIAL_URL);\n      window.YAW_BUNDLED_TILESET_URL = terrainUrl;\n      window.YAW_BUNDLED_TILESET_OVERLAY_URL = overlayUrl;\n      window.YAW_BUNDLED_TILESET_MATERIAL_URL = materialUrl;\n      return { terrainUrl, overlayUrl, materialUrl, mode: 'embedded' };\n    })\n    .catch(error => {\n      console.warn('Bundled Tileset Pack atlases could not be prepared; emoji fallback remains active.', error);\n      return null;\n    });\n};\nwindow.YAW_BUNDLED_TILESET_READY = window.YAW_PREPARE_BUNDLED_TILESET();\nwindow.addEventListener('beforeunload', () => {\n  if (window.YAW_BUNDLED_TILESET_URL) URL.revokeObjectURL(window.YAW_BUNDLED_TILESET_URL);\n  if (window.YAW_BUNDLED_TILESET_OVERLAY_URL) URL.revokeObjectURL(window.YAW_BUNDLED_TILESET_OVERLAY_URL);\n  if (window.YAW_BUNDLED_TILESET_MATERIAL_URL) URL.revokeObjectURL(window.YAW_BUNDLED_TILESET_MATERIAL_URL);\n}, { once: true });\n</script>`;
}

function renderHtml(options = {}) {
  console.log('Building you-are-wild.html...\n');

  if (!lint()) {
    console.error('\nBuild aborted due to lint errors.');
    process.exit(1);
  }

  let html = fs.readFileSync(TEMPLATE, 'utf8');
  if (!html.includes(PLACEHOLDER)) {
    console.error(`\nBuild aborted: template is missing ${PLACEHOLDER}.`);
    process.exit(1);
  }

  const release = loadRelease();
  if (!fs.existsSync(BUNDLED_TILESET) || !fs.existsSync(BUNDLED_TILESET_OVERLAYS) || !fs.existsSync(BUNDLED_TILESET_MATERIALS)) throw new Error('Bundled Tileset Pack atlas is missing');
  const scripts = [tilesetBootstrap(release, options.tilesetMode)];
  let totalLines = 0;

  for (const relPath of SCRIPT_ORDER) {
    const fullPath = path.join(__dirname, relPath);
    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split('\n').length;
    scripts.push(`<script>\n${content}\n</script>`);
    totalLines += lines;
    console.log(`  ${relPath} (${lines} lines) - included`);
  }

  const scriptsBlock = scripts.join('\n\n');
  html = html.replace(PLACEHOLDER, scriptsBlock);
  html = `${GENERATED_BANNER}\n${html}`;

  return { html, totalLines };
}

function build(options = {}) {
  const { html, totalLines } = renderHtml(options);
  const output = options.output || OUTPUT;

  fs.mkdirSync(DIST_DIR, { recursive: true });
  fs.writeFileSync(output, html);

  const outputLines = html.split('\n').length;
  console.log(`\nBuild successful!`);
  console.log(`  Output: ${path.relative(__dirname, output)}`);
  console.log(`  Total lines: ${outputLines}`);
  console.log(`  Script lines: ${totalLines}`);
  console.log(`  Scripts: ${SCRIPT_ORDER.length}`);
}

function check() {
  const { html } = renderHtml();
  if (!fs.existsSync(OUTPUT)) {
    console.error(`\nCheck failed: ${path.relative(ROOT_DIR, OUTPUT)} does not exist.`);
    process.exit(1);
  }

  const current = fs.readFileSync(OUTPUT, 'utf8');
  if (current !== html) {
    console.error(`\nCheck failed: ${path.relative(ROOT_DIR, OUTPUT)} is stale. Run npm run build.`);
    process.exit(1);
  }

  console.log(`\nCheck passed: ${path.relative(ROOT_DIR, OUTPUT)} is up to date.`);
}

function watch() {
  console.log('Watching for changes... (Ctrl+C to stop)\n');
  const watchedFiles = [TEMPLATE, RELEASE_FILE, BUNDLED_TILESET, BUNDLED_TILESET_OVERLAYS, BUNDLED_TILESET_MATERIALS, ...SCRIPT_ORDER.map(p => path.join(__dirname, p))];

  let building = false;

  function onChange() {
    if (building) return;
    building = true;
    console.log('\n--- Change detected, rebuilding... ---');
    try {
      build();
      console.log('--- Build complete ---\n');
    } catch (e) {
      console.error('--- Build failed ---', e.message, '\n');
    }
    building = false;
  }

  for (const file of watchedFiles) {
    fs.watchFile(file, { interval: 500 }, (curr, prev) => {
      if (curr.mtime !== prev.mtime) {
        console.log(`  Changed: ${path.relative(__dirname, file)}`);
        onChange();
      }
    });
  }

  // Initial build
  build();

  // Keep process alive
  process.stdin.resume();
}

// CLI
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log('Usage: node build.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  --lint-only  Only run syntax validation, no build');
  console.log('  --check      Verify generated output is up to date');
  console.log('  --watch      Watch for changes and rebuild automatically');
  console.log('  --hosted     Build a hosted HTML shell with external cacheable tileset files');
  console.log('  --help       Show this help');
  console.log('');
  console.log('Examples:');
  console.log('  node build.js              Build the HTML file');
  console.log('  node build.js --lint-only  Validate all modules');
  console.log('  node build.js --check      Validate generated output');
  console.log('  node build.js --watch      Watch and rebuild on changes');
  process.exit(0);
} else if (args.includes('--lint-only')) {
  const ok = lint();
  process.exit(ok ? 0 : 1);
} else if (args.includes('--check')) {
  check();
} else if (args.includes('--watch')) {
  watch();
} else if (args.includes('--hosted')) {
  build({ output: HOSTED_OUTPUT, tilesetMode: 'external' });
} else {
  build();
}
