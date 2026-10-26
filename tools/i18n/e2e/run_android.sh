#!/usr/bin/env bash
# Explicit Bash entrypoint: android-emulator-runner's default shell can be /bin/sh.
set -Eeuo pipefail

API="${1:?Usage: bash tools/i18n/e2e/run_android.sh 30|35}"
case "$API" in 30|35) ;; *) echo "Unsupported API" >&2; exit 64 ;; esac

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"
OUT="artifacts/i18n-e2e/api${API}"
BUILD="artifacts/i18n-e2e/build"
APK="$BUILD/app-debug.apk"
mkdir -p "$OUT"
printf '%s\n' "$(git rev-parse HEAD)" > "$OUT/SOURCE_SHA.txt"
RUNNER_STARTED=0
PROBE_PID=""

finalize() {
  local code=$?
  trap - EXIT
  printf '%s\n' "$code" > "$OUT/RUNNER_EXIT_CODE.txt"
  {
    date -u
    free -m
    ps -eo pid,rss,vsz,stat,comm | awk 'NR == 1 || $5 ~ /(qemu|emulator)/'
    timeout 10s adb devices -l || true
  } > "$OUT/EMULATOR_HOST_STATE.txt" 2>&1
  # Distinguish host OOM/VM crashes from assertion failures; no command lines
  # or unrestricted device logs are collected.
  timeout 10s sudo -n dmesg 2>/dev/null |
    grep -Ei 'Out of memory|Killed process|qemu.*segfault|segfault.*qemu' \
    > "$OUT/EMULATOR_HOST_FAILURES.txt" || true
  if [[ -n "$PROBE_PID" ]]; then
    timeout 10s adb shell am force-stop com.zenstudy.focus.e2e || true
    kill "$PROBE_PID" 2>/dev/null || true
    adb forward --remove tcp:38383 || true
  fi
  # Only AndroidRuntime errors: avoid uploading full device logs or potentially sensitive data.
  timeout 20s adb logcat -d -t 250 'AndroidRuntime:E' '*:S' 2>/dev/null |
    sed -E 's/(token|password|authorization|secret)=[^ ]+/\1=[REDACTED]/Ig' \
    > "$OUT/ANDROID_RUNTIME_ERRORS.txt" || true
  python3 - "$OUT/DEVICE_MATRIX.json" "$code" "$RUNNER_STARTED" <<'PY' || true
import json, pathlib, sys
p = pathlib.Path(sys.argv[1])
code = int(sys.argv[2])
started = bool(int(sys.argv[3]))
try:
    data = json.loads(p.read_text()) if p.exists() else {}
except (ValueError, OSError):
    data = {}
data.setdefault("TASK_ID", "DF13-A-ANDROID-CI-RECOVERY")
data.setdefault("test_results", {})
data.setdefault("device_matrix", [])
data.setdefault("BLOCKERS", [])
data["RUNNER_EXIT_CODE"] = code
if code:
    data["BLOCKERS"].append("Android runner returned nonzero exit code " + str(code))
    if not started:
        data["status"] = "NOT_TESTED"
        data["BLOCKERS"].append("Test process not started; infrastructure verification failed")
if not data["test_results"]:
    data["status"] = "NOT_TESTED"
data["RELEASE_APPROVED"] = "NO"
tmp = p.with_suffix(".json.tmp")
tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
tmp.replace(p)
PY
  exit "$code"
}
trap finalize EXIT

test "$(cat "$BUILD/SOURCE_SHA.txt")" = "$(git rev-parse HEAD)"
test "$(cat "$BUILD/ANDROID_TREE.txt")" = "$(git rev-parse HEAD:android)"
cp "$BUILD/ANDROID_TREE.txt" "$OUT/ANDROID_TREE.txt"
export DF13_ANDROID_TREE="$(cat "$BUILD/ANDROID_TREE.txt")"
test "$(cat "$BUILD/PACKAGE_ID.txt")" = com.zenstudy.focus
EXPECTED="$(cat "$BUILD/APK_SHA256.txt")"
[[ "$EXPECTED" =~ ^[a-f0-9]{64}$ ]]
test -s "$APK"
ACTUAL="$(sha256sum "$APK" | awk '{print $1}')"
test "$ACTUAL" = "$EXPECTED"
cp "$BUILD/APK_SHA256.txt" "$OUT/APK_SHA256.txt"

