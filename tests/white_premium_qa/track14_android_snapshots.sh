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
  rm -f "${local_xml:-}"
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
render_failed=0
for width in 320 360 393 430; do
  timeout 40s adb shell wm size "${width}x780"
  for scale in 1.0 1.5 2.0; do
    timeout 40s adb shell settings put system font_scale "$scale"
    timeout 30s adb shell am force-stop com.zenstudy.focus
    startup="$out/start-${width}-${scale}.txt"
    if ! timeout 100s adb shell am start -W -n com.zenstudy.focus/.MainActivity > "$startup" 2>&1 ||
       ! grep -Eq 'Status:[[:space:]]*ok' "$startup"; then
      echo "ANDROID_ACTIVITY_START_FAILED: width=$width scale=$scale" >&2
      exit 1
    fi
    sleep 3
    if ! timeout 30s adb shell pidof com.zenstudy.focus > "$out/pid-${width}-${scale}.txt" 2>&1 ||
       ! test -s "$out/pid-${width}-${scale}.txt"; then
      echo "ANDROID_APP_PROCESS_NOT_RUNNING: width=$width scale=$scale" >&2
      exit 1
    fi
    png="$out/android-${width}-${scale}.png"
    if ! timeout 50s adb exec-out screencap -p > "$png" 2> "$out/capture-${width}-${scale}.stderr"; then
      echo "ANDROID_CAPTURE_TOOL_FAILED: width=$width scale=$scale" >&2
      exit 1
    fi
    if ! test -s "$png"; then
      echo "ANDROID_CAPTURE_EMPTY: width=$width scale=$scale" >&2
      exit 1
    fi
    # Per-frame content and semantic checks MUST precede the next width/scale.
    pixel_state=CANDIDATE
    semantic_state=CANDIDATE
    if ! python3 tests/white_premium_qa/track14_png_screen_guard.py "$png" > "$out/pixel-${width}-${scale}.json"; then
      pixel_state=NOT_VERIFIED
      render_failed=1
      echo "ANDROID_WEBVIEW_RENDER_NOT_VERIFIED: width=$width scale=$scale" >&2
    fi
    remote="/sdcard/track14-window-${width}-${scale}.xml"
    local_xml="${RUNNER_TEMP:-/tmp}/track14-window-${width}-${scale}.xml"
    timeout 15s adb shell rm -f "$remote" >/dev/null 2>&1 || true
    if ! timeout 35s adb shell uiautomator dump "$remote" > "$out/hierarchy-capture-${width}-${scale}.txt" 2>&1 ||
       ! timeout 15s adb exec-out cat "$remote" > "$local_xml" 2> "$out/hierarchy-capture-${width}-${scale}.stderr"; then
      semantic_state=NOT_VERIFIED
      render_failed=1
      printf '{"status":"HIERARCHY_UNAVAILABLE"}\n' > "$out/hierarchy-review-${width}-${scale}.json"
      echo "ANDROID_ACCESSIBILITY_CAPTURE_UNAVAILABLE: width=$width scale=$scale" >&2
    elif ! python3 tests/white_premium_qa/track14_rendered_hierarchy_guard.py "$local_xml" > "$out/hierarchy-review-${width}-${scale}.json"; then
      semantic_state=NOT_VERIFIED
      render_failed=1
      echo "ANDROID_WEBVIEW_DOM_NOT_VERIFIED: width=$width scale=$scale" >&2
    fi
    timeout 15s adb shell rm -f "$remote" >/dev/null 2>&1 || true
    # Avoid retaining any private text from the native accessibility hierarchy.
    rm -f "$local_xml"
    printf 'width=%s font_scale=%s screenshot=CAPTURED pixel=%s webview_dom=%s visual_review=NOT_TESTED\n' \
      "$width" "$scale" "$pixel_state" "$semantic_state" >> "$out/geometry_status.txt"
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
# Final aggregate is independent of single-frame checks: all twelve PNGs
# must still be present, CRC-valid and visually nonblank, with a matching
# native WebView hierarchy candidate for the SAME width/font scale.
if ! python3 tests/white_premium_qa/track14_png_screen_guard.py "$out"/android-*.png > "$out/pixel_content_review.json"; then
  render_failed=1
fi
if ((render_failed != 0)); then
  # Transport, Activity, PID, and PNG capture were checked separately above.
  # Capture evidence for future diagnosis without calling an unknown WebView
  # startup/compositor/accessibility failure a proven application UI defect.
  timeout 20s adb shell dumpsys activity activities > "$out/activity-state.txt" 2>&1 || true
  timeout 20s adb shell dumpsys window windows > "$out/window-state.txt" 2>&1 || true
  timeout 20s adb shell dumpsys webviewupdate > "$out/webview-provider.txt" 2>&1 || true
  timeout 20s adb logcat -d -t 250 > "$out/last-logcat.txt" 2>&1 || true
  cat > "$out/triage-status.txt" <<'TRIAGE'
CAPTURE_TOOL=PASS
ACTIVITY_START=PASS
APP_PROCESS=PASS
PIXEL_VARIATION=CHECK_PER_FRAME
WEBVIEW_DOM=CHECK_PER_FRAME
CAUSE=UNDETERMINED
RELEASE_APPROVED=NO
TRIAGE
  echo 'ANDROID_WEBVIEW_RENDER_NOT_VERIFIED: pixel/semantic checks not established; CAUSE=UNDETERMINED' >&2
  exit 1
fi
cat > "$out/triage-status.txt" <<'TRIAGE'
CAPTURE_TOOL=PASS
ACTIVITY_START=PASS
APP_PROCESS=PASS
PIXEL_VARIATION=CANDIDATE
WEBVIEW_DOM=CANDIDATE
MANUAL_VISUAL_REVIEW=NOT_TESTED
RELEASE_APPROVED=NO
TRIAGE
printf 'Disposable Android emulator screenshots only. Pixel-content gate is not functional, IME, TalkBack or real-device acceptance. RELEASE_APPROVED=NO\n' > "$out/LIMITS.txt"
