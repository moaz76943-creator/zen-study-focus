#!/usr/bin/env bash
# Sourced by the disposable Android runner; a transport failure is never a PASS.
df08_record_failure() {
  local stage="$1" width="$2" output="$3" command_status="$4" state
  state="$(timeout 5s adb get-state 2>/dev/null | tr -d '\r')" || state=unavailable
  DF08_FAILURE_CATEGORY=TEST_HARNESS_FAIL
  # Only observed application postconditions establish APP_FAIL. Bootstrap,
  # pointer injection, JS transport and IME setup errors need harness diagnosis.
  if grep -q 'INSTRUMENTATION_RESULT: df08_status=FAIL' "$output" &&
     grep -Eq 'Physical Save did not persist note exactly once|Visible Notes Save lacked v21 packet ACK|Force-stop/relaunch Notes mirror and rendered state FAILED|Actual Android tap did not navigate|Physical tap did not open Notes modal|Android Back closed Notes or lost unsaved draft|Physical water tap published a rejected save' "$output"; then
    DF08_FAILURE_CATEGORY=APP_FAIL
  elif [[ "$state" != device ]]; then
    DF08_FAILURE_CATEGORY=EMULATOR_TRANSPORT_FAIL
  fi
  printf 'TEST_RESULT=FAIL\nFAILURE_CATEGORY=%s\nSTAGE=%s\nWIDTH=%s\nCOMMAND_STATUS=%s\nADB_STATE=%s\n' \
    "$DF08_FAILURE_CATEGORY" "$stage" "$width" "$command_status" "$state" > "$out/failure-${stage}-${width}.txt"
  cat "$out/failure-${stage}-${width}.txt"
  # Preserve host evidence even when guest logcat can no longer be read.
  {
    free -m
    df -h / /tmp
    ps -eo pid,ppid,rss,comm --sort=-rss | head -20
    timeout 5s sudo -n dmesg --ctime | tail -40
  } > "$out/host-failure-${stage}-${width}.txt" 2>&1 || true
}
