"""Bounded host-only diagnostics for emulator loss; never reads app data/env."""
import argparse
import json
from pathlib import Path
import subprocess
import time


def snapshot():
    memory = {}
    for line in Path('/proc/meminfo').read_text().splitlines():
        key, value = line.split(':', 1)
        if key in ('MemTotal', 'MemAvailable', 'SwapFree'):
            memory[key + '_kib'] = int(value.split()[0])
    events = {}
    event_file = Path('/sys/fs/cgroup/memory.events')
    if event_file.is_file():
        for line in event_file.read_text().splitlines():
            key, value = line.split()
            if key in ('oom', 'oom_kill', 'high', 'max'):
                events[key] = int(value)
    rss = {'emulator': 0, 'java': 0, 'adb': 0}
    result = subprocess.run(['ps', '-eo', 'comm=,rss='], capture_output=True, text=True, timeout=3, check=True)
    for line in result.stdout.splitlines():
        name, value = line.rsplit(None, 1)
        family = 'emulator' if name.startswith(('qemu', 'emulator')) else name
        if family in rss:
            rss[family] += int(value)
    return {'time_unix': int(time.time()), 'host_memory': memory, 'cgroup_memory_events': events, 'rss_kib': rss}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--samples', type=int, default=240)
    args = parser.parse_args()
    if not 1 <= args.samples <= 600:
        parser.error('sample count outside bounded range')
    for index in range(args.samples):
        try:
            print(json.dumps(snapshot(), sort_keys=True), flush=True)
        except (OSError, ValueError, subprocess.SubprocessError):
            print('{"diagnostics":"unavailable"}', flush=True)
        if index + 1 < args.samples:
            time.sleep(5)
