"""Bind the disposable probe's exact Toast allowlist to the built app resource.

The probe never stores arbitrary notification text. The native SAF fixture uses
English, so only the current English backup-read rejection is observed.
"""
import json
from pathlib import Path
import sys
import xml.etree.ElementTree as ET


def prepare(probe, resources):
    strings = ET.parse(resources).getroot()
    matches = strings.findall("string[@name='native_backup_import_failed']")
    if len(matches) != 1 or not matches[0].text or len(matches[0].text) > 256:
        raise ValueError('Missing or invalid backup rejection resource')
    expected = json.dumps(matches[0].text, ensure_ascii=True)
    old = json.dumps('Unable to read backup; data unchanged')
    source = Path(probe).read_text(encoding='utf-8')
    needle = old + '.equals(string(text))'
    replacement = expected + '.equals(string(text))'
    if source.count(needle) == 1:
        Path(probe).write_text(source.replace(needle, replacement), encoding='utf-8')
    elif source.count(replacement) != 1:
        raise ValueError('Pinned probe allowlist changed; review required')


if __name__ == '__main__':
    prepare(sys.argv[1], sys.argv[2])
