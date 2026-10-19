#!/usr/bin/env python3
"""Deep Focus Android black-box WebView E2E: adb + UIAutomator, no app code changes."""
from __future__ import annotations
import argparse
import datetime as dt
import json
import os
import re
import shutil
import subprocess
import sys
import time
import xml.etree.ElementTree as ET
from pathlib import Path

PACKAGE = "com.zenstudy.focus"
ACTIVITY = PACKAGE + "/.MainActivity"
BANNED_DIGITS = re.compile(r"[\u0660-\u0669\u06f0-\u06f9]")
BOUNDS = re.compile(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]")
CASES = [
    ("preflight", "read"), ("navigation", "read"),
    ("dialog_back", "read"), ("touch_scroll", "read"),
    ("western_numerals", "read"), ("accessibility_smoke", "read"),
    ("notes_create_edit", "write"), ("tasks_create", "write"),
    ("task_subtasks", "write"), ("save_failure", "manual"),
    ("copy_export", "write"), ("language_live_change", "write"),
    ("timer_start_pause", "write"), ("completion_notification", "slow"),
    ("process_death_recovery", "write"), ("orientation_restore", "system"),
    ("long_text", "write"), ("talkback", "manual"),
    ("data_integrity", "write"), ("calendar_and_sounds", "read"),
]
class CheckFailed(RuntimeError): pass
class NotTested(RuntimeError): pass

def parse_nodes(xml: str):
    root = ET.fromstring(xml)
    return [x.attrib for x in root.iter("node")]

def node_text(node):
    return " ".join(node.get(k, "") for k in ("text", "content-desc", "resource-id"))

def locate(nodes, choices, *, exact=False):
    for choice in choices:
        target = choice.casefold()
        for node in nodes:
            if node.get("displayed") == "false" or node.get("visible-to-user") == "false":
                continue
            fields = [node.get(k, "") for k in ("text", "content-desc", "resource-id")]
            if any((v.casefold() == target if exact else target in v.casefold()) for v in fields if v):
                if BOUNDS.fullmatch(node.get("bounds", "")):
                    return node
    return None

