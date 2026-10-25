#!/usr/bin/env python3
"""DF13-C functional Android scenarios: ADB/UIAutomator only, no mock DOM.

Callable from lane A after its single fresh-HEAD APK install:
    from scenarios.functional import run
    run(output_path, source_sha, api)
This module NEVER builds an APK, clears app storage or changes production files.
"""
import argparse
import json
import re
import sys
import time
import unicodedata
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import android_device as device  # runtime primitives owned by lane A; never modified here

CLOCK = re.compile(r"^([0-9]{1,3}):([0-9]{2})$")
SHA = re.compile(r"^[0-9a-f]{40}$")
NOT_TESTED = "NOT_TESTED"


class RequiresHook(Exception):
    """The app or device lacks an independently verifiable runtime interface."""


def normalize_clock(text):
    match = CLOCK.fullmatch(str(text).strip())
    if not match or int(match.group(2)) > 59 or int(match.group(1)) > 240:
        raise ValueError("invalid ASCII minute:second timer: " + repr(text))
    return int(match.group(1)) * 60 + int(match.group(2))


def assert_changed(before, after, reason):
    if before == after:
        raise AssertionError(reason + ": no observed state change")
    return True


def assert_stable(before, after, tolerance=1):
    if abs(before - after) > tolerance:
        raise AssertionError("paused value drifted: %s => %s" % (before, after))
    return True


def west_digits(value):
    return [ch for ch in str(value) if unicodedata.category(ch) == "Nd" and ch not in "0123456789"]


def classify(method, verified):
    if method != "REAL_ANDROID_ASSERTIONS":
        return NOT_TESTED
    return "PASS" if verified else "FAIL"


def description(node):
    return " ".join(node.get(k, "") for k in ("text", "content-desc", "hint", "resource-id"))


