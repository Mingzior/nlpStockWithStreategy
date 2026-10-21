#!/usr/bin/env python3
"""Fetch a verifiable Fuyao valuation snapshot for static GitHub Pages.

Only documented/previously validated fields pe_ttm and pb_mrq are mapped.
Other metrics are null, never fabricated. Missing credentials fail closed.
"""
import datetime as dt
import json
import os
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

HOST = "https://fuyao.aicubes.cn"
CODES = ["600519.SH", "000858.SZ", "601318.SH", "600036.SH", "000333.SZ"]
METRICS = ("revenue_growth", "net_profit_growth", "roe", "gross_margin", "pe", "pb",
           "debt_ratio", "volatility_60d", "max_drawdown_1y")
OUTPUT = Path(__file__).resolve().parents[1] / "code/site/data/stocks.json"


def request(kind, key):
    path = {"valuations": "/api/a-share/valuations/snapshot",
            "prices": "/api/a-share/prices/snapshot"}[kind]
    url = HOST + path + "?" + urlencode({"thscodes": ",".join(CODES)})
    with urlopen(Request(url, headers={"X-api-key": key, "Accept": "application/json"}), timeout=25) as response:
        data = json.load(response)
    if data.get("code") != 0 or not isinstance(data.get("data", {}).get("item"), list):
        raise ValueError(f"Fuyao {kind} response envelope invalid (code={data.get('code')})")
    return data["data"]


def number(v):
    if isinstance(v, bool) or not isinstance(v, (int, float)):
        return None
    if not (-1e12 < v < 1e12):
        return None
    return float(v)


def build_snapshot(valuations, prices):
    price_by_code = {p.get("thscode"): p for p in prices["item"] if isinstance(p, dict)}
    output = []
    for v in valuations["item"]:
        if not isinstance(v, dict) or v.get("thscode") not in CODES:
            continue
        code = v["thscode"]
        p = price_by_code.get(code) or {}
        metrics = {key: None for key in METRICS}
        metrics["pe"] = number(v.get("pe_ttm"))
        metrics["pb"] = number(v.get("pb_mrq"))
        if all(value is None for value in metrics.values()):
            continue
        output.append({
            "sourceRecord": {k: v.get(k) for k in ("thscode", "name", "pe_ttm", "pb_mrq") if k in v},
            "sourceEndpoint": "/api/a-share/valuations/snapshot",
            "code": code, "name": str(v.get("name") or p.get("name") or code),
            "industry": "行业信息未验证", "metrics": metrics,
            "missingNote": {k: ("未接入该指标的已验证数据接口" if k not in ("pe", "pb")
                               else "估值快照中该指标缺失或非数值") for k in METRICS if metrics[k] is None},
        })
    if not output:
        raise ValueError("No verified numeric PE/PB values returned; refuse publishing empty/fictional data")
    timestamp = valuations.get("timestamp")
    return {
        "mode": "real", "provider": "Fuyao REST API",
        "sourceDocsUrl": "https://fuyao.aicubes.cn/docs/api-reference/valuations/",
        "sourceApiPath": "/api/a-share/valuations/snapshot",
        "sourceDisclosure": "sourceRecord 为接口响应中选取的原始字段；可公开点击的原数据库逐证券记录地址尚未验证，不能将 API 文档冒充原始记录。",
        "asOf": str(timestamp) if timestamp is not None else None,
        "fetchedAt": dt.datetime.now(dt.timezone.utc).isoformat(),
        "scope": "5只预设A股中的有效记录，不代表全市场",
        "metrics": {"pe": {"sourceField": "pe_ttm", "unit": "倍", "period": "TTM"},
                    "pb": {"sourceField": "pb_mrq", "unit": "倍", "period": "MRQ"}},
        "stocks": output,
    }


def main():
    key = os.environ.get("FUYAO_API_KEY", "").strip()
    if not key:
        raise SystemExit("FUYAO_API_KEY missing; no data published")
    result = build_snapshot(request("valuations", key), request("prices", key))
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Validated Fuyao snapshot: {len(result['stocks'])} records; fetchedAt={result['fetchedAt']}")


if __name__ == "__main__":
    main()
