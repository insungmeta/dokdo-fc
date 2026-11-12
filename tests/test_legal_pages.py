"""DOKDO FC fan-site legal/privacy safeguards and packaging regressions."""
import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class LegalNoticeTests(unittest.TestCase):
    def read(self, name):
        return (ROOT / name).read_text(encoding="utf-8")

    def test_bilingual_notices_are_public_and_nonaffiliated(self):
        for name in ("legal.html", "privacy.html"):
            html = self.read(name)
            with self.subTest(page=name):
                self.assertIn('data-language="ko"', html)
                self.assertIn('data-language="en"', html)
                self.assertIn("EA or its licensors", html)
                self.assertIn('href="./"', html)
                self.assertIn("github.com/insungmeta/dokdo-fc/issues", html)

    def test_both_main_pages_link_to_rights_and_privacy(self):
        for name in ("index.html", "legacy.html"):
            html = self.read(name)
            with self.subTest(page=name):
                self.assertIn('href="./legal.html"', html)
                self.assertIn('href="./privacy.html"', html)
                self.assertIn("라이선스 제공자", html)

    def test_no_hotlinked_ea_or_opponent_crests_in_active_render(self):
        js = self.read("live-dashboard-v7.js")
        self.assertNotIn('class="crest-img"', js)
        self.assertNotIn("eafc24.content.easports.com", js)
        self.assertIn("neutral initials", js)
        self.assertIn("crest-fallback", js)

    def test_no_false_live_source_approval(self):
        html = self.read("index.html")
        self.assertIn("rights-hold", html)
        self.assertIn("자동 수집은 일시 중단", html)
        self.assertNotIn("FC27 · DESIGN CONCEPT V6", html)
        manifest = json.loads(self.read("site.webmanifest"))
        self.assertEqual(manifest["short_name"], "DOKDO FC")
        self.assertNotIn("EA SPORTS", manifest["name"])
        banner = self.read("assets/club-banner.svg")
        self.assertNotIn("EA FC 27  /  GEN 5", banner)

    def test_unofficial_ea_collector_is_fail_closed(self):
        workflow = self.read(".github/workflows/update-and-publish.yml")
        self.assertIn("vars.DFC_EA_DATA_LICENSE_CONFIRMED == 'true'", workflow)
        self.assertIn("until verified authorization", self.read("COMPLIANCE_REVIEW.md").replace("until permission is documented", "until verified authorization"))
        self.assertIn("license", self.read("README.md").lower())

    def test_privacy_notice_discloses_retention_and_external_services(self):
        html = self.read("privacy.html")
        for term in ("GitHub Pages", "GitHub", "Google Fonts", "보관", "삭제", "gamer tags"):
            self.assertIn(term, html)


if __name__ == "__main__":
    unittest.main()
