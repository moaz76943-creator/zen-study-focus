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
    adb("shell", "uiautomator", "dump", "/sdcard/df13-ui.xml", timeout=45)
    xml = adb("exec-out", "cat", "/sdcard/df13-ui.xml")
    if not xml.lstrip().startswith("<?xml"):
        raise AssertionError("UIAutomator dump missing XML; Android view not inspected")
    return list(ET.fromstring(xml).iter("node"))

def value(node):
    return " ".join(node.get(k, "") for k in ("text", "content-desc", "hint", "resource-id"))

def visible(nodes, needle):
    return next((n for n in nodes if needle.casefold() in value(n).casefold()
                 and n.get("bounds")), None)

def iso_badge(nodes, code):
    return next((n for n in nodes if n.get("text", "").strip().upper() == code.upper()
                 and n.get("bounds")), None)

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
    return name in n.get("class", "") and n.get("bounds")

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
    if not iso_badge(nodes, iso):
        raise AssertionError("Language selected but exact ISO badge not visible: "+iso)
    return True

def record(results, name, fn):
    try:
        detail = fn()
        results[name] = {"status":"PASS", "detail":detail}
    except Exception as error:
        results[name] = {"status":"FAIL", "error":str(error)}
    return results[name]["status"] == "PASS"

def untested(results, name, reason):
    results[name] = {"status":"NOT_TESTED", "reason":reason}

def run(out, source_sha, api):
    out.mkdir(parents=True, exist_ok=True)
    results={}
    matrix=[]
    setup={}
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
        if not visible(nodes, "Deep Focus"):
            raise AssertionError("Deep Focus heading not exposed or app failed to boot")
        screenshot(out, "boot_api"+str(api))
        results["offline_fresh_boot"]={"status":"PASS"}
    except Exception as error:
        results["offline_fresh_boot"]={"status":"FAIL","error":str(error)}
        for k in ("navigation","timer_start_pause","task_create","note_create_restore",
                  "language_change","language_after_restart","offline_resume","quick_training",
                  "sounds","goals_analytics","cancel_confirm"):
            untested(results,k,"Blocked by Android boot/accessibility failure")
        for w in WIDTHS:
            matrix.append({"api":api,"width_px":w,"font_scale":1,"status":"NOT_TESTED"})
    else:
        def nav():
            for name in ("Tasks", "Calendar", "Notes", "Timer", "Nature", "Analytics"):
                click(name)
                if not visible(dump(),name):
                    raise AssertionError("Navigation label disappeared: "+name)
            click("Timer")
            return "6 real Android bottom-navigation taps"
        record(results,"navigation",nav)

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
        record(results,"timer_start_pause",timer)

        def task():
            click("Tasks")
            text_input(0,"DF13_TASK_123")
            shell("input","keyevent","66") # Enter calls the original createNewTask handler
            time.sleep(1)
            if not visible(dump(),"DF13_TASK_123"):
                raise AssertionError("New task absent after Enter/save")
            return "Saved task displayed in original Android WebView"
        record(results,"task_create",task)

        def note():
            click("Notes")
            click("New note")
            text_input(0,"DF13_NOTE_123")
            text_input(1,"DF13_BODY_123")
            click("Save")
            if not visible(dump(),"DF13_NOTE_123"):
                raise AssertionError("Saved note not present")
            restart()
            click("Notes")
            if not visible(dump(),"DF13_NOTE_123"):
                raise AssertionError("Saved note disappeared on restart")
            return "Note persisted through process restart"
        record(results,"note_create_restore",note)

        def switch():
            click("Timer")
            language("Arabic","ar")
            return "Arabic picker item selected; native-visible ISO AR"
        record(results,"language_change",switch)

        def lang_restart():
            nodes=restart()
            if not iso_badge(nodes,"AR"):
                raise AssertionError("Arabic locale did not persist after restart")
            return "Arabic ISO label survived process restart"
        record(results,"language_after_restart",lang_restart)

        def offline_resume():
            nodes=restart()
            if not visible(nodes,"Deep Focus"):
                raise AssertionError("App unavailable offline after fresh start")
            return "No Wi-Fi or mobile-data services during fresh restart"
        record(results,"offline_resume",offline_resume)

        # One freshly cleared emulator data store per locale. Localized UI is checked
        # on Android, not inferred from dictionary coverage. Each entry reports itself.
        for code, english_name in LOCALES:
            def verify_locale(code=code, english_name=english_name):
                shell("pm", "clear", PACKAGE)  # isolated test data only
                if api >= 33:
                    shell("pm", "grant", PACKAGE, "android.permission.POST_NOTIFICATIONS")
                initial = restart()
                if not visible(initial, "English"):
                    raise AssertionError("English locale chooser not visible on fresh app")
                if code != "en":
                    language(english_name, code)
                after = restart()
                if not iso_badge(after, code):
                    raise AssertionError(code + " did not persist on Android restart")
                screenshot(out, "locale_" + code + "_api" + str(api))
                return code + " selected and persisted through native process restart"
            record(results, "locale_" + code, verify_locale)

        # Native UIAutomator cannot expose HTML direction/layout CSS; record screenshots,
        # leave visual layout acceptance as NOT_TESTED until an image/layout comparator exists.
        for w in WIDTHS:
            for scale in (1.0,2.0):
                item={"api":api,"width_px":w,"font_scale":scale}
                try:
                    shell("wm","size",f"{w}x800")
                    shell("settings","put","system","font_scale",str(scale))
                    nodes=restart()
                    if not visible(nodes,"Deep Focus"):
                        raise AssertionError("App no longer exposes title")
                    item.update({"status":"PASS","meaning":"boot/visible title only",
                                 "screenshot":screenshot(out,f"api{api}_w{w}_font{scale}")})
                except Exception as error:
                    item.update({"status":"FAIL","error":str(error)})
                matrix.append(item)
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

    # Each Android axis builds one new APK. 'matrix PASS' means title visible only.
    report={"TASK_ID":"DF-LANE-13-REAL-END-TO-END-QA","SOURCE_SHA":source_sha,
            "API":api,"test_results":results,"device_matrix":matrix,
            "representative_locales_planned":[code for code,_ in LOCALES],
            "representative_locales_android_verified":[code for code,_ in LOCALES if results.get("locale_"+code,{}).get("status")=="PASS"],
            "note":"UIAutomator assertions reflect actual installed Android WebView, not Node or simulated DOM.",
            "CI_RUN_URL":os.getenv("GITHUB_SERVER_URL","https://github.com")+"/"+os.getenv("GITHUB_REPOSITORY","moaz76943-creator/zen-study-focus")+"/actions/runs/"+os.getenv("GITHUB_RUN_ID","UNKNOWN")}
    report["BLOCKERS"]=[key+": "+str(x.get("error",x.get("reason",""))) for key,x in results.items() if x["status"]!="PASS"]
    (out/"DEVICE_MATRIX.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n")
    print(json.dumps({"API":api,"SOURCE_SHA":source_sha,"summary":{
        status:sum(x["status"]==status for x in results.values())
        for status in ("PASS","FAIL","NOT_TESTED")},"report":str(out/"DEVICE_MATRIX.json")}))
    return 1 if any(x["status"]=="FAIL" for x in results.values()) or any(x["status"]=="FAIL" for x in matrix) else 0

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
