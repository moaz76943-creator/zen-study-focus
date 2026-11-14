const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

describe('Cryptographic Backup Hash (computeHash)', () => {
  const web = path.resolve(__dirname, '../../android/app/src/main/assets/web');
  const app = fs.readFileSync(path.join(web, 'app.js'), 'utf8');

  const c = vm.createContext({});

  // Extract computeHash and SECRET_SALT
  const codeToRun = app.slice(app.indexOf('const SECRET_SALT ='), app.indexOf('function saveFortressData('));
  vm.runInContext(codeToRun, c);

  const computeHash = c.computeHash;
  const SECRET_SALT = vm.runInContext('SECRET_SALT', c);

  it('should be defined', () => {
    assert.ok(typeof computeHash === 'function');
    assert.equal(SECRET_SALT, "ZEN_FORTRESS_V21_99812");
  });

  it('should generate a consistent hex hash for a given string', () => {
    const input = '{"tasks":[{"id":1,"title":"test"}]}';
    const hash1 = computeHash(input);
    const hash2 = computeHash(input);

    assert.equal(typeof hash1, 'string');
    assert.match(hash1, /^[0-9a-f]+$/);
    assert.equal(hash1, hash2);
  });

  it('should generate different hashes for different strings', () => {
    const hash1 = computeHash('test1');
    const hash2 = computeHash('test2');

    assert.notEqual(hash1, hash2);
  });

  it('should handle empty strings', () => {
    const hash = computeHash('');
    assert.equal(typeof hash, 'string');
    assert.match(hash, /^[0-9a-f]+$/);
  });

  it('should handle large strings', () => {
    const largeString = 'a'.repeat(10000);
    const hash = computeHash(largeString);
    assert.equal(typeof hash, 'string');
    assert.match(hash, /^[0-9a-f]+$/);
  });
});
