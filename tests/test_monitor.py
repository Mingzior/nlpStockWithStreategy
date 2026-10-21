import importlib.util
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
def load(name,path):
    spec=importlib.util.spec_from_file_location(name,ROOT/path)
    module=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module
monitor=load("monitor","scripts/run_monitor.py")
ifind=load("ifind","scripts/validate_ifind_observations.py")

class MonitorTests(unittest.TestCase):
    def setUp(self):
        self.snapshot={"mode":"real","provider":"Fuyao","fetchedAt":"2026-10-21T00:00:00Z","stocks":[
            {"code":"600519.SH","name":"贵州茅台","metrics":{"pe":21,"roe":None}},
            {"code":"000333.SZ","name":"美的集团","metrics":{"pe":10,"roe":None}}]}
        self.config={"strategies":[{"id":"test","enabled":True,"rules":[{"metric":"pe","op":"<=","value":20}]}]}

    def test_main_flow_and_state_changes(self):
        first=monitor.run(self.snapshot,self.config,{})
        self.assertEqual(first["strategies"][0]["results"]["600519.SH"]["status"],"excluded")
        self.assertEqual(first["strategies"][0]["results"]["000333.SZ"]["status"],"included")
        self.assertEqual(first["strategies"][0]["changes"],[])
        self.snapshot["stocks"][0]["metrics"]["pe"]=19
        second=monitor.run(self.snapshot,self.config,first)
        self.assertEqual(len(second["strategies"][0]["changes"]),1)
        self.assertEqual(second["strategies"][0]["changes"][0]["after"],"included")

    def test_rule_change_resets_comparison(self):
        first=monitor.run(self.snapshot,self.config,{})
        self.config["strategies"][0]["rules"][0]["value"]=30
        second=monitor.run(self.snapshot,self.config,first)
        self.assertEqual(second["strategies"][0]["changes"],[])
        self.assertEqual(second["strategies"][0]["baseline"],"new_or_rules_changed")

    def test_missing_unknown_and_fail_priority(self):
        rules=[{"metric":"pe","op":"<=","value":20},{"metric":"roe","op":">=","value":10}]
        result=monitor.evaluate(self.snapshot["stocks"],rules)
        self.assertEqual(result["600519.SH"]["status"],"excluded")
        self.assertEqual(result["000333.SZ"]["status"],"unknown")

    def test_invalid_and_conflicting_rules(self):
        for rules in ([{"metric":"pe","op":"<=","value":float("nan")}],
                      [{"metric":"pe","op":"<=","value":10},{"metric":"pe","op":">=","value":30}],
                      [{"metric":"pe","op":"between","value":30,"value2":10}]):
            with self.assertRaises(ValueError): monitor.validate_rules(rules)

    def test_bad_snapshot_fails_closed(self):
        with self.assertRaises(ValueError): monitor.run({"mode":"synthetic","stocks":[{}]},self.config,{})

class IFindValidationTests(unittest.TestCase):
    def setUp(self):
        self.record={"code":"600519.SH","metric":"roe","value":15.0,"unit":"%",
                     "periodEnd":"2026-06-30","periodType":"semiannual","sourceField":"ROE",
                     "sourceUrl":"https://example.org/original-record","provider":"iFinD",
                     "retrievedAt":"2026-10-21T00:00:00Z"}

    def test_complete_structured_record(self):
        self.assertEqual(len(ifind.validate([self.record])),1)

    def test_missing_source_or_period_rejected(self):
        for field in ("sourceUrl","periodEnd","unit","value"):
            candidate=dict(self.record);candidate.pop(field)
            with self.assertRaises(ValueError): ifind.validate([candidate])

    def test_freeform_answer_and_fraction_not_silently_accepted(self):
        with self.assertRaises(ValueError): ifind.validate([{"answer":"ROE约15%"}])
        candidate=dict(self.record);candidate["unit"]="fraction"
        with self.assertRaises(ValueError): ifind.validate([candidate])

if __name__=="__main__":unittest.main()
