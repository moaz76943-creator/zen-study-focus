#!/usr/bin/env python3
"""Android WebView black-box smoke tests against a newly built APK.

Real device actions use adb + UIAutomator's accessibility hierarchy.
No mock DOM, stale APK, JavaScript injection or shell modification of app data.
Unverifiable assertions are NOT_TESTED, not PASS.
"""
import argparse
import json
import os
import re
import socket
import subprocess
import sys
import time
import xml.etree.ElementTree as ET
from pathlib import Path

PACKAGE = "com.zenstudy.focus"
ACTIVITY = PACKAGE + "/com.zenstudy.focus.MainActivity"
WIDTHS = (320, 360, 393, 430)
LOCALES = (("en", "English"), ("ar", "Arabic"), ("de", "German"),
           ("hi", "Hindi"), ("ja", "Japanese"), ("fa", "Persian"), ("ur", "Urdu"))
BOUNDS = re.compile(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]")

def adb(*args, timeout=45, check=True, binary=False):
    p = subprocess.run(["adb", *map(str, args)], capture_output=True,
                       text=not binary, timeout=timeout)
    if check and p.returncode:
        raise RuntimeError("adb %s: %s" % (" ".join(args), p.stderr))
    return p.stdout

def shell(*args):
    return adb("shell", *args)

def dump():
    """Read real Android accessibility XML, retrying transient null roots.

    UIAutomator may emit 'null root node returned' immediately after WebView
    activity startup despite a successful adb install and activity launch.
    Never convert missing XML into a successful UI assertion.
    """
    if os.getenv("DF13_UI_PORT"):
        return persistent_dump()
    diagnostics = []
    for attempt in range(1, 5):
        exported = subprocess.run(
            ["adb", "shell", "uiautomator", "dump", "/sdcard/df13-ui.xml"],
            capture_output=True, text=True, timeout=55)
        fetched = subprocess.run(
            ["adb", "exec-out", "cat", "/sdcard/df13-ui.xml"],
            capture_output=True, text=True, timeout=35)
        raw = fetched.stdout.lstrip("\ufeff\r\n ")
        start = raw.find("<?xml")
        if start == -1:
            start = raw.find("<hierarchy")
        end = raw.rfind("</hierarchy>")
        if (exported.returncode == 0 and fetched.returncode == 0
                and "ERROR:" not in exported.stdout + exported.stderr
                and start >= 0 and end >= start):
            try:
                root = ET.fromstring(raw[start:end + len("</hierarchy>")])
                nodes = list(root.iter("node"))
                # A native WebView container can precede its virtual children.
                # Returning that first tree makes every following locator race
                # WebView accessibility initialization on a cold launch.
                if any(is_visible_node(n) and (n.get("text") or n.get("content-desc"))
                       for n in nodes):
                    dest = os.getenv("DF13_EVIDENCE_DIR")
                    if dest:
                        Path(dest).mkdir(parents=True, exist_ok=True)
                        (Path(dest) / "LAST_UI.xml").write_text(ET.tostring(root, encoding="unicode"))
                    return nodes
                reason = "no_visible_accessibility_content"
            except ET.ParseError as exc:
                reason = "invalid_xml:" + str(exc)
        else:
            reason = "no_complete_hierarchy_xml"
        diagnostics.append({
            "attempt": attempt, "dump_exit": exported.returncode,
            "read_exit": fetched.returncode,
            "xml_length": len(raw), "reason": reason,
            "uiautomator_message": (exported.stdout + exported.stderr).strip()[:220]
        })
        time.sleep(attempt + 1)
    dest = os.getenv("DF13_EVIDENCE_DIR")
    if dest:
        Path(dest).mkdir(parents=True, exist_ok=True)
        (Path(dest) / "UIAUTOMATOR_PROBE.json").write_text(
            json.dumps(diagnostics, ensure_ascii=False, indent=2) + "\n")
    raise AssertionError("UIAutomator did not expose a complete accessibility hierarchy "
                         "after four attempts; probe evidence captured")

