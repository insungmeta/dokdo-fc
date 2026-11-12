"""Language switch regressions for the active and archived DOKDO FC pages."""
import json
import re
import shutil
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class I18nTests(unittest.TestCase):
    def test_language_scripts_parse(self):
        if not shutil.which("node"):
            self.skipTest("Node.js unavailable")
        for script in ("i18n-terms.js", "i18n-v1.js"):
            with self.subTest(script=script):
                result = subprocess.run(
                    ["node", "--check", str(ROOT / script)],
                    capture_output=True, text=True, check=False
                )
                self.assertEqual(result.returncode, 0, result.stderr)

    def test_both_pages_include_translation_in_correct_order(self):
        for page in ("index.html", "legacy.html"):
            html = (ROOT / page).read_text(encoding="utf-8")
            with self.subTest(page=page):
                self.assertIn('src="./i18n-terms.js', html)
                self.assertIn('src="./i18n-v1.js', html)
                self.assertLess(html.index('src="./i18n-terms.js'),
                                html.index('src="./i18n-v1.js'))

    def test_english_covers_core_site_and_preserves_original_names(self):
        src = (ROOT / "i18n-terms.js").read_text(encoding="utf-8")
        match = re.search(r"window.DFC_TRANSLATIONS=(\[.*\]);", src, re.S)
        self.assertIsNotNone(match)
        entries = json.loads(match.group(1))
        self.assertGreater(len(entries), 400)
        mapping = {key: value for key, value in entries}
        for key, expected in [
            ("클럽 홈", "Club Home"),
            ("선수 랭킹", "Player Rankings"),
            ("경기 기록", "Match Records"),
            ("상대전적", "Head-to-Head"),
            ("팀 흐름", "Team Trends"),
            ("새 기록 확인", "Check for Updates"),
        ]:
            self.assertEqual(mapping.get(key), expected)
        runtime = (ROOT / "i18n-v1.js").read_text(encoding="utf-8")
        for token in ('URLSearchParams', 'lang', 'localStorage',
                      'MutationObserver', '.match-item .title',
                      "data-dfc-language", "dfc-lang-switch"):
            self.assertIn(token, runtime)

    def test_default_language_is_korean_and_english_requires_query(self):
        runtime = (ROOT / "i18n-v1.js").read_text(encoding="utf-8")
        self.assertIn("var locale = query === 'en' ? 'en' : 'ko';", runtime)
        self.assertNotIn("navigator.language", runtime)
        self.assertNotIn("localStorage.getItem", runtime)
        self.assertIn("current.searchParams.set('lang', lang)", runtime)

    def test_stale_collection_is_not_reported_as_live(self):
        script = (ROOT / "live-dashboard-v7.js").read_text(encoding="utf-8")
        self.assertIn("minutes>=12", script)
        self.assertIn("예약 실행 지연", script)
        self.assertIn("분 전", script)


if __name__ == "__main__":
    unittest.main()
