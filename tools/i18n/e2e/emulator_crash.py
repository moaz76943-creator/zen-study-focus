#!/usr/bin/env python3
"""Read bounded Crashpad exception/module metadata; never emit memory or paths."""
import argparse
import hashlib
import json
import struct
from pathlib import Path


def read_at(stream, position, count):
    if position < 0 or count < 0 or count > 1024 * 1024:
        raise ValueError('invalid metadata range')
    stream.seek(position)
    value = stream.read(count)
    if len(value) != count:
        raise ValueError('truncated metadata')
    return value


def summarize(path):
    with Path(path).open('rb') as stream:
        signature, _, count, directory, _, _, _ = struct.unpack('<4sIIIIIQ', read_at(stream, 0, 32))
        if signature != b'MDMP' or count > 512:
            raise ValueError('invalid minidump header')
        entries = {}
        for index in range(count):
            kind, size, address = struct.unpack('<III', read_at(stream, directory + index * 12, 12))
            entries[kind] = (size, address)
        if 6 not in entries or 4 not in entries:
            raise ValueError('exception/module metadata unavailable')
        exception = entries[6][1]
        code = struct.unpack('<I', read_at(stream, exception + 8, 4))[0]
        instruction = struct.unpack('<Q', read_at(stream, exception + 24, 8))[0]
        modules = entries[4][1]
        module_count = struct.unpack('<I', read_at(stream, modules, 4))[0]
        if module_count > 4096:
            raise ValueError('invalid module count')
        result = {'parsed': True, 'exception_code': code, 'module_category': 'UNKNOWN'}
        for index in range(module_count):
            record = read_at(stream, modules + 4 + index * 108, 108)
            base, size = struct.unpack_from('<QI', record)
            if not base <= instruction < base + size:
                continue
            name_rva = struct.unpack_from('<I', record, 20)[0]
            length = struct.unpack('<I', read_at(stream, name_rva, 4))[0]
            if length > 4096 or length % 2:
                raise ValueError('invalid module name metadata')
            # Only classify/hash the basename. No source path or decoded name is emitted.
            name = read_at(stream, name_rva + 4, length).decode('utf-16-le').replace('\\', '/').rsplit('/', 1)[-1]
            lower = name.lower()
            category = ('GRAPHICS' if any(part in lower for part in ('swiftshader', 'vulkan', 'gfxstream', 'libegl', 'libgles'))
                        else 'EMULATOR_CORE' if lower.startswith('qemu-system')
                        else 'LIBC' if lower.startswith('libc.so') else 'OTHER_NATIVE')
            result.update(module_category=category,
                          module_name_sha256_16=hashlib.sha256(name.encode()).hexdigest()[:16],
                          module_offset=hex(instruction - base))
            break
        return result


def collect(root):
    root = Path(root).resolve()
    records = []
    for path in root.rglob('*.dmp'):
        if len(records) == 8:
            break
        if path.is_symlink() or not path.resolve().is_relative_to(root):
            continue
        try:
            records.append(summarize(path))
        except (OSError, ValueError, struct.error, UnicodeError):
            records.append({'parsed': False, 'reason': 'INVALID_OR_INCOMPLETE_METADATA'})
    return {'diagnostic': 'EMULATOR_CRASHPAD_METADATA_ONLY', 'crashes': records}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('directory', type=Path)
    args = parser.parse_args()
    print(json.dumps(collect(args.directory), indent=2))
