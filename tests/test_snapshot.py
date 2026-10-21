import importlib.util
import json
import pathlib
import unittest
from unittest.mock import patch
from urllib.error import HTTPError

ROOT = pathlib.Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("snapshot", ROOT / "scripts/fetch_fuyao_snapshot.py")
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


class SnapshotTests(unittest.TestCase):
    def setUp(self):
        self.valuations = {"timestamp": 1792575638000, "item": [
            {"thscode": "600519.SH", "name": "测试股票", "pe_ttm": 20.5, "pb_mrq": 3.1},
            {"thscode": "000858.SZ", "name": "缺失指标", "pe_ttm": None, "pb_mrq": 1.5}]}
        self.prices = {"item": [{"thscode": "600519.SH", "name": "测试股票"}]}

    def test_main_flow_preserves_original_values_and_evidence(self):
        result = mod.build_snapshot(self.valuations, self.prices)
        self.assertEqual(result["mode"], "real")
        self.assertEqual(len(result["stocks"]), 2)
        first = result["stocks"][0]
        self.assertEqual(first["metrics"]["pe"], 20.5)
        self.assertEqual(first["sourceRecord"]["pe_ttm"], 20.5)
        self.assertEqual(first["sourceRecord"]["thscode"], first["code"])
        self.assertEqual(first["metrics"]["roe"], None)
        self.assertIn("fuyao.aicubes.cn", result["sourceDocsUrl"])

    def test_missing_and_bad_numeric_values_are_not_fabricated(self):
        self.valuations["item"][0]["pe_ttm"] = "20.5"
        self.valuations["item"][0]["pb_mrq"] = float("nan")
        result = mod.build_snapshot(self.valuations, self.prices)
        self.assertEqual(len(result["stocks"]), 1)
        self.assertIsNone(result["stocks"][0]["metrics"]["pe"])

    def test_invalid_universe_fails_closed(self):
        self.valuations["item"] = [{"thscode": "NOT_REAL", "pe_ttm": 20}]
        with self.assertRaisesRegex(ValueError, "No verified"):
            mod.build_snapshot(self.valuations, self.prices)

    def test_no_key_does_not_call_provider(self):
        with patch.dict("os.environ", {"FUYAO_API_KEY": ""}):
            with patch.object(mod, "request") as request:
                with self.assertRaises(SystemExit):
                    mod.main()
                request.assert_not_called()

    def test_api_error_envelope_rejected(self):
        class FakeResponse:
            def __enter__(self): return self
            def __exit__(self, *args): pass
            def read(self, *args): return b'{"code":403,"message":"unauthorized","data":{"item":[]}}'
        with patch.object(mod, "urlopen", return_value=FakeResponse()):
            with self.assertRaisesRegex(ValueError, "response envelope invalid"):
                mod.request("valuations", "not-a-real-key")

    def test_catalog_all_entries_are_valid_and_confirmable(self):
        catalog = json.loads((ROOT / "code/site/data/query-catalog.json").read_text())
        self.assertGreaterEqual(len(catalog["items"]), 200)
        self.assertEqual(len({x["id"] for x in catalog["items"]}), len(catalog["items"]))
        self.assertEqual(len({x["query"] for x in catalog["items"]}), len(catalog["items"]))
        for item in catalog["items"]:
            self.assertTrue(item["needsConfirmation"])
            for rule in item["rules"]:
                self.assertIn(rule["metric"], mod.METRICS)
                self.assertIn(rule["op"], (">", ">=", "<", "<=", "between"))
                self.assertIsInstance(rule["value"], (int, float))

    def test_public_snapshot_has_no_fake_codes(self):
        path = ROOT / "code/site/data/stocks.json"
        if not path.exists():
            self.skipTest("No published snapshot yet")
        data = json.loads(path.read_text())
        self.assertEqual(data["mode"], "real")
        for stock in data["stocks"]:
            self.assertNotIn("SYN-", stock["code"])
            for key in mod.METRICS:
                self.assertIn(key, stock["metrics"])


if __name__ == "__main__":
    unittest.main()
