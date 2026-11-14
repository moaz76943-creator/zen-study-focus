'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const appPath = path.resolve(__dirname, '../../android/app/src/main/assets/web/app.js');
const source = fs.readFileSync(appPath, 'utf8');

function block(start, end) {
  const a = source.indexOf(start);
  assert.ok(a >= 0, 'expected production block: ' + start);
  const b = source.indexOf(end, a + start.length);
  assert.ok(b > a, 'expected production block end: ' + end);
  return source.slice(a, b);
}

const chimeCode = block('let chimeCtx = null;', '/* ========================================================');

function rigChime() {
  const calls = {
    triggerCompletionSound: [],
    vibrate: [],
  };

  const audioContextCounts = {
    constructors: 0,
    resumes: 0,
    oscillators: 0,
    gains: 0,
    started: 0,
    stopped: 0,
    connectedOscToGain: 0,
    connectedGainToDest: 0
  };

  class MockAudioContext {
    constructor() {
      audioContextCounts.constructors++;
      this.state = 'suspended';
      this.currentTime = 0;
      this.destination = {};
    }
    resume() {
      audioContextCounts.resumes++;
      this.state = 'running';
      return Promise.resolve();
    }
    createOscillator() {
      audioContextCounts.oscillators++;
      return {
        type: '',
        frequency: { setValueAtTime() {} },
        connect() { audioContextCounts.connectedOscToGain++; },
        start() { audioContextCounts.started++; },
        stop() { audioContextCounts.stopped++; }
      };
    }
    createGain() {
      audioContextCounts.gains++;
      return {
        gain: {
          setValueAtTime() {},
          exponentialRampToValueAtTime() {}
        },
        connect() { audioContextCounts.connectedGainToDest++; }
      };
    }
  }

  const sandbox = {
    window: {
      ZenNative: {
        triggerCompletionSound: (title) => calls.triggerCompletionSound.push(title)
      },
      AudioContext: MockAudioContext,
      webkitAudioContext: MockAudioContext
    },
    navigator: {
      vibrate: (pattern) => calls.vibrate.push(Array.from(pattern))
    }
  };

  vm.createContext(sandbox);
  vm.runInContext(chimeCode, sandbox, { filename: 'chime-segment' });

  return {
    call: (titleText, skipNative) => {
      let args = [];
      if (titleText !== undefined) args.push(JSON.stringify(titleText));
      if (skipNative !== undefined) {
          if (args.length === 0) args.push("undefined");
          args.push(JSON.stringify(skipNative));
      }
      return vm.runInContext(`playRichCompletionChime(${args.join(',')})`, sandbox);
    },
    sandbox,
    calls,
    audioContextCounts
  };
}

test('playRichCompletionChime creates and reuses exactly one AudioContext', () => {
  const t = rigChime();
  t.call("Test 1");
  assert.equal(t.audioContextCounts.constructors, 1);
  assert.equal(t.audioContextCounts.resumes, 1);

  vm.runInContext('chimeCtx.state = "suspended"', t.sandbox);
  t.call("Test 2");
  assert.equal(t.audioContextCounts.constructors, 1, 'Should reuse the same AudioContext');
  assert.equal(t.audioContextCounts.resumes, 2, 'Should resume the suspended AudioContext');
});

test('playRichCompletionChime triggers native sound if skipNative is false', () => {
  const t = rigChime();
  t.call("Custom Title", false);
  assert.deepEqual(t.calls.triggerCompletionSound, ["Custom Title"]);

  t.call(undefined, false);
  assert.deepEqual(t.calls.triggerCompletionSound, ["Custom Title", "Session Completed!"]);
});

test('playRichCompletionChime respects skipNative flag', () => {
  const t = rigChime();
  t.call("Custom Title", true);
  assert.equal(t.calls.triggerCompletionSound.length, 0);
});

test('playRichCompletionChime schedules 3 oscillator tones', () => {
  const t = rigChime();
  t.call();
  assert.equal(t.audioContextCounts.oscillators, 3);
  assert.equal(t.audioContextCounts.gains, 3);
  assert.equal(t.audioContextCounts.started, 3);
  assert.equal(t.audioContextCounts.stopped, 3);
  assert.equal(t.audioContextCounts.connectedOscToGain, 3);
  assert.equal(t.audioContextCounts.connectedGainToDest, 3);
});

test('playRichCompletionChime triggers vibration', () => {
  const t = rigChime();
  t.call();
  assert.equal(t.calls.vibrate.length, 1);
  assert.deepEqual(t.calls.vibrate[0], [300, 150, 300, 150, 500]);
});

test('playRichCompletionChime degrades gracefully if AudioContext fails', () => {
    const sandbox = {
      window: {
        ZenNative: { triggerCompletionSound: () => {} }
      },
      navigator: { vibrate: () => {} }
    };
    vm.createContext(sandbox);
    vm.runInContext(chimeCode, sandbox);

    assert.doesNotThrow(() => {
        vm.runInContext('playRichCompletionChime("Title")', sandbox);
    }, 'Missing AudioContext should be caught and ignored');
});

test('playRichCompletionChime degrades gracefully if navigator.vibrate is missing or fails', () => {
    const calls = [];
    const sandbox = {
      window: {
        ZenNative: { triggerCompletionSound: () => {} },
        AudioContext: class {
            constructor() { this.state = 'running'; }
            resume() { return Promise.resolve(); }
            createOscillator() { return { frequency: { setValueAtTime(){} }, connect(){}, start(){}, stop(){} }; }
            createGain() { return { gain: { setValueAtTime(){}, exponentialRampToValueAtTime(){} }, connect(){} }; }
        }
      },
      navigator: {
          get vibrate() { calls.push('vibrate accessed'); return () => { throw new Error('vibrate err'); }; }
      }
    };
    vm.createContext(sandbox);
    vm.runInContext(chimeCode, sandbox);

    assert.doesNotThrow(() => {
        vm.runInContext('playRichCompletionChime("Title")', sandbox);
    }, 'Failing vibrate should be caught and ignored');
    assert.ok(calls.includes('vibrate accessed'));
});
