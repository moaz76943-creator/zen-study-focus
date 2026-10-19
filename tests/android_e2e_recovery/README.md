# DEEP-FOCUS-RECOVERY-14 — Android interaction E2E

Baseline: PR #25 / 0dd9239bc28978e11f41c1c0f618c9662b291fe2.
Target: com.zenstudy.focus, MainActivity and bundled WebView.
All additions are inside tests/android_e2e_recovery/. No production or workflow changes.

## Static read-only inventory, Node 18+

Run from repository root:

    node --test tests/android_e2e_recovery/inventory.test.cjs
    node tests/android_e2e_recovery/inventory.cjs > /tmp/deep-focus-14-inventory.json
    python3 -m unittest discover -s tests/android_e2e_recovery -p 'test_*.py' -v

The inventory enumerates interactive static controls, inline handlers, JS
dynamic event listener sites, and candidate observable behaviors. It does
not assert that any UI event actually works on Android; controls generated
dynamically must be validated on a real accessibility tree.

## Android device / emulator runs

Use a disposable app profile and first verify a real v21 ZEN21:: backup.
Do not use personal notes or tasks as test data. This runner does NOT clear
app storage, delete records, or force-reset a profile. Mutating tests create
uniquely named disposable notes and tasks.

    adb devices -l
    python3 tests/android_e2e_recovery/run_e2e.py --serial emulator-5554

    python3 tests/android_e2e_recovery/run_e2e.py --serial emulator-5554 --ack-disposable-data

    python3 tests/android_e2e_recovery/run_e2e.py --serial emulator-5554 --ack-disposable-data --run-slow --allow-rotation

Optional: --json PATH writes a machine-readable report. Do not commit a live
device report until audited/redacted. No third-party Python dependencies;
requires Android platform-tools with adb and an installed APK built from
the baseline source. Does not need WebView debugging.

The suite uses adb UIAutomator XML and input tap/swipe/text/keyevent, actual
Android process stop/relaunch, and measured user-visible outcomes.

PASS = on-device observation confirmed.
FAIL = expected postcondition absent or execution failure.
NOT_TESTED = no device, no opt-in, inaccessible hierarchy, or manual scenario.
Exit code 0 = every case passed; 1 = at least one failure; 2 = one or
more NOT_TESTED without failures. NEVER label Node/Python unit checks E2E passes.

## Coverage

Automated: navigation (seven tabs/training), modal/back, scrolling, numerals,
accessibility basic smoke, create/edit notes, add task, clipboard paste,
language change, timer start/pause, optional 1-min Android notification,
process kill/relaunch, optional screen rotation, long text, no-data-loss
record visibility, calendar and nature entry points.

Manual NOT_TESTED until device evidence: TalkBack traversal, subtasks/checklists
manual verification beyond the automated subtask prompt, storage-write failure injection, native file
picker export success and actual on-device audio listening. Reproduction
steps are in SCENARIOS.md. Clipboard paste is not evidence of file export;
notification presence is not evidence of audible sound.

The tests assert postconditions and can fail if source labels are inaccessible.
They do not bypass the app's WebView security settings. Do not run the same
suite concurrently against one app profile. Consult RESULTS.md before
claiming release readiness.
