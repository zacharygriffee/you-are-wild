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

// Order matters: dependencies must be loaded before consumers
const SCRIPT_ORDER = [
  'src/core/serialization.js',      // Binary (no deps)
  'src/core/app.js',                // App (methods reference others but not at load time)
  'src/ui/settings-nav.js',         // Adds settings button to nav (needs App, CONTENT)
  'src/core/module-system.js',      // MODULE_SYSTEM (no deps)
  'src/ui/mod-ui.js',               // ModUI (needs MODULE_SYSTEM, App)
  'src/core/content-system.js',     // CONTENT_SYSTEM (no deps)
  'src/core/marketplace.js',        // MODULE_MARKETPLACE (no deps)
  'src/ui/market-screen.js',        // Market screen DOM (needs MODULE_MARKETPLACE)
  'src/ui/market-nav.js',           // Adds market button (needs MODULE_MARKETPLACE)
  'src/ui/global-nav.js',           // Global helpers (needs App)
];

function build() {
  console.log('Building FightFuckFeed.tactical.html...\n');

  // Read template
  let html = fs.readFileSync(TEMPLATE, 'utf8');

  // Validate and concatenate scripts
  const scripts = [];
  let totalLines = 0;

  for (const relPath of SCRIPT_ORDER) {
    const fullPath = path.join(__dirname, relPath);
    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split('\n').length;

    // Validate syntax
    try {
      new Function(content);
    } catch (e) {
      console.error(`SYNTAX ERROR in ${relPath}:`);
      console.error(e.message);
      process.exit(1);
    }

    scripts.push(`<script>\n${content}\n</script>`);
    totalLines += lines;
    console.log(`  ${relPath} (${lines} lines) - OK`);
  }

  // Replace placeholder
  const scriptsBlock = scripts.join('\n\n');
  html = html.replace('<!-- SCRIPTS_PLACEHOLDER -->', scriptsBlock);

  // Write output
  fs.writeFileSync(OUTPUT, html);

  const outputLines = html.split('\n').length;
  console.log(`\nBuild successful!`);
  console.log(`  Output: ${path.relative(__dirname, OUTPUT)}`);
  console.log(`  Total lines: ${outputLines}`);
  console.log(`  Script lines: ${totalLines}`);
  console.log(`  Scripts: ${SCRIPT_ORDER.length}`);

  // Validate final HTML by checking all script blocks
  console.log('\nValidating final HTML...');
  const scriptRegex = /<script>([\s\S]*?)<\/script>/g;
  let match;
  let scriptCount = 0;
  while ((match = scriptRegex.exec(html)) !== null) {
    scriptCount++;
    try {
      new Function(match[1]);
    } catch (e) {
      console.error(`  Script ${scriptCount}: ERROR - ${e.message}`);
    }
  }
  console.log(`  All ${scriptCount} script blocks validated successfully.`);
}

if (require.main === module) {
  build();
}

module.exports = { build };
