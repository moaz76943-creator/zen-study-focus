#!/data/data/com.termux/files/usr/bin/bash
# Deep Focus batch 33: 15 native locales and 384 offline UI strings.
# Target: official source branch ONLY. No Google Play publication.
set -euo pipefail

REPO="$HOME/deep-focus-official"
BR="integration/master-qa-verified-v21"
BASE="ad221fa8d8235f2c774484f3239db9c19c04128e"
DATA_SHA="b30b05393580e3f486596578e1b226feb6e088eb"
DATA_REF="tooling/deep-focus-batch33-direct-20261025"
PACK="assets/i18n/df99_reviewed_packs.json"
GENERATED="android/app/src/main/assets/web/js/df99_reviewed_packs.js"
TEST="tests/termux_fix33_timer_goals_multiscript_15_locales.test.cjs"

cd "$REPO" || { echo 'STOP: missing official repository'; exit 1; }
[ "$(git branch --show-current)" = "$BR" ] || { echo 'STOP: wrong source branch'; exit 1; }
case "$(git remote get-url origin)" in
  *github.com/moaz76943-creator/zen-study-focus|*github.com/moaz76943-creator/zen-study-focus.git) ;;
  *) echo 'STOP: wrong remote repository'; exit 1;;
esac
[ -z "$(git status --porcelain --untracked-files=all)" ] || { echo 'STOP: local pending changes exist'; exit 1; }
[ "$(git rev-parse HEAD)" = "$BASE" ] || { echo 'STOP: official source advanced locally'; exit 1; }
[ "$(git ls-remote origin "refs/heads/$BR" | cut -f1)" = "$BASE" ] || { echo 'STOP: official remote advanced'; exit 1; }

git fetch origin "refs/heads/$DATA_REF"
git merge-base --is-ancestor "$DATA_SHA" FETCH_HEAD || { echo 'STOP: unverified tooling source'; exit 1; }
[ ! -e "$TEST" ] || { echo 'STOP: test file already exists'; exit 1; }

cat > "$TEST" <<'JSTEST'
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const packs=JSON.parse(fs.readFileSync('assets/i18n/df99_reviewed_packs.json','utf8'));
const TARGET={"gl":["timer"],"bs":["timer"],"sq":["timer"],"be":["timer"],"mt":["timer"],"id":["timer","goals"],"zh":["timer","goals"],"ja":["timer","goals"],"ko":["timer","goals"],"hi":["timer","goals"],"bn":["timer","goals","analytics","analyticsDomain"],"ur":["timer","goals","analytics","analyticsDomain"],"fa":["timer"],"vi":["timer","goals","analytics","analyticsDomain"],"th":["timer","goals","analytics","analyticsDomain"]};
const SCHEMAS={"timer":["0","1","2","3","4","5","6","7","8","9","10"],"goals":["kicker","heading","desc","edit","modal","hint","save","invalid","noGoal","minute","done","today","week","weekTarget","weekInvalid"],"analytics":["title","activity","period","start","end","minutes","sessions","average","streak","noData","goal","noGoals","tasks","chart","year","export","details"],"analyticsDomain":["study","read","work","sport"]};
const expectedTotal=6714;
function t(){
 const context={window:{},console};vm.createContext(context);
 vm.runInContext(fs.readFileSync('android/app/src/main/assets/web/js/df99_multiscreen_i18n.js','utf8'),context);
 vm.runInContext(fs.readFileSync('android/app/src/main/assets/web/js/df99_reviewed_packs.js','utf8'),context);
 return context.window.DF99Locale.t;
}
test('33: expected new 15-language dictionaries have exact approved key inventories',()=>{
 for(const [lang,families] of Object.entries(TARGET))for(const family of families){
  const found=packs[lang]?.[family];
  assert.ok(found,'missing '+lang+'/'+family);
  assert.deepEqual(Object.keys(found).sort(),SCHEMAS[family].slice().sort(),lang+'/'+family);
  assert.ok(Object.values(found).every(x=>typeof x==='string'&&x.trim()),lang+'/'+family+' empty');
 }
});
test('33: all 384 native translations resolve through the installed offline runtime',()=>{
 const translate=t();let count=0;
 for(const [lang,families] of Object.entries(TARGET))for(const family of families)
  for(const [key,native] of Object.entries(packs[lang][family])){
   assert.equal(translate(lang,family,key,'fallback'),native,lang+'/'+family+'/'+key);
   count++;
  }
 assert.equal(count,384);
});
test('33: prior 6330 strings remain and 15 earlier notes dictionaries survive',()=>{
 const total=Object.values(packs).reduce((a,s)=>a+Object.values(s).reduce((b,d)=>b+Object.keys(d).length,0),0);
 assert.equal(total,expectedTotal,'new data must add exactly 384 strings, not replace prior text');
 for(const lang of Object.keys(TARGET))assert.equal(Object.keys(packs[lang]?.notes||{}).length,36,'notes missing '+lang);
});
test('33: no Hebrew or unsupported locale passed off as translated',()=>{
 const translate=t();
 for(const lang of ['he','iw','zz']){
  assert.equal(packs[lang],undefined);
  assert.equal(translate(lang,'timer','1','fallback'),'fallback');
 }
 for(const lang of Object.keys(TARGET))
  assert.equal(translate(lang,'timer','this_key_does_not_exist','fallback'),'fallback');
});
test('33: translated save button retains its meaning in representative scripts',()=>{
 assert.equal(packs.gl.timer['8'],'Gardar');
 assert.equal(packs.bs.timer['8'],'Sačuvaj');
 assert.equal(packs.zh.timer['8'],'保存');
 assert.equal(packs.ja.timer['8'],'保存');
 assert.equal(packs.ko.timer['8'],'저장');
 assert.equal(packs.hi.timer['8'],'सहेजें');
 assert.equal(packs.bn.timer['8'],'সংরক্ষণ করুন');
 assert.equal(packs.ur.timer['8'],'محفوظ کریں');
 assert.equal(packs.fa.timer['8'],'ذخیره');
 assert.equal(packs.vi.timer['8'],'Lưu');
 assert.equal(packs.th.timer['8'],'บันทึก');
});
test('33: western numerals, no injection, and no empty localized labels',()=>{
 for(const [lang,families] of Object.entries(TARGET))for(const family of families)
 for(const text of Object.values(packs[lang][family])){
  assert.doesNotMatch(text,/[٠-٩۰-۹]/);
  assert.doesNotMatch(text,/<\/?(?:script|style|iframe|img)\b/i);
  assert.ok(text.trim().length>0);
 }
});
JSTEST
node --check "$TEST"

