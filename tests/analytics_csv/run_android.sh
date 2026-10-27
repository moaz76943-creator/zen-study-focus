#!/usr/bin/env bash
set -euo pipefail
E="$DF09_NATIVE_EVIDENCE"
mkdir -p "$E"
# All state is disposable com.zenstudy.focus.qa. No primary package installs/data reads.
timeout 45s adb install -r "$E/DeepFocus-DF09-QA-only.apk"
installed="$(timeout 15s adb shell pm path com.zenstudy.focus.qa | tr -d '\r' | sed -n 's/^package://p' | head -1)"
test -n "$installed"
timeout 30s adb pull "$installed" "$E/installed.apk"
sha256sum "$E/installed.apk" > "$E/INSTALLED_APK_SHA256.txt"
cmp "$E/DeepFocus-DF09-QA-only.apk" "$E/installed.apk"
rm "$E/installed.apk"
timeout 15s adb shell svc wifi disable || true
timeout 15s adb shell svc data disable || true
timeout 20s adb shell am start -W -n com.zenstudy.focus.qa/com.zenstudy.focus.MainActivity > "$E/ACTIVITY_START.txt"
for i in $(seq 1 30); do
  pid="$(timeout 10s adb shell pidof com.zenstudy.focus.qa | tr -d '\r')"
  if [[ "$pid" =~ ^[0-9]+$ ]]; then
    timeout 10s adb forward tcp:9223 "localabstract:webview_devtools_remote_$pid"
    if curl --fail --silent --max-time 3 http://127.0.0.1:9223/json/list | grep -q 'android_asset/web/index.html'; then break; fi
  fi
  sleep 1
done
trap 'timeout 10s adb forward --remove tcp:9223 || true' EXIT
timeout 180s node tests/analytics_csv/real_android_saf.cjs "$E"
