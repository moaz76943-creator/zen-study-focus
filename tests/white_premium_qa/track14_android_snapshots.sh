#!/usr/bin/env bash
# Disposable API 30 emulator: 12 real PNG captures, not TalkBack or screenshot review.
set -euo pipefail
out="${DF_TRACK14_ANDROID_EVIDENCE:-${RUNNER_TEMP:-/tmp}/track14-android}"
mkdir -p "$out"
cleanup() {
  rc=$?
  trap - EXIT
  set +e
  timeout 20s adb shell wm size reset >/dev/null 2>&1
  timeout 20s adb shell wm density reset >/dev/null 2>&1
  timeout 20s adb shell settings put system font_scale 1.0 >/dev/null 2>&1
  printf '%s\n' "$rc" > "$out/capture-exit-code.txt"
  exit "$rc"
}
trap cleanup EXIT
apk="android/app/build/outputs/apk/debug/app-debug.apk"
# sys.boot_completed is not sufficient when package/settings services are
# absent (observed with unaccelerated emulator at PR #164 initial run).
ready=0
for i in {1..12}; do
  if timeout 20s adb shell service check package 2>/dev/null | grep -q 'found' &&
     timeout 20s adb shell service check settings 2>/dev/null | grep -q 'found'; then
    ready=1; break
  fi
  sleep 5
done
if ((ready==0)); then
  echo 'ANDROID_FRAMEWORK_NOT_READY: package/settings services missing' >&2
  timeout 20s adb shell service list > "$out/android-services.txt" 2>&1 || true
  exit 1
fi
bash tests/white_premium_qa/track14_install_apk.sh "$apk"
timeout 40s adb shell wm density 160
for width in 320 360 393 430; do
  timeout 40s adb shell wm size "${width}x780"
  for scale in 1.0 1.5 2.0; do
    timeout 40s adb shell settings put system font_scale "$scale"
    timeout 30s adb shell am force-stop com.zenstudy.focus
    timeout 100s adb shell am start -W -n com.zenstudy.focus/.MainActivity > "$out/start-${width}-${scale}.txt"
    sleep 3
    timeout 30s adb shell pidof com.zenstudy.focus > "$out/pid-${width}-${scale}.txt"
    test -s "$out/pid-${width}-${scale}.txt"
    png="$out/android-${width}-${scale}.png"
    timeout 50s adb exec-out screencap -p > "$png"
    test -s "$png"
    # Fail early when a live APK renders an all-white WebView. An installed PID
    # and structurally valid PNG do not prove visible UI; keep native diagnostics.
    if [[ "$width" == "320" && "$scale" == "1.0" ]]; then
      rendered=0
      for attempt in 1 2 3; do
        if python3 tests/white_premium_qa/track14_png_screen_guard.py "$png" > "$out/first-frame-pixel-review.json"; then
          rendered=1; break
        fi
        if ((attempt<3)); then
          sleep 5
          timeout 50s adb exec-out screencap -p > "$png"
        fi
      done
      if ((rendered==0)); then
        echo 'ANDROID_WEBVIEW_BLANK_FIRST_FRAME: 3 genuine captures, no visible rendered content' >&2
        timeout 30s adb logcat -d -t 800 > "$out/first-frame-logcat.txt" 2>&1 || true
        timeout 30s adb shell dumpsys activity top > "$out/first-frame-activity.txt" 2>&1 || true
        timeout 30s adb shell dumpsys window windows > "$out/first-frame-window.txt" 2>&1 || true
        cat "$out/first-frame-pixel-review.json" >&2
        exit 1
      fi
    fi
    printf 'width=%s font_scale=%s screenshot=CAPTURED visual_review=NOT_TESTED\n' "$width" "$scale" >> "$out/geometry_status.txt"
  done
done
python3 - "$out" <<'PY'
import hashlib, json, pathlib, struct, sys
out=pathlib.Path(sys.argv[1])
rows=[]
for width in (320,360,393,430):
    for scale in ('1.0','1.5','2.0'):
        p=out/f'android-{width}-{scale}.png'
        data=p.read_bytes()
        if len(data)<1000 or data[:8]!=b'\x89PNG\r\n\x1a\n':
            raise SystemExit(f'FAIL: invalid PNG for {p.name}')
        w,h=struct.unpack('>II',data[16:24])
        if w!=width or h<600: raise SystemExit(f'FAIL: wrong physical size for {p.name}: {w}x{h}')
        rows.append(dict(name=p.name,width=w,height=h,bytes=len(data),sha256=hashlib.sha256(data).hexdigest(),status='CAPTURED_NOT_REVIEWED'))
(out/'png_manifest.json').write_text(json.dumps({'screenshots':rows,'actual_count':len(rows),'visual_review':'NOT_TESTED'},indent=2))
assert len(rows)==12
PY
# PNG dimensions and a running app process do not prove the WebView rendered.
# Inspect central pixels and reject blank/splash captures; keep evidence on failure.
if ! python3 tests/white_premium_qa/track14_png_screen_guard.py "$out"/android-*.png > "$out/pixel_content_review.json"; then
  echo 'ANDROID_WEBVIEW_RENDER_NOT_VERIFIED: screenshot pixels are blank or invalid' >&2
  cat "$out/pixel_content_review.json" >&2
  exit 1
fi
printf 'Disposable Android emulator screenshots only. Pixel-content gate is not functional, IME, TalkBack or real-device acceptance. RELEASE_APPROVED=NO\n' > "$out/LIMITS.txt"
