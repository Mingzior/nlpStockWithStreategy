#!/usr/bin/env python3
"""Conservative validator for additional iFinD financial indicators.

Do NOT parse free-form iFinD answer text into numeric metrics. Only ingest
independently reviewed, structured observations with explicit provenance.
This tool validates candidates; it does NOT silently publish them.
"""
import datetime as dt
import json
import math
import re
import sys
from pathlib import Path

METRICS = {"roe", "revenue_growth", "net_profit_growth", "debt_ratio"}
CODES = {"600519.SH", "000858.SZ", "601318.SH", "600036.SH", "000333.SZ"}
REQUIRED = {"code", "metric", "value", "unit", "periodEnd", "periodType", "sourceField", "sourceUrl", "provider", "retrievedAt"}
CODE = re.compile(r"^\d{6}\.(SH|SZ)$")
DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")

def validate(items):
    if not isinstance(items, list): raise ValueError("observations must be a list")
    output, seen = [], set()
    for i, row in enumerate(items):
        if not isinstance(row, dict) or not REQUIRED.issubset(row):
            raise ValueError(f"observation {i}: missing required provenance fields")
        code, metric = row["code"], row["metric"]
        if code not in CODES or not CODE.fullmatch(code) or metric not in METRICS:
            raise ValueError(f"observation {i}: invalid code or metric")
        if type(row["value"]) not in (int, float) or not math.isfinite(row["value"]):
            raise ValueError(f"observation {i}: non-finite/non-numeric value")
        if row["unit"] != "%":
            raise ValueError(f"observation {i}: values must be in percent, not fractions")
        if not isinstance(row["periodEnd"], str) or not DATE.fullmatch(row["periodEnd"]):
            raise ValueError(f"observation {i}: periodEnd must be ISO date")
        dt.date.fromisoformat(row["periodEnd"])
        if row["periodType"] not in ("quarter", "annual", "ttm", "semiannual"):
            raise ValueError(f"observation {i}: unsupported reporting period")
        for field in ("sourceField", "provider", "retrievedAt"):
            if not isinstance(row[field], str) or not row[field].strip():
                raise ValueError(f"observation {i}: missing {field}")
        if not isinstance(row["sourceUrl"], str) or not row["sourceUrl"].startswith("https://"):
            raise ValueError(f"observation {i}: no verifiable HTTPS source URL")
        key = (code, metric, row["periodEnd"], row["periodType"])
        if key in seen: raise ValueError(f"observation {i}: duplicate")
        seen.add(key)
        output.append(row)
    return output

if __name__ == "__main__":
    if len(sys.argv) != 2: raise SystemExit("Usage: python scripts/validate_ifind_observations.py FILE.json")
    data = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    validated = validate(data["observations"])
    print(f"VALIDATED STRUCTURE ONLY: {len(validated)} records; original financial values still require independent source verification")
