#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.resolve(__dirname, '..');
const paths = {
  offline: path.join(ROOT, 'dist', 'you-are-wild.html'),
  hosted: path.join(ROOT, 'dist', 'you-are-wild.hosted.html'),
  atlases: [
    path.join(ROOT, 'media', 'basic-tileset-v1.png'),
    path.join(ROOT, 'media', 'basic-tileset-overlays-v1.png'),
    path.join(ROOT, 'media', 'terrain-sand-seamless-v1.png'),
    path.join(ROOT, 'media', 'terrain-materials-v2.png'),
    path.join(ROOT, 'media', 'bridge-span-v2.png'),
    path.join(ROOT, 'media', 'foliage-cover-v2.png')
  ]
};

function bytesFor(file) {
  const bytes = fs.readFileSync(file);
  return {
    file: path.relative(ROOT, file),
    bytes: bytes.byteLength,
    gzipBytes: zlib.gzipSync(bytes, { level: 9 }).byteLength
  };
}

function mib(bytes) {
  return Number((bytes / (1024 * 1024)).toFixed(2));
}

function secondsAtMbps(bytes, mbps) {
  return Number(((bytes * 8) / (mbps * 1000 * 1000)).toFixed(1));
}

function measure() {
  const missing = [paths.offline, paths.hosted, ...paths.atlases].filter(file => !fs.existsSync(file));
  if (missing.length) {
    throw new Error(`Build artifacts are missing: ${missing.map(file => path.relative(ROOT, file)).join(', ')}`);
  }

  const offline = bytesFor(paths.offline);
  const hosted = bytesFor(paths.hosted);
  const atlases = paths.atlases.map(bytesFor);
  const atlasBytes = atlases.reduce((sum, entry) => sum + entry.bytes, 0);
  const atlasGzipBytes = atlases.reduce((sum, entry) => sum + entry.gzipBytes, 0);
  const hostedSource = fs.readFileSync(paths.hosted, 'utf8');
  const expectedAssetPaths = paths.atlases.map(file => `./assets/${path.basename(file)}`);
  const externalPathsStable = expectedAssetPaths.every(assetPath => hostedSource.includes(JSON.stringify(assetPath)));
  const embedsAtlasData = /data:image\/png;base64,/.test(hostedSource);
  const hasCacheBustingQuery = expectedAssetPaths.some(assetPath => new RegExp(`${assetPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\?`).test(hostedSource));
  const lightweightTransferBytes = hosted.gzipBytes;
  const texturedColdTransferBytes = hosted.gzipBytes + atlasBytes;

  return {
    schemaVersion: 1,
    measuredAt: new Date().toISOString(),
    artifacts: {
      offline: { ...offline, mib: mib(offline.bytes), gzipMib: mib(offline.gzipBytes) },
      hosted: { ...hosted, mib: mib(hosted.bytes), gzipMib: mib(hosted.gzipBytes) },
      atlases: atlases.map(entry => ({ ...entry, mib: mib(entry.bytes), gzipMib: mib(entry.gzipBytes) })),
      atlasTotal: { bytes: atlasBytes, gzipBytes: atlasGzipBytes, mib: mib(atlasBytes), gzipMib: mib(atlasGzipBytes) }
    },
    hostedTransfer: {
      lightweightBytes: lightweightTransferBytes,
      lightweightMib: mib(lightweightTransferBytes),
      texturedColdBytes: texturedColdTransferBytes,
      texturedColdMib: mib(texturedColdTransferBytes),
      additionalTextureBytes: atlasBytes,
      additionalTextureMib: mib(atlasBytes),
      theoreticalSecondsAt1_5Mbps: {
        lightweight: secondsAtMbps(lightweightTransferBytes, 1.5),
        texturedCold: secondsAtMbps(texturedColdTransferBytes, 1.5)
      }
    },
    cacheContract: {
      externalPathsStable,
      embedsAtlasData,
      hasCacheBustingQuery,
      reusable: externalPathsStable && !embedsAtlasData && !hasCacheBustingQuery
    }
  };
}

function printHuman(report) {
  const { artifacts, hostedTransfer, cacheContract } = report;
  console.log('Map/Tileset artifact acceptance');
  console.log(`  Offline single-file: ${artifacts.offline.mib} MiB (${artifacts.offline.gzipMib} MiB gzip)`);
  console.log(`  Hosted runtime:      ${artifacts.hosted.mib} MiB (${artifacts.hosted.gzipMib} MiB gzip)`);
  console.log(`  External atlases:    ${artifacts.atlasTotal.mib} MiB (${artifacts.atlasTotal.gzipMib} MiB gzip)`);
  console.log(`  Lightweight transfer estimate: ${hostedTransfer.lightweightMib} MiB`);
  console.log(`  Textured cold transfer estimate: ${hostedTransfer.texturedColdMib} MiB`);
  console.log(`  Theoretical 1.5 Mbps: Lightweight ${hostedTransfer.theoreticalSecondsAt1_5Mbps.lightweight}s; Textured cold ${hostedTransfer.theoreticalSecondsAt1_5Mbps.texturedCold}s`);
  console.log(`  Stable external cache contract: ${cacheContract.reusable ? 'yes' : 'no'}`);
}

if (require.main === module) {
  try {
    const report = measure();
    if (process.argv.includes('--json')) {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    } else {
      printHuman(report);
    }
    if (!report.cacheContract.reusable) process.exitCode = 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { measure };
