#!/data/data/com.termux/files/usr/bin/bash
# Deep Focus / Batch 31 / Native i18n for 5 languages x 4 sections.
set -euo pipefail

cd "$HOME/deep-focus-official" || exit 1
BR='integration/master-qa-verified-v21'
BASE='70a9fd66ef847b11d8fb7b1c79f4e4ee43956133'
DATA_SHA='2642cbabc8f1491ed854615687908ee7fa8e21f4'
DATA_REF='tooling/deep-focus-batch31-direct-20261025'
PACK='assets/i18n/df99_reviewed_packs.json'
JS='android/app/src/main/assets/web/js/df99_reviewed_packs.js'
TEST='tests/termux_fix31_five_languages_four_sections.test.cjs'

[ "$(git branch --show-current)" = "$BR" ] || { echo 'STOP: wrong branch'; exit 1; }
case "$(git remote get-url origin)" in
 *github.com/moaz76943-creator/zen-study-focus|*github.com/moaz76943-creator/zen-study-focus.git) ;;
 *) echo 'STOP: wrong repository'; exit 1 ;;
esac
[ -z "$(git status --porcelain --untracked-files=all)" ] || { echo 'STOP: local changes exist; nothing overwritten'; exit 1; }
[ "$(git rev-parse HEAD)" = "$BASE" ] || { echo 'STOP: official local SHA changed'; exit 1; }

git fetch origin "$BR" "$DATA_REF"
[ "$(git rev-parse "refs/remotes/origin/$BR")" = "$BASE" ] || { echo 'STOP: official branch advanced'; exit 1; }
git merge-base --is-ancestor "$DATA_SHA" "refs/remotes/origin/$DATA_REF" || { echo 'STOP: trusted data revision not present'; exit 1; }
[ ! -e "$TEST" ] || { echo 'STOP: test file already exists'; exit 1; }

cat > "$TEST" <<'JSTEST'
'use strict';
const {test}=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs'), vm=require('node:vm');
const packs=JSON.parse(fs.readFileSync('assets/i18n/df99_reviewed_packs.json','utf8'));
const langs=['gl','bs','sq','be','mt'];
const keys={
  tasks:'title subtitle add project today search all board matrix trash calendar undo redo empty task desc due time cat priority estimate repeat group notes proj none save cancel focus edit done resume archive remove restore addCheck check sub study sport review exam todo doing completed archived low medium high urgent daily weekly monthly never allCategories estimated actual overdue do schedule delegate eliminate invalid notConnected'.split(' '),
  goals:'kicker heading desc edit modal hint save invalid noGoal minute done today week weekTarget weekInvalid'.split(' '),
  analytics:'title activity period start end minutes sessions average streak noData goal noGoals tasks chart year export details'.split(' '),
  analyticsDomain:'study read work sport'.split(' ')
};
function translator() {
 const c={window:{},console};vm.createContext(c);
 vm.runInContext(fs.readFileSync('android/app/src/main/assets/web/js/df99_multiscreen_i18n.js','utf8'),c);
 vm.runInContext(fs.readFileSync('android/app/src/main/assets/web/js/df99_reviewed_packs.js','utf8'),c);
 return c.window.DF99Locale.t;
}
test('31: five languages have 64 tasks, 15 goals, 17 analytics and 4 activity labels',()=>{
 for(const code of langs) for(const [f,expected] of Object.entries(keys)){
  const dic=packs[code]?.[f];assert.ok(dic,code+'/'+f+' missing');
  assert.deepEqual(Object.keys(dic).sort(),expected.slice().sort(),code+'/'+f);
  assert.ok(Object.values(dic).every(v=>typeof v==='string'&&v.trim()),code+'/'+f+' blank');
 }
});
test('31: all 500 translated strings are available through the offline runtime',()=>{
 const t=translator();let count=0;
 for(const code of langs)for(const f of Object.keys(keys))
 for(const [k,v] of Object.entries(packs[code][f])){assert.equal(t(code,f,k,'fallback'),v);count++;}
 assert.equal(count,500);
});
test('31: previous 5360 strings persist; unknown languages never appear native',()=>{
 const n=Object.values(packs).reduce((a,p)=>a+Object.values(p).reduce((b,d)=>b+Object.keys(d).length,0),0);
 assert.ok(n>=5860,'Expected >=5860 translations; found '+n);
 for(const code of langs)assert.equal(Object.keys(packs[code].notes).length,36,'Notes lost for '+code);
 for(const code of ['he','iw'])assert.equal(packs[code],undefined);
});
test('31: untranslated labels retain their safe fallback',()=>{
 const t=translator();
 for(const code of langs)assert.equal(t(code,'tasks','not_a_real_key','fallback'),'fallback');
 for(const code of ['he','iw','zz'])assert.equal(t(code,'analytics','title','fallback'),'fallback');
});
test('31: selected translated actions preserve their meaning',()=>{
 assert.equal(packs.gl.tasks.save,'Gardar');
 assert.equal(packs.bs.tasks.cancel,'Otkaži');
 assert.equal(packs.sq.tasks.restore,'Rikthe');
 assert.equal(packs.be.tasks.save,'Захаваць');
 assert.equal(packs.mt.analytics.export,'Esporta CSV');
});
JSTEST

