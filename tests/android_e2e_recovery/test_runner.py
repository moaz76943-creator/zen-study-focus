"""Offline helper tests only. Passing does NOT count as Android E2E."""
import importlib.util
from pathlib import Path
import unittest

path = Path(__file__).with_name("run_e2e.py")
spec = importlib.util.spec_from_file_location("df14", path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

XML = """<?xml version='1.0'?><hierarchy><node class='android.webkit.WebView'
bounds='[0,0][400,900]' text=''><node text='New note'
content-desc='Create a note' bounds='[10,20][200,80]' clickable='true'/></node></hierarchy>"""

class ParserTests(unittest.TestCase):
    def test_accessibility_tree(self):
        nodes = mod.parse_nodes(XML)
        self.assertEqual(len(nodes), 2)
        found = mod.locate(nodes, ["Create a note"])
        self.assertEqual(mod.mid(found), (105, 50))

    def test_missing_node_is_not_a_pass(self):
        self.assertIsNone(mod.locate(mod.parse_nodes(XML), ["Save"]))
        with self.assertRaises(mod.CheckFailed):
            mod.mid({"bounds": "[0,0][0,0]"})

    def test_western_numeral_rule(self):
        self.assertFalse(mod.BANNED_DIGITS.search("25:00 2026 100%"))
        self.assertTrue(mod.BANNED_DIGITS.search("٢٥:۰۰"))

    def test_uiautomator_process_failure_is_unverified_environment_not_app_fail(self):
        device = mod.Device("emulator-test")
        device.shell = lambda *args, **kwargs: (_ for _ in ()).throw(
            mod.CheckFailed("ADB command failed (shell uiautomator dump): "))
        with self.assertRaises(mod.NotTested):
            device.dump()

    def test_hierarchy_failure_blocks_followup_without_fabricated_failures(self):
        from types import SimpleNamespace
        class Unavailable:
            def shell(self, *args, **kwargs): return "package:com.zenstudy.focus"
            def launch(self): pass
            def dump(self): raise mod.NotTested("UIAutomator hierarchy unavailable in emulator")
        suite = mod.Suite(Unavailable(), SimpleNamespace(
            ack_disposable_data=True, run_slow=True, allow_rotation=True))
        suite.test("preflight", "read")
        suite.test("navigation", "read")
        suite.test("notes_create_edit", "write")
        self.assertEqual([r["status"] for r in suite.records],
                         ["NOT_TESTED","NOT_TESTED","NOT_TESTED"])
        self.assertTrue(all("UIAutomator" in r["detail"] for r in suite.records))

    def test_observed_app_assertion_failure_remains_fail(self):
        from types import SimpleNamespace
        suite = mod.Suite(object(), SimpleNamespace(
            ack_disposable_data=True, run_slow=True, allow_rotation=True))
        suite.case_preflight = lambda: None
        suite.case_navigation = lambda: (_ for _ in ()).throw(
            mod.CheckFailed("Control not exposed/visible: Tasks"))
        suite.test("preflight", "read")
        suite.test("navigation", "read")
        self.assertEqual([r["status"] for r in suite.records], ["PASS", "FAIL"])

    def test_permission_prompt_requires_disposable_ack_and_app_ui_proof(self):
        from types import SimpleNamespace
        class Device:
            def __init__(self): self.tapped = False; self.proved = False
            def shell(self, *args, **kwargs): return "package:com.zenstudy.focus"
            def launch(self): pass
            def dump(self):
                button = {"resource-id":"com.android.permissioncontroller:id/permission_allow_button",
                          "bounds":"[0,0][100,100]"}
                return [button] + [{"text":"permission context"}] * 4
            def tap(self, *args): self.tapped = True
            def see(self, *args):
                self.proved = True
                if not self.tapped: raise mod.CheckFailed("App UI is still behind permission prompt")
        d = Device()
        args = SimpleNamespace(ack_disposable_data=False, run_slow=True, allow_rotation=True)
        suite = mod.Suite(d, args); suite.test("preflight", "read")
        self.assertEqual(suite.records[0]["status"], "NOT_TESTED")
        self.assertFalse(d.tapped)
        args.ack_disposable_data = True
        suite = mod.Suite(d, args); suite.test("preflight", "read")
        self.assertEqual(suite.records[0]["status"], "PASS")
        self.assertTrue(d.tapped and d.proved)

    def test_cases_are_unique_and_restricted_paths_explicit(self):
        ids=[x[0] for x in mod.CASES]
        self.assertEqual(len(ids),len(set(ids)))
        self.assertEqual(len(ids),20)
        self.assertEqual(dict(mod.CASES)["talkback"],"manual")
        self.assertEqual(dict(mod.CASES)["save_failure"],"manual")
        self.assertEqual(dict(mod.CASES)["task_subtasks"],"write")

if __name__=="__main__":
    unittest.main()