def persistent_dump():
    """Use the test-only instrumentation's long-lived real UIAutomation session."""
    diagnostics = []
    for attempt in range(4):
        with socket.create_connection(("127.0.0.1", int(os.environ["DF13_UI_PORT"])), timeout=45) as connection:
            connection.sendall(b"DUMP\n")
            with connection.makefile("rb") as stream:
                line = stream.readline(8 * 1024 * 1024)
        response = json.loads(line)
        if response.get("error"):
            raise AssertionError("Persistent UIAutomation: " + response["error"])
        raw = response["xml"]
        root = ET.fromstring(raw)
        dest = os.getenv("DF13_EVIDENCE_DIR")
        if dest:
            Path(dest).mkdir(parents=True, exist_ok=True)
            (Path(dest) / "LAST_UI.xml").write_text(raw)
        nodes = list(root.iter("node"))
        if any(is_visible_node(n) and (n.get("text") or n.get("content-desc")) for n in nodes):
            return nodes
        diagnostics.append({"attempt": attempt + 1, "node_count": len(nodes)})
        time.sleep(1)
    if dest:
        (Path(dest) / "UIAUTOMATOR_PROBE.json").write_text(json.dumps(diagnostics, indent=2) + "\n")
    raise AssertionError("Persistent UIAutomation exposed no visible content after four attempts")

def value(node):
    return " ".join(node.get(k, "") for k in ("text", "content-desc", "hint", "resource-id"))

def is_visible_node(node):
    match = BOUNDS.fullmatch(node.get("bounds", ""))
    if not match:
        return False
    x1, y1, x2, y2 = map(int, match.groups())
    return x2 > x1 and y2 > y1

def visible(nodes, needle):
    return next((n for n in nodes if needle.casefold() in value(n).casefold()
                 and is_visible_node(n)), None)

def iso_badge(nodes, code):
    return next((n for n in nodes if n.get("text", "").strip().upper() == code.upper()
                 and is_visible_node(n)), None)

def has_visible(nodes, needle):
    """Explicit presence: an ElementTree leaf is false-y despite being present."""
    return visible(nodes, needle) is not None


def has_iso_badge(nodes, code):
    """Do not coerce an empty native accessibility XML node to bool."""
    return iso_badge(nodes, code) is not None


