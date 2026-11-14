'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const appPath = path.resolve(__dirname, '../../android/app/src/main/assets/web/app.js');
const appCode = fs.readFileSync(appPath, 'utf8');

test('function L returns expected dictionary', () => {
    const sandbox = {
        DICT: {
            en: { hello: 'world' },
            fr: { hello: 'monde' }
        },
        cfg: {
            lang: 'en'
        },
        toWest: (str) => str,
        loadFortressData: (key, def) => def
    };

    // Need to extract the function L from appCode because running the whole appCode in VM might have side effects or missing DOM dependencies
    const functionLRegex = /function L\(\) \{[\s\S]*?return DICT\[cfg\.lang\] \|\| DICT\.en;[\s\S]*?\}/;
    const match = appCode.match(functionLRegex);
    assert.ok(match, 'function L not found in app.js');

    vm.createContext(sandbox);
    vm.runInContext(match[0], sandbox);

    // Test with cfg.lang = 'en'
    sandbox.cfg.lang = 'en';
    const resultEn = vm.runInContext('L()', sandbox);
    assert.deepEqual(resultEn, { hello: 'world' });

    // Test with cfg.lang = 'fr'
    sandbox.cfg.lang = 'fr';
    const resultFr = vm.runInContext('L()', sandbox);
    assert.deepEqual(resultFr, { hello: 'monde' });

    // Test fallback to 'en' when cfg.lang is not in DICT
    sandbox.cfg.lang = 'es';
    const resultEs = vm.runInContext('L()', sandbox);
    assert.deepEqual(resultEs, { hello: 'world' });
});