class Android:
    def nodes(self):
        return device.dump()

    def find(self, needle, *, exact=False, editable=False):
        found = []
        for node in self.nodes():
            if not node.get("bounds"):
                continue
            if editable and not ("EditText" in node.get("class", "") or
                                 "AutoCompleteTextView" in node.get("class", "")):
                continue
            fields = [node.get(k, "") for k in ("text", "content-desc", "hint", "resource-id")]
            matches = any((v.strip().casefold() == needle.casefold() if exact else
                           needle.casefold() in v.casefold()) for v in fields if v)
            if matches:
                found.append(node)
        if not found:
            raise AssertionError("Missing visible Android accessibility target: " + needle)
        if len(found) > 1 and not editable:
            # An exact UI label is preferred over ambiguous substring labels.
            exacts = [n for n in found if any(n.get(k, "").strip().casefold() == needle.casefold()
                for k in ("text", "content-desc", "hint"))]
            if len(exacts) == 1:
                return exacts[0]
            raise RequiresHook("ambiguous Android locator: " + needle)
        return found[0]

    def tap(self, label, *, exact=False):
        device.tap_node(self.find(label, exact=exact))

    def field(self, hint, text):
        if not re.fullmatch(r"[A-Za-z0-9_]+", text):
            raise RequiresHook("adb input text allows only safe ASCII test tokens")
        node = self.find(hint, editable=True)
        if node.get("text", "").strip():
            raise AssertionError("refusing to append to non-empty input: " + hint)
        device.tap_node(node)
        device.shell("input", "text", text)
        time.sleep(0.4)

    def tap_scoped(self, record, action):
        """Find the action inside the *same* accessibility subtree as the saved record.

        UIAutomator XML comes from the actual Android WebView, not an injected DOM.
        Ambiguity must be surfaced rather than tapping another person's record.
        """
        self.nodes()  # refresh the real-device dump
        xml = device.adb("exec-out", "cat", "/sdcard/df13-ui.xml")
        root = ET.fromstring(xml)
        parents = {child: parent for parent in root.iter()
                   for child in parent if child.tag == "node"}
        matches = [n for n in root.iter("node") if n.get("bounds") and (
            n.get("text", "").strip() == record or
            record in n.get("content-desc", ""))]
        if not matches:
            raise RequiresHook("record anchor not exposed to UIAutomator: " + record)
        for anchor in matches:
            parent = anchor
            while parent is not None:
                actions = [n for n in parent.iter("node") if n.get("bounds") and
                           (n.get("text", "").strip().casefold() == action.casefold() or
                            n.get("content-desc", "").strip().casefold() == action.casefold())]
                if len(actions) == 1:
                    device.tap_node(actions[0].attrib)
                    return
                parent = parents.get(parent)
        raise RequiresHook("record-scoped " + action + " action ambiguous/inaccessible")

    def replace_text(self, before, after):
        """Only replace a currently exposed editable field with known previous data."""
        if not re.fullmatch(r"[A-Za-z0-9_]+", before + after):
            raise RequiresHook("safe ASCII token field replacement required")
        field = self.find(before, editable=True, exact=True)
        if field.get("text", "") != before:
            raise AssertionError("editor field did not expose exact original value")
        device.tap_node(field)
        device.shell("input", "keyevent", "KEYCODE_MOVE_END")
        # Batch key events; no clipboard, direct WebView JS or app-store writes.
        device.shell("input", "keyevent", *(["KEYCODE_DEL"] * len(before)))
        device.shell("input", "text", after)
        time.sleep(0.4)
        if not self.find(after, exact=True, editable=True):
            raise AssertionError("editor field did not receive replacement text")

    def has(self, label):
        return any(label.casefold() in description(n).casefold() for n in self.nodes()
                   if n.get("bounds"))

    def has_exact_record(self, name):
        """Match a displayed record, excluding editable search fields and prefix collisions."""
        return any(
            n.get("bounds") and "EditText" not in n.get("class", "") and
            (n.get("text", "").strip() == name or
             n.get("content-desc", "").strip().endswith(": " + name))
            for n in self.nodes()
        )

    def clock(self):
        values = [n.get("text", "").strip() for n in self.nodes()
                  if n.get("bounds") and CLOCK.fullmatch(n.get("text", "").strip())]
        if len(values) != 1:
            raise RequiresHook("timer numeric node missing/ambiguous: " + repr(values))
        return normalize_clock(values[0])

    def restart(self):
        return device.restart()

    def back_home(self):
        device.shell("input", "keyevent", "KEYCODE_HOME")
        time.sleep(1.0)
        device.shell("am", "start", "-n", device.ACTIVITY)
        time.sleep(3)

    def choose_confirm(self, allow):
        # JS confirm must be exposed as a *real* native dialog. No blind keyevent.
        options = ("OK", "Yes", "Confirm") if allow else ("Cancel", "No")
        for option in options:
            try:
                self.tap(option, exact=True)
                return option
            except AssertionError:
                continue
        raise RequiresHook("native destructive consent buttons not exposed to UIAutomator")

    def ensure_timer(self):
        self.tap("Timer")
        return self.clock()


def timer_start_pause_resume(a, token):
    start = a.ensure_timer()
    a.tap("Start or pause timer")
    time.sleep(3)
    running = a.clock()
    if running >= start:
        raise AssertionError("Start did not decrease remaining seconds")
    a.tap("Start or pause timer")
    paused = a.clock()
    time.sleep(2)
    assert_stable(paused, a.clock())
    a.tap("Start or pause timer")
    time.sleep(3)
    resumed = a.clock()
    if resumed >= paused:
        raise AssertionError("Resume did not decrease remaining seconds")
    a.tap("Start or pause timer")
    return {"start": start, "running": running, "paused": paused,
            "resumed": resumed, "assertions": ["decrements", "pause_stable", "resume_decrements"]}


