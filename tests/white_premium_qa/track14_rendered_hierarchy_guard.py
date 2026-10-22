#!/usr/bin/env python3
"""Source-only semantic acceptance gate for disposable Android WebView UI dumps.

A pixel-varied screenshot is never visual proof by itself. This gate requires
real app-package WebView structure plus its title and two existing navigation
labels (English, Arabic, or German). A missing/unsupported UI dump is blocked,
not classified as a defective application layout.
"""
import json
import pathlib
import sys
import xml.etree.ElementTree as ET

PACKAGE = 'com.zenstudy.focus'
DESTINATIONS = (
    ('Tasks', 'Calendar', 'Notes', 'Timer', 'Quick training', 'Nature', 'Analytics'),
    ('المهام', 'التقويم', 'الملاحظات', 'المؤقت', 'تدريب سريع', 'الطبيعة', 'التحليلات'),
    ('Aufgaben', 'Kalender', 'Notizen', 'Timer', 'Schnelltraining', 'Natur', 'Analyse'),
)


def check(path):
    try:
        root = ET.parse(path).getroot()
    except (OSError, ET.ParseError, ValueError):
        return {'status': 'HIERARCHY_INVALID', 'webview_nodes': 0,
                'title_found': False, 'navigation_labels_matched': 0}
    nodes = [n for n in root.iter('node') if n.get('package') == PACKAGE]
    webviews = [n for n in nodes if n.get('class') == 'android.webkit.WebView']
    displayed = set()
    for n in nodes:
        for key in ('text', 'content-desc'):
            value = (n.get(key) or '').strip()
            if value:
                displayed.add(value)
    title_found = any('Deep Focus' in value for value in displayed)
    matched = max((sum(any(label == value for value in displayed) for label in labels)
                   for labels in DESTINATIONS), default=0)
    confirmed = bool(webviews) and title_found and matched >= 2
    return {'status': 'RENDERED_SEMANTIC_CANDIDATE' if confirmed else 'WEBVIEW_DOM_NOT_VERIFIED',
            'webview_nodes': len(webviews), 'title_found': title_found,
            'navigation_labels_matched': matched}


def main(argv):
    if len(argv) != 1:
        print(json.dumps({'status': 'HIERARCHY_INVALID', 'reason': 'EXPECTED_ONE_FILE'}))
        return 1
    result = check(pathlib.Path(argv[0]))
    print(json.dumps(result, ensure_ascii=False))
    return 0 if result['status'] == 'RENDERED_SEMANTIC_CANDIDATE' else 1


if __name__ == '__main__':
    raise SystemExit(main(sys.argv[1:]))
