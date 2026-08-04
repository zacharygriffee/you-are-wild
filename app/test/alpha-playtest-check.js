#!/usr/bin/env node

const assert = require('assert');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '../..');
const BUILD = path.join(ROOT, 'dist', 'you-are-wild.html');

const EXPECTED = {
  'interaction-single': { party: 1, creatures: 1, combat: false },
  'interaction-group': { party: 2, creatures: 2, combat: false },
  'self-containment': { party: 1, creatures: 0, combat: false, contained: 1 },
  'combat-group': { party: 2, creatures: 2, combat: true },
  'failure-narration': { party: 1, creatures: 1, combat: true },
  'companion-management': { party: 3, creatures: 0, combat: false, inventory: 4 },
  'content-posture': { party: 1, creatures: 1, combat: false },
  'responsive-layout': { party: 2, creatures: 2, combat: false }
};

async function serveBuild() {
  const server = http.createServer((request, response) => {
    const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
    if (pathname === '/yaw-service.json' || pathname.endsWith('/yaw-host.json')) {
      response.writeHead(204, { 'Cache-Control': 'no-store' });
      response.end();
      return;
    }
    if (!['/', '/dist/you-are-wild', '/dist/you-are-wild.html'].includes(pathname)) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }
    const bytes = fs.readFileSync(BUILD);
    response.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Length': String(bytes.byteLength),
      'Cache-Control': 'no-store'
    });
    response.end(bytes);
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return {
    origin: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise(resolve => server.close(resolve))
  };
}

async function makePage(browser, viewport) {
  const context = await browser.newContext({ viewport });
  await context.addInitScript(() => {
    localStorage.setItem('yaw-has-played', 'true');
    localStorage.setItem('yaw-tutorial-complete', 'true');
  });
  const page = await context.newPage();
  const failures = [];
  page.on('pageerror', error => failures.push(`pageerror: ${error.message}`));
  page.on('console', message => {
    if (message.type() === 'error') failures.push(`console: ${message.text()}`);
  });
  return { context, page, failures };
}

async function inspectScenario(page) {
  return page.evaluate(() => {
    const banner = document.getElementById('alpha-session-banner');
    const appRoot = document.getElementById('app');
    return {
      diagnostics: YAW_ALPHA_LAB.diagnostics(App),
      screen: App.screen,
      party: App.party.length,
      creatures: App.creatures.length,
      inventory: App.inventory.length,
      contained: App.player?.stomach?.length || 0,
      combat: App.combatState.active === true,
      bannerVisible: Boolean(banner && !banner.hidden && banner.getBoundingClientRect().height > 0),
      bannerControls: banner?.querySelectorAll('button').length || 0,
      gameVisible: getComputedStyle(appRoot).display !== 'none',
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    };
  });
}

async function checkScenario(browser, origin, scenarioId, viewport) {
  const { context, page, failures } = await makePage(browser, viewport);
  try {
    await page.goto(`${origin}/dist/you-are-wild?alphaScenario=${encodeURIComponent(scenarioId)}`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(id => window.App?.alphaSession?.scenarioId === id, scenarioId, { timeout: 15000 });
    await page.waitForTimeout(250);
    const actual = await inspectScenario(page);
    const expected = EXPECTED[scenarioId];
    assert.equal(actual.screen, 'game', `${scenarioId} should open the game`);
    assert.equal(actual.party, expected.party, `${scenarioId} party fixture`);
    assert.equal(actual.creatures, expected.creatures, `${scenarioId} creature fixture`);
    assert.equal(actual.combat, expected.combat, `${scenarioId} combat fixture`);
    if (expected.inventory !== undefined) assert.equal(actual.inventory, expected.inventory, `${scenarioId} inventory fixture`);
    if (expected.contained !== undefined) assert.equal(actual.contained, expected.contained, `${scenarioId} containment fixture`);
    assert.equal(actual.diagnostics.activeScenario, scenarioId, `${scenarioId} diagnostic identity`);
    assert.equal(actual.diagnostics.isolatedSaveDb, true, `${scenarioId} isolated save database`);
    assert.equal(actual.diagnostics.isolatedWorldDb, true, `${scenarioId} isolated world database`);
    assert.equal(actual.bannerVisible, true, `${scenarioId} Alpha banner`);
    assert.equal(actual.bannerControls, 2, `${scenarioId} report and exit controls`);
    assert.equal(actual.gameVisible, true, `${scenarioId} game surface`);
    assert.equal(actual.horizontalOverflow, false, `${scenarioId} page overflow at ${viewport.width}px`);
    assert.deepEqual(failures, [], `${scenarioId} browser failures:\n${failures.join('\n')}`);
    return { scenarioId, viewport, outcome: 'passed' };
  } finally {
    await context.close();
  }
}

async function checkPublicLab(browser, origin) {
  const { context, page, failures } = await makePage(browser, { width: 390, height: 844 });
  try {
    await page.goto(`${origin}/dist/you-are-wild`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#screen-menu.active', { state: 'visible', timeout: 30000 });
    await page.getByRole('button', { name: 'Open Alpha Lab' }).waitFor({ state: 'visible', timeout: 30000 });
    await page.getByRole('button', { name: 'Open Alpha Lab' }).click();
    await page.waitForSelector('#screen-alpha.active');
    assert.equal(await page.locator('.alpha-mission-card').count(), Object.keys(EXPECTED).length, 'public lab should list every mission');
    assert.equal(await page.locator('#alpha-report-preview').count(), 0, 'public lab should not expose a report before a mission starts');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1), false, 'public lab mobile width should not overflow');
    await page.locator('[data-alpha-scenario="interaction-single"]').click();
    await page.waitForFunction(() => App.alphaSession?.scenarioId === 'interaction-single');
    await page.getByRole('button', { name: 'Report outcome' }).click();
    await page.waitForSelector('#screen-alpha.active #alpha-report-preview');
    assert.equal(await page.locator('#alpha-report-notes').count(), 1, 'mission report should include notes');
    assert.equal(await page.locator('.alpha-check-row').count(), 3, 'mission report should include its checklist');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1), false, 'mobile report should not overflow');
    assert.deepEqual(failures, [], `public Alpha Lab browser failures:\n${failures.join('\n')}`);
    return { surface: 'public-alpha-lab', viewport: { width: 390, height: 844 }, outcome: 'passed' };
  } finally {
    await context.close();
  }
}

async function main() {
  assert.ok(fs.existsSync(BUILD), 'Build missing; run npm run build first');
  const fixture = await serveBuild();
  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    results.push(await checkPublicLab(browser, fixture.origin));
    for (const scenarioId of Object.keys(EXPECTED)) {
      results.push(await checkScenario(browser, fixture.origin, scenarioId, { width: 1280, height: 800 }));
    }
    results.push(await checkScenario(browser, fixture.origin, 'responsive-layout', { width: 390, height: 844 }));
  } finally {
    await browser.close();
    await fixture.close();
  }
  console.log(JSON.stringify({ suite: 'alpha-playtest-matrix', passed: results.length, results }, null, 2));
}

main().catch(error => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
