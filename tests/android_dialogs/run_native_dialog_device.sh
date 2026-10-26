#!/usr/bin/env bash
# Disposable emulator only; never exercise user devices or production app data.
set -euo pipefail
: "${RUNNER_TEMP:?}"
E="$RUNNER_TEMP/df-dialog-evidence"
mkdir -p "$E"
APK=android/app/build/outputs/apk/debug/app-debug.apk
test -s "$APK"
test "$(adb shell getprop ro.kernel.qemu | tr -d '\r')" = 1
adb wait-for-device
ready=0
for i in $(seq 1 35); do
  if [ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = 1 ] &&
     adb shell service check package 2>/dev/null | grep -q 'Service package: found'; then
    ready=1
    break
  fi
  sleep 5
done
if [ "$ready" -ne 1 ]; then
  echo 'ANDROID_DIALOG_QA=NOT_TESTED (emulator PackageManager unavailable)' >&2
  exit 1
fi
# Avoid flaky streamed installs on hosted API30; still require real PackageManager.
installed=0
for attempt in 1 2 3; do
  if timeout 90 adb install --no-streaming -r "$APK" &&
     adb shell pm path com.zenstudy.focus | grep -q '^package:'; then
    installed=1
    break
  fi
  if [ "$attempt" -eq 2 ]; then
    echo 'PackageManager install failed twice; one bounded emulator reboot' >&2
    timeout 25 adb reboot || { echo 'ANDROID_DIALOG_QA=NOT_TESTED (reboot failed)' >&2; exit 1; }
    timeout 180 adb wait-for-device || { echo 'ANDROID_DIALOG_QA=NOT_TESTED (ADB unrecovered)' >&2; exit 1; }
    recovery=0
    for retry in $(seq 1 40); do
      if [ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = 1 ] &&
         adb shell service check package 2>/dev/null | grep -q 'Service package: found'; then
        recovery=1
        break
      fi
      sleep 5
    done
    if [ "$recovery" -ne 1 ]; then
      echo 'ANDROID_DIALOG_QA=NOT_TESTED (PackageManager unrecovered)' >&2
      exit 1
    fi
  elif [ "$attempt" -lt 3 ]; then
    sleep 10
  fi
done
if [ "$installed" -ne 1 ]; then
  echo 'ANDROID_DIALOG_QA=NOT_TESTED (APK not installed)' >&2
  exit 1
fi
# Reuse the existing separate test-only Android accessibility probe.
adb install -r -t qa-probe/tools/i18n/e2e/probe/build/outputs/apk/debug/*-debug.apk
adb forward --remove tcp:38384 >/dev/null 2>&1 || :
adb forward tcp:38384 localabstract:df13-accessibility
adb shell am instrument -w com.zenstudy.focus.e2e/.AccessibilityProbe > "$E/native-probe-log.txt" 2>&1 &
PROBE_PID=$!
cleanup_probe(){
  adb shell am force-stop com.zenstudy.focus.e2e >/dev/null 2>&1 || :
  kill "$PROBE_PID" 2>/dev/null || :
  adb forward --remove tcp:38384 >/dev/null 2>&1 || :
}
trap cleanup_probe EXIT
export DF_DIALOG_NATIVE_PORT=38384
python3 - <<'READY'
import socket, time
for _ in range(45):
    try:
        with socket.create_connection(('127.0.0.1', 38384), timeout=2) as s:
            s.sendall(b'PING\n')
            if s.recv(1024): break
    except OSError: pass
    time.sleep(1)
else: raise SystemExit('NOT_TESTED: persistent Android accessibility probe unavailable')
READY
adb shell am start -W -n com.zenstudy.focus/com.zenstudy.focus.MainActivity
sleep 6
PID="$(adb shell pidof com.zenstudy.focus | tr -d '\r' | awk '{print $1}')"
test -n "$PID"
adb forward --remove tcp:9223 >/dev/null 2>&1 || :
adb forward tcp:9223 "localabstract:webview_devtools_remote_${PID}"
node tests/android_dialogs/native_js_dialog_android_probe.cjs "$E"
test -s "$E/android-native-dialog-results.json"
node -e "const f=require(process.argv[1]);if(f.results.length!==5||f.results.some(r=>r.status!=='PASS'))process.exit(1)" "$E/android-native-dialog-results.json"
adb shell am force-stop com.zenstudy.focus
adb shell am start -W -n com.zenstudy.focus/com.zenstudy.focus.MainActivity
sleep 3
adb shell pidof com.zenstudy.focus
echo "ANDROID_NATIVE_DIALOGS=PASS; USER_DATA=DISPOSABLE_ONLY; RELEASE_APPROVED=NO"
