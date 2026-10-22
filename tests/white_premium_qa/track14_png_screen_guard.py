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
    ended = False
    while p + 12 <= len(data):
        size = struct.unpack_from('>I', data, p)[0]
        tag = data[p + 4:p + 8]
        payload = data[p + 8:p + 8 + size]
        if len(payload) != size or p + 12 + size > len(data):
            raise ValueError('truncated PNG')
        actual_crc = struct.unpack_from('>I', data, p + 8 + size)[0]
        if (zlib.crc32(tag + payload) & 0xffffffff) != actual_crc:
            raise ValueError('PNG CRC mismatch')
        p += size + 12
        if tag == b'IHDR':
            width, height, depth, kind, _, _, interlace = struct.unpack('>IIBBBBB', payload)
        elif tag == b'IDAT':
            compressed.extend(payload)
        elif tag == b'IEND':
            if size:
                raise ValueError('invalid PNG IEND')
            ended = True
            break
    if not ended or p != len(data):
        raise ValueError('missing IEND or trailing PNG data')
    if depth != 8 or kind not in (2, 6) or interlace != 0 or not width or not height:
        raise ValueError('unsupported screenshot PNG format')
    pixel_bytes = 3 if kind == 2 else 4
    stride = width * pixel_bytes
    raw = zlib.decompress(compressed)
    if len(raw) != height * (stride + 1):
        raise ValueError('invalid PNG pixel payload size')
    prev = bytearray(stride)
    zones = {'content': {'colors': set(), 'nonwhite': 0, 'sampled': 0},
             'footer': {'colors': set(), 'nonwhite': 0, 'sampled': 0}}
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
        zone = (zones['content'] if height // 8 <= y < 3 * height // 4 else
                zones['footer'] if 4 * height // 5 <= y < 19 * height // 20 else None)
        if zone is not None and y % 4 == 0:
            for x in range(width // 12, 11 * width // 12, 4):
                i = x * pixel_bytes
                rgb = tuple(cur[i:i + 3])
                zone['colors'].add(rgb)
                zone['sampled'] += 1
                zone['nonwhite'] += min(rgb) < 245
        prev = cur
    content, footer = zones['content'], zones['footer']
    content_ratio = content['nonwhite'] / max(1, content['sampled'])
    footer_ratio = footer['nonwhite'] / max(1, footer['sampled'])
    visible = (len(content['colors']) >= 12 and content_ratio >= 0.01 and
               len(footer['colors']) >= 5 and footer_ratio >= 0.005)
    return dict(width=width, height=height,
                sampled=content['sampled'] + footer['sampled'],
                colors=len(content['colors']), nonwhite_fraction=round(content_ratio, 4),
                footer_colors=len(footer['colors']),
                footer_nonwhite_fraction=round(footer_ratio, 4),
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
