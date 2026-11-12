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

    def test_mobile_five_sections_remain(self):
        for menu in ('home', 'players', 'matches', 'rivals', 'more'):
            self.assertIn(menu + ":'", self.mobile)


if __name__ == "__main__":
    unittest.main()
