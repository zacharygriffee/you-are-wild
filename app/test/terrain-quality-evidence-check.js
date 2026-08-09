#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const outputRoot = path.resolve(process.env.YAW_EVIDENCE_OUTPUT || '/tmp/yaw-terrain-quality-evidence');
const target = process.env.YAW_EVIDENCE_TARGET || 'desktop';
const cdp = process.env.YAW_EVIDENCE_CDP || '';
const origin = process.env.YAW_EVIDENCE_URL
  || 'http://127.0.0.1:3000/dist/you-are-wild?alphaScenario=terrain-workbench&terrainRenderer=canvas-v1';
const qualities = ['performance', 'balanced', 'high'];
const phases = ['day', 'night'];
const modes = [
  { id: 'local', visibleTiles: null },
  { id: 'regional', visibleTiles: 12 },
  { id: 'survey', visibleTiles: 40 }
];

function percentile(values, fraction) {
  if (!values.length) return 0;
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.min(ordered.length - 1, Math.floor((ordered.length - 1) * fraction))];
}

async function waitFrames(page, count = 2) {
  await page.evaluate(frames => new Promise(resolve => {
    const next = remaining => requestAnimationFrame(() => remaining <= 1 ? resolve() : next(remaining - 1));
    next(frames);
  }), count);
}

async function canvasEvidence(page) {
  return page.evaluate(() => {
    const diagnostic = window.YAW_TERRAIN_CANVAS_ALPHA?.diagnostics?.()[0] || null;
    const canvas = document.querySelector(`#${diagnostic?.containerId || 'mobile-mini-map'} canvas.yaw-terrain-world-canvas`)
      || document.querySelector('canvas.yaw-terrain-world-canvas');
    if (!canvas || !diagnostic?.renderStats) return { diagnostic, pixels: null };
    const context = canvas.getContext('2d');
    const { width, height } = canvas;
    const data = context.getImageData(0, 0, width, height).data;
    const stride = Math.max(1, Math.floor(Math.sqrt((width * height) / 12000)));
    let samples = 0;
    let mean = 0;
    let squared = 0;
    let opaque = 0;
    for (let y = 0; y < height; y += stride) {
      for (let x = 0; x < width; x += stride) {
        const index = (y * width + x) * 4;
        const luminance = data[index] * 0.2126 + data[index + 1] * 0.7152 + data[index + 2] * 0.0722;
        mean += luminance;
        squared += luminance * luminance;
        if (data[index + 3] >= 250) opaque++;
        samples++;
      }
    }
    mean /= Math.max(1, samples);
    return {
      diagnostic,
      pixels: {
        width,
        height,
        samples,
        meanLuminance: Number(mean.toFixed(3)),
        luminanceDeviation: Number(Math.sqrt(Math.max(0, squared / Math.max(1, samples) - mean * mean)).toFixed(3)),
        opaqueRatio: Number((opaque / Math.max(1, samples)).toFixed(5))
      }
    };
  });
}

async function setCase(page, state) {
  await page.evaluate(next => {
    const normalized = window.YAW_ALPHA_LAB.normalizeTerrainWorkbench({
      ...window.App.alphaTerrainWorkbench,
      ...next,
      direction: 'north',
      geometry: 'straight',
      relief: 'slope',
      overlay: 'none',
      seed: 2
    });
    window.App.alphaTerrainWorkbench = normalized;
    window.App.setTerrainWorkbench('seed', normalized.seed);
  }, state);
  await waitFrames(page, 3);
}

async function setMode(page, mode) {
  const ok = await page.evaluate(({ id, visibleTiles }) => {
    if (id === 'local') {
      if (window.YAW_TERRAIN_CANVAS_ALPHA?.diagnostics?.()[0]?.mode === 'local') return true;
      const button = document.querySelector('[data-terrain-view="local"]');
      if (!button) return false;
      button.click();
      return true;
    }
    return window.YAW_TERRAIN_CANVAS_ALPHA.focusSurvey(
      window.App,
      { ...window.App.location, label: `${id} evidence` },
      { visibleTiles }
    );
  }, mode);
  if (!ok) throw new Error(`Unable to select ${mode.id} mode`);
  await page.waitForFunction(expected => window.YAW_TERRAIN_CANVAS_ALPHA?.diagnostics?.()[0]?.mode === expected, mode.id);
  await waitFrames(page, 2);
}

