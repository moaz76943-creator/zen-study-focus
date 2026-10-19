#!/usr/bin/env python3
"""Read-only inventory of bundled nature assets, never a rights/listening approval."""
import argparse
import hashlib
import json
import pathlib
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[2]
WEB = ROOT / 'android/app/src/main/assets/web'
IDS = 'ocean rain fire forest stream leaves waterfall night thunder wind winrain earth'.split()


def command(args):
    return subprocess.run(args, cwd=ROOT, capture_output=True, text=True, timeout=90)


def inventory():
    rows = []
    paths = {name: WEB / 'sounds' / (name + '.ogg') for name in IDS}
    paths.update({p.stem: p for p in sorted((WEB / 'sounds').glob('*.ogg'))})
    for name, path in paths.items():
        row = dict(id=name, path=str(path.relative_to(ROOT)), catalogued=name in IDS,
                   packaged=path.is_file(), runtime_legacy_allowlist=name in ('forest', 'wind'),
                   source_page=None, author=None, license=None, license_url=None,
                   commercial_use=None, redistribution=None, attribution=None,
                   acquired_at=None, original_sha256=None, conversion_chain=None,
                   listening='NOT_TESTED', android_playback='NOT_TESTED',
                   final_approval='BLOCKED', distortion_review='NOT_TESTED')
        if path.is_file():
            raw = path.read_bytes()
            row.update(bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest())
            probe = command(['ffprobe', '-v', 'error', '-show_entries',
                             'format=duration:stream=codec_name,sample_rate,channels',
                             '-of', 'json', str(path)])
            row['probe'] = json.loads(probe.stdout) if probe.returncode == 0 else {'error': probe.stderr}
            decode = command(['ffmpeg', '-nostdin', '-v', 'error', '-i', str(path), '-f', 'null', '-'])
            row['desktop_decode'] = 'PASS' if decode.returncode == 0 else 'FAIL'
            if decode.returncode:
                row['decode_error'] = decode.stderr[:2000]
        if name in ('forest', 'wind'):
            row['secondary_credit'] = 'https://github.com/Lelio88/dewdrop/blob/main/CREDITS.md'
            row['missing_evidence'] = 'Individual original bytes/hash and original-to-bundled relationship, listening and Android'
        elif name == 'earth':
            row['missing_evidence'] = 'Previously identified as HVAC, byte-identical to noise; must not present as nature'
        else:
            row['missing_evidence'] = 'Individual recording origin/rights/hash chain plus listening and Android'
        rows.append(row)
    groups = {}
    for row in rows:
        if row.get('sha256'):
            groups.setdefault(row['sha256'], []).append(row['id'])
    return dict(audited_sha=command(['git', 'rev-parse', 'HEAD']).stdout.strip(),
                tracked_edits=bool(command(['git', 'status', '--porcelain', '--untracked-files=no']).stdout.strip()),
                scope='Repository bundled assets; desktop decode only, no rights/listening/device approval',
                release_approved=False, assets=rows,
                duplicate_bytes=[names for names in groups.values() if len(names) > 1])


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--out', required=True)
    args = parser.parse_args()
    target = pathlib.Path(args.out)
    target.parent.mkdir(parents=True, exist_ok=True)
    result = inventory()
    target.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'assets': len(result['assets']), 'missing': sum(not a['packaged'] for a in result['assets']),
                      'duplicate_bytes': result['duplicate_bytes'], 'release_approved': False}))
