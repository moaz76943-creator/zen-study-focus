'use strict';

const test = require('node:test');
const assert = require('node:assert');
const Engine = require('../../android/app/src/main/assets/web/js/post_session_reflection_engine.js');

function hasLoneSurrogate(value) {
  return Array.from(value).some(function (ch) {
    const codePoint = ch.codePointAt(0);
    return codePoint >= 0xd800 && codePoint <= 0xdfff;
  });
}

test('C11: takeaway truncation never splits a Unicode surrogate pair', () => {
  const input = 'a'.repeat(199) + '\u{1F600}';
  const safe = Engine.sanitizeTakeaway(input);

  assert.strictEqual(
    hasLoneSurrogate(safe),
    false,
    'sanitized takeaway must not contain a lone surrogate'
  );
  assert.strictEqual(safe, 'a'.repeat(199));
  assert.strictEqual(Engine.sanitizeTakeaway('a'.repeat(200)), 'a'.repeat(200));
  assert.strictEqual(Engine.sanitizeTakeaway('  focus <b>deep</b>  '), 'focus bdeep/b');
});