def timer_reset_consent(a, token):
    initial = a.ensure_timer()
    a.tap("Start or pause timer")
    time.sleep(2)
    active = a.clock()
    a.tap("↺", exact=True)
    a.choose_confirm(False)
    after_cancel = a.clock()
    if after_cancel > active or (active < initial and after_cancel == initial):
        raise AssertionError("Cancel reset unexpectedly rewound the timer")
    a.tap("↺", exact=True)
    a.choose_confirm(True)
    after_reset = a.clock()
    if abs(after_reset - initial) > 1 or after_reset <= active:
        raise AssertionError("Confirmed reset did not restore initial duration")
    time.sleep(2)
    assert_stable(after_reset, a.clock())
    return {"after_cancel": after_cancel, "after_confirm": after_reset,
            "assertions": ["cancel_preserves_progress", "confirm_resets_and_stops"]}


def tasks_create_save_relaunch(a, token):
    name = "DF13C_TASK_" + token
    a.tap("Tasks")
    if a.has(name):
        raise AssertionError("test task already exists; isolation failed")
    a.field("Add study", name)
    device.shell("input", "keyevent", "KEYCODE_ENTER")
    time.sleep(1)
    if not a.has(name):
        raise AssertionError("task not rendered after save")
    a.restart()
    a.tap("Tasks")
    if not a.has(name):
        raise AssertionError("task did not survive process restart")
    return {"record": name, "assertions": ["absent_before", "present_after_save",
                                           "present_after_process_relaunch"]}


def notes_create_search_relaunch(a, token):
    title, body = "DF13C_NOTE_" + token, "DF13C_BODY_" + token
    a.tap("Notes")
    if a.has(title):
        raise AssertionError("test note already exists; isolation failed")
    a.tap("＋ New note", exact=True)
    a.field("Title or question", title)
    a.field("Write here", body)
    a.tap("Save", exact=True)
    if not a.has(title) or not a.has(body):
        raise AssertionError("note title/body did not appear after Save")
    a.restart()
    a.tap("Notes")
    if not a.has(title) or not a.has(body):
        raise AssertionError("note disappeared or body changed after process relaunch")
    a.field("Search notes", title)
    if not a.has(title) or not a.has(body):
        raise AssertionError("note not found by actual search")
    return {"record": title, "assertions": ["absent_before", "title_body_after_save",
                                           "title_body_after_restart", "search_finds_saved_note"]}


def tasks_edit(a, token):
    original, updated = "DF13C_TASK_" + token, "DF13C_TASK_" + token + "_EDIT"
    a.tap("Tasks")
    if not a.has(original):
        raise RequiresHook("create_save_relaunch dependency did not create test task")
    a.tap_scoped(original, "Edit")
    a.replace_text(original, updated)
    a.tap("Save", exact=True)
    if not a.has(updated) or a.has_exact_record(original):
        raise AssertionError("task edit was not committed to visible state")
    a.restart()
    a.tap("Tasks")
    if not a.has(updated) or a.has_exact_record(original):
        raise AssertionError("edited task title did not persist on restart")
    return {"record": updated, "assertions": ["saved_record_scoped_edit", "old_title_absent",
                                             "new_title_present_after_relaunch"]}


def tasks_trash_restore(a, token):
    name = "DF13C_TASK_" + token + "_EDIT"
    a.tap("Tasks")
    if not a.has(name):
        raise RequiresHook("tasks.edit dependency did not produce edited test task")
    a.tap_scoped(name, "Trash")
    a.tap("Trash", exact=True)
    if not a.has(name):
        raise AssertionError("trashed task not present in in-app Trash")
    a.tap_scoped(name, "Restore")
    a.tap("List", exact=True)
    if not a.has(name):
        raise AssertionError("restored task not present in live task list")
    a.restart()
    a.tap("Tasks")
    if not a.has(name):
        raise AssertionError("restored task absent after relaunch")
    return {"record": name, "assertions": ["moved_to_trash", "restored",
                                          "restored_survived_relaunch"]}


