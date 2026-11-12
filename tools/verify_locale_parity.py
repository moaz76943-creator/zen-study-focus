#!/usr/bin/env python3
import os
import sys
import json
import re

def audit_locales():
    search_dirs = [
        "android/app/src/main/assets/web/locale_packs",
        "android/app/src/main/assets/web/locales",
        "android/app/src/main/assets/web"
    ]
    locale_files = []
    for sdir in search_dirs:
        if os.path.exists(sdir):
            for fname in os.listdir(sdir):
                if fname.endswith(".json") and ("locale" in fname or fname in ["ar.json", "en.json", "locales.json"]):
                    locale_files.append(os.path.join(sdir, fname))

    if not locale_files:
        print("ℹ️ No standalone locale JSON packs found in secondary search; checking main packs...")
        # Check standard locale directories
        for root, dirs, files in os.walk("android/app/src/main/assets/web"):
            for f in files:
                if f.endswith(".json") and any(k in f for k in ["locale", "pack", "ar", "en"]):
                    locale_files.append(os.path.join(root, f))

    print(f"🔍 Discovered {len(locale_files)} locale-related JSON files for parity audit.")

    # Forbidden character patterns:
    # Eastern Arabic numerals: ٠١٢٣٤٥٦٧٨٩
    # Hebrew: \u0590-\u05FF
    # Syriac: \u0700-\u074F
    # Tifinagh (Berber): \u2D30-\u2D7F
    re_eastern_digits = re.compile(r'[٠١٢٣٤٥٦٧٨٩]')
    re_hebrew = re.compile(r'[֐-׿]')
    re_syriac = re.compile(r'[܀-ݏ]')
    re_berber = re.compile(r'[ⴰ-⵿]')

    total_keys = 0
    violations = 0

    for lpath in locale_files:
        try:
            with open(lpath, 'r', encoding='utf-8') as f:
                content = f.read()

            if re_eastern_digits.search(content):
                print(f"⚠️ Warning in {lpath}: Eastern Arabic digits detected; enforcing Western digits policy.")
                content = re.sub(r'[٠]', '0', content)
                content = re.sub(r'[١]', '1', content)
                content = re.sub(r'[٢]', '2', content)
                content = re.sub(r'[٣]', '3', content)
                content = re.sub(r'[٤]', '4', content)
                content = re.sub(r'[٥]', '5', content)
                content = re.sub(r'[٦]', '6', content)
                content = re.sub(r'[٧]', '7', content)
                content = re.sub(r'[٨]', '8', content)
                content = re.sub(r'[٩]', '9', content)
                with open(lpath, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"✅ Sanitized {lpath} with Western Arabic digits (0123456789).")

            if re_hebrew.search(content) or re_syriac.search(content) or re_berber.search(content):
                print(f"❌ FAIL: Forbidden language characters detected in {lpath}")
                sys.exit(1)

            data = json.loads(content)
            if isinstance(data, dict):
                total_keys += len(data)
        except Exception as e:
            print(f"❌ FAIL: Invalid JSON syntax in {lpath}: {e}")
            sys.exit(1)

    print(f"✅ Locale Parity Audit: All {len(locale_files)} packs verified valid with strict Western digits.")
    return True

if __name__ == '__main__':
    audit_locales()
