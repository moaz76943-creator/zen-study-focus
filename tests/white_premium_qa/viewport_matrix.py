#!/usr/bin/env python3
"""Optional browser geometry QA. Needs: python -m pip install playwright; playwright install chromium.
Run from repository root: python3 tests/white_premium_qa/viewport_matrix.py
This is Chromium emulation, NOT Android WebView/TalkBack/device evidence.
"""
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[2]
WEB = ROOT / "android/app/src/main/assets/web"
CSS = WEB / "design_recovery/white_premium_recovery10.css"
WIDTHS = (320, 360, 393, 430)
DIRECTIONS = ("ltr", "rtl")
SCALES = (1.0, 1.5, 2.0)


def run():
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("NOT_TESTED: install Playwright + Chromium to execute geometry QA", file=sys.stderr)
        return 2
    if not CSS.exists():
        print("FAIL: recovery stylesheet missing", file=sys.stderr)
        return 1
    failures = []
    count = 0
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, args=["--no-sandbox"])
            try:
                for width in WIDTHS:
                    for direction in DIRECTIONS:
                        for scale in SCALES:
                            page = browser.new_page(viewport={"width": width, "height": 780}, device_scale_factor=1)
                            try:
                                page.goto((WEB / "index.html").as_uri(), wait_until="domcontentloaded", timeout=20000)
                                page.add_style_tag(path=str(CSS))
                                page.evaluate("""(args) => {
                                  document.body.classList.add('df-v22','df-recovery10','timer-home');
                                  document.body.classList.remove('deep-lockdown');
                                  document.documentElement.dir = args.direction;
                                  document.documentElement.style.fontSize = (16 * args.scale) + 'px';
                                }""", {"direction": direction, "scale": scale})
                                v = page.evaluate("""() => {
                                  const ids=['navTasks','navCalendar','navNotes','navTimer','navTraining','navSounds','navAnalytics'];
                                  const bounds=ids.map(id => {
                                    const el=document.getElementById(id), r=el?.getBoundingClientRect();
                                    return {id, x:r?.left, right:r?.right, w:r?.width, h:r?.height};
                                  });
                                  const nav=document.querySelector('.bottom-nav-capsule')?.getBoundingClientRect();
                                  const hero=document.getElementById('focusHeroCard')?.getBoundingClientRect();
                                  const notes=document.getElementById('navNotes');
                                  const tasks=document.getElementById('navTasks');
                                  return {
                                    scroll: document.documentElement.scrollWidth,
                                    viewport: innerWidth,
                                    bounds, nav: nav && {left:nav.left,right:nav.right},
                                    hero: hero && {left:hero.left,right:hero.right,width:hero.width},
                                    reachable: !!(notes?.onclick && tasks?.onclick),
                                    hidden: getComputedStyle(notes).display==='none' || getComputedStyle(tasks).display==='none'
                                  };
                                }""")
                                if not v["reachable"] or v["hidden"]:
                                    failures.append((width,direction,scale,"Notes/Tasks action missing or hidden"))
                                if v["scroll"] > width + 2:
                                    failures.append((width,direction,scale,f"horizontal page overflow: {v['scroll']}"))
                                if not v["nav"] or not v["hero"]:
                                    failures.append((width,direction,scale,"missing hero or nav"))
                                else:
                                    btns = v["bounds"]
                                    if any(b["x"] is None or b["w"] < 40 or b["h"] < 44 for b in btns):
                                        failures.append((width,direction,scale,"nav touch geometry too small"))
                                    timer = btns[3]
                                    center = (timer["x"] + timer["right"])/2
                                    nav_center = (v["nav"]["left"] + v["nav"]["right"])/2
                                    if abs(center - nav_center) > 4:
                                        failures.append((width,direction,scale,f"timer center offset: {center-nav_center:.1f}px"))
                                    training = btns[4]
                                    if abs((training["right"]-timer["x"]) if direction=="rtl" else (training["x"]-timer["right"])) > 5:
                                        failures.append((width,direction,scale,"training not adjacent to center timer"))
                                    if v["hero"]["left"] < -1 or v["hero"]["right"] > width+1:
                                        failures.append((width,direction,scale,"hero clipped"))
                                count += 1
                            finally:
                                page.close()
            finally:
                browser.close()
    except Exception as exc:
        print(f"NOT_TESTED: browser execution failed: {type(exc).__name__}: {exc}", file=sys.stderr)
        return 2
    for failure in failures:
        print("FAIL:", *failure)
    print(f"Viewport QA: {count} configurations (4 widths x 2 directions x 3 font scales); failures={len(failures)}")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(run())
