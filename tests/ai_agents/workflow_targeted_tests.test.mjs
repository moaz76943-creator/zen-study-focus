import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const yaml=readFileSync(new URL('../../.github/workflows/df_ai_repair_worker.yml',import.meta.url),'utf8');
test('only regression tests modified by the candidate PR are run in worker',()=>{
  assert.match(yaml,/git diff --cached --name-only/);
  assert.match(yaml,/node --test "\$\{changed_tests\[@\]\}"/);
  assert.doesNotMatch(yaml,/node --test tests\/integration_quality\/\*\.test\.cjs/);
});
test('worker enforces fail-closed change guard and exact integration HEAD',()=>{
  assert.match(yaml,/node \.\.\/automation\/tools\/ai_agents\/guard\.mjs/);
  assert.match(yaml,/Integration HEAD moved/);
  assert.match(yaml,/--draft/);
  assert.doesNotMatch(yaml,/gh pr merge/);
});
