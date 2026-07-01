#!/usr/bin/env node
/**
 * Build script for FightFuckFeed.tactical
 * Assembles separate JS modules into a single HTML file for distribution
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, 'src');
const TEMPLATE = path.join(__dirname, 'template.html');
const OUTPUT = path.join(__dirname, '..', 'FightFuckFeed.tactical.html');

const SCRIPT_ORDER = [
  'src/core/serialization.js',
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

function build() {
  console.log('Building FightFuckFeed.tactical.html...\n');

  if (!lint()) {
    console.error('\nBuild aborted due to lint errors.');
    process.exit(1);
  }

  let html = fs.readFileSync(TEMPLATE, 'utf8');

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
  html = html.replace('<!-- SCRIPTS_PLACEHOLDER -->', scriptsBlock);

  fs.writeFileSync(OUTPUT, html);

  const outputLines = html.split('\n').length;
  console.log(`\nBuild successful!`);
  console.log(`  Output: ${path.relative(__dirname, OUTPUT)}`);
  console.log(`  Total lines: ${outputLines}`);
  console.log(`  Script lines: ${totalLines}`);
  console.log(`  Scripts: ${SCRIPT_ORDER.length}`);
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
  console.log('  --watch      Watch for changes and rebuild automatically');
  console.log('  --help       Show this help');
  console.log('');
  console.log('Examples:');
  console.log('  node build.js              Build the HTML file');
  console.log('  node build.js --lint-only  Validate all modules');
  console.log('  node build.js --watch      Watch and rebuild on changes');
  process.exit(0);
} else if (args.includes('--lint-only')) {
  const ok = lint();
  process.exit(ok ? 0 : 1);
} else if (args.includes('--watch')) {
  watch();
} else {
  build();
}