def notes_edit(a, token):
    original = "DF13C_NOTE_" + token
    title, body = original + "_EDIT", "DF13C_BODY_" + token + "_EDIT"
    a.tap("Notes")
    if not a.has(original):
        raise RequiresHook("notes.create_search_relaunch dependency not observed")
    a.tap_scoped(original, "Edit")
    a.replace_text(original, title)
    a.replace_text("DF13C_BODY_" + token, body)
    a.tap("Save", exact=True)
    if not a.has(title) or not a.has(body) or a.has_exact_record(original):
        raise AssertionError("note edit not observable in the rendered record")
    a.restart()
    a.tap("Notes")
    if not a.has(title) or not a.has(body) or a.has_exact_record(original):
        raise AssertionError("note edit was not persisted across relaunch")
    return {"record": title, "assertions": ["scoped_title_body_edit",
                                          "old_title_absent", "edit_survived_relaunch"]}


def offline_relaunch_foreground(a, token):
    device.shell("svc", "wifi", "disable")
    device.shell("svc", "data", "disable")
    try:
        a.restart()
        if not a.has("Deep Focus"):
            raise AssertionError("offline launch failed")
        a.back_home()
        if not a.has("Deep Focus"):
            raise AssertionError("offline foreground return failed")
        return {"assertions": ["offline_process_relaunch", "foreground_return"]}
    finally:
        device.shell("svc", "wifi", "enable")
        device.shell("svc", "data", "enable")


def language_running(a, token):
    a.ensure_timer()
    a.tap("Start or pause timer")
    time.sleep(2)
    before = a.clock()
    device.language("Arabic", "ar")
    after = a.clock()
    if after > before:
        raise AssertionError("locale change reset timer progress")
    a.restart()
    if not device.iso_badge(a.nodes(), "ar"):
        raise AssertionError("selected language lost after relaunch")
    later = a.clock()
    if later > before:
        raise AssertionError("relaunch reset timer while switching locale")
    return {"before": before, "after_switch": after, "after_relaunch": later,
            "assertions": ["same_session_progress", "locale_persisted"]}


def quick_training_work_rest_stop(a, token):
    a.tap("Timer")
    a.tap("Custom work-and-rest intervals")
    a.tap("Intervals 20/10")
    a.tap("Start training")
    if not a.has("Work · Round 1/8"):
        raise AssertionError("Quick Training did not expose Work phase 1/8")
    deadline = time.monotonic() + 35
    while time.monotonic() < deadline and not a.has("Rest · Round 1/8"):
        time.sleep(0.7)
    if not a.has("Rest · Round 1/8"):
        raise AssertionError("Quick Training did not enter Rest after actual Work countdown")
    a.tap("End training")
    a.choose_confirm(True)
    if a.has("Rest · Round 1/8"):
        raise AssertionError("Quick Training still active after Stop confirmation")
    return {"assertions": ["started_work", "work_to_rest_changed", "stop_confirm_changed"]}


def digits_visible(a, token):
    a.tap("Timer")
    nodes = a.nodes()
    numeric = [n.get("text", "") for n in nodes if any(ch.isdigit()
               for ch in n.get("text", "")) and n.get("bounds")]
    if not numeric:
        raise AssertionError("no visible numeric nodes were inspected")
    violations = {s: west_digits(s) for s in numeric if west_digits(s)}
    if violations:
        raise AssertionError("non-Western numeric glyphs: " + repr(violations))
    return {"numeric_labels_inspected": len(numeric),
            "assertions": ["visible_android_numbers_are_0_to_9"]}


def needs_hook(name):
    def blocked(a, token):
        raise RequiresHook(name)
    return blocked


