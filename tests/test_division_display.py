"""Regression check: EA's 1–6 tier codes must display Elite, Division 1–5."""
import json
import shutil
import subprocess
import unittest
from pathlib import Path


class DivisionDisplayTests(unittest.TestCase):
    def test_fc27_league_tier_labels(self):
        if shutil.which("node") is None:
            self.skipTest("Node.js is unavailable")
        html = (Path(__file__).resolve().parents[1] / "index.html").read_text(
            encoding="utf-8"
        )
        start = html.index("function clubDivision(")
        stop = html.index("function renderMeta()", start)
        helper = html[start:stop]
        cases = [
            [1, "엘리트", "ELITE"], [2, "1부", "DIVISION 1"],
            [3, "2부", "DIVISION 2"], [4, "3부", "DIVISION 3"],
            [5, "4부", "DIVISION 4"], [6, "5부", "DIVISION 5"],
            [0, None, None], [7, None, None], [None, None, None],
        ]
        js = (
            "const num=v=>v===null||v===undefined||v===''||"
            "!Number.isFinite(Number(v))?null:Number(v);\n"
            + helper
            + "\nconst cases=" + json.dumps(cases, ensure_ascii=False) + ";\n"
            + "for(const [raw,label,short] of cases){"
            + "const item=clubDivision(raw);"
            + "if(item?.label!== (label??undefined) || item?.short!== (short??undefined))"
            + "throw new Error('EA tier '+raw+': '+JSON.stringify(item));"
            + "}\n"
        )
        subprocess.run(["node", "-e", js], check=True, capture_output=True, text=True)

    def test_frontend_uses_translated_labels(self):
        html = (Path(__file__).resolve().parents[1] / "index.html").read_text(
            encoding="utf-8"
        )
        self.assertIn("d=clubDivision(lg.currentDivision)", html)
        self.assertIn("best=clubDivision(lg.bestDivision)", html)
        self.assertIn("'leagueDivision').textContent=d?d.label", html)
        self.assertIn("best?best.label", html)


if __name__ == "__main__":
    unittest.main()