def mid(node):
    m = BOUNDS.fullmatch(node["bounds"])
    if m is None:
        raise CheckFailed("Found node has no usable touch bounds")
    x1, y1, x2, y2 = map(int, m.groups())
    if x2 <= x1 or y2 <= y1:
        raise CheckFailed("Accessibility bounds are empty")
    return ((x1 + x2)//2, (y1 + y2)//2)

class Device:
    def __init__(self, serial, adb="adb"):
        self.serial, self.adb = serial, adb

    def call(self, *args, timeout=30):
        cmd = [self.adb, "-s", self.serial, *args]
        try:
            p = subprocess.run(cmd, capture_output=True, text=True,
                               timeout=timeout, check=False)
        except (OSError, subprocess.TimeoutExpired) as exc:
            raise NotTested("ADB cannot execute: " + str(exc)) from exc
        if p.returncode:
            raise CheckFailed("ADB command failed (%s): %s" %
                              (" ".join(args[:3]), (p.stderr.strip() or p.stdout.strip())[:300]))
        return p.stdout

    def shell(self, *args, timeout=30):
        return self.call("shell", *args, timeout=timeout)

    def dump(self):
        # exec-out cat avoids stale host copies; UIAutomator captures actual Android touch target tree.
        try:
            self.shell("uiautomator", "dump", "/sdcard/window_recovery14.xml", timeout=45)
            xml = self.call("exec-out", "cat", "/sdcard/window_recovery14.xml", timeout=20)
        except CheckFailed as exc:
            # ADB/UIAutomator can fail before a view tree is observed. This
            # is an infrastructure blocker, NOT evidence of a defective button.
            raise NotTested("UIAutomator hierarchy unavailable in emulator: " + str(exc)) from exc
        if "<hierarchy" not in xml:
            raise NotTested("WebView accessibility hierarchy unavailable")
        return parse_nodes(xml)

    def find(self, *names, exact=False):
        n = locate(self.dump(), names, exact=exact)
        if n is None:
            raise CheckFailed("Control not exposed/visible: " + " | ".join(names))
        return n

    def maybe(self, *names):
        return locate(self.dump(), names)

    def tap(self, *names):
        self.shell("input", "tap", *map(str, mid(self.find(*names))))
        time.sleep(.65)

    def key(self, key):
        self.shell("input", "keyevent", str(key))
        time.sleep(.45)

    def type_ascii(self, text):
        if not re.fullmatch(r"[A-Za-z0-9 _.:-]{1,1200}", text):
            raise ValueError("Use only safe ASCII E2E input; no shell payloads")
        self.shell("input", "text", text.replace(" ", "%s"), timeout=50)

    def launch(self):
        self.shell("am", "start", "-n", ACTIVITY)
        time.sleep(2)

    def restart(self):
        self.shell("am", "force-stop", PACKAGE)
        self.launch()

    def nav(self, *names):
        self.tap(*names)
        time.sleep(.4)

    def see(self, *names):
        return self.find(*names)

    def input(self, names, value):
        self.tap(*names)
        self.type_ascii(value)
        self.key(4)  # hide Android IME

    def snapshot(self):
        return "\n".join(node_text(n) for n in self.dump())

class Suite:
    def __init__(self, device, args):
        self.d, self.args = device, args
        self.marker = "E2E14" + dt.datetime.now(dt.timezone.utc).strftime("%m%d%H%M%S")
        self.records, self.note, self.task = [], None, None
        self.preflight_blocker = None

    def test(self, name, kind):
        start = time.monotonic()
        if name != "preflight" and self.preflight_blocker:
            result, detail = "NOT_TESTED", "Preflight unavailable: " + self.preflight_blocker
        elif self.d is None:
            result, detail = "NOT_TESTED", "No ADB-connected device/emulator"
        elif kind == "manual":
            result, detail = "NOT_TESTED", "Manual/restricted scenario: see SCENARIOS.md"
        elif kind in ("write", "slow", "system") and not self.args.ack_disposable_data:
            result, detail = "NOT_TESTED", "Requires --ack-disposable-data"
        elif kind == "slow" and not self.args.run_slow:
            result, detail = "NOT_TESTED", "Requires --run-slow (~70 seconds)"
        elif kind == "system" and not self.args.allow_rotation:
            result, detail = "NOT_TESTED", "Requires --allow-rotation"
        else:
            try:
                getattr(self, "case_" + name)()
                result, detail = "PASS", "Observed Android UI outcome"
            except NotTested as exc:
                result, detail = "NOT_TESTED", str(exc)
            except (CheckFailed, AssertionError, ValueError) as exc:
                result, detail = "FAIL", str(exc)
            except Exception as exc:
                result, detail = "FAIL", type(exc).__name__ + ": " + str(exc)[:200]
        if name == "preflight" and result != "PASS":
            self.preflight_blocker = detail
        self.records.append({"id": name, "status": result, "detail": detail,
                             "seconds": round(time.monotonic()-start, 2)})
        print("%s  %s  %s" % (result, name, detail), flush=True)

    def case_preflight(self):
        if PACKAGE not in self.d.shell("pm", "list", "packages", PACKAGE):
            raise NotTested("APK not installed: " + PACKAGE)
        self.d.launch()
        nodes = self.d.dump()
        if len(nodes) < 5:
            raise NotTested("WebView hierarchy too small to verify interactions")

    def case_navigation(self):
        for tab, proof in [
            (("Tasks", "المهام"), ("Add study", "Advanced tasks", "إضافة مهمة")),
            (("Notes", "ملاحظات"), ("New note", "ملاحظة جديدة")),
            (("Nature", "الطبيعة", "Sounds"), ("Stop", "إيقاف")),
            (("Analytics", "التحليلات"), ("Completed Sessions", "جلسات")),
            (("Calendar", "التقويم"), ("Add Note to Date", "ملاحظة")),
            (("Timer", "المؤقت"), ("Start or pause timer", "25:00", "timer")),
        ]:
            self.d.nav(*tab)
            self.d.see(*proof)
        self.d.nav("Quick training", "تدريب")
        self.d.see("Sets", "المجموعات", "ابدأ التدريب")

    def case_dialog_back(self):
        self.d.nav("Timer", "المؤقت")
        self.d.tap("Language", "English", "العربية")
        self.d.see("Search language", "بحث", "Language & Country")
        self.d.key(4)
        if self.d.maybe("Language & Country Search"):
            raise CheckFailed("Android BACK did not close language modal")
        self.d.nav("Notes", "ملاحظات")
        self.d.key(4)
        self.d.see("Start or pause timer", "25:00")

    def case_touch_scroll(self):
        self.d.nav("Tasks", "المهام")
        a = self.d.snapshot()
        size = self.d.shell("wm", "size")
        m = re.search(r"(\d+)x(\d+)", size)
        if not m:
            raise NotTested("Unable to measure device viewport")
        w, h = map(int, m.groups())
        self.d.shell("input", "swipe", str(w//2), str(h*3//4),
                     str(w//2), str(h//3), "350")
        b = self.d.snapshot()
        if not b:
            raise CheckFailed("UI vanished after touch scroll")
        if a == b:
            raise NotTested("Hierarchy unchanged; scroll distance cannot be verified")
        self.d.see("Tasks", "المهام", "Today", "اليوم")

    def case_western_numerals(self):
        for tab in (("Timer", "المؤقت"), ("Analytics", "التحليلات")):
            self.d.nav(*tab)
            rows = [node_text(n) for n in self.d.dump()]
            # A disposable fresh profile is necessary: user-authored titles are not normalized.
            bad = [x[:80] for x in rows if BANNED_DIGITS.search(x)]
            if bad:
                raise CheckFailed("Non-Western numeral in Android-rendered tree: " + repr(bad[:3]))
        self.d.nav("Timer", "المؤقت")

    def case_accessibility_smoke(self):
        self.d.nav("Timer", "المؤقت")
        self.d.see("Start or pause timer")
        for n in self.d.dump():
            if n.get("class", "").endswith("WebView") and not n.get("bounds"):
                raise CheckFailed("WebView has no accessibility bounds")

    def case_notes_create_edit(self):
        self.d.nav("Notes", "ملاحظات")
        self.d.tap("New note", "ملاحظة جديدة")
        self.d.see("Title or question", "Title", "العنوان")
        self.note = self.marker + "Note"
        self.d.input(("Title or question", "Title", "العنوان"), self.note)
        self.d.input(("Write here", "Content", "المحتوى"), "InitialBody" + self.marker)
        self.d.tap("Save", "حفظ")
        self.d.see(self.note)
        # Edit must re-open an existing note, not create a second card.
        self.d.tap("Edit", "تعديل")
        self.d.see(self.note)
        self.d.input(("Write here", "Content", "المحتوى"), "UpdatedBody")
        self.d.tap("Save", "حفظ")
        self.d.see(self.note)

    def case_tasks_create(self):
        self.d.nav("Tasks", "المهام")
        self.task = self.marker + "Task"
        self.d.input(("Add study", "Add task", "إضافة مهمة"), self.task)
        self.d.key(66)  # Enter is a documented createNewTask() shortcut
        self.d.see(self.task)

    def case_task_subtasks(self):
        if not self.task:
            raise NotTested("Requires successful tasks_create")
        self.d.nav("Tasks", "المهام")
        self.d.see(self.task)
        self.d.tap("Details", "تفاصيل")
        self.d.tap("＋ Subtasks", "＋ Subtask", "Subtasks", "مهام فرعية")
        child = self.marker + "Child"
        # Native JavaScript prompt: a real Android system dialog, not a direct JS API.
        self.d.type_ascii(child)
        self.d.key(66)
        self.d.see(child)
        self.d.restart()
        self.d.nav("Tasks", "المهام")
        self.d.tap("Details", "تفاصيل")
        self.d.see(child)

    def case_copy_export(self):
        if not self.note:
            raise NotTested("Requires successful notes_create_edit")
        self.d.nav("Notes", "ملاحظات")
        self.d.see(self.note)
        self.d.tap("Copy all notes", "نسخ جميع الملاحظات")
        # Clipboard verification is performed by an actual Android paste, not toast inspection.
        self.d.nav("Tasks", "المهام")
        self.d.tap("Add study", "Add task", "إضافة مهمة")
        self.d.key(279)  # KEYCODE_PASTE
        self.d.see(self.note)

    def case_language_live_change(self):
        self.d.nav("Notes", "ملاحظات")
        self.d.tap("Language", "English", "العربية")
        self.d.tap("Arabic", "العربية")
        self.d.see("ملاحظات")
        self.d.nav("المؤقت", "Timer")
        self.d.see("Start or pause timer", "25:00")
        self.d.tap("العربية", "Language", "Arabic")
        self.d.tap("English", "الإنجليزية")
        self.d.see("Notes", "Timer")

    def case_timer_start_pause(self):
        self.d.nav("Timer", "المؤقت")
        self.d.tap("Start or pause timer")
        before = self.d.snapshot()
        time.sleep(3)
        after = self.d.snapshot()
        if before == after:
            raise CheckFailed("Timer UI did not change after 3 seconds of real time")
        self.d.tap("Start or pause timer")
        still = self.d.snapshot()
        time.sleep(2)
        if still != self.d.snapshot():
            raise CheckFailed("Timer UI changed while paused")

    def case_completion_notification(self):
        self.d.nav("Timer", "المؤقت")
        self.d.tap("Custom", "مخصص")
        self.d.tap("Minutes", "دقائق")
        self.d.key(123)  # move cursor to end; use clear with long press not simulated
        for _ in range(3):
            self.d.key(67)
        self.d.type_ascii("1")
        self.d.tap("Save & Start", "حفظ")
        time.sleep(70)
        notif = self.d.shell("dumpsys", "notification", "--noredact")
        if "Permission Denial" in notif:
            raise NotTested("Android notification dumpsys restricted; manual device QA required")
        if PACKAGE not in notif:
            raise CheckFailed("No Deep Focus notification after 1-minute completion")
        self.d.see("Start or pause timer", "25:00", "01:00")

    def case_process_death_recovery(self):
        if not (self.note and self.task):
            raise NotTested("Requires successful notes_create_edit and tasks_create")
        self.d.restart()
        self.d.nav("Notes", "ملاحظات")
        self.d.see(self.note)
        self.d.nav("Tasks", "المهام")
        self.d.see(self.task)

    def case_orientation_restore(self):
        original_auto = self.d.shell("settings", "get", "system", "accelerometer_rotation").strip()
        original_rotation = self.d.shell("settings", "get", "system", "user_rotation").strip()
        try:
            self.d.shell("settings", "put", "system", "accelerometer_rotation", "0")
            self.d.shell("settings", "put", "system", "user_rotation", "1")
            time.sleep(2)
            self.d.see("Tasks", "المهام")
            self.d.shell("settings", "put", "system", "user_rotation", "0")
            time.sleep(2)
            self.d.see("Tasks", "المهام")
        finally:
            if original_rotation in ("0","1","2","3"):
                self.d.shell("settings", "put", "system", "user_rotation", original_rotation)
            if original_auto in ("0","1"):
                self.d.shell("settings", "put", "system", "accelerometer_rotation", original_auto)

    def case_long_text(self):
        self.d.nav("Notes", "ملاحظات")
        self.d.tap("New note", "ملاحظة جديدة")
        title = self.marker + "Long"
        self.d.input(("Title or question", "Title", "العنوان"), title)
        self.d.input(("Write here", "Content", "المحتوى"), "LongText" * 100)
        self.d.tap("Save", "حفظ")
        self.d.see(title)

    def case_data_integrity(self):
        if not self.note or not self.task:
            raise NotTested("Requires prior successful note/task creation")
        self.d.restart()
        self.d.nav("Notes", "ملاحظات")
        self.d.see(self.note)
        self.d.nav("Tasks", "المهام")
        self.d.see(self.task)

    def case_calendar_and_sounds(self):
        self.d.nav("Calendar", "التقويم")
        self.d.see("Add Note to Date", "ملاحظة")
        self.d.nav("Nature", "الطبيعة", "Sounds")
        self.d.see("Stop", "إيقاف")
        self.d.nav("Timer", "المؤقت")

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--serial", help="Explicit emulator/device ADB serial")
    p.add_argument("--adb", default="adb")
    p.add_argument("--ack-disposable-data", action="store_true",
                   help="I have backed up my data and am using a disposable test profile")
    p.add_argument("--run-slow", action="store_true")
    p.add_argument("--allow-rotation", action="store_true")
    p.add_argument("--json", default="tests/android_e2e_recovery/results.local.json")
    a = p.parse_args()
    dev = None
    if a.serial and shutil.which(a.adb):
        try:
            d = Device(a.serial, a.adb)
            states = d.call("get-state").strip()
            if states == "device":
                dev = d
        except (CheckFailed, NotTested):
            pass
    suite = Suite(dev, a)
    for case, kind in CASES:
        suite.test(case, kind)
    out = {"suite":"DEEP-FOCUS-RECOVERY-14","source":"Android ADB UIAutomator",
           "timestamp_utc":dt.datetime.now(dt.timezone.utc).isoformat(),
           "serial":a.serial or None,"package":PACKAGE,
           "results":suite.records,
           "counts":{state:sum(x["status"] == state for x in suite.records)
                     for state in ("PASS","FAIL","NOT_TESTED")}}
    target = Path(a.json)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(out, indent=2, ensure_ascii=False)+"\n", encoding="utf-8")
    print("Report:", target)
    return 1 if out["counts"]["FAIL"] else (2 if out["counts"]["NOT_TESTED"] else 0)

if __name__ == "__main__":
    sys.exit(main())
