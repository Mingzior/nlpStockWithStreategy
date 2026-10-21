#!/usr/bin/env python3
"""Deterministic monitor over the committed, verified financial snapshot.

No price prediction, no notifications, no synthetic fallback. Rule changes and
snapshot changes are separately recorded. Results are not a backtest.
"""
import datetime as dt
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SNAPSHOT = ROOT / "code/site/data/stocks.json"
CONFIG = ROOT / "monitor/strategies.json"
HISTORY = ROOT / "code/site/data/monitor-history.json"
METRICS = {"revenue_growth", "net_profit_growth", "roe", "gross_margin", "pe", "pb", "debt_ratio", "volatility_60d", "max_drawdown_1y"}
OPS = {"<", "<=", ">", ">=", "between"}

def validate_rules(rules):
    if not isinstance(rules, list) or not 1 <= len(rules) <= 12:
        raise ValueError("rules must contain 1-12 entries")
    for r in rules:
        if not isinstance(r, dict) or r.get("metric") not in METRICS or r.get("op") not in OPS:
            raise ValueError("invalid rule metric/operator")
        values = [r.get("value")] + ([r.get("value2")] if r["op"] == "between" else [])
        if not all(type(v) in (int, float) and math.isfinite(v) for v in values):
            raise ValueError("non-finite or missing rule value")
        if r["op"] == "between" and r["value"] > r["value2"]:
            raise ValueError("inverted range")
    for metric in {r["metric"] for r in rules}:
        subset = [r for r in rules if r["metric"] == metric]
        lo, hi = -math.inf, math.inf
        for r in subset:
            if r["op"] == "between": lo, hi = max(lo, r["value"]), min(hi, r["value2"])
            if r["op"] in (">", ">="): lo = max(lo, r["value"])
            if r["op"] in ("<", "<="): hi = min(hi, r["value"])
        if lo > hi or (lo == hi and any(r["op"] in ("<", ">") for r in subset)):
            raise ValueError("conflicting constraints for " + metric)

def check(value, rule):
    if value is None or type(value) not in (int, float) or not math.isfinite(value):
        return "missing"
    op, v = rule["op"], rule["value"]
    passed = {"<": lambda: value < v, "<=": lambda: value <= v,
              ">": lambda: value > v, ">=": lambda: value >= v,
              "between": lambda: v <= value <= rule["value2"]}[op]()
    return "pass" if passed else "fail"

def evaluate(stocks, rules):
    result = {}
    for stock in stocks:
        checks = [{"metric": r["metric"], "op": r["op"], "threshold": r["value"],
                   "value": stock["metrics"].get(r["metric"]),
                   "result": check(stock["metrics"].get(r["metric"]), r)} for r in rules]
        outcomes = [c["result"] for c in checks]
        result[stock["code"]] = {"name": stock["name"],
            "status": "excluded" if "fail" in outcomes else "unknown" if "missing" in outcomes else "included",
            "checks": checks}
    return result

def run(snapshot, config, previous):
    if snapshot.get("mode") != "real" or not isinstance(snapshot.get("stocks"), list) or not snapshot["stocks"]:
        raise ValueError("verified real snapshot required")
    if not isinstance(config.get("strategies"), list):
        raise ValueError("invalid strategy configuration")
    old = {s["id"]: s for s in previous.get("strategies", [])}
    reports = []
    for item in config["strategies"]:
        if not item.get("enabled", False): continue
        sid = item.get("id")
        if not isinstance(sid, str) or not sid.strip(): raise ValueError("strategy id required")
        rules = item.get("rules")
        validate_rules(rules)
        results = evaluate(snapshot["stocks"], rules)
        old_item = old.get(sid, {})
        comparable = old_item.get("rules") == rules
        old_results = old_item.get("results", {}) if comparable else {}
        changes = [{"code": code, "name": record["name"],
                    "before": old_results[code]["status"], "after": record["status"]}
                   for code, record in results.items()
                   if code in old_results and old_results[code]["status"] != record["status"]]
        reports.append({"id": sid, "name": item.get("name", sid), "rules": [dict(r) for r in rules],
                        "results": results, "changes": changes,
                        "baseline": "comparable" if comparable else "new_or_rules_changed"})
    return {"schemaVersion": 1, "source": snapshot.get("provider"),
            "sourceFetchedAt": snapshot.get("fetchedAt"), "sourceAsOf": snapshot.get("asOf"),
            "checkedAt": dt.datetime.now(dt.timezone.utc).isoformat(),
            "snapshotUrl": "https://github.com/Mingzior/nlpStockWithStreategy/blob/main/code/site/data/stocks.json",
            "strategies": reports, "notice": "状态变化不是收益回测或买卖建议；仅监控仓库中已启用策略"}

def main():
    snapshot = json.loads(SNAPSHOT.read_text(encoding="utf-8"))
    config = json.loads(CONFIG.read_text(encoding="utf-8"))
    previous = json.loads(HISTORY.read_text(encoding="utf-8")) if HISTORY.exists() else {}
    report = run(snapshot, config, previous)
    HISTORY.parent.mkdir(parents=True, exist_ok=True)
    HISTORY.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Monitored strategies:", len(report["strategies"]))
    for strategy in report["strategies"]:
        print(strategy["id"], "changes:", len(strategy["changes"]), "baseline:", strategy["baseline"])

if __name__ == "__main__": main()
