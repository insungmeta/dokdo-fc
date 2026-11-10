"""Do not present five-second EA DNF placeholder numbers as real player stats."""
import json
import shutil
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class MatchDnfDisplayTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (ROOT / "index.html").read_text(encoding="utf-8")
        if shutil.which("node") is None:
            raise unittest.SkipTest("Node.js is required to test dashboard JavaScript")

    def test_dashboard_javascript_syntax(self):
        script = self.html.split("<script>\n'use strict';", 1)[1].split("</script>", 1)[0]
        result = subprocess.run(
            ["node", "--check", "-"],
            input="'use strict';\n" + script,
            encoding="utf-8",
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )
        self.assertEqual(0, result.returncode, result.stderr)

    def test_actual_dnf_match_not_shown_as_zero_goals_and_rating_six(self):
        js = r"""
const fs=require('fs'), assert=require('assert');
const html=fs.readFileSync('index.html','utf8');
const records=JSON.parse(fs.readFileSync('data/dashboard.json','utf8')).matches;
const num=v=>v===null||v===undefined||v===''||!Number.isFinite(Number(v))?null:Number(v);
const helper=html.slice(html.indexOf('function matchStatsUnavailable(m){'),
                        html.indexOf('function matchMarkup(m,i)'));
const tableFn=html.slice(html.indexOf('function rosterTable(players,side,unavailable=false){'),
                         html.indexOf('\nlet detailMatch=null;'));
eval(helper+'\n'+tableFn);
const E=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const fmt=(v,d=0)=>Number(v).toFixed(d);
const val=(v,f)=>v??f;
const isGoalkeeper=p=>p.position==='goalkeeper';
const confirmedHuman=p=>Number(p.playerId)>0&&Boolean(p.name);
const posLabel=p=>p.position||'—';
const empty=()=>'<div>EMPTY</div>';
const dnf=records.find(m=>m.matchId===181346009730026);
assert.ok(dnf && dnf.dnf===true);
assert.equal(dnf.goals,3);
assert.equal(dnf.goalsAgainst,0);
assert.ok(matchStatsUnavailable(dnf),'DNF 5-second placeholders must be detected');
const result=rosterTable(dnf.players,'ours',matchStatsUnavailable(dnf));
assert.ok(result.includes('RiRiXiD'),'Keep real player names');
assert.ok(result.includes('—'),'Show missing stats as em dashes');
assert.ok(!result.includes('>6<') && !result.includes('>0<'),'Do not render placeholders as real stats');
const normal=records.find(m=>m.dnf===false&&m.players.some(p=>p.goals>0));
assert.ok(normal && !matchStatsUnavailable(normal));
const ordinary=rosterTable(normal.players,'ours',matchStatsUnavailable(normal));
assert.ok(ordinary.includes('>1<') || ordinary.includes('>2<') || ordinary.includes('>3<'),
          'Keep real scored goals for ordinary matches');
const lateDnf={...normal,dnf:true};
assert.ok(!matchStatsUnavailable(lateDnf),
          'Late DNF with actual stats must not be suppressed');
console.log('DNF regression checks passed');
"""
        result = subprocess.run(
            ["node", "-e", js],
            cwd=ROOT,
            encoding="utf-8",
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )
        self.assertEqual(0, result.returncode, result.stderr)

    def test_player_profile_and_match_modal_reuse_match_status(self):
        self.assertIn("rosterTable(our,'ours',unavailable)", self.html)
        self.assertIn("rosterTable(opponents,'opponent',unavailable)", self.html)
        self.assertIn("const unavailable=matchStatsUnavailable(detailMatch)", self.html)
        self.assertIn("matchStatsUnavailable(x.m)?'기록 미집계'", self.html)
        self.assertIn("m.dnf?' · DNF'", self.html)


if __name__ == "__main__":
    unittest.main()