timeout 30s adb wait-for-device
test "$(adb shell getprop sys.boot_completed | tr -d '\r')" = 1
timeout 120s adb install -r "$APK" | tee "$OUT/ADB_INSTALL.txt"
# API35 evidence shows an alive VM and ample host memory, but adbd goes
# offline immediately after a successful install. Recover only transport/read
# operations here; never replay a UI tap, consent action, or application write.
INSTALLED_PATH=""
for attempt in {1..6}; do
  if PACKAGE_PATHS="$(timeout 15s adb shell pm path com.zenstudy.focus 2> "$OUT/PACKAGE_PATH_TRANSPORT.txt")"; then
    INSTALLED_PATH="$(printf '%s' "$PACKAGE_PATHS" | tr -d '\r' | sed -n 's/^package://p')"
    if [[ -n "$INSTALLED_PATH" ]]; then break; fi
  fi
  timeout 10s adb reconnect offline >/dev/null 2>&1 || true
  timeout 30s adb wait-for-device || true
done
test -n "$INSTALLED_PATH"
PULLED=0
for attempt in {1..3}; do
  if timeout 60s adb pull "$INSTALLED_PATH" "$OUT/installed-base.apk"; then PULLED=1; break; fi
  timeout 10s adb reconnect offline >/dev/null 2>&1 || true
  timeout 30s adb wait-for-device || true
done
test "$PULLED" = 1
sha256sum "$OUT/installed-base.apk" | awk '{print $1}' > "$OUT/INSTALLED_APK_SHA256.txt"
rm "$OUT/installed-base.apk"
test "$(cat "$OUT/INSTALLED_APK_SHA256.txt")" = "$EXPECTED"
cp "$BUILD/PACKAGE_ID.txt" "$OUT/PACKAGE_ID.txt"
# Keep UIAutomation connected across reads and taps. One-shot `uiautomator
# dump` tears down accessibility and repeatedly loses WebView virtual children.
test "$(sha256sum "$BUILD/accessibility-probe.apk" | awk '{print $1}')" = "$(cat "$BUILD/PROBE_SHA256.txt")"
cp "$BUILD/PROBE_SHA256.txt" "$OUT/PROBE_SHA256.txt"
timeout 60s adb install -r -t "$BUILD/accessibility-probe.apk"
adb forward tcp:38383 localabstract:df13-accessibility
adb shell am instrument -w com.zenstudy.focus.e2e/.AccessibilityProbe > "$OUT/PROBE_INSTRUMENTATION.txt" 2>&1 &
PROBE_PID=$!
export DF13_UI_PORT=38383
python3 - <<'PY'
import socket, time
for attempt in range(60):
    try:
        with socket.create_connection(('127.0.0.1', 38383), timeout=2) as connection:
            # A forwarded TCP connection can open before the device socket is
            # listening. Require a real reply from instrumentation, not connect.
            connection.sendall(b'PING\n')
            if connection.recv(1024):
                break
    except OSError:
        pass
    time.sleep(1)
else:
    raise SystemExit('Persistent accessibility instrumentation failed to start')
PY
RUNNER_STARTED=1
set +e
DF13_EVIDENCE_DIR="$OUT" timeout --signal=TERM --kill-after=15s 22m python3 -u tools/i18n/e2e/android_device.py \
  --output "$OUT" --sha "$(git rev-parse HEAD)" --api "$API" \
  2>&1 | tee "$OUT/PYTHON_E2E.log"
RESULT=${PIPESTATUS[0]}
set -e
exit "$RESULT"
