#!/usr/bin/env python3
"""Prepare a DISPOSABLE debug-only Android listening app in a GitHub Actions checkout.

Run ONLY after pinned original candidate intake. Never execute in a user worktree.
Never changes the real app's package ID, storage or release branch.
"""
import hashlib
import json
import os
import pathlib
import re
import shutil
import sys

QA_PACKAGE = "com.zenstudy.focus.audioqa"
PRODUCTION_PACKAGE = "com.zenstudy.focus"
WEB = pathlib.Path("android/app/src/main/assets/web")
JAVA = pathlib.Path("android/app/src/main/java/com/zenstudy/focus/MainActivity.java")
MANIFEST = pathlib.Path("android/app/src/main/AndroidManifest.xml")
GRADLE = pathlib.Path("android/app/build.gradle")
SOURCE_MANIFEST = pathlib.Path("tools/nature_audio/commons_intake.json")
QUARANTINE = pathlib.Path("audio_candidates/commons_intake")

def replace_exact(source, old, new, description):
    if source.count(old) != 1:
        raise ValueError("Unexpected original " + description + "; abort QA build")
    return source.replace(old, new, 1)

def prepare(root, selected_items=None):
    root = pathlib.Path(root).resolve()
    web, java, manifest, gradle = (
        root / WEB, root / JAVA, root / MANIFEST, root / GRADLE
    )
    media = root / QUARANTINE
    meta = json.loads((root / SOURCE_MANIFEST).read_text(encoding="utf-8"))
    if selected_items is not None:
        meta["items"] = selected_items
    evidence = json.loads((media / "qa_report.json").read_text(encoding="utf-8"))
    statuses = {entry["id"]: entry for entry in evidence}
    if not (media / "index.html").is_file():
        raise ValueError("Offline listening page missing")
    if not meta.get("items") or len(meta["items"]) != len(statuses):
        raise ValueError("Original source and report counts differ")
    original_files = []
    for item in meta["items"]:
        name = item["file"]
        if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9 _()'-]*\.ogg", name):
            raise ValueError("Unsafe original media path")
        expected = statuses.get(item["id"])
        if any(str(w).startswith("BLOCKED_RIGHTS:") for w in item.get("review_warnings", [])):
            if expected is None or expected.get("status") != "BLOCKED_RIGHTS" or (media / name).exists():
                raise ValueError("Blocked rights file in AudioQA")
            continue
        body = (media / name).read_bytes()
        actual_sha1 = hashlib.sha1(body).hexdigest()
        actual_sha256 = hashlib.sha256(body).hexdigest()
        if (expected is None or expected["status"] != "QUARANTINED_NOT_APPROVED"
            or item["source_sha1"] != actual_sha1
            or item["source_sha256"] != actual_sha256
            or expected["original_sha1"] != actual_sha1
            or expected["original_sha256"] != actual_sha256):
            raise ValueError("Source hash and QA receipt mismatch: " + item["id"])
        original_files.append(name)

    loops = []
    for item in meta["items"]:
        loop = statuses[item["id"]].get("loop_derivative")
        if not loop:
            continue
        name = loop.get("path", "")
        if not re.fullmatch(r"loops/[a-z][a-z0-9_]*\.ogg", name):
            raise ValueError("Unsafe loop derivative path")
        if loop.get("input_sha256") != item["source_sha256"] or hashlib.sha256((media/name).read_bytes()).hexdigest() != loop.get("output_sha256"):
            raise ValueError("Loop derivative lineage mismatch")
        loops.append(name)
    gradle_source = gradle.read_text(encoding="utf-8")
    java_source = java.read_text(encoding="utf-8")
    manifest_source = manifest.read_text(encoding="utf-8")
    gradle_source = replace_exact(gradle_source,
        'applicationId "' + PRODUCTION_PACKAGE + '"',
        'applicationId "' + QA_PACKAGE + '"', "Gradle application ID")
    java_source = replace_exact(java_source,
        'if (!"' + PRODUCTION_PACKAGE + '".equals(getPackageName()))',
        'if (!"' + QA_PACKAGE + '".equals(getPackageName()))', "native app identity")
    java_source = replace_exact(java_source,
        'webView.loadUrl("file:///android_asset/web/index.html");',
        'webView.loadUrl("file:///android_asset/web/audio_review/index.html");',
        "WebView entrypoint")
    java_source = replace_exact(java_source, "if (Build.VERSION.SDK_INT >= 33)",
        "if (false && Build.VERSION.SDK_INT >= 33)", "notification opt-out")
    java_source = java_source.replace(
        'webView.addJavascriptInterface(new ZenNativeBridge(), "ZenNative");',
        "// No privileged JavaScript bridge in disposable Audio QA APK."
    )
    manifest_source = replace_exact(manifest_source, 'android:label="Deep Focus"',
        'android:label="Deep Focus Audio QA"', "app label")
    manifest_source = re.sub(r"\s*<uses-permission\b[^>]*/>", "", manifest_source)
    manifest_source = re.sub(r"\s*<service\b[^>]*(?:/>|>[\s\S]*?</service>)", "", manifest_source)
    if "uses-permission" in manifest_source or "<service" in manifest_source:
        raise ValueError("QA preview manifest must have no permissions or services")

    gradle.write_text(gradle_source, encoding="utf-8")
    java.write_text(java_source, encoding="utf-8")
    manifest.write_text(manifest_source, encoding="utf-8")

    # This is an ephemeral CI checkout only, guarded at CLI entry.
    # Remove the legacy Android web assets from the QA package (no user data).
    if not web.is_dir() or web.is_symlink() or not web.resolve().is_relative_to(root):
        raise ValueError("Invalid ephemeral web directory")
    for child in web.iterdir():
        if child.is_symlink():
            raise ValueError("Unexpected symlink in disposable web tree")
        if child.is_dir():
            shutil.rmtree(child)
        else:
            child.unlink()
    review = web / "audio_review"
    review.mkdir()
    for name in original_files:
        shutil.copy2(media / name, review / name)
    if loops:
        (review / "loops").mkdir()
        for name in loops:
            shutil.copy2(media / name, review / name)
    for filename in ("index.html", "qa_report.json"):
        shutil.copy2(media / filename, review / filename)
    (review / "README.txt").write_text(
        "NON-PRODUCTION AUDIO QA ONLY. Unique package com.zenstudy.focus.audioqa.\n"
        "No app data accessed, no release media approved.\n", encoding="utf-8")
    print("Isolated QA APK prepared with", len(original_files),
          "original pinned recordings; real application assets excluded")

