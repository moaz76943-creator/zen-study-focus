#!/usr/bin/env bash
# Disposable runner diagnostics only: no app storage or raw instrumentation payloads.
df03_host_evidence() {
  local destination="$1"
  {
    timeout 3s free -m || true
    timeout 3s df -h / /tmp || true
    timeout 3s ps -eo pid,ppid,rss,comm --sort=-rss | head -20 || true
    # Read the existing KVM setting; never change host CPU/MSR behavior here.
    for parameter in ignore_msrs report_ignored_msrs; do
      if [[ -r "/sys/module/kvm/parameters/$parameter" ]]; then
        printf 'KVM_%s=' "$parameter"
        cat "/sys/module/kvm/parameters/$parameter"
      fi
    done
    timeout --kill-after=2s 5s sudo -n dmesg --ctime 2>&1 | \
      grep -Ei 'kvm|qemu|unhandled.*msr|out of memory|oom-kill|killed process|segfault|permission denied|operation not permitted' | tail -40 || true
  } > "$destination" 2>&1
}
df03_record_failure() {
  local stage="$1" case_id="$2" output="$3" command_status="$4" state
  state="$(timeout --kill-after=2s 5s adb get-state 2>/dev/null | tr -d '\r')" || state=unavailable
  DF03_FAILURE_CATEGORY=TEST_HARNESS_FAIL
  if [[ -f "$output" ]] && grep -q 'INSTRUMENTATION_RESULT: df03_status=FAIL' "$output" &&
     grep -Eq 'Real Android Save did not persist single edit|Force-stop relaunch failed to retain edit|Legacy due fields fabricated after restart|Unknown legacy data lost|v21 WebView six-packet readback failed after process kill|Editing legacy undated task fabricated date|Keyboard dismissal closed task editor or lost draft|Real Android Save invented date or due|Native v21 ACK missing after Save|Rejected ACK overwrote task or lost editor draft|v21 packet changed on injected rejected ACK' "$output"; then
    DF03_FAILURE_CATEGORY=APP_FAIL
  elif [[ "$state" != device ]]; then
    DF03_FAILURE_CATEGORY=EMULATOR_TRANSPORT_FAIL
  fi
  failure_recorded=1
  printf 'TEST_RESULT=FAIL\nFAILURE_CATEGORY=%s\nSTAGE=%s\nCASE=%s\nCOMMAND_STATUS=%s\nADB_STATE=%s\n' \
    "$DF03_FAILURE_CATEGORY" "$stage" "$case_id" "$command_status" "$state" > "$out/failure-${stage}-${case_id}.txt"
  cat "$out/failure-${stage}-${case_id}.txt"
  df03_host_evidence "$out/host-failure-${stage}-${case_id}.txt"
}
