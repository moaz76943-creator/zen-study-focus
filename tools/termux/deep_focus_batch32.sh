#!/data/data/com.termux/files/usr/bin/bash
# Deep Focus Batch 32 — extend offline timer/goals/analytics to ten languages.
# Validates actual source, prior content, and full tests before fast-forward integration.
set -euo pipefail

REPO="$HOME/deep-focus-official"
BR='integration/master-qa-verified-v21'
BASE='ce608b3a1ce549fb0000dc93e43609db60471202'
DATA_REF='tooling/deep-focus-batch32-direct-20261025'
DATA_SHA='4127d6bc6c669e113e9b798fba9f2ada5350d708'
PACK='assets/i18n/df99_reviewed_packs.json'
JS='android/app/src/main/assets/web/js/df99_reviewed_packs.js'
TEST='tests/termux_fix32_ten_locales_timer_goals_analytics.test.cjs'
cd "$REPO" || exit 1

[ "$(git branch --show-current)" = "$BR" ] || { echo 'STOP: wrong working branch'; exit 1; }
case "$(git remote get-url origin)" in
 *github.com/moaz76943-creator/zen-study-focus|*github.com/moaz76943-creator/zen-study-focus.git) ;;
 *) echo 'STOP: wrong GitHub repository'; exit 1 ;;
esac
[ -z "$(git status --porcelain --untracked-files=all)" ] || { echo 'STOP: existing local changes; nothing replaced'; exit 1; }
[ "$(git rev-parse HEAD)" = "$BASE" ] || { echo 'STOP: official local commit changed'; exit 1; }

REMOTE="$(git ls-remote origin "refs/heads/$BR" | cut -f1)"
[ "$REMOTE" = "$BASE" ] || { echo 'STOP: official remote advanced; no changes written'; exit 1; }

git fetch origin "refs/heads/$DATA_REF"
git merge-base --is-ancestor "$DATA_SHA" FETCH_HEAD || { echo 'STOP: unverified tooling revision'; exit 1; }
[ ! -e "$TEST" ] || { echo 'STOP: batch32 test file already exists'; exit 1; }

cat > "$TEST" <<'JSTEST'
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const packs=JSON.parse(fs.readFileSync('assets/i18n/df99_reviewed_packs.json','utf8'));
const LANGS=["bg","hr","sr","sl","lt","lv","et","mk","eo","ca"];
const KEYS={"timer":["0","1","2","3","4","5","6","7","8","9","10"],"goals":["kicker","heading","desc","edit","modal","hint","save","invalid","noGoal","minute","done","today","week","weekTarget","weekInvalid"],"analytics":["title","activity","period","start","end","minutes","sessions","average","streak","noData","goal","noGoals","tasks","chart","year","export","details"],"analyticsDomain":["study","read","work","sport"]};
function translator(){
  const c={window:{},console};vm.createContext(c);
  vm.runInContext(fs.readFileSync('android/app/src/main/assets/web/js/df99_multiscreen_i18n.js','utf8'),c);
  vm.runInContext(fs.readFileSync('android/app/src/main/assets/web/js/df99_reviewed_packs.js','utf8'),c);
  return c.window.DF99Locale.t;
}
test('32: ten new languages have full timer goals analytics and activity label keys',()=>{
 for(const lang of LANGS)for(const [family,keys] of Object.entries(KEYS)){
  const dictionary=packs[lang]?.[family];
  assert.ok(dictionary,'missing '+lang+'/'+family);
  assert.deepEqual(Object.keys(dictionary).sort(),keys.slice().sort(),lang+'/'+family);
  assert.ok(Object.values(dictionary).every(v=>typeof v==='string'&&v.trim().length>0),lang+'/'+family+' blank');
 }
});
test('32: 470 new strings resolve to translated values through actual offline runtime',()=>{
 const t=translator();let n=0;
 for(const code of LANGS)for(const family of Object.keys(KEYS))
 for(const [key,value]of Object.entries(packs[code][family])){
  assert.equal(t(code,family,key,'fallback'),value,code+'/'+family+'/'+key);n++;
 }
 assert.equal(n,470);
});
test('32: previous 5860 texts and existing tasks/notes packs remain intact',()=>{
 const count=Object.values(packs).reduce((n,sec)=>n+Object.values(sec).reduce((sum,d)=>sum+Object.keys(d).length,0),0);
 assert.equal(count,6330);
 for(const lang of LANGS){
  assert.equal(Object.keys(packs[lang].notes).length,36,'older notes lost '+lang);
  assert.equal(Object.keys(packs[lang].tasks).length,64,'older tasks lost '+lang);
 }
});
test('32: Hebrew and unknown language codes are not introduced',()=>{
 const t=translator();
 for(const lang of ['he','iw'])assert.equal(packs[lang],undefined);
 for(const lang of ['he','iw','zz'])assert.equal(t(lang,'analytics','title','fallback'),'fallback');
 for(const lang of LANGS)assert.equal(t(lang,'timer','missing_value','fallback'),'fallback');
});
test('32: translated save and export actions retain intended meanings',()=>{
 assert.equal(packs.bg.timer['8'],'Запази');
 assert.equal(packs.hr.timer['8'],'Spremi');
 assert.equal(packs.sr.timer['8'],'Sačuvaj');
 assert.equal(packs.sl.analytics.export,'Izvozi CSV');
 assert.equal(packs.lt.timer['8'],'Išsaugoti');
 assert.equal(packs.ca.timer['8'],'Desa');
});
test('32: generated translations keep western digits and no markup injection',()=>{
 for(const lang of LANGS)for(const family of Object.keys(KEYS))
 for(const value of Object.values(packs[lang][family])){
  assert.doesNotMatch(value,/[٠-٩۰-۹]/);
  assert.doesNotMatch(value,/<\/?(?:script|iframe|img|style)\b/i);
 }
});
JSTEST
node --check "$TEST"

