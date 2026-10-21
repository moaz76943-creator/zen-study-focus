#!/usr/bin/env bash
# Real Android emulator screenshots. Not proof of TalkBack/IME or actual phone success.
set -euo pipefail
out="${DF_TRACK14_ANDROID_EVIDENCE:-$PWD/track14-android}"
mkdir -p "$out"
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
adb shell wm density 160
for width in 320 360 393 430; do
  adb shell wm size "${width}x780"
  for scale in 1.0 1.5 2.0; do
    adb shell settings put system font_scale "$scale"
    adb shell am force-stop com.zenstudy.focus || true
    adb shell am start -W -n com.zenstudy.focus/.MainActivity > "$out/start-${width}-${scale}.txt"
    sleep 3
    if ! adb shell pidof com.zenstudy.focus > "$out/pid-${width}-${scale}.txt"; then
      echo "FAIL: app not running at width=$width scale=$scale"
      exit 1
    fi
    adb exec-out screencap -p > "$out/android-${width}-${scale}.png"
    test -s "$out/android-${width}-${scale}.png"
    printf 'width=%s font_scale=%s: captured, manual visual acceptance NOT_TESTED\n' "$width" "$scale" >> "$out/geometry_status.txt"
  done
done
adb shell wm size reset
adb shell wm density reset
adb shell settings put system font_scale 1.0
printf 'Emulated API30 screenshots only; no automated TalkBack/IME/touch or human screen approval. RELEASE_APPROVED=NO\n' > "$out/LIMITS.txt"
