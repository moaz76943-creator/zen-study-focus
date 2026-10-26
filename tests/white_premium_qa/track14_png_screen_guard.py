#!/usr/bin/env python3
"""Fail closed when a screenshot is a blank or unrendered WebView.

The script uses only Python's standard library; it does not confuse a valid
PNG file with an actual rendered application screen.
"""
import json
import pathlib
import struct
import sys
import zlib


def png_content_stats(path):
    data = pathlib.Path(path).read_bytes()
    if not data.startswith(b'\x89PNG\r\n\x1a\n'):
        raise ValueError('invalid PNG signature')
    p = 8
    width = height = depth = kind = interlace = None
    compressed = bytearray()
    while p + 12 <= len(data):
        size = struct.unpack_from('>I', data, p)[0]
        tag = data[p + 4:p + 8]
        payload = data[p + 8:p + 8 + size]
        if len(payload) != size:
            raise ValueError('truncated PNG')
        p += size + 12
        if tag == b'IHDR':
            width, height, depth, kind, _, _, interlace = struct.unpack('>IIBBBBB', payload)
        elif tag == b'IDAT':
            compressed.extend(payload)
        elif tag == b'IEND':
            break
    if depth != 8 or kind not in (2, 6) or interlace != 0 or not width or not height:
        raise ValueError('unsupported screenshot PNG format')
    pixel_bytes = 3 if kind == 2 else 4
    stride = width * pixel_bytes
    raw = zlib.decompress(compressed)
    if len(raw) != height * (stride + 1):
        raise ValueError('invalid PNG pixel payload size')
    prev = bytearray(stride)
    unique = set()
    not_white = sampled = 0
    idx = 0
    for y in range(height):
        filt = raw[idx]
        idx += 1
        cur = bytearray(raw[idx:idx + stride])
        idx += stride
        if filt == 1:
            for i in range(pixel_bytes, stride):
                cur[i] = (cur[i] + cur[i - pixel_bytes]) & 255
        elif filt == 2:
            for i in range(stride):
                cur[i] = (cur[i] + prev[i]) & 255
        elif filt == 3:
            for i in range(stride):
                cur[i] = (cur[i] + ((cur[i - pixel_bytes] if i >= pixel_bytes else 0) + prev[i]) // 2) & 255
        elif filt == 4:
            for i in range(stride):
                a = cur[i - pixel_bytes] if i >= pixel_bytes else 0
                b = prev[i]
                c = prev[i - pixel_bytes] if i >= pixel_bytes else 0
                q = a + b - c
                d = (abs(q - a), abs(q - b), abs(q - c))
                pred = a if d[0] <= d[1] and d[0] <= d[2] else b if d[1] <= d[2] else c
                cur[i] = (cur[i] + pred) & 255
        elif filt != 0:
            raise ValueError(f'unknown PNG filter: {filt}')
        if height // 8 <= y <= 7 * height // 8 and y % 8 == 0:
            for x in range(width // 12, 11 * width // 12, 8):
                i = x * pixel_bytes
                rgb = tuple(cur[i:i + 3])
                unique.add(rgb)
                sampled += 1
                not_white += min(rgb) < 245
        prev = cur
    ratio = not_white / max(1, sampled)
    visible = len(unique) >= 12 and ratio >= 0.01
    return dict(width=width, height=height, sampled=sampled, colors=len(unique),
                nonwhite_fraction=round(ratio, 4),
                status='RENDERED_CANDIDATE' if visible else 'BLANK_OR_UNRENDERED')


def main(files):
    if not files:
        raise SystemExit('usage: track14_png_screen_guard.py screenshot.png [...]')
    rows = []
    for filename in files:
        try:
            result = png_content_stats(filename)
        except Exception as exc:
            result = dict(status='IMAGE_INVALID', error=str(exc))
        rows.append(dict(file=pathlib.Path(filename).name, **result))
    print(json.dumps(rows, indent=2))
    return 1 if any(row['status'] != 'RENDERED_CANDIDATE' for row in rows) else 0


if __name__ == '__main__':
    raise SystemExit(main(sys.argv[1:]))