# Each unimplemented case is *visible as NOT_TESTED* with a precise reason;
# never turn missing accessibility or DOM evidence into a green Android run.
SCENARIOS = {
    "timer.start_pause_resume": timer_start_pause_resume,
    "timer.reset_cancel_confirm": timer_reset_consent,
    "tasks.create_save_relaunch": tasks_create_save_relaunch,
    "tasks.edit": tasks_edit,
    "tasks.restore": tasks_trash_restore,
    "notes.create_search_relaunch": notes_create_search_relaunch,
    "notes.edit": notes_edit,
    "offline.relaunch_foreground": offline_relaunch_foreground,
    "locale.switch_while_timer_running": language_running,
    "quick_training.work_rest_stop": quick_training_work_rest_stop,
    "goals.real_analytics": needs_hook("Complete real session; read persisted goal credit and Today/Week/Month v21"),
    "audio.controls_settings": needs_hook("Real playback/volume signal and settings read-back"),
    "digits.visible_labels": digits_visible,
    "security.html_injection": needs_hook("Safe payload entry and actual rendered DOM/execution signal, no mocked DOM"),
    "validation.inputs": needs_hook("Typed invalid values plus unchanged persisted state"),
    "validation.destructive_consent": needs_hook("Record-scoped delete dialog and preserved state on Cancel"),
    "performance.tasks_1000": needs_hook("Controlled SAF import and real Android timing, memory and baseline"),
    "performance.notes_5000": needs_hook("Controlled SAF import and real Android timing, memory and baseline"),
    "performance.sessions_10000": needs_hook("Controlled SAF import and real Android timing, memory and baseline"),
    "accessibility.talkback": needs_hook("TalkBack spoken-output accessibility QA"),
    "accessibility.rtl_visual": needs_hook("RTL screenshot/layout comparator with recorded acceptance"),
}
RUNNABLE = [k for k in SCENARIOS if k not in (
    "goals.real_analytics", "audio.controls_settings",
    "security.html_injection", "validation.inputs", "validation.destructive_consent",
    "performance.tasks_1000", "performance.notes_5000", "performance.sessions_10000",
    "accessibility.talkback", "accessibility.rtl_visual")]


def run(output, sha, api, selected=None):
    if not SHA.fullmatch(sha):
        raise ValueError("must receive exact fresh-HEAD 40-digit source SHA from lane A")
    output = Path(output)
    output.parent.mkdir(parents=True, exist_ok=True)
    chosen = list(SCENARIOS) if selected is None else selected
    if any(k not in SCENARIOS for k in chosen):
        raise ValueError("unknown scenario")
    token = str(int(time.time()))
    report = {"TASK_ID": "DF13-C-FUNCTIONAL-E2E-SCENARIOS", "SOURCE_SHA": sha,
              "API": api, "EVIDENCE": "ADB_UIAUTOMATOR_REAL_ANDROID_ONLY",
              "CASES": {key: {"status": NOT_TESTED, "reason": "Not yet executed"}
                        for key in chosen}}
    def save():
        report["SUMMARY"] = {s: sum(v["status"] == s for v in report["CASES"].values())
                             for s in ("PASS", "FAIL", NOT_TESTED)}
        report["BLOCKERS"] = [f"{k}: {v.get('reason', v.get('error', ''))}"
                              for k, v in report["CASES"].items() if v["status"] != "PASS"]
        tmp = output.with_suffix(".tmp")
        tmp.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        tmp.replace(output)
    save()
    android = Android()
    for key in chosen:
        t0 = time.monotonic()
        try:
            detail = SCENARIOS[key](android, token)
            report["CASES"][key] = {"status": classify("REAL_ANDROID_ASSERTIONS", True),
                                    "detail": detail}
        except RequiresHook as exc:
            report["CASES"][key] = {"status": NOT_TESTED, "reason": str(exc)}
        except Exception as exc:
            report["CASES"][key] = {"status": "FAIL", "error": f"{type(exc).__name__}: {exc}"}
        report["CASES"][key]["duration_ms"] = round((time.monotonic() - t0) * 1000)
        save()
        print("DF13_C", key, report["CASES"][key]["status"], flush=True)
    return report


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--sha", required=True)
    parser.add_argument("--api", type=int, required=True, choices=(30, 35))
    parser.add_argument("--scenario", action="append", choices=list(SCENARIOS))
    args = parser.parse_args()
    report = run(args.output, args.sha, args.api, args.scenario)
    print(json.dumps(report["SUMMARY"]))
    return int(report["SUMMARY"]["FAIL"] > 0)


if __name__ == "__main__":
    raise SystemExit(main())