if __name__ == "__main__":
    if not (os.environ.get("GITHUB_ACTIONS") == "true"
        and os.environ.get("AUDIO_QA_BUILD") == "1"
        and os.environ.get("GITHUB_REF_NAME") in {
            "fix/deep-focus-nature-catalog-20-20261020",
            "feature/track07-04-authentic-nature-20-20261020",
            "fix/track07-04-audio-acceptance-20261020"
        }):
        raise SystemExit("SAFE_GUARD: Audio QA packaging is GitHub Actions branch-only")
    # CLI requires all twenty originals, but prepare(root) remains unit-testable
    # with small isolated fixtures and never relaxes per-file hash/rights checks.
    if os.environ["GITHUB_REF_NAME"] in {"feature/track07-04-authentic-nature-20-20261020", "fix/track07-04-audio-acceptance-20261020"}:
        intake=json.loads(SOURCE_MANIFEST.read_text(encoding="utf-8"))
        if len(intake.get("items",[])) != 20:
            raise SystemExit("AUDIO20_QA_BLOCKED: exact twenty sources required")
    if sys.argv[1:] == ["--requested"]:
        from collect_commons_audio import requested_sources
        QUARANTINE = pathlib.Path("audio_candidates/requested")
        selected = requested_sources(json.loads(SOURCE_MANIFEST.read_text(encoding="utf-8")))
        prepare(pathlib.Path(__file__).resolve().parents[2],selected_items=selected)
    elif not sys.argv[1:]:
        prepare(pathlib.Path(__file__).resolve().parents[2])
    else:
        raise SystemExit("Unknown QA cohort")
