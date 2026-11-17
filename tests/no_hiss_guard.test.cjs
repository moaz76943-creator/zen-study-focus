// No‑hiss guard: ensure no .ogg has a flat broadband noise floor (flat spectrum across full / high / low bands)
// Implements a simple heuristic: the sum of absolute differences between full‑band RMS and each band (‾‾>‾) must exceed 10 dB.
// Reason: legitimate assets have spectral tilt (e.g., low‑freq heavy or high‑freq emphasis). A flat broadband hiss would make full ≈ high ≈ low, sum difference ≈ 0.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ASSETS_DIR = path.resolve(__dirname, '../android/app/src/main/assets/web/audio');
const OGG_FILES = fs.readdirSync(ASSETS_DIR).filter(name => name.toLowerCase().endsWith('.ogg'));

/** Run a small ffmpeg command and extract the RMS level from astats */
function extractRMS(file, filter) {
  const af = filter ? `${filter},astats=metadata=1` : 'astats=metadata=1';
  const cmd = `ffmpeg -hide_banner -i "${file}" -af "${af}" -f null - 2>&1 | grep "RMS level dB:"`;
  try {
    const out = execSync(cmd, { encoding: 'utf8', maxBuffer: 128 * 1024 });
    const lines = out.split('\n').filter(l => l.includes('RMS level dB:'));
    const rms = parseFloat(lines[0]?.split('RMS level dB:')[1]);
    return isNaN(rms) ? null : rms;
  } catch (e) {
    console.warn(`[no_hiss_guard] failed on ${file} with filter "${filter}":`, e.message);
    return null;
  }
}

const FAILURES = [];

for (const name of OGG_FILES) {
  const fullPath = path.join(ASSETS_DIR, name);
  const fullRMS = extractRMS(fullPath, ''); // no band‑specific filter
  const highRMS = extractRMS(fullPath, 'highpass=f=6000');
  const lowRMS = extractRMS(fullPath, 'lowpass=f=200');

  if (fullRMS == null || highRMS == null || lowRMS == null) {
    FAILURES.push(`${name}: could not measure RMS (ffmpeg error)`);
    continue;
  }

  // Sum of absolute differences between full‑band and each band
  const diff = Math.abs(fullRMS - highRMS) + Math.abs(fullRMS - lowRMS);
  if (diff < 10) {
    FAILURES.push(`${name}: flat spectrum (full:${fullRMS.toFixed(1)} dB, high:${highRMS.toFixed(1)} dB, low:${lowRMS.toFixed(1)} dB)`);
  }
}

if (FAILURES.length) {
  console.error('FAIL: No‑hiss guard triggered');
  FAILURES.forEach(msg => console.error('  ', msg));
  process.exit(1);
}

console.log('PASS: No hiss detected across audio assets');