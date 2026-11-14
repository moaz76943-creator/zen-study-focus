'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const vm = require('node:vm');

test('toWest maps various digits to Western digits properly', () => {
    const code = fs.readFileSync('android/app/src/main/assets/web/app.js', 'utf8');

    // In the task description, toWest was shown as:
    // function toWest(val) { ... }
    // However, it seems the codebase has been modified or the snippet is partial.
    // Let's use string manipulation to extract the function that is actually there.

    // A robust way to extract just the toWest function from the file
    // First, find 'function toWest(val)'
    const startIndex = code.indexOf('function toWest(val)');
    assert.ok(startIndex !== -1, 'Could not find toWest function in app.js');

    // Find the end of the function. We can find the end by looking for the next 'document.addEventListener'
    const nextEventLIndex = code.indexOf('document.addEventListener', startIndex);

    // We'll also extract any constants that are used right above toWest just in case.
    let fullCodeToEval = '';
    const westernZeroPointsIdx = code.indexOf('const WESTERN_DIGIT_ZERO_POINTS');
    if (westernZeroPointsIdx !== -1 && westernZeroPointsIdx < startIndex) {
       // Also include ARABIC_ZERO_OFFSET and PERSIAN_ZERO_OFFSET
       if (code.indexOf('const ARABIC_ZERO_OFFSET') === -1) {
           fullCodeToEval += 'const ARABIC_ZERO_OFFSET = 1632;\n';
       } else {
           const offsetStart = code.indexOf('const ARABIC_ZERO_OFFSET');
           fullCodeToEval += code.substring(offsetStart, code.indexOf(';', offsetStart) + 1) + '\n';
       }
       if (code.indexOf('const PERSIAN_ZERO_OFFSET') === -1) {
           fullCodeToEval += 'const PERSIAN_ZERO_OFFSET = 1776;\n';
       } else {
           const offsetStart = code.indexOf('const PERSIAN_ZERO_OFFSET');
           fullCodeToEval += code.substring(offsetStart, code.indexOf(';', offsetStart) + 1) + '\n';
       }

       // We extract from WESTERN_DIGIT_ZERO_POINTS up to the next document.addEventListener
       fullCodeToEval += code.substring(westernZeroPointsIdx, nextEventLIndex);
    } else {
       // Just extract the function toWest to the next document.addEventListener
       fullCodeToEval += code.substring(startIndex, nextEventLIndex);
    }


    const context = vm.createContext({});
    vm.runInContext(fullCodeToEval, context);
    const toWest = context.toWest;

    assert.ok(typeof toWest === 'function', 'Failed to extract toWest function');

    // Arabic and Persian
    assert.equal(toWest('٠١٢٣٤٥٦٧٨٩'), '0123456789', 'Arabic digits');
    assert.equal(toWest('٤٢'), '42', 'Arabic partial digits');
    assert.equal(toWest('۰۱۲۳۴۵۶۷۸۹'), '0123456789', 'Persian digits');
    assert.equal(toWest('۴۲'), '42', 'Persian partial digits');

    // Other digit systems if supported by regex in WESTERN_DIGIT_ZERO_POINTS
    if (code.includes('WESTERN_DIGIT_ZERO_POINTS')) {
       assert.equal(toWest('१२३'), '123', 'Devanagari digits');
       assert.equal(toWest('১২৩'), '123', 'Bengali digits');
       assert.equal(toWest('๑๒๓'), '123', 'Thai digits');
    }

    // Mixed usage
    assert.equal(toWest('hello ١٢٣ world'), 'hello 123 world', 'Mixed Arabic text');
    assert.equal(toWest('test ٠١٢ ۰۱۲ 012'), 'test 012 012 012', 'Mixed multiple scripts');

    // Edge cases
    assert.equal(toWest(null), '', 'Null handling');
    assert.equal(toWest(undefined), '', 'Undefined handling');
    assert.equal(toWest(''), '', 'Empty string handling');
    assert.equal(toWest(123), '123', 'Number handling');
    assert.equal(toWest(0), '0', 'Zero handling');

    // Some implementations return the object stringified, others handle it differently.
    // The snippet given returns String(val).replace(...) so we expect '[object Object]'
    assert.equal(toWest({}), '[object Object]', 'Object handling');
    assert.equal(toWest(['١', '٢']), '1,2', 'Array handling');

    // Non-digits string
    assert.equal(toWest('abc ABC !@#'), 'abc ABC !@#', 'No digits');
});
