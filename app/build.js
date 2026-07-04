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
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const OUTPUT = path.join(DIST_DIR, 'you-are-wild.html');
const PLACEHOLDER = '<!-- SCRIPTS_PLACEHOLDER -->';
const GENERATED_BANNER = '<!-- GENERATED FILE. Do not edit directly. Edit app/src and run npm run build. -->';

const SCRIPT_ORDER = [
  'src/core/serialization.js',
  'src/core/world-generation.js',
  'src/core/asset-manifest.js',
  'src/core/storage-system.js',
  'src/core/large-map.js',
  'src/core/desktop-play-surface.js',
  'src/core/center-context.js',
  'src/core/unit-selection.js',
  'src/core/intent-menu.js',
  'src/core/mobile-context-menu.js',
  'src/core/combat-scene.js',
  'src/core/app.js',
  'src/ui/settings-nav.js',
  'src/core/module-system.js',
  'src/ui/mod-ui.js',
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

  const scripts = [];
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
  const watchedFiles = [TEMPLATE, ...SCRIPT_ORDER.map(p => path.join(__dirname, p))];

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
