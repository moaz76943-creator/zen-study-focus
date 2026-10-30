#!/usr/bin/env bash
# Fixed, repository-owned driver for disposable Android failure classification tests.
# Never evaluate test inputs as shell source; only the checked-in helpers are sourced.
set -euo pipefail
helper="$1"
scenario="$2"
source "$helper"
case "$scenario" in
  df03) df03_record_failure edit 320-en "$out/instrumentation.txt" 124 ;;
  df08) df08_record_failure save 320 "$out/instrumentation.txt" "$3" ;;
  *) echo 'Invalid QA scenario' >&2; exit 2 ;;
esac