echo '=== RED: regression tests must initially identify missing translations ==='
if node --test "$TEST"; then
 echo 'STOP: missing-translation test unexpectedly passed before applying batch'
 exit 1
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
for lang in bg hr sr sl lt lv et mk eo ca; do
 git show "$DATA_SHA:tools/termux/batch32_${lang}.json" > "$TMP/${lang}.json"
done

python3 - "$TMP" <<'PY'
import json,pathlib,sys,re
base=pathlib.Path('assets/i18n/df99_reviewed_packs.json')
d=json.loads(base.read_text(encoding='utf-8'))
before=sum(len(v) for sections in d.values() for v in sections.values())
assert before==5860,f'STOP: expected 5860 existing strings; found {before}'
langs=["bg","hr","sr","sl","lt","lv","et","mk","eo","ca"]
keys={"timer":["0","1","2","3","4","5","6","7","8","9","10"],"goals":["kicker","heading","desc","edit","modal","hint","save","invalid","noGoal","minute","done","today","week","weekTarget","weekInvalid"],"analytics":["title","activity","period","start","end","minutes","sessions","average","streak","noData","goal","noGoals","tasks","chart","year","export","details"],"analyticsDomain":["study","read","work","sport"]}
for lang in langs:
  path=pathlib.Path(sys.argv[1])/f'{lang}.json'
  incoming=json.loads(path.read_text(encoding='utf-8'))
  assert lang in d,f'STOP: unknown catalog language {lang}'
  assert len(d[lang]['tasks'])==64 and len(d[lang]['notes'])==36,f'STOP: prior pack changed {lang}'
  assert set(incoming)==set(keys),f'STOP: wrong section inventory {lang}'
  for family,expected in keys.items():
    terms=incoming[family]
    assert family not in d[lang],f'STOP: would overwrite {lang}/{family}'
    assert isinstance(terms,list) and len(terms)==len(expected),f'STOP: missing values {lang}/{family}'
    assert all(isinstance(t,str) and t.strip() and not re.search('[\u0660-\u0669\u06f0-\u06f9]',t) and not re.search(r'<\s*(script|iframe|img|style)\b',t,re.I) for t in terms),f'STOP: unsafe or empty terms {lang}/{family}'
    d[lang][family]=dict(zip(expected,terms))
after=sum(len(v) for sections in d.values() for v in sections.values())
assert after==6330,f'STOP: expected 6330 strings, got {after}'
base.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('PASS: 470 native strings; original 5860 translations preserved')
PY

node tools/df99_bulk_import.cjs
echo '=== GREEN: previous and new batch regression tests ==='
node --test tests/termux_fix*.test.cjs
node tests/smoke_app.cjs
node tests/validate_locales.cjs
node tools/df99_full_app_coverage.cjs
git diff --check
git add -- "$PACK" "$JS" "$TEST"
git diff --cached --check

EXPECTED="$(printf '%s\n' "$PACK" "$JS" "$TEST" | sort)"
ACTUAL="$(git diff --cached --name-only | sort)"
[ "$ACTUAL" = "$EXPECTED" ] || { echo 'STOP: unexpected staged files'; exit 1; }
[ -z "$(git diff --name-only)" ] || { echo 'STOP: unexpected unstaged edits'; exit 1; }

# Re-check the target branch before publication: no forced pushes, no Play uploads.
REMOTE_NOW="$(git ls-remote origin "refs/heads/$BR" | cut -f1)"
[ "$REMOTE_NOW" = "$BASE" ] || { echo 'STOP: remote moved during tests; local files kept'; exit 1; }
git -c user.name='moaz76943-creator' -c user.email='moaz76943-creator@users.noreply.github.com' commit -m 'feat(i18n): batch32 complete 10 timer goals and analytics locale packs'
git push origin "HEAD:refs/heads/$BR"
SHA="$(git rev-parse HEAD)"
[ "$(git ls-remote origin "refs/heads/$BR" | cut -f1)" = "$SHA" ] || { echo 'STOP: remote SHA does not match'; exit 1; }

printf '\nSUCCESS: BATCH 32 PUSH VERIFIED\nOFFICIAL_HEAD=%s\nNEW_TRANSLATIONS=470\nTOTAL_TRANSLATIONS=6330\nTIMER_GOALS_ANALYTICS_LOCALES_ADDED=10\nPREVIOUS_BATCHES=01-31 PRESERVED\nPLAY_RELEASE=UNCHANGED\n' "$SHA"
