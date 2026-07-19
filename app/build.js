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
const BUNDLED_TILESET = path.join(ROOT_DIR, 'media', 'basic-tileset-v1.png');
const BUNDLED_TILESET_OVERLAYS = path.join(ROOT_DIR, 'media', 'basic-tileset-overlays-v1.png');
const PLACEHOLDER = '<!-- SCRIPTS_PLACEHOLDER -->';
const GENERATED_BANNER = '<!-- GENERATED FILE. Do not edit directly. Edit app/src and run npm run build. -->';

function loadRelease() {
  let release;
  try {
    release = JSON.parse(fs.readFileSync(RELEASE_FILE, 'utf8'));
  } catch (error) {
    throw new Error(`release.json is missing or invalid: ${error.message}`);
  }
  if (!/^\d+\.\d+\.\d+$/.test(String(release.version || ''))) throw new Error('release.json version must use numeric semver');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(release.releasedAt || ''))) throw new Error('release.json releasedAt must use YYYY-MM-DD');
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
    for (const name of fs.readdirSync(optionalDir).filter(name => name.endsWith('.yawmod.json'))) {
      const file = path.join(optionalDir, name);
      const packageData = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (packageData.gameVersion && packageData.gameVersion !== release.version) {
        throw new Error(`${path.relative(ROOT_DIR, file)} gameVersion must mirror release.json (${release.version})`);
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
  'src/core/defeat-recovery.js',
  'src/core/log-view.js',
  'src/core/story-events.js',
  'src/core/narration-system.js',
  'src/core/puter-provider.js',
  'src/core/openai-compatible-provider.js',
  'src/core/balance-system.js',
  'src/core/tile-event-feed.js',
  'src/core/structure-navigation.js',
  'src/core/movement-flow.js',
  'src/core/sub-actions.js',
  'src/core/ui-text.js',
  'src/core/action-ui.js',
  'src/core/action-rules.js',
  'src/core/species-system.js',
  'src/core/unit-lifecycle.js',
  'src/core/unit-containers.js',
  'src/core/unit-containment.js',
  'src/core/time-system.js',
  'src/core/interaction-plan.js',
  'src/core/interaction-dispatch.js',
  'src/core/interaction-state.js',
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
  'src/core/equipment-system.js',
  'src/core/merchant-system.js',
  'src/core/inventory-panel.js',
  'src/core/trade-flow.js',
  'src/core/perk-flow.js',
  'src/core/stats-panel.js',
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

function renderHtml() {
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
  if (!fs.existsSync(BUNDLED_TILESET) || !fs.existsSync(BUNDLED_TILESET_OVERLAYS)) throw new Error('Bundled Tileset Pack atlas is missing');
  const bundledTilesetBase64 = fs.readFileSync(BUNDLED_TILESET).toString('base64');
  const bundledTilesetOverlayBase64 = fs.readFileSync(BUNDLED_TILESET_OVERLAYS).toString('base64');
  const scripts = [`<script>\nwindow.YAW_RELEASE = Object.freeze(${JSON.stringify(release)});\nwindow.YAW_BUNDLED_TILESET_URL = '';\nwindow.YAW_BUNDLED_TILESET_OVERLAY_URL = '';\nwindow.YAW_PREPARE_BUNDLED_TILESET = () => Promise.all([\n  fetch(${JSON.stringify(`data:image/png;base64,${bundledTilesetBase64}`)}).then(response => response.blob()).then(blob => URL.createObjectURL(blob)),\n  fetch(${JSON.stringify(`data:image/png;base64,${bundledTilesetOverlayBase64}`)}).then(response => response.blob()).then(blob => URL.createObjectURL(blob))\n])\n  .then(([terrainUrl, overlayUrl]) => {\n    if (window.YAW_BUNDLED_TILESET_URL) URL.revokeObjectURL(window.YAW_BUNDLED_TILESET_URL);\n    if (window.YAW_BUNDLED_TILESET_OVERLAY_URL) URL.revokeObjectURL(window.YAW_BUNDLED_TILESET_OVERLAY_URL);\n    window.YAW_BUNDLED_TILESET_URL = terrainUrl;\n    window.YAW_BUNDLED_TILESET_OVERLAY_URL = overlayUrl;\n    return { terrainUrl, overlayUrl };\n  })\n  .catch(error => {\n    console.warn('Bundled Tileset Pack atlases could not be prepared; emoji fallback remains active.', error);\n    return null;\n  });\nwindow.YAW_BUNDLED_TILESET_READY = window.YAW_PREPARE_BUNDLED_TILESET();\nwindow.addEventListener('beforeunload', () => {\n  if (window.YAW_BUNDLED_TILESET_URL) URL.revokeObjectURL(window.YAW_BUNDLED_TILESET_URL);\n  if (window.YAW_BUNDLED_TILESET_OVERLAY_URL) URL.revokeObjectURL(window.YAW_BUNDLED_TILESET_OVERLAY_URL);\n}, { once: true });\n</script>`];
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

function build() {
  const { html, totalLines } = renderHtml();

  fs.mkdirSync(DIST_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT, html);

  const outputLines = html.split('\n').length;
  console.log(`\nBuild successful!`);
  console.log(`  Output: ${path.relative(__dirname, OUTPUT)}`);
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
  const watchedFiles = [TEMPLATE, RELEASE_FILE, BUNDLED_TILESET, BUNDLED_TILESET_OVERLAYS, ...SCRIPT_ORDER.map(p => path.join(__dirname, p))];

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
} else {
  build();
}
