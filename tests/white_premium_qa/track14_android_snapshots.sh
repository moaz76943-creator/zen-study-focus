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
printf 'Disposable Android emulator screenshots only. Manual layout, IME, TalkBack, real-device interactions are NOT_TESTED. RELEASE_APPROVED=NO\n' > "$out/LIMITS.txt"
