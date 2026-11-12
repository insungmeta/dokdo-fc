"""Active-dashboard contract checks. Avoid obsolete assertions about retired inline scripts."""
import shutil
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class DashboardUIContract(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (ROOT / "index.html").read_text(encoding="utf-8")
        cls.js = (ROOT / "live-dashboard-v7.js").read_text(encoding="utf-8")
        cls.mobile = (ROOT / "mobile-app-v8.js").read_text(encoding="utf-8")
        cls.css = (ROOT / "mobile-app-v8.css").read_text(encoding="utf-8")

    def test_active_scripts_syntax(self):
        if shutil.which("node") is None:
            self.skipTest("Node.js unavailable")
        for name in ("live-dashboard-v7.js", "mobile-app-v8.js"):
            with self.subTest(file=name):
                result = subprocess.run(
                    ["node", "--check", str(ROOT / name)],
                    capture_output=True, text=True, check=False,
                )
                self.assertEqual(result.returncode, 0, result.stderr)

    def test_rolling_points_and_consistent_chronology(self):
        for token in ('id="divisionTrendChart"', 'id="divisionTrendDelta"',
                      'id="heroFormLine"', '과거 경기 → 최신 경기'):
            self.assertIn(token, self.html)
        self.assertIn('displayRecent=[...recent].reverse()', self.js)
        self.assertIn('average:(wins*3+draws)/5', self.js)
        self.assertIn('renderDivisionTrend();', self.js)

    def test_moved_home_graph_and_health_styles(self):
        # Mobile JS moves the hero into app-home; selectors cannot use old #overview.
        self.assertIn('home.append(hero,metrics)', self.mobile)
        self.assertIn('#app-home .division-trend', self.css)
        self.assertIn('#app-home .sync-health', self.css)
        self.assertNotIn('#overview .division-trend', self.css)

    def test_freshness_and_player_history_have_full_wiring(self):
        for name in ('syncHealthText', 'syncRefreshNow', 'syncBanner',
                     'syncApplyUpdate', 'profileHistory', 'teamPeriodBody'):
            self.assertIn('id="' + name + '"', self.html)
        for token in ('data/status.json', 'checkFreshness()', 'renderHealth(status)',
                      "window.setInterval", "renderPeriodComparison()",
                      "'profileHistory').addEventListener"):
            self.assertIn(token, self.js)
        self.assertIn('num(x.appearances)>=5', self.js)

    def test_manual_refresh_gives_explicit_feedback(self):
        self.assertIn('id="syncCheckFeedback"', self.html)
        self.assertIn('role="status"', self.html)
        self.assertIn('>새 기록 확인</button>', self.html)
        self.assertIn("checkFreshness({manual:true})", self.js)
        self.assertIn("refreshButton.textContent='확인 중…'", self.js)
        self.assertIn("showCheckFeedback(", self.js)
        self.assertIn("새로 저장된 기록은 없습니다", self.js)
        self.assertIn("확인 실패", self.js)
        self.assertIn("#app-home .sync-check-feedback", self.css)
        self.assertIn("min-height:44px", self.css)

    def test_tactical_lab_uses_archived_results_and_no_new_menu(self):
        tactical = (ROOT / "tactical-lab-v1.js").read_text(encoding="utf-8")
        styling = (ROOT / "tactical-lab-v1.css").read_text(encoding="utf-8")
        self.assertIn('id="tacticalLab"', self.html)
        self.assertIn('id="tlPitch"', self.html)
        self.assertIn('id="tlEvidence"', self.html)
        self.assertIn('src="./tactical-lab-v1.js', self.html)
        self.assertIn('href="./tactical-lab-v1.css', self.html)
        self.assertIn("matchType==='leagueMatch'", tactical)
        self.assertIn("model=compute(window.__dokdoData)", tactical)
        self.assertIn("formation==='4-3-3'", tactical)
        self.assertIn("people=Number(btn.dataset.tlPeople)", tactical)
        self.assertIn("data-tl-people=\"5\"", self.html)
        self.assertIn("data-tl-people=\"9\"", self.html)
        self.assertIn("#tactics .tl-columns", styling)
        self.assertIn("Fewer than 5 matches", tactical)
        self.assertIn('id="tlRoles"', self.html)
        self.assertIn('id="tlCopy"', self.html)
        self.assertIn('id="tlBestXI"', self.html)
        self.assertIn('id="tlXIList"', self.html)
        self.assertIn('id="tlRecommendFormation"', self.html)
        self.assertIn("function bestXI(roster,formation)", tactical)
        self.assertIn("if(lineupMode)", tactical)
        self.assertIn('id="tlShareStatus"', self.html)
        self.assertIn("roleRows(formation,people)", tactical)
        self.assertIn("navigator.clipboard.writeText(shareText())", tactical)
        self.assertIn("if(now.n===0)return", tactical)
        self.assertEqual(self.html.count('id="tacticalLab"'), 1)

    def test_mobile_six_sections_remain(self):
        for menu in ('home', 'players', 'matches', 'rivals', 'more', 'tactics'):
            self.assertIn(menu + ":'", self.mobile)


if __name__ == "__main__":
    unittest.main()