echo '=== RED: new tests must fail before importing translations ==='
if node --test "$TEST"; then
  echo 'STOP: expected RED test before translation import'
  exit 1
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
for lang in gl bs sq be mt; do
  git show "$DATA_SHA:tools/termux/batch31_${lang}.json" > "$TMP/${lang}.json"
done

python3 - "$TMP" <<'PY'
import json, pathlib, sys, re
directory=pathlib.Path(sys.argv[1])
file=pathlib.Path('assets/i18n/df99_reviewed_packs.json')
d=json.loads(file.read_text(encoding='utf-8'))
old=sum(len(item) for sections in d.values() for item in sections.values())
assert old==5360, f'STOP: expected 5360 earlier strings; got {old}'
fields={
 'tasks':'title subtitle add project today search all board matrix trash calendar undo redo empty task desc due time cat priority estimate repeat group notes proj none save cancel focus edit done resume archive remove restore addCheck check sub study sport review exam todo doing completed archived low medium high urgent daily weekly monthly never allCategories estimated actual overdue do schedule delegate eliminate invalid notConnected'.split(),
 'goals':'kicker heading desc edit modal hint save invalid noGoal minute done today week weekTarget weekInvalid'.split(),
 'analytics':'title activity period start end minutes sessions average streak noData goal noGoals tasks chart year export details'.split(),
 'analyticsDomain':'study read work sport'.split()
}
for lang in ['gl','bs','sq','be','mt']:
 values=json.loads((directory/f'{lang}.json').read_text(encoding='utf-8'))
 assert lang in d and 'notes' in d[lang], f'STOP: prior note pack missing {lang}'
 assert set(values)==set(fields), f'STOP: incorrect section inventory {lang}'
 for family,keys in fields.items():
  data=values[family]
  assert isinstance(data,list) and len(data)==len(keys),f'STOP: key count {lang}/{family}'
  assert family not in d[lang],f'STOP: would overwrite existing section {lang}/{family}'
  assert all(isinstance(v,str) and v.strip() and not re.search('[\u0660-\u0669\u06f0-\u06f9]',v) for v in data), f'STOP: bad translation {lang}/{family}'
  d[lang][family]=dict(zip(keys,data))
new=sum(len(item) for sections in d.values() for item in sections.values())
assert new==5860,f'STOP: incorrect total {new}'
file.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('PASS: 500 native text entries added; 5360 previous entries preserved')
PY

node tools/df99_bulk_import.cjs
node --test tests/termux_fix*.test.cjs
node tests/smoke_app.cjs
node tests/validate_locales.cjs
node tools/df99_full_app_coverage.cjs
git diff --check
git add -- "$PACK" "$JS" "$TEST"
git diff --cached --check

EXPECTED="$(printf '%s\n' "$PACK" "$JS" "$TEST" | sort)"
ACTUAL="$(git diff --cached --name-only | sort)"
[ "$ACTUAL" = "$EXPECTED" ] || { echo 'STOP: unauthorized staged file'; exit 1; }
[ -z "$(git diff --name-only)" ] || { echo 'STOP: unexpected unstaged modifications'; exit 1; }

git -c user.name='moaz76943-creator' -c user.email='moaz76943-creator@users.noreply.github.com' commit -m 'feat(i18n): batch31 five complete tasks goals analytics packs'
git push origin "HEAD:refs/heads/$BR"
SHA="$(git rev-parse HEAD)"
[ "$(git ls-remote origin "refs/heads/$BR" | cut -f1)" = "$SHA" ] || { echo 'STOP: remote SHA verification failed'; exit 1; }
printf '\nSUCCESS: BATCH 31 PUSH VERIFIED\nOFFICIAL_HEAD=%s\nNEW_TRANSLATIONS=500\nTOTAL_TRANSLATIONS=5860\nPLAY_RELEASE=UNCHANGED\n' "$SHA"
