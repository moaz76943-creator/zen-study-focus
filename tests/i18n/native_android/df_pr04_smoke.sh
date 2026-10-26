#!/usr/bin/env bash
# Native i18n smoke. Run explicitly with bash from the emulator runner.
set -euo pipefail
apk="android/app/build/outputs/apk/debug/app-debug.apk"
test -s "$apk"
adb wait-for-device
boot="$(adb shell getprop sys.boot_completed | tr -d '\r')"
test "$boot" = 1

# sys.boot_completed can report 1 while PackageManager is still absent.
# Do not attempt installation until Android publishes its real package service.
ready=0
for probe in $(seq 1 36); do
  if timeout 12 adb shell service check package 2>/dev/null | grep -q 'Service package: found'; then
    ready=1
    break
  fi
  sleep 5
done
if [ "$ready" -ne 1 ]; then
  echo 'Android PackageManager never became available; runtime NOT_TESTED' >&2
  exit 1
fi

# GitHub-hosted API30 emulator can temporarily lose PackageManager after boot.
# Retry only the install; do not mark a failed or incomplete install as PASS.
installed=0
for attempt in 1 2 3; do
  if adb install -r "$apk" && adb shell pm path com.zenstudy.focus | grep -q '^package:'; then
    installed=1
    break
  fi
  if [ "$attempt" -lt 3 ]; then
    sleep 12
    timeout 40 adb wait-for-device
  fi
done
test "$installed" -eq 1
adb shell pm list packages | grep -Fx 'package:com.zenstudy.focus'

adb shell am start -W -n com.zenstudy.focus/com.zenstudy.focus.MainActivity
sleep 6
adb shell pidof com.zenstudy.focus
adb shell input keyevent KEYCODE_HOME
adb shell am start -W -n com.zenstudy.focus/com.zenstudy.focus.MainActivity
adb shell pidof com.zenstudy.focus
adb shell am force-stop com.zenstudy.focus
adb shell am start -W -n com.zenstudy.focus/com.zenstudy.focus.MainActivity
sleep 4
adb shell pidof com.zenstudy.focus
echo 'API_RUNTIME_SMOKE=PASS'
echo 'SAF_USER_CONSENT_DEVICE_QA=NOT_TESTED'
echo 'NOTIFICATION_GRANT_DENY_QA=NOT_TESTED'
echo 'RELEASE_APPROVED=NO'
