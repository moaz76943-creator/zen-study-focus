#!/data/data/com.termux/files/usr/bin/bash
# Deep Focus — Batch 30: genuine offline translations for tasks, goals and analytics.
# Uses the current official integration branch; never publishes to Play.
set -euo pipefail

REPO="$HOME/deep-focus-official"
BR="integration/master-qa-verified-v21"
EXPECTED_HEAD="b57aac978d6263678ac4bd36336320ca4b423c80"
PACK="assets/i18n/df99_reviewed_packs.json"
RUNTIME="android/app/src/main/assets/web/js/df99_reviewed_packs.js"
TEST="tests/termux_fix30_bulk_tasks_goals_analytics.test.cjs"

fail(){ printf 'STOP: %s\n' "$*" >&2; exit 1; }
cd "$REPO" || fail 'Official Deep Focus checkout not found.'
[ "$(git branch --show-current)" = "$BR" ] || fail 'Wrong branch. No changes made.'
ORIGIN="$(git remote get-url origin)"
case "$ORIGIN" in
  https://github.com/moaz76943-creator/zen-study-focus|https://github.com/moaz76943-creator/zen-study-focus.git|git@github.com:moaz76943-creator/zen-study-focus.git|ssh://git@github.com/moaz76943-creator/zen-study-focus.git) ;;
  *) fail "Wrong origin: $ORIGIN" ;;
esac
for path in "$PACK" "$RUNTIME" tools/df99_bulk_import.cjs; do
  [ -f "$path" ] || fail "Missing repository file: $path"
done
[ -z "$(git diff --cached --name-only)" ] || fail 'Files are already staged; preserve them and report status.'

# The only local files allowed after an interrupted rerun are this batch's three files.
python3 - <<'PY_CHECK'
import subprocess
allowed={'assets/i18n/df99_reviewed_packs.json','android/app/src/main/assets/web/js/df99_reviewed_packs.js','tests/termux_fix30_bulk_tasks_goals_analytics.test.cjs'}
rows=subprocess.check_output(['git','status','--porcelain','--untracked-files=all'],text=True).splitlines()
unexpected=[x for x in rows if x[3:] not in allowed]
if unexpected: raise SystemExit('STOP: Preserve unrelated local files: '+repr(unexpected))
print('PASS: source checkout and local file ownership checked')
PY_CHECK

git fetch origin "$BR"
REMOTE="$(git rev-parse "origin/$BR")"
LOCAL="$(git rev-parse HEAD)"
[ "$REMOTE" = "$EXPECTED_HEAD" ] || fail "Official branch advanced to $REMOTE. Do not overwrite new work."
if [ "$LOCAL" != "$REMOTE" ]; then
  [ -z "$(git status --porcelain --untracked-files=all)" ] || fail 'Local changes exist; cannot fast-forward safely.'
  git merge --ff-only "origin/$BR"
fi

