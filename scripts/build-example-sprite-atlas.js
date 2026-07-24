#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const WIDTH = 256;
const HEIGHT = 128;
const FRAME = 64;
const pixels = Buffer.alloc(WIDTH * HEIGHT * 4);

function setPixel(x, y, color) {
  if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return;
  const index = (y * WIDTH + x) * 4;
  pixels[index] = color[0];
  pixels[index + 1] = color[1];
  pixels[index + 2] = color[2];
  pixels[index + 3] = color[3] ?? 255;
}

function rect(x, y, width, height, color) {
  for (let py = y; py < y + height; py++) {
    for (let px = x; px < x + width; px++) setPixel(px, py, color);
  }
}

function circle(cx, cy, radius, color) {
  const radiusSquared = radius * radius;
  for (let y = cy - radius; y <= cy + radius; y++) {
    for (let x = cx - radius; x <= cx + radius; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= radiusSquared) setPixel(x, y, color);
    }
  }
}

function triangle(points, color) {
  const minX = Math.floor(Math.min(...points.map(point => point[0])));
  const maxX = Math.ceil(Math.max(...points.map(point => point[0])));
  const minY = Math.floor(Math.min(...points.map(point => point[1])));
  const maxY = Math.ceil(Math.max(...points.map(point => point[1])));
  const [a, b, c] = points;
  const area = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const w1 = ((b[1] - c[1]) * (x - c[0]) + (c[0] - b[0]) * (y - c[1])) / area;
      const w2 = ((c[1] - a[1]) * (x - c[0]) + (a[0] - c[0]) * (y - c[1])) / area;
      const w3 = 1 - w1 - w2;
      if (w1 >= 0 && w2 >= 0 && w3 >= 0) setPixel(x, y, color);
    }
  }
}

function drawPerson(frameX, rowY, { bob = 0, wounded = false, ghost = false, wolf = false } = {}) {
  const alpha = ghost ? 155 : 255;
  const skin = wolf ? [120, 132, 150, alpha] : [225, 181, 136, alpha];
  const body = ghost ? [115, 226, 239, alpha] : wolf ? [74, 90, 120, alpha] : [52, 111, 190, alpha];
  const accent = ghost ? [205, 251, 255, alpha] : [240, 205, 79, alpha];
  const originX = frameX + 32;
  const originY = rowY + (wounded ? 37 : 30) + bob;
  const lean = wounded ? 7 : 0;

  if (wolf) {
    triangle([[originX - 13 + lean, originY - 18], [originX - 5 + lean, originY - 32], [originX - 1 + lean, originY - 17]], skin);
    triangle([[originX + 13 + lean, originY - 18], [originX + 5 + lean, originY - 32], [originX + 1 + lean, originY - 17]], skin);
  }
  circle(originX + lean, originY - 15, 11, skin);
  rect(originX - 12 + lean, originY - 4, 24, wounded ? 17 : 22, body);
  rect(originX - 18 + lean, originY, 7, wounded ? 13 : 20, body);
  rect(originX + 11 + lean, originY, 7, wounded ? 13 : 20, body);
  rect(originX - 10 + lean, originY + 17, 8, wounded ? 7 : 15, body);
  rect(originX + 2 + lean, originY + 17, 8, wounded ? 7 : 15, body);
  setPixel(originX - 4 + lean, originY - 17, accent);
  setPixel(originX + 4 + lean, originY - 17, accent);

  if (ghost) {
    triangle([
      [originX - 10, originY + 31],
      [originX, originY + 20],
      [originX + 10, originY + 31]
    ], body);
  }
}

for (const row of [0, 1]) {
  const wolf = row === 1;
  drawPerson(0, row * FRAME, { wolf });
  drawPerson(FRAME, row * FRAME, { bob: -2, wolf });
  drawPerson(FRAME * 2, row * FRAME, { wounded: true, wolf });
  drawPerson(FRAME * 3, row * FRAME, { ghost: true, wolf });
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const output = Buffer.alloc(data.length + 12);
  output.writeUInt32BE(data.length, 0);
  typeBytes.copy(output, 4);
  data.copy(output, 8);
  output.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), data.length + 8);
  return output;
}

const header = Buffer.alloc(13);
header.writeUInt32BE(WIDTH, 0);
header.writeUInt32BE(HEIGHT, 4);
header[8] = 8;
header[9] = 6;
header[10] = 0;
header[11] = 0;
header[12] = 0;

const scanlines = Buffer.alloc((WIDTH * 4 + 1) * HEIGHT);
for (let y = 0; y < HEIGHT; y++) {
  const target = y * (WIDTH * 4 + 1);
  scanlines[target] = 0;
  pixels.copy(scanlines, target + 1, y * WIDTH * 4, (y + 1) * WIDTH * 4);
}

const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', header),
  chunk('IDAT', zlib.deflateSync(scanlines, { level: 9 })),
  chunk('IEND', Buffer.alloc(0))
]);

const output = path.resolve(__dirname, '../media/example-sprite-atlas-v1.png');
fs.writeFileSync(output, png);
console.log(`Wrote ${path.relative(process.cwd(), output)} (${png.byteLength} bytes)`);
