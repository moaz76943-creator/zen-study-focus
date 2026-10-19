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

    def test_cases_are_unique_and_restricted_paths_explicit(self):
        ids=[x[0] for x in mod.CASES]
        self.assertEqual(len(ids),len(set(ids)))
        self.assertEqual(len(ids),20)
        self.assertEqual(dict(mod.CASES)["talkback"],"manual")
        self.assertEqual(dict(mod.CASES)["save_failure"],"manual")
        self.assertEqual(dict(mod.CASES)["task_subtasks"],"write")

if __name__=="__main__":
    unittest.main()
