'use strict';
// The Android screenshot gate must never count all-white captures as a PASS.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const zlib = require('node:zlib');

const guard = path.join(__dirname, 'track14_png_screen_guard.py');
function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(tag, bytes) {
  const label = Buffer.from(tag, 'ascii');
  const length = Buffer.alloc(4); length.writeUInt32BE(bytes.length);
  const checksum = Buffer.alloc(4); checksum.writeUInt32BE(crc32(Buffer.concat([label, bytes])));
  return Buffer.concat([length, label, bytes, checksum]);
}
function fixture(realContent) {
  const width = 64, height = 64;
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width); header.writeUInt32BE(height, 4);
  header[8] = 8; header[9] = 2; // RGB 8-bit, no interlace.
  const scanlines = [];
  for (let y = 0; y < height; y++) {
    const scanline = Buffer.alloc(1 + width * 3, 255);
    scanline[0] = 0; // PNG filter None.
    for (let x = 0; x < width; x++) {
      const p = 1 + x * 3;
      const shade = realContent ? (32 + (x * 3 + y * 5) % 180) : 255;
      scanline[p] = shade;
      scanline[p + 1] = realContent ? (shade + 11) % 220 : 255;
      scanline[p + 2] = realContent ? (shade + 23) % 220 : 255;
    }
    scanlines.push(scanline);
  }
  return Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'),
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(Buffer.concat(scanlines))),
    chunk('IEND', Buffer.alloc(0))
  ]);
}
function check(p) {
  return spawnSync('python3', [guard, p], {encoding: 'utf8', timeout: 15000});
}
test('blank but structurally valid Android PNG fails closed', t => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'df14-png-'));
  t.after(() => fs.rmSync(d, {recursive:true,force:true}));
  const p = path.join(d, 'blank.png'); fs.writeFileSync(p, fixture(false));
  const r = check(p);
  assert.equal(r.status, 1, r.stderr);
  assert.match(r.stdout, /BLANK_OR_UNRENDERED/);
});
test('PNG with actual varied foreground pixels is a rendered candidate only', t => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'df14-png-'));
  t.after(() => fs.rmSync(d, {recursive:true,force:true}));
  const p = path.join(d, 'rendered.png'); fs.writeFileSync(p, fixture(true));
  const r = check(p);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /RENDERED_CANDIDATE/);
});
test('invalid screenshot content cannot certify Android', t => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'df14-png-'));
  t.after(() => fs.rmSync(d, {recursive:true,force:true}));
  const p = path.join(d, 'bad.png'); fs.writeFileSync(p, 'not a PNG');
  const r = check(p);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /IMAGE_INVALID/);
});
