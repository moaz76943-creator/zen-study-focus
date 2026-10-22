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
  # Image bytes and app PID exist, but actual WebView pixels were NOT verified.
  # Collect bounded diagnostics to distinguish WebView startup/compositor/tool issues;
  # do not assert a visual app defect without positive evidence.
  timeout 20s adb shell dumpsys activity activities > "$out/activity-state.txt" 2>&1 || true
  timeout 20s adb shell dumpsys window windows > "$out/window-state.txt" 2>&1 || true
  timeout 20s adb shell dumpsys webviewupdate > "$out/webview-provider.txt" 2>&1 || true
  timeout 20s adb logcat -d -t 250 > "$out/last-logcat.txt" 2>&1 || true
  printf 'CAPTURE_TOOL=PASS\\nACTIVITY_START=PASS\\nAPP_PROCESS=PASS\\nWEBVIEW_RENDER=NOT_VERIFIED\\nCAUSE=UNDETERMINED\\nRELEASE_APPROVED=NO\\n' > "$out/triage-status.txt"
  echo 'ANDROID_WEBVIEW_RENDER_NOT_VERIFIED: screenshot pixels are blank or invalid; CAUSE=UNDETERMINED' >&2
  cat "$out/pixel_content_review.json" >&2
  exit 1
fi
# Verify app-specific WebView semantics before treating any screenshot as even a
# rendered UI candidate. A colorful boot screen/system chrome is NOT app proof.
# UI dump may be unavailable in some WebView builds; fail closed as NOT_VERIFIED.
for width in 320 360 393 430; do
  for scale in 1.0 1.5 2.0; do
    remote="/sdcard/track14-window-${width}-${scale}.xml"
    local_xml="${RUNNER_TEMP:-/tmp}/track14-window-${width}-${scale}.xml"
    timeout 15s adb shell rm -f "$remote" >/dev/null 2>&1 || true
    if ! timeout 35s adb shell uiautomator dump "$remote" > "$out/hierarchy-capture-${width}-${scale}.txt" 2>&1 ||
       ! timeout 15s adb exec-out cat "$remote" > "$local_xml" 2> "$out/hierarchy-capture-${width}-${scale}.stderr"; then
      rm -f "$local_xml"
      echo "ANDROID_ACCESSIBILITY_CAPTURE_UNAVAILABLE: semantic WebView unverified width=$width scale=$scale" >&2
      exit 1
    fi
    timeout 15s adb shell rm -f "$remote" >/dev/null 2>&1 || true
    if ! python3 tests/white_premium_qa/track14_rendered_hierarchy_guard.py "$local_xml" > "$out/hierarchy-review-${width}-${scale}.json"; then
      rm -f "$local_xml"
      echo "ANDROID_WEBVIEW_DOM_NOT_VERIFIED: semantic UI not proven width=$width scale=$scale" >&2
      exit 1
    fi
    # Never upload raw hierarchy dumps (potentially containing personal text).
    rm -f "$local_xml"
  done
done
printf 'CAPTURE_TOOL=PASS\\nACTIVITY_START=PASS\\nAPP_PROCESS=PASS\\nPIXEL_VARIATION=CANDIDATE\\nWEBVIEW_DOM=CANDIDATE\\nMANUAL_VISUAL_REVIEW=NOT_TESTED\\nRELEASE_APPROVED=NO\\n' > "$out/triage-status.txt"
printf 'Disposable Android emulator screenshots only. Pixel-content gate is not functional, IME, TalkBack or real-device acceptance. RELEASE_APPROVED=NO\n' > "$out/LIMITS.txt"
