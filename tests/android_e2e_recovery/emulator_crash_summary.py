"""Read exception/module metadata only; never upload a raw emulator minidump."""
import json
import mmap
from pathlib import Path
import re
import struct


def summarize(data):
    if len(data) < 32 or data[:4] != b'MDMP':
        raise ValueError('Invalid minidump')
    count, directory = struct.unpack_from('<II', data, 8)
    if count > 128 or directory + count * 12 > len(data):
        raise ValueError('Invalid stream directory')
    streams = {}
    for index in range(count):
        kind, size, offset = struct.unpack_from('<III', data, directory + index * 12)
        if offset + size > len(data):
            raise ValueError('Truncated stream')
        streams[kind] = (offset, size)
    if 6 not in streams or streams[6][1] < 32:
        return {'status': 'NO_EXCEPTION_STREAM'}
    offset = streams[6][0]
    code = struct.unpack_from('<I', data, offset + 8)[0]
    address = struct.unpack_from('<Q', data, offset + 24)[0]
    result = {'status': 'EXCEPTION_RECORDED', 'exception_code': hex(code), 'module': None}
    if 4 in streams:
        start, size = streams[4]
        modules = struct.unpack_from('<I', data, start)[0]
        if modules > 4096 or 4 + modules * 108 > size:
            raise ValueError('Invalid module directory')
        for index in range(modules):
            entry = start + 4 + index * 108
            base, length = struct.unpack_from('<QI', data, entry)
            if not base <= address < base + length:
                continue
            name_offset = struct.unpack_from('<I', data, entry + 20)[0]
            name_length = struct.unpack_from('<I', data, name_offset)[0]
            if name_length > 2048 or name_offset + 4 + name_length > len(data):
                raise ValueError('Invalid module name')
            name = data[name_offset + 4:name_offset + 4 + name_length].decode('utf-16le')
            basename = name.replace('\\', '/').rsplit('/', 1)[-1]
            result['module'] = basename if re.fullmatch(r'[A-Za-z0-9_.-]{1,128}', basename) else 'REDACTED'
            result['module_offset'] = hex(address - base)
            break
    return result


if __name__ == '__main__':
    root = Path('/tmp/android-runner')
    reports = []
    for file in sorted(root.glob('emu-crash-*.db/*/*.dmp'))[-4:]:
        if file.is_symlink() or not file.resolve().is_relative_to(root.resolve()):
            continue
        try:
            with file.open('rb') as stream, mmap.mmap(stream.fileno(), 0, access=mmap.ACCESS_READ) as data:
                reports.append(summarize(data))
        except (OSError, ValueError, struct.error, UnicodeError):
            reports.append({'status': 'UNREADABLE_CRASH_METADATA'})
    print(json.dumps({'reports': reports, 'raw_dumps_uploaded': False}, sort_keys=True))