echo '=== RED: test failures before filling missing locale sections are expected ==='
if node --test "$TEST"; then
 echo 'STOP: expected RED test before locale import'
 exit 1
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
for code in gl bs sq be mt id zh ja ko hi bn ur fa vi th; do
  git show "$DATA_SHA:tools/termux/batch33_${code}.json" > "$TMP/${code}.json"
done

python3 - "$TMP" <<'PY'
import json,pathlib,sys,re
source=pathlib.Path('assets/i18n/df99_reviewed_packs.json')
packs=json.loads(source.read_text(encoding='utf-8'))
before=sum(len(v) for d in packs.values() for v in d.values())
assert before==6330, f'STOP: expected 6330 previous translations; found {before}'
target={"gl":["timer"],"bs":["timer"],"sq":["timer"],"be":["timer"],"mt":["timer"],"id":["timer","goals"],"zh":["timer","goals"],"ja":["timer","goals"],"ko":["timer","goals"],"hi":["timer","goals"],"bn":["timer","goals","analytics","analyticsDomain"],"ur":["timer","goals","analytics","analyticsDomain"],"fa":["timer"],"vi":["timer","goals","analytics","analyticsDomain"],"th":["timer","goals","analytics","analyticsDomain"]}
schema={"timer":["0","1","2","3","4","5","6","7","8","9","10"],"goals":["kicker","heading","desc","edit","modal","hint","save","invalid","noGoal","minute","done","today","week","weekTarget","weekInvalid"],"analytics":["title","activity","period","start","end","minutes","sessions","average","streak","noData","goal","noGoals","tasks","chart","year","export","details"],"analyticsDomain":["study","read","work","sport"]}
count=0
for code,families in target.items():
  incoming=json.loads((pathlib.Path(sys.argv[1])/f'{code}.json').read_text(encoding='utf-8'))
  assert code in packs and 'notes' in packs[code] and len(packs[code]['notes'])==36, f'STOP: incomplete previous locale {code}'
  assert set(incoming)==set(families), f'STOP: unexpected section set {code}'
  for family in families:
    assert family not in packs[code], f'STOP: would overwrite previous translation {code}/{family}'
    values=incoming[family]
    keys=schema[family]
    assert isinstance(values,list) and len(values)==len(keys), f'STOP: incorrect keys {code}/{family}'
    assert all(isinstance(v,str) and v.strip() and not re.search('[\u0660-\u0669\u06f0-\u06f9]',v) and not re.search(r'<\s*(script|iframe|style|img)\b',v,re.I) for v in values), f'STOP: unsafe text {code}/{family}'
    packs[code][family]=dict(zip(keys,values))
    count+=len(keys)
assert count==384, f'STOP: unexpected new count {count}'
after=sum(len(v) for d in packs.values() for v in d.values())
assert after==6714, f'STOP: expected 6714 total strings; got {after}'
source.write_text(json.dumps(packs,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('PASS: 384 native labels integrated; 6330 previous strings untouched')
PY

node tools/df99_bulk_import.cjs
echo '=== GREEN: all batch regressions ==='
node --test tests/termux_fix*.test.cjs
node tests/smoke_app.cjs
node tests/validate_locales.cjs
node tools/df99_full_app_coverage.cjs
node --check "$GENERATED"
git diff --check
git add -- "$PACK" "$GENERATED" "$TEST"
git diff --cached --check
EXPECTED_FILES="$(printf '%s\n' "$PACK" "$GENERATED" "$TEST" | sort)"
STAGED_FILES="$(git diff --cached --name-only | sort)"
[ "$STAGED_FILES" = "$EXPECTED_FILES" ] || { echo 'STOP: changed file scope mismatch'; exit 1; }
[ -z "$(git diff --name-only)" ] || { echo 'STOP: unstaged modifications found'; exit 1; }
[ "$(git ls-remote origin "refs/heads/$BR" | cut -f1)" = "$BASE" ] || { echo 'STOP: remote source advanced during tests'; exit 1; }

git -c user.name='moaz76943-creator' -c user.email='moaz76943-creator@users.noreply.github.com' commit -m 'feat(i18n): batch33 extend timer goals analytics for 15 locales'
git push origin "HEAD:refs/heads/$BR"
SHA="$(git rev-parse HEAD)"
[ "$(git ls-remote origin "refs/heads/$BR" | cut -f1)" = "$SHA" ] || { echo 'STOP: remote does not match local new commit'; exit 1; }
printf '\nSUCCESS: BATCH 33 PUSH VERIFIED\nOFFICIAL_HEAD=%s\nNEW_TRANSLATIONS=384\nTOTAL_TRANSLATIONS=6714\nLANGUAGES_EXTENDED=15\nPREVIOUS_BATCHES=01-32 PRESERVED\nGOOGLE_PLAY_RELEASE=UNCHANGED\n' "$SHA"
