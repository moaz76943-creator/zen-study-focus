#!/usr/bin/env python3
"""Local-only Playwright smoke. Synthetic browser context: no personal profile."""
import functools
import http.server
import pathlib
import re
import sys
import threading
from urllib.parse import urlparse


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, _format, *_args):
        pass


def exercise(webroot):
    from playwright.sync_api import sync_playwright

    handler = functools.partial(QuietHandler, directory=str(webroot))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = "http://127.0.0.1:" + str(server.server_port)
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(args=["--disable-background-networking"])
            try:
                context = browser.new_context(locale="en-US", service_workers="block")
                def restrict(route):
                    url = urlparse(route.request.url)
                    if url.scheme == "http" and url.hostname == "127.0.0.1" and url.port == server.server_port:
                        route.continue_()
                    else:
                        route.abort("blockedbyclient")
                context.route("**/*", restrict)
                page = context.new_page()
                exceptions = []
                page.on("pageerror", lambda error: exceptions.append(type(error).__name__))
                response = page.goto(base + "/index.html", wait_until="domcontentloaded", timeout=30000)
                assert response is not None and response.status == 200, "main HTML unavailable"
                page.locator("#timerDigitsTxt").wait_for(state="visible", timeout=15000)
                page.locator("#mainPlayBtn").wait_for(state="visible", timeout=15000)
                assert re.fullmatch(r"\d{1,3}:\d{2}", page.locator("#timerDigitsTxt").inner_text().strip()), "timer is not an ASCII duration"
                page.locator("#homeQuick10").click(timeout=10000)
                page.wait_for_function("document.getElementById('timerDigitsTxt').textContent.trim() === '10:00'", timeout=10000)
                page.locator("#homeQuick25").click(timeout=10000)
                page.wait_for_function("document.getElementById('timerDigitsTxt').textContent.trim() === '25:00'", timeout=10000)
                page.locator("#domBtn-sport").click(timeout=10000)
                assert page.locator("#domBtn-sport").get_attribute("aria-pressed") == "true", "sport mode not selected"
                page.locator("#domBtn-study").click(timeout=10000)
                assert page.locator("#domBtn-study").get_attribute("aria-pressed") == "true", "study mode not restored"
                assert not exceptions, "uncaught browser exceptions: " + ", ".join(exceptions[:3])
                context.close()
            finally:
                browser.close()
    finally:
        server.shutdown()
        thread.join(timeout=3)
        server.server_close()


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: browser_smoke.py <webroot>")
    root = pathlib.Path(sys.argv[1]).resolve()
    if not (root / "index.html").is_file():
        raise SystemExit("NOT_TESTED: missing web index.html")
    try:
        exercise(root)
    except Exception as error:
        print("FAIL: isolated Chromium checks did not pass: " + type(error).__name__ + " " + str(error)[:180])
        raise SystemExit(1)
    print("PASS: real local Chromium UI smoke; Android and release remain NOT_TESTED.")
