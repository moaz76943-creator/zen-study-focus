#!/usr/bin/env bash
set -Eeuo pipefail

REPO='moaz76943-creator/zen-study-focus'
OFFICIAL='integration/master-qa-verified-v21'
APP='android/app/src/main/assets/web/app.js'
GRADLE='android/app/build.gradle'
WORKFLOW='.github/workflows/auto_release_build.yml'

say(){ printf '\n[DF] %s\n' "$*"; }
warn(){ printf '[WARN] %s\n' "$*"; }
fail(){ printf '[STOP] %s\n' "$*" >&2; exit 1; }

printf '=============================================================\n'
printf ' DEEP FOCUS — SAFE REPAIR + PR516/518 + CI AUDIT (TERMUX)\n'
printf '=============================================================\n'
for cmd in git gh python3 node; do
  command -v "$cmd" >/dev/null 2>&1 || fail "Missing $cmd. For Termux: pkg install git gh python nodejs -y"
done
gh auth status >/dev/null 2>&1 || fail 'GitHub login missing. Run: gh auth login'
[[ "$(gh repo view "$REPO" --json nameWithOwner --jq .nameWithOwner)" == "$REPO" ]] || fail 'Wrong GitHub repository'
[[ -d .git || -f .git ]] || fail 'Run inside ~/zen-study-focus'
ORIGIN="$(git remote get-url origin)"
[[ "$ORIGIN" =~ (^git@github\.com:|^https://github\.com/|^ssh://git@github\.com/|^https://[^/]+@github\.com/)moaz76943-creator/zen-study-focus(\.git)?$ ]] || fail "Origin does not match the expected GitHub repository"

TMP="$(mktemp -d "${TMPDIR:-${PREFIX:-/tmp}/tmp}/df-safe-repair.XXXXXX")"
WT="$TMP/worktree"
cleanup(){
  if [[ -d "$WT" ]]; then
    if [[ -z "$(git -C "$WT" status --porcelain 2>/dev/null || printf 'unknown')" ]]; then
      git worktree remove "$WT" >/dev/null 2>&1 || true
      rm -f -- "$TMP"/*.log "$TMP"/*.json "$TMP"/*.txt
      rmdir "$TMP" 2>/dev/null || true
    else
      printf '\n[PRESERVED] Uncommitted repair work: %s\n' "$WT"
    fi
  else
    rmdir "$TMP" 2>/dev/null || true
  fi
}
trap cleanup EXIT

say '1/6 Read current GitHub HEAD; preserve local working tree and Gemini'
git fetch --quiet origin "+refs/heads/$OFFICIAL:refs/remotes/origin/$OFFICIAL" || fail 'Cannot fetch official branch'
BASE="$(git rev-parse "refs/remotes/origin/$OFFICIAL")"
REMOTE_BASE="$(gh api "repos/$REPO/git/ref/heads/$OFFICIAL" --jq '.object.sha')"
[[ "$BASE" == "$REMOTE_BASE" ]] || fail 'Official branch moved during fetch. Retry script.'
echo "OFFICIAL_SHA=$BASE"
git worktree add --detach "$WT" "$BASE" >/dev/null
[[ -f "$WT/$APP" && -f "$WT/$GRADLE" ]] || fail 'Critical files not found'

python3 - "$WT/$APP" "$WT/$GRADLE" "$WT/$WORKFLOW" <<'PY'
import pathlib,re,sys
app=pathlib.Path(sys.argv[1]).read_text()
gradle=pathlib.Path(sys.argv[2]).read_text()
workflow=pathlib.Path(sys.argv[3]).read_text()
marks=set(map(int,re.findall(r'/\*\s*===\s*M(\d{3})_',app)))
print('GEMINI_LATEST_M=',max(marks) if marks else 'UNKNOWN')
print('GEMINI_MARKERS=',len(marks))
print('VERSION_CODE=',(re.search(r'\bversionCode\s+(\d+)',gradle)or[None,'?'])[1])
print('VERSION_NAME=',(re.search(r'\bversionName\s+["\']([^"\']+)',gradle)or[None,'?'])[1])
print('PACKAGE_ID=',(re.search(r'applicationId\s+["\']([^"\']+)',gradle)or[None,'?'])[1])
print('M277_PRESENT=', 'M277_FULL_VAULT_BACKUP_EXPORT_IMPORT' in app)
print('RELEASE_MANUAL_ONLY=', 'workflow_dispatch:' in workflow and '\n  push:' not in workflow)
print('GRADLE_WRAPPER_BROKEN=', 'android/gradlew' in workflow and not pathlib.Path(sys.argv[2]).parent.parent.joinpath('gradlew').exists())
PY

say '2/6 Targeted safety fix for M277 (no Notes/Tasks/Timer changes)'
if grep -q 'DF_M277_SAFE_JOURNAL_IMPORT_V2' "$WT/$APP"; then
  say 'M277 transaction repair already exists; skipping'
else
  BRANCH="fix/df-m277-safe-vault-${BASE:0:12}"
  if git ls-remote --exit-code --heads origin "$BRANCH" >/dev/null 2>&1; then
    warn "Existing branch $BRANCH; do not overwrite. Inspect its PR."
  else
    git -C "$WT" switch -c "$BRANCH" >/dev/null
    [[ ! -e "$WT/tests/vault/m277_safe_import.test.cjs" ]] || fail "Existing vault test found; do not overwrite"
    mkdir -p "$WT/tests/vault"
    cat > "$WT/tests/vault/m277_safe_import.test.cjs" <<'TEST_M277'
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const app=fs.readFileSync(path.join(__dirname,'../../android/app/src/main/assets/web/app.js'),'utf8');
const start=app.indexOf('/* === M277_FULL_VAULT_BACKUP_EXPORT_IMPORT_AND_CODE97_V1 === */');
const next=app.indexOf('/* === M278_',start);
assert.ok(start>=0&&next>start);
const moduleText=app.slice(start,next);
function fixture(seed={},failureAt=Infinity){
 const map=new Map(Object.entries(seed)),before=()=>Object.fromEntries(map);
 let counter=0;
 const storage={
  getItem:k=>map.has(k)?map.get(k):null,
  setItem(k,v){if(++counter===failureAt)throw Error('disk failure');map.set(k,String(v))},
  removeItem:k=>map.delete(k)
 };
 const sandbox={window:{},localStorage:storage,console,JSON,Date,Blob,URL};
 vm.runInNewContext(moduleText,sandbox,{filename:'M277 actual source'});
 const payload=(vocab=[{id:'new'}],hist=[{id:'review'}])=>JSON.stringify({app:'Deep Focus',packageId:'com.deepfocus.study',schemaVersion:'v4.0.7',vault:{vocabBank:vocab,studyHistory:hist,dailyGoal:5,settings:{oledTrueBlack:true,halfwayChime:false}}});
 return {w:sandbox.window,store:storage,before,payload,map};
}
test('rejects missing lists without clearing existing vocabulary',()=>{
 const f=fixture({'df_vocab_bank_v1':'[{"id":"old"}]'}),before=f.before();
 const result=f.w.dfValidateAndImportVaultJson(JSON.stringify({app:'Deep Focus',schemaVersion:'v4.0.7',vault:{}}));
 assert.equal(result.success,false);assert.deepEqual(f.before(),before);
});
test('refuses empty replacement of populated vocabulary',()=>{
 const f=fixture({'df_vocab_bank_v1':'[{"id":"old"}]'});
 const r=f.w.dfValidateAndImportVaultJson(f.payload([],[]));
 assert.equal(r.success,false);assert.equal(f.store.getItem('df_vocab_bank_v1'),'[{"id":"old"}]');
});
test('successful valid import updates the intended vocabulary keys only',()=>{
 const f=fixture({'user-notes-private':'keep'}),r=f.w.dfValidateAndImportVaultJson(f.payload());
 assert.equal(r.success,true);assert.equal(f.store.getItem('user-notes-private'),'keep');
 assert.equal(JSON.parse(f.store.getItem('df_vocab_bank_v1')).length,1);
 assert.equal(f.store.getItem('df_vocab_daily_goal_v1'),'5');
 assert.equal(f.store.getItem('df_vocab_import_journal_v2'),null);
});
test('failed partial write rolls all modified values back',()=>{
 const old={'df_vocab_bank_v1':'[{"id":"old"}]','df_vocab_study_history_v1':'[{"id":"old-history"}]','df_vocab_daily_goal_v1':'8','user-notes-private':'keep'};
 const f=fixture(old,3),r=f.w.dfValidateAndImportVaultJson(f.payload());
 assert.equal(r.success,false);assert.deepEqual(f.before(),old);
});
test('unfinished journal is recovered on next startup',()=>{
 const old={'df_vocab_bank_v1':'[{"id":"old"}]','df_vocab_study_history_v1':'[]'};
 const journal={schema:'DF_M277_SAFE_JOURNAL_IMPORT_V2',before:old,keys:Object.keys(old)};
 const f=fixture({...old,'df_vocab_bank_v1':'[{"id":"partial"}]','df_vocab_import_journal_v2':JSON.stringify(journal)});
 assert.equal(f.store.getItem('df_vocab_bank_v1'),'[{"id":"old"}]');
 assert.equal(f.store.getItem('df_vocab_import_journal_v2'),null);
});
TEST_M277
    # RED first: confirm that the old implementation does not meet the protection contract.
    if (cd "$WT" && node --test tests/vault/m277_safe_import.test.cjs > "$TMP/red.log" 2>&1); then
      warn 'Safety test already passed before modification. Avoid unnecessary rewrite.'
      rm -f "$WT/tests/vault/m277_safe_import.test.cjs" # Only the test created above
    else
      say 'RED confirmed: M277 has unsafe import behavior'
      python3 - "$WT/$APP" <<'PY'
import pathlib,sys
p=pathlib.Path(sys.argv[1]);s=p.read_text()
marker='/* === M277_FULL_VAULT_BACKUP_EXPORT_IMPORT_AND_CODE97_V1 === */'
start=s.index('  function dfValidateAndImportVaultJson(jsonString) {',s.index(marker))
end=s.index('\n  function dfRenderVaultBackupSettingsSectionHtml()',start)
replacement='''  // DF_M277_SAFE_JOURNAL_IMPORT_V2: rollback journal survives sudden process death.
  var DF_VAULT_JOURNAL = "df_vocab_import_journal_v2";
  function dfRecoverPendingVaultImport() {
    var raw;
    try { raw = localStorage.getItem(DF_VAULT_JOURNAL); } catch (_) { return false; }
    if (!raw) return true;
    var journal;
    try { journal = JSON.parse(raw); } catch (_) { return false; }
    var allowed = ["df_vocab_bank_v1", "df_vocab_study_history_v1", "df_vocab_daily_goal_v1", "df_oled_true_black_v1", "df_halfway_chime_enabled_v1"];
    if (!journal || journal.schema !== "DF_M277_SAFE_JOURNAL_IMPORT_V2" ||
        !Array.isArray(journal.keys) || !journal.keys.length || !journal.before ||
        journal.keys.some(function(k) { return allowed.indexOf(k) < 0 || !Object.prototype.hasOwnProperty.call(journal.before,k); })) return false;
    try {
      for (var i=0; i<journal.keys.length; i++) {
        var key=journal.keys[i],old=journal.before[key];
        if (old === null) localStorage.removeItem(key);
        else localStorage.setItem(key,old);
      }
      for (var j=0; j<journal.keys.length; j++) {
        var k=journal.keys[j];
        if (localStorage.getItem(k) !== journal.before[k]) return false;
      }
      localStorage.removeItem(DF_VAULT_JOURNAL);
      return true;
    } catch (_) { return false; }
  }

  function dfValidateAndImportVaultJson(jsonString) {
    if (typeof jsonString !== 'string' || !jsonString || jsonString.length > 5*1024*1024)
      return {success:false,reason:'invalid_or_oversized_input'};
    if (!dfRecoverPendingVaultImport()) return {success:false,reason:'recovery_pending'};
    var parsed;
    try { parsed = JSON.parse(jsonString); } catch (_) { return {success:false,reason:'invalid_json'}; }
    if (!parsed || parsed.app !== 'Deep Focus' || parsed.schemaVersion !== 'v4.0.7' ||
        !parsed.vault || typeof parsed.vault !== 'object' ||
        !Array.isArray(parsed.vault.vocabBank) || !Array.isArray(parsed.vault.studyHistory))
      return {success:false,reason:'invalid_vault_schema'};
    var v=parsed.vault;
    if (v.vocabBank.some(function(x){return !x || typeof x !== 'object' || Array.isArray(x);}) ||
        v.studyHistory.some(function(x){return !x || typeof x !== 'object' || Array.isArray(x);}))
      return {success:false,reason:'invalid_vault_items'};
    var current;
    try { current = JSON.parse(localStorage.getItem('df_vocab_bank_v1') || '[]'); } catch (_) { current=[]; }
    if (Array.isArray(current) && current.length && !v.vocabBank.length)
      return {success:false,reason:'refuse_empty_vocabulary_overwrite'};
    var desired={
      df_vocab_bank_v1:JSON.stringify(v.vocabBank),
      df_vocab_study_history_v1:JSON.stringify(v.studyHistory)
    };
    if (Object.prototype.hasOwnProperty.call(v,'dailyGoal')) {
      if (!Number.isSafeInteger(v.dailyGoal) || v.dailyGoal<1 || v.dailyGoal>10000)
        return {success:false,reason:'invalid_daily_goal'};
      desired.df_vocab_daily_goal_v1=String(v.dailyGoal);
    }
    if (v.settings != null) {
      if (typeof v.settings !== 'object' || Array.isArray(v.settings))
        return {success:false,reason:'invalid_settings'};
      if (Object.prototype.hasOwnProperty.call(v.settings,'oledTrueBlack')) {
        if (typeof v.settings.oledTrueBlack !== 'boolean') return {success:false,reason:'invalid_oled_state'};
        desired.df_oled_true_black_v1=String(v.settings.oledTrueBlack);
      }
      if (Object.prototype.hasOwnProperty.call(v.settings,'halfwayChime')) {
        if (typeof v.settings.halfwayChime !== 'boolean') return {success:false,reason:'invalid_chime_state'};
        desired.df_halfway_chime_enabled_v1=String(v.settings.halfwayChime);
      }
    }
    var keys=Object.keys(desired),before=Object.create(null);
    try {
      for (var i=0;i<keys.length;i++) before[keys[i]]=localStorage.getItem(keys[i]);
      localStorage.setItem(DF_VAULT_JOURNAL,JSON.stringify({schema:'DF_M277_SAFE_JOURNAL_IMPORT_V2',keys:keys,before:before}));
      for (var j=0;j<keys.length;j++) localStorage.setItem(keys[j],desired[keys[j]]);
      for (var k=0;k<keys.length;k++) if (localStorage.getItem(keys[k])!==desired[keys[k]]) throw Error('readback_failed');
      localStorage.removeItem(DF_VAULT_JOURNAL);
    } catch (_) {
      var restored=dfRecoverPendingVaultImport();
      return {success:false,reason:restored?'storage_write_failed_rolled_back':'rollback_pending_do_not_close'};
    }
    try { if (typeof window !== 'undefined') {
      if (typeof window.dfApplyOledTrueBlackState === 'function') window.dfApplyOledTrueBlackState();
      if (typeof window.dfTriggerVocabStatsSync === 'function') window.dfTriggerVocabStatsSync({immediate:true});
      if (typeof window.dfShowVocabToastNotification === 'function') window.dfShowVocabToastNotification('تم استيراد بيانات المفردات بنجاح','success');
    }} catch (_) {}
    return {success:true,wordsCount:v.vocabBank.length,historyCount:v.studyHistory.length};
  }
  // A crash during a previous import must not leave half-published values.
  dfRecoverPendingVaultImport();
'''
p.write_text(s[:start]+replacement+s[end:])
PY
      (cd "$WT" && node --check "$APP" && node --test tests/vault/m277_safe_import.test.cjs && git diff --check) || fail 'M277 focused tests failed; worktree preserved for inspection'
      # Avoid staging any file except the exact two scoped files.
      git -C "$WT" add -- "$APP" tests/vault/m277_safe_import.test.cjs
      git -C "$WT" diff --cached --quiet && fail 'No changes to commit'
      git -C "$WT" commit -m 'fix(vault): journaled M277 import with strict validation and rollback' >/dev/null
      git -C "$WT" push --set-upstream origin "$BRANCH" || fail 'Could not push scoped safety branch'
      if gh pr create --repo "$REPO" --base "$OFFICIAL" --head "$BRANCH" \
        --title 'fix(vault): prevent destructive M277 imports and recover interrupted writes' \
        --body 'Scope: M277 vocabulary-only import safety and real-source Node tests. Preserves Notes/Tasks/Timer, app identity, release signing and Gemini. Journal reverts interrupted imports on app reload. Requires normal security and focused CI before merge.'; then
        say 'M277 safety PR created; no bypass or direct official push'
      else
        warn "Branch pushed: $BRANCH ; PR may require creation manually"
      fi
    fi
  fi
fi

say '3/6 Synchronize PR516 and PR518 without overwriting Gemini'
for PR in 516 518; do
  state="$(gh pr view "$PR" --repo "$REPO" --json state --jq .state 2>/dev/null || true)"
  [[ "$state" == 'OPEN' ]] || { warn "PR #$PR not open / unavailable"; continue; }
  HEAD="$(gh pr view "$PR" --repo "$REPO" --json headRefOid --jq .headRefOid)"
  response="$TMP/update-$PR.json"
  if gh api -X PUT "repos/$REPO/pulls/$PR/update-branch" -f expected_head_sha="$HEAD" > "$response" 2> "$TMP/error-$PR.txt"; then
    say "PR #$PR update requested using expected SHA $HEAD"
  else
    warn "PR #$PR sync blocked or already current: $(head -c 220 "$TMP/error-$PR.txt")"
  fi
done

say '4/6 Check existing CI without launching new Android tests'
for PR in 516 518; do
  echo "---- PR #$PR ----"
  gh pr checks "$PR" --repo "$REPO" || warn "PR #$PR has pending/failed checks. No bypass."
  # Only request GitHub-protected automatic merge if all listed checks pass.
  if gh pr checks "$PR" --repo "$REPO" > "$TMP/check-$PR.txt" 2>&1 \
      && grep -qi "CodeQL" "$TMP/check-$PR.txt" \
      && grep -qi "Gitleaks" "$TMP/check-$PR.txt"; then
    SHA="$(gh pr view "$PR" --repo "$REPO" --json headRefOid --jq .headRefOid)"
    if gh pr merge "$PR" --repo "$REPO" --auto --merge --match-head-commit "$SHA"; then
      say "PR #$PR auto-merge accepted by GitHub; verify whether actually merged"
    else
      warn "PR #$PR blocked by GitHub protection / review policy"
    fi
  fi
done

say '5/6 Audit blockers; do not falsify Gitleaks/CodeQL, translations or audio'
gh run list --repo "$REPO" --branch "$OFFICIAL" --limit 12 \
  --json workflowName,conclusion,status,headSha \
  --jq '.[] | [.workflowName,.conclusion,.status,(.headSha[0:12])] | @tsv' || true
if [[ -f "$WT/$WORKFLOW" ]]; then
  if grep -q 'workflow_dispatch:' "$WT/$WORKFLOW" && ! grep -q 'android/gradlew' "$WT/$WORKFLOW"; then
    echo '[RELEASE] Manual-only workflow and missing-wrapper issue addressed in source'
  else
    warn 'Release workflow still needs focused inspection; no silent modification'
  fi
fi
printf '[PACKAGE] Play identity must be checked manually; script never changes applicationId\n'
printf '[LOCALES] Catalogue admission != fully reviewed translations\n'
printf '[AUDIO] Local file presence != approved license/runtime status\n'

say '6/6 Final immutable-source report'
OFFICIAL_AFTER="$(gh api "repos/$REPO/git/ref/heads/$OFFICIAL" --jq '.object.sha')"
echo "OFFICIAL_BEFORE=$BASE"
echo "OFFICIAL_AFTER=$OFFICIAL_AFTER"
# Confirm official tree did not lose any M markers or lower versionCode.
git fetch --quiet origin "+refs/heads/$OFFICIAL:refs/remotes/origin/$OFFICIAL" || warn 'Final fetch unavailable'
python3 - "$WT/$APP" "$WT/$GRADLE" "$BASE" "$OFFICIAL_AFTER" <<'PY_FINAL'
import re,subprocess,sys,pathlib
app_path,gradle_path,before,after=sys.argv[1:]
def show(sha,path):
    return subprocess.check_output(['git','show',sha+':'+path],text=True)
try:
    original=show(before,'android/app/src/main/assets/web/app.js')
    new=show(after,'android/app/src/main/assets/web/app.js')
    oldgradle=show(before,'android/app/build.gradle')
    newgradle=show(after,'android/app/build.gradle')
    marks=lambda s:set(re.findall(r'/\*\s*===\s*M(\d{3})_',s))
    vc=lambda s:int(re.search(r'\bversionCode\s+(\d+)',s).group(1))
    missing=sorted(marks(original)-marks(new))
    regression=vc(newgradle)<vc(oldgradle)
    print('GEMINI_MARKERS_MISSING=',missing)
    print('VERSION_CODE_REGRESSION=',regression)
    if missing or regression: print('[ALERT] Official source regression; inspect immediately. No automatic reset.')
except Exception as e:
    print('[WARN] Cannot complete post-merge source verification:',str(e)[:200])
PY_FINAL
for PR in 516 518; do
  gh pr view "$PR" --repo "$REPO" --json state,mergedAt,headRefOid \
    --jq '"PR #'+"$PR"+' STATE=\(.state) MERGED_AT=\(.mergedAt // "none") HEAD=\(.headRefOid)"' 2>/dev/null || true
done
printf 'LOCAL_PROJECT_FILES=UNTOUCHED\nFORCE_PUSH=NO\nBRANCH_PROTECTION_BYPASS=NO\nSECURITY_CHECKS_DISABLED=NO\n'
say 'Completed. Do not label a pending/failed PR as merged.'