def tap_node(node):
    if node is None:
        raise AssertionError("Visible actionable element not found")
    m = BOUNDS.fullmatch(node.get("bounds", ""))
    if not m:
        raise AssertionError("UI node has no tap bounds")
    x1, y1, x2, y2 = map(int, m.groups())
    if x2 <= x1 or y2 <= y1:
        raise AssertionError("Empty bounds")
    shell("input", "tap", (x1+x2)//2, (y1+y2)//2)
    time.sleep(0.65)

def click(label):
    tap_node(visible(dump(), label))

def node_class_contains(n, name):
    return name in n.get("class", "") and is_visible_node(n)

def text_input(index, value):
    nodes = dump()
    items = [n for n in nodes if node_class_contains(n, "EditText")
             or node_class_contains(n, "AutoCompleteTextView")]
    if index >= len(items):
        raise AssertionError("Editable field #%d not exposed in accessibility tree" % index)
    tap_node(items[index])
    shell("input", "text", value)
    time.sleep(0.5)

def restart():
    shell("am", "force-stop", PACKAGE)
    shell("am", "start", "-n", ACTIVITY)
    time.sleep(5)
    return dump()

def screenshot(out, name):
    path = out / (name + ".png")
    path.write_bytes(adb("exec-out", "screencap", "-p", binary=True, timeout=40))
    if path.stat().st_size < 3000:
        raise AssertionError("Screenshot too small")
    return str(path.name)

def language(name, iso):
    click("English" if iso != "en" else "English")
    text_input(0, name)
    matches = [n for n in dump() if name.casefold() in value(n).casefold()
               and "EditText" not in n.get("class", "")
               and n.get("clickable") == "true"]
    if not matches:
        raise AssertionError(name + " not exposed as a clickable Catalog row")
    tap_node(matches[-1])
    nodes = dump()
    if not has_iso_badge(nodes, iso):
        raise AssertionError("Language selected but exact ISO badge not visible: "+iso)
    return True

def record(results, name, fn, checkpoint=None):
    started = time.monotonic()
    try:
        detail = fn()
        results[name] = {"status":"PASS", "detail":detail}
    except Exception as error:
        results[name] = {"status":"FAIL", "error":str(error)}
        dest = os.getenv("DF13_EVIDENCE_DIR")
        if dest:
            try:
                screenshot(Path(dest), "failure_" + name)
                # Preserve the tree preceding the failing action, not a later case.
                last = Path(dest) / "LAST_UI.xml"
                if last.exists():
                    (Path(dest) / ("failure_" + name + ".xml")).write_bytes(last.read_bytes())
            except Exception:
                pass
    results[name]["duration_ms"] = int((time.monotonic() - started) * 1000)
    print("DF13_CASE", name, results[name]["status"], flush=True)
    if checkpoint is not None:
        checkpoint()
    return results[name]["status"] == "PASS"

def untested(results, name, reason):
    results[name] = {"status":"NOT_TESTED", "reason":reason}

def run(out, source_sha, api):
    out.mkdir(parents=True, exist_ok=True)
    results={}
    matrix=[]
    setup={}
    # Save partial evidence after every assertion and device case.
    def checkpoint():
        report = {
            "TASK_ID":"DF-LANE-13-REAL-END-TO-END-QA",
            "SOURCE_SHA":source_sha, "API":api, "test_results":results, "device_matrix":matrix,
            "summary":{status:sum(x["status"]==status for x in results.values())
                       for status in ("PASS","FAIL","NOT_TESTED")},
            "representative_locales_planned":[code for code,_ in LOCALES],
            "representative_locales_android_verified":[code for code,_ in LOCALES
                if results.get("locale_"+code,{}).get("status")=="PASS"],
            "CI_RUN_URL":os.getenv("GITHUB_SERVER_URL","https://github.com")+"/"+os.getenv("GITHUB_REPOSITORY","moaz76943-creator/zen-study-focus")+"/actions/runs/"+os.getenv("GITHUB_RUN_ID","UNKNOWN"),
            "note":"WebView assertions performed on Android. Boot screenshots do not prove RTL/visual correctness."
        }
        report["BLOCKERS"]=[key+": "+str(result.get("error",result.get("reason","")))
            for key,result in results.items() if result["status"]!="PASS"]
        tmp=out/"DEVICE_MATRIX.json.tmp"
        tmp.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n")
        os.replace(tmp,out/"DEVICE_MATRIX.json")
        return report
    checkpoint()
    try:
        shell("pm", "grant", PACKAGE, "android.permission.POST_NOTIFICATIONS") if api>=33 else None
        shell("wm", "density", "160")
        shell("wm", "size", "393x800")
        shell("settings", "put", "system", "font_scale", "1.0")
        shell("svc", "wifi", "disable")
        shell("svc", "data", "disable")
        shell("am", "force-stop", PACKAGE)
        setup["apk_info"] = adb("shell", "dumpsys", "package", PACKAGE)[-2500:]
        nodes=restart()
        # An installed APK and a running process do not alone prove a visible app.
        # Confirm the foreground MainActivity and capture a screenshot separately
        # from UIAutomator's ability to expose WebView text.
        activities = adb("shell", "dumpsys", "activity", "activities", timeout=35)
        resumed = [line for line in activities.splitlines()
                   if ("topResumedActivity" in line or "mResumedActivity" in line)
                   and PACKAGE in line and "MainActivity" in line]
        if not resumed:
            raise AssertionError("MainActivity is not the foreground resumed activity")
        shot = screenshot(out, "boot_api"+str(api))
        (out/"BOOT_UI_TREE.json").write_text(json.dumps({
            "node_count":len(nodes),
            "class_counts":{cl:sum(n.get("class") == cl for n in nodes)
                            for cl in sorted(set(n.get("class","") for n in nodes))},
            "nodes_with_text":sum(bool(n.get("text")) for n in nodes),
            "nodes_with_content_desc":sum(bool(n.get("content-desc")) for n in nodes),
            "heading_accessible":has_visible(nodes,"Deep Focus"),
            "screenshot":shot
        }, indent=2)+"\n")
        results["native_foreground_boot"]={"status":"PASS","detail":"Resumed MainActivity; screenshot captured; not proof of interactive WebView"}
        if not has_visible(nodes, "Deep Focus"):
            results["offline_fresh_boot"]={"status":"FAIL",
                "error":"Native app in foreground and screenshot captured, but WebView title not exposed to UIAutomator"}
        else:
            results["offline_fresh_boot"]={"status":"PASS",
                "detail":"Offline foreground activity and accessible Deep Focus heading"}
        checkpoint()
    except Exception as error:
        results["offline_fresh_boot"]={"status":"FAIL","error":str(error)}
        try:
            screenshot(out, "boot_failure_api" + str(api))
        except Exception:
            pass  # Never mask the original boot/accessibility failure.
        for k in ("navigation","timer_start_pause","task_create","note_create_restore",
                  "language_change","language_after_restart","offline_resume","quick_training",
                  "sounds","goals_analytics","cancel_confirm"):
            untested(results,k,"Blocked by Android boot/accessibility failure")
        for w in WIDTHS:
            matrix.append({"api":api,"width_px":w,"font_scale":1,"status":"NOT_TESTED"})
        checkpoint()
    else:
        def nav():
            # A navigation label is permanently visible; assert unique active-page content.
            cases=(
                ("Tasks",("Add study, workout or reading goal","Add study")),
                ("Calendar",("Add Note to Date",)),
                ("Notes",("New note",)),
                ("Timer",("Start or pause timer",)),
                ("Nature",("Pure Nature Studio Ready","Water & Rain")),
                ("Analytics",("Active Minutes",)),
            )
            for name, markers in cases:
                click(name)
                nodes=dump()
                if not any(has_visible(nodes,marker) for marker in markers):
                    raise AssertionError("Tapped "+name+" but target page content was not exposed: "+str(markers))
            click("Timer")
            return "Six Android taps plus unique visible content checks for each active section"
        record(results,"navigation",nav,checkpoint)

        def timer():
            before=dump()
            if visible(before,"Start or pause timer") is None:
                raise AssertionError("Timer button not accessible")
            tap_node(visible(before,"Start or pause timer"))
            time.sleep(3)
            after=dump()
            before_digits={n.get("text") for n in before if re.fullmatch(r"\d\d:\d\d",n.get("text",""))}
            after_digits={n.get("text") for n in after if re.fullmatch(r"\d\d:\d\d",n.get("text",""))}
            if not before_digits or before_digits == after_digits:
                raise AssertionError("Countdown state change not observable after Start")
            tap_node(visible(after,"Start or pause timer"))
            return "Countdown changed and Pause button tapped; Reset/confirmation separately gated"
        record(results,"timer_start_pause",timer,checkpoint)

        def task():
            click("Tasks")
            text_input(0,"DF13_TASK_123")
            shell("input","keyevent","66") # Enter calls the original createNewTask handler
            time.sleep(1)
            if not has_visible(dump(),"DF13_TASK_123"):
                raise AssertionError("New task absent after Enter/save")
            return "Saved task displayed in original Android WebView"
        record(results,"task_create",task,checkpoint)

        def note():
            click("Notes")
            click("New note")
            text_input(0,"DF13_NOTE_123")
            text_input(1,"DF13_BODY_123")
            click("Save")
            if not has_visible(dump(),"DF13_NOTE_123"):
                raise AssertionError("Saved note not present")
            restart()
            click("Notes")
            if not has_visible(dump(),"DF13_NOTE_123"):
                raise AssertionError("Saved note disappeared on restart")
            return "Note persisted through process restart"
        record(results,"note_create_restore",note,checkpoint)

        def switch():
            click("Timer")
            language("Arabic","ar")
            return "Arabic picker item selected; native-visible ISO AR"
        record(results,"language_change",switch,checkpoint)

        def lang_restart():
            nodes=restart()
            if not has_iso_badge(nodes,"AR"):
                raise AssertionError("Arabic locale did not persist after restart")
            return "Arabic ISO label survived process restart"
        record(results,"language_after_restart",lang_restart,checkpoint)

        def offline_resume():
            nodes=restart()
            if not has_visible(nodes,"Deep Focus"):
                raise AssertionError("App unavailable offline after fresh start")
            return "No Wi-Fi or mobile-data services during fresh restart"
        record(results,"offline_resume",offline_resume,checkpoint)

        # One freshly cleared emulator data store per locale. Localized UI is checked
        # on Android, not inferred from dictionary coverage. Each entry reports itself.
        for code, english_name in LOCALES:
            def verify_locale(code=code, english_name=english_name):
                shell("pm", "clear", PACKAGE)  # isolated test data only
                if api >= 33:
                    shell("pm", "grant", PACKAGE, "android.permission.POST_NOTIFICATIONS")
                initial = restart()
                if not has_visible(initial, "English"):
                    raise AssertionError("English locale chooser not visible on fresh app")
                if code != "en":
                    language(english_name, code)
                after = restart()
                if not has_iso_badge(after, code):
                    raise AssertionError(code + " did not persist on Android restart")
                screenshot(out, "locale_" + code + "_api" + str(api))
                return code + " selected and persisted through native process restart"
            record(results, "locale_" + code, verify_locale, checkpoint)

        # Native UIAutomator cannot expose HTML direction/layout CSS; record screenshots,
        # leave visual layout acceptance as NOT_TESTED until an image/layout comparator exists.
        for w in WIDTHS:
            for scale in (1.0,2.0):
                item={"api":api,"width_px":w,"font_scale":scale}
                try:
                    shell("wm","size",f"{w}x800")
                    shell("settings","put","system","font_scale",str(scale))
                    nodes=restart()
                    if not has_visible(nodes,"Deep Focus"):
                        raise AssertionError("App no longer exposes title")
                    item.update({"status":"PASS","meaning":"boot/visible title only",
                                 "screenshot":screenshot(out,f"api{api}_w{w}_font{scale}")})
                except Exception as error:
                    item.update({"status":"FAIL","error":str(error)})
                matrix.append(item)
                checkpoint()
        untested(results,"rtl_ltr_visual","Screenshots attached; no automated pixel/layout-direction assertion")
        untested(results,"quick_training","Requires per-state work/rest and cancel semantics assertions")
        untested(results,"sounds","Requires audio output/volume assertions, not just controls")
        untested(results,"goals_analytics","Requires persisted real sessions and minutes validation")
        untested(results,"cancel_confirm","Requires verifying state unchanged after Cancel")
        untested(results,"html_injection","Requires input + rendered DOM safety assertion; UI hierarchy alone is insufficient")
        untested(results,"large_data_performance","No authorized 10k-session fixture injected into production WebView")
        untested(results,"talkback","TalkBack spoken accessibility output requires assistive-tech/device QA")
        untested(results,"99_android_locales","7 representative languages planned; never equate to all 99")
        untested(results,"timer_reset","Requires destructive-confirmation consent outcome assertion")
        untested(results,"network_loss_recovery","Offline boot tested; live connection transitions not exercised")

    report=checkpoint()
    print(json.dumps({"API":api,"SOURCE_SHA":source_sha,"summary":report["summary"],
                      "report":str(out/"DEVICE_MATRIX.json")}),flush=True)
    return int(any(x["status"]=="FAIL" for x in results.values()) or
               any(x["status"]=="FAIL" for x in matrix))

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--output",required=True,type=Path)
    p.add_argument("--sha",required=True)
    p.add_argument("--api",type=int,required=True)
    args=p.parse_args()
    try: return run(args.output,args.sha,args.api)
    finally:
        for cmd in (("wm","size","reset"),("wm","density","reset"),
                    ("settings","put","system","font_scale","1.0"),
                    ("svc","wifi","enable"),("svc","data","enable")):
            try: shell(*cmd)
            except Exception: pass

if __name__=="__main__":
    sys.exit(main())