# RED phase: write regression tests before applying the new translations.
cat > "$TEST" <<'BATCH30_TEST'
"use strict";
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const packs=JSON.parse(fs.readFileSync('assets/i18n/df99_reviewed_packs.json','utf8'));
const TASK_KEYS='title subtitle add project today search all board matrix trash calendar undo redo empty task desc due time cat priority estimate repeat group notes proj none save cancel focus edit done resume archive remove restore addCheck check sub study sport review exam todo doing completed archived low medium high urgent daily weekly monthly never allCategories estimated actual overdue do schedule delegate eliminate invalid notConnected'.split(' ');
const GOAL_KEYS='kicker heading desc edit modal hint save invalid noGoal minute done today week weekTarget weekInvalid'.split(' ');
const ANALYTICS_KEYS='title activity period start end minutes sessions average streak noData goal noGoals tasks chart year export details'.split(' ');
const DOMAIN_KEYS='study read work sport'.split(' ');
const tasks=['fil','sw','el','sk','fa'];
const analytics=['fil','sw','el','sk','fa','zh','ja','ko','hi','id'];
function runtime(){
  const cx={window:{},console};vm.createContext(cx);
  vm.runInContext(fs.readFileSync('android/app/src/main/assets/web/js/df99_multiscreen_i18n.js','utf8'),cx);
  vm.runInContext(fs.readFileSync('android/app/src/main/assets/web/js/df99_reviewed_packs.js','utf8'),cx);
  return cx.window.DF99Locale.t;
}
test('batch30 provides native 64-key task dictionaries for five languages',()=>{
  for(const code of tasks){
    assert.ok(packs[code]?.tasks,'MISSING_BATCH30 '+code+'/tasks');
    const dict=packs[code].tasks;
    assert.deepEqual(Object.keys(dict).sort(),TASK_KEYS.slice().sort(),code+' task keys');
    assert.ok(Object.values(dict).every(x=>typeof x==='string'&&x.trim()),code+' blank tasks');
    assert.notEqual(dict.title,'Tasks Studio',code+' task title copied');
  }
});
test('batch30 provides full 15-key goal dictionaries for five languages',()=>{
  for(const code of tasks){
    const d=packs[code]?.goals;
    assert.ok(d,'MISSING_BATCH30 '+code+'/goals');
    assert.deepEqual(Object.keys(d).sort(),GOAL_KEYS.slice().sort());
    assert.ok(Object.values(d).every(x=>typeof x==='string'&&x.trim()));
  }
});
test('batch30 provides complete analytics and activity domains for ten languages',()=>{
  for(const code of analytics){
    assert.ok(packs[code]?.analytics,'MISSING_BATCH30 '+code+'/analytics');
    assert.ok(packs[code]?.analyticsDomain,'MISSING_BATCH30 '+code+'/analyticsDomain');
    assert.deepEqual(Object.keys(packs[code].analytics).sort(),ANALYTICS_KEYS.slice().sort());
    assert.deepEqual(Object.keys(packs[code].analyticsDomain).sort(),DOMAIN_KEYS.slice().sort());
    for(const family of ['analytics','analyticsDomain']){
      const vals=Object.values(packs[code][family]);
      assert.ok(vals.every(x=>typeof x==='string'&&x.trim()));
      for(const x of vals)assert.doesNotMatch(x,/[\u0660-\u0669\u06F0-\u06F9]|<\/?(?:script|style|iframe)/i);
    }
  }
});
test('all 605 added translations resolve from the offline runtime',()=>{
  const t=runtime();let count=0;
  for(const code of analytics){
    const families=code in Object.fromEntries(tasks.map(x=>[x,true]))
      ? ['tasks','goals','analytics','analyticsDomain'] : ['analytics','analyticsDomain'];
    for(const family of families)for(const [key,v] of Object.entries(packs[code][family])){
      assert.equal(t(code,family,key,'fallback'),v,code+'/'+family+'/'+key); count++;
    }
  }
  assert.equal(count,605);
  for(const code of ['he','iw','zz'])assert.equal(t(code,'analytics','title','fallback'),'fallback');
  assert.equal(t('fil','analytics','not_a_real_key','fallback'),'fallback');
  assert.equal(t('hi','tasks','title','fallback'),'fallback');
  assert.equal(t('vi','tasks','title','fallback'),'fallback');
});
test('prior 4755 strings survive without unsafe runtime or fabricated completeness',()=>{
  const total=Object.values(packs).reduce((n,s)=>n+Object.values(s).reduce((m,dict)=>m+Object.keys(dict).length,0),0);
  assert.ok(total>=5360,'Expected at least 5360 translations after batch30: '+total);
  for(const code of ['de','es','fr','it','pt','tr','ru','nl','sv','da','no','fi','pl','uk','ro','cs','hu'])
    assert.ok(packs[code]?.timer,'Missing earlier timer pack '+code);
  for(const code of ['he','iw'])assert.equal(packs[code],undefined);
  for(const code of analytics)assert.ok(packs[code]?.notes,'Earlier notes lost: '+code);
  const js=fs.readFileSync('android/app/src/main/assets/web/js/df99_reviewed_packs.js','utf8');
  assert.doesNotMatch(js,/\b(?:localStorage|indexedDB|XMLHttpRequest|fetch\s*\()\b/);
});
test('selected action labels keep their intended meaning',()=>{
  assert.equal(packs.fil.tasks.cancel,'Kanselahin');
  assert.equal(packs.sw.goals.save,'Malengo yamehifadhiwa');
  assert.equal(packs.el.analytics.title,'Καταγεγραμμένα στατιστικά');
  assert.equal(packs.sk.tasks.save,'Uložiť');
  assert.equal(packs.fa.tasks.save,'ذخیره');
  assert.equal(packs.zh.analytics.export,'导出 CSV');
  assert.equal(packs.ja.analytics.export,'CSV をエクスポート');
  assert.equal(packs.ko.analytics.title,'기록된 분석');
  assert.equal(packs.hi.analytics.noData,'इस अवधि में कोई सत्र दर्ज नहीं है');
  assert.equal(packs.id.analytics.title,'Analitik tercatat');
});
BATCH30_TEST
node --check "$TEST"
if python3 - <<'PY_ALREADY'
import json
p=json.load(open('assets/i18n/df99_reviewed_packs.json'))
required={'fil':['tasks','goals','analytics','analyticsDomain'],'sw':['tasks','goals','analytics','analyticsDomain'],
'el':['tasks','goals','analytics','analyticsDomain'],'sk':['tasks','goals','analytics','analyticsDomain'],
'fa':['tasks','goals','analytics','analyticsDomain'],
'zh':['analytics','analyticsDomain'],'ja':['analytics','analyticsDomain'],
'ko':['analytics','analyticsDomain'],'hi':['analytics','analyticsDomain'],'id':['analytics','analyticsDomain']}
assert all(all(f in p.get(code,{}) for f in families) for code,families in required.items())
PY_ALREADY
then
  echo 'RESUME: New namespaces already present; verifying without duplication.'
else
  RED_LOG="$(mktemp)"
  if node --test "$TEST" >"$RED_LOG" 2>&1; then
    cat "$RED_LOG"
    rm -f "$RED_LOG"
    fail 'Expected red regression tests before changes, but they passed.'
  fi
  if ! grep -q 'MISSING_BATCH30' "$RED_LOG"; then
    cat "$RED_LOG"
    rm -f "$RED_LOG"
    fail 'Tests failed for an unexpected reason.'
  fi
  rm -f "$RED_LOG"
  echo 'RED confirmed: batch30 translations missing before patch.'
fi

# GREEN phase: merge only absent canonical namespaces and never overwrite old translations.
python3 - <<'PY_TRANSLATIONS'
import base64, zlib, json, pathlib
raw="""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
06/W+OKLL/4fH/T6kA=="""
delta=json.loads(zlib.decompress(base64.b64decode(raw)).decode('utf-8'))
p=pathlib.Path('assets/i18n/df99_reviewed_packs.json')
data=json.loads(p.read_text(encoding='utf-8'))
count=lambda x:sum(len(d) for sections in x.values() for d in sections.values())
assert count(delta)==605,'Expected exactly 605 batch30 translations'
assert count(data)>=4755,'Earlier translations missing or wrong base'
for code,families in delta.items():
    assert code not in ('ar','en','he','iw'),code
    existing=data.setdefault(code,{})
    for family,entries in families.items():
        if family in existing and existing[family]!=entries:
            raise SystemExit(f'STOP: Refusing to overwrite existing {code}/{family} translations')
        existing[family]=entries
assert count(data)>=5360, 'New expected total not reached'
assert all(x not in data for x in ('he','iw'))
p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('PASS: batch30 translations merged. ALL_STRINGS='+str(count(data)))
PY_TRANSLATIONS

node tools/df99_bulk_import.cjs
node --check "$RUNTIME"
node --check "$TEST"
node --test "$TEST"

# Full regression tests; no push if any test or coverage validation fails.
echo '=== FULL REGRESSION TESTS ==='
node --test tests/termux_fix*.test.cjs
node tests/smoke_app.cjs
node tests/validate_locales.cjs
node tools/locale_coverage_99_audit.cjs
node tools/df99_full_app_coverage.cjs
git diff --check

git add -- "$PACK" "$RUNTIME" "$TEST"
git diff --cached --check
python3 - <<'PY_OWNERSHIP'
import subprocess
expected={'assets/i18n/df99_reviewed_packs.json','android/app/src/main/assets/web/js/df99_reviewed_packs.js','tests/termux_fix30_bulk_tasks_goals_analytics.test.cjs'}
rows=subprocess.check_output(['git','status','--porcelain','--untracked-files=all'],text=True).splitlines()
actual={s[3:] for s in rows}
assert actual==expected,f'STOP: unexpected modified files: {rows}'
assert all(s[0]!=' ' and s[1]==' ' for s in rows),f'STOP: unstaged files: {rows}'
print('PASS: only the three authorized files are staged')
PY_OWNERSHIP

# Integration to official branch without force and with remote hash verification.
git -c user.name='moaz76943-creator' \
    -c user.email='moaz76943-creator@users.noreply.github.com' \
    commit -m 'feat(i18n): add batch30 tasks goals and analytics locales'
SHA="$(git rev-parse HEAD)"
if ! git push origin "HEAD:refs/heads/$BR"; then
  printf 'PUSH FAILED. LOCAL_COMMIT=%s. Do not force push.\n' "$SHA" >&2
  exit 1
fi
[ "$(git ls-remote origin "refs/heads/$BR" | cut -f1)" = "$SHA" ] || fail 'Remote HEAD does not match local commit.'
TOTAL="$(python3 -c 'import json;d=json.load(open("assets/i18n/df99_reviewed_packs.json"));print(sum(len(x) for s in d.values() for x in s.values()))')"
printf '\nSUCCESS: BATCH 30 PUSH VERIFIED\nOFFICIAL_HEAD=%s\nNEW_TRANSLATIONS=605\nTOTAL_TRANSLATIONS=%s\nNEW_TASK_LANGUAGES=fil,sw,el,sk,fa\nNEW_GOAL_LANGUAGES=fil,sw,el,sk,fa\nNEW_ANALYTICS_LANGUAGES=fil,sw,el,sk,fa,zh,ja,ko,hi,id\nPLAY_RELEASE=UNCHANGED\n' "$SHA" "$TOTAL"