async function warmMovementEvidence(page) {
  const probes = [];
  for (const quality of qualities) {
    await setCase(page, { source: 'grove', destination: 'grove', phase: 'day', quality });
    await setMode(page, modes[0]);
    const cold = await canvasEvidence(page);
    const moves = [];
    for (let index = 0; index < 6; index++) {
      const dx = index % 2 === 0 ? 1 : -1;
      const result = await page.evaluate(async deltaX => {
        const from = { ...window.App.location };
        const startedAt = performance.now();
        const moved = window.App.move(deltaX, 0);
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const diagnostic = window.YAW_TERRAIN_CANVAS_ALPHA?.diagnostics?.()[0] || null;
        return {
          moved: moved === true,
          from,
          to: { ...window.App.location },
          elapsedMilliseconds: performance.now() - startedAt,
          diagnostic
        };
      }, dx);
      if (!result.moved || result.to.x !== result.from.x + dx || result.to.y !== result.from.y) {
        throw new Error(`Warm movement did not traverse authoritatively: ${JSON.stringify({ quality, result })}`);
      }
      if (result.diagnostic?.renderStats?.cacheHits < 1 || result.diagnostic?.renderStats?.cacheMisses !== 0) {
        throw new Error(`Warm movement did not reuse cached terrain: ${JSON.stringify({ quality, result })}`);
      }
      moves.push(result);
    }
    const elapsed = moves.map(move => move.elapsedMilliseconds);
    probes.push({
      quality,
      coldRenderMilliseconds: cold.diagnostic.renderStats.milliseconds,
      coldCacheMisses: cold.diagnostic.renderStats.cacheMisses,
      moves: moves.length,
      warmMoveMedianMilliseconds: Number(percentile(elapsed, 0.5).toFixed(3)),
      warmMoveP95Milliseconds: Number(percentile(elapsed, 0.95).toFixed(3)),
      warmMoveMaxMilliseconds: Number(Math.max(...elapsed).toFixed(3)),
      cacheHitsPerMove: moves.map(move => move.diagnostic.renderStats.cacheHits),
      cacheMissesPerMove: moves.map(move => move.diagnostic.renderStats.cacheMisses)
    });
  }
  return probes;
}

async function main() {
  fs.mkdirSync(outputRoot, { recursive: true });
  let browser;
  let context;
  let ownsBrowser = false;
  if (cdp) {
    browser = await chromium.connectOverCDP(cdp);
    context = browser.contexts()[0];
  } else {
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
    ownsBrowser = true;
  }
  const pages = context.pages();
  const page = pages.find(candidate => candidate.url().includes('you-are-wild')) || await context.newPage();
  const url = new URL(origin);
  url.searchParams.set('alphaScenario', 'terrain-workbench');
  url.searchParams.set('terrainRenderer', 'canvas-v1');
  url.searchParams.set('terrainQuality', 'balanced');
  await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.App?.alphaSession?.scenarioId === 'terrain-workbench'
    && window.YAW_TERRAIN_CANVAS_ALPHA?.diagnostics?.()[0]?.renderStats
    && window.YAW_TERRAIN_CANVAS_V1?.assetStatus?.().count >= 8, null, { timeout: 60000 });
  const biomes = await page.evaluate(() => [...window.YAW_ALPHA_LAB.TERRAIN_WORKBENCH_BIOMES]);
  const records = [];

  for (const quality of qualities) {
    for (const phase of phases) {
      for (const biome of biomes) {
        await setCase(page, { source: biome, destination: biome, phase, quality });
        for (const mode of modes) {
          await setMode(page, mode);
          const evidence = await canvasEvidence(page);
          const record = {
            target,
            biome,
            phase,
            quality,
            mode: mode.id,
            capturedAt: new Date().toISOString(),
            ...evidence
          };
          if (!record.diagnostic?.renderStats || !record.pixels || record.pixels.opaqueRatio < 0.25) {
            throw new Error(`Incomplete terrain evidence: ${JSON.stringify(record)}`);
          }
          if (mode.id === 'local' && record.diagnostic.renderStats.cacheHits !== 0) {
            throw new Error(`Workbench case retained stale terrain chunks: ${JSON.stringify(record)}`);
          }
          records.push(record);
          if (quality === 'balanced') {
            const canvas = page.locator(`#${record.diagnostic.containerId} canvas.yaw-terrain-world-canvas`);
            await canvas.screenshot({ path: path.join(outputRoot, `${target}-${biome}-${phase}-${mode.id}.png`) });
          }
          process.stdout.write(`\r${target}: ${records.length}/${qualities.length * phases.length * biomes.length * modes.length}`);
        }
      }
    }
  }
  process.stdout.write('\n');
  const summaries = qualities.flatMap(quality => modes.map(mode => {
    const selected = records.filter(record => record.quality === quality && record.mode === mode.id);
    const milliseconds = selected.map(record => record.diagnostic.renderStats.milliseconds);
    const cacheBytes = selected.map(record => record.diagnostic.renderStats.cacheByteEstimate);
    return {
      quality,
      mode: mode.id,
      cases: selected.length,
      tilePixels: [...new Set(selected.map(record => record.diagnostic.renderStats.cacheTilePixels))],
      decorativeDensity: [...new Set(selected.map(record => record.diagnostic.renderStats.decorativeDensity))],
      renderMsMedian: Number(percentile(milliseconds, 0.5).toFixed(3)),
      renderMsP95: Number(percentile(milliseconds, 0.95).toFixed(3)),
      renderMsMax: Number(Math.max(...milliseconds).toFixed(3)),
      cacheBytesMax: Math.max(...cacheBytes),
      minimumOpaqueRatio: Math.min(...selected.map(record => record.pixels.opaqueRatio)),
      minimumLuminanceDeviation: Math.min(...selected.map(record => record.pixels.luminanceDeviation))
    };
  }));
  const warmMovement = await warmMovementEvidence(page);
  const report = { target, url: page.url(), biomes, cases: records.length, summaries, warmMovement, records };
  fs.writeFileSync(path.join(outputRoot, `${target}-report.json`), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ target, cases: records.length, biomes, summaries, warmMovement }, null, 2));
  if (ownsBrowser) await browser.close();
  else await browser.close().catch(() => {});
}

main().catch(error => {
  console.error(error?.stack || error);
  process.exitCode = 1;
});
