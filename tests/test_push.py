import json
import tempfile
import unittest
from unittest import mock
from datetime import datetime, timedelta, timezone
from pathlib import Path

from tools.push_matches import build_notification, run

NOW = datetime(2026, 11, 10, 9, 0, tzinfo=timezone.utc)


def example(match_id=21, when=None, result="win"):
    when = when or NOW.isoformat()
    return {
        "matchType": "leagueMatch", "matchId": match_id,
        "timestamp": when, "goals": 3, "goalsAgainst": 1,
        "opponentName": "Other FC", "result": result,
        "players": [
            {"name": "Striker", "position": "forward", "goals": 2,
             "assists": 0, "rating": 9.2, "manOfTheMatch": 1},
            {"name": "Midfielder", "position": "midfielder", "goals": 1,
             "assists": 2, "rating": 8.2, "manOfTheMatch": 0},
            {"name": "GK", "position": "goalkeeper", "goals": 0,
             "assists": 0, "saves": 5, "rating": 7.7},
        ],
    }


class PushTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        root = Path(self.temp.name)
        self.dashboard = root / "dashboard.json"
        self.state = root / "push-state.json"
        self.config = root / "config.json"
        self.config.write_text(json.dumps({"enabled": True, "appId": "test-app"}), encoding="utf-8")
        self.sender_calls = []

    def snapshot(self, matches):
        self.dashboard.write_text(
            json.dumps({"clubId": 331042, "matches": matches}), encoding="utf-8")

    def send(self, payload, key):
        self.sender_calls.append((payload, key))
        return "notification-id"

    def execute(self, sender=None):
        return run(self.dashboard, self.state, self.config, NOW, sender or self.send)

    def test_format_includes_actual_player_stats(self):
        msg = build_notification(example(), "test-app")
        self.assertIn("3 : 1", msg["headings"]["ko"])
        self.assertIn("Striker 2골", msg["contents"]["ko"])
        self.assertIn("Midfielder 2도움", msg["contents"]["ko"])
        self.assertIn("GK 5선방", msg["contents"]["ko"])
        self.assertIn("MVP Striker", msg["contents"]["ko"])

    def test_first_run_is_baseline(self):
        self.snapshot([example()])
        self.assertEqual(0, self.execute())
        self.assertEqual([], self.sender_calls)
        self.assertIn("leagueMatch:21", json.loads(self.state.read_text())["seenMatchKeys"])

    def test_without_credentials_advance_baseline(self):
        self.snapshot([example()])
        self.execute()
        self.snapshot([example(), example(22)])
        self.assertEqual(0, self.execute())
        self.assertEqual([], self.sender_calls)
        self.assertIn("leagueMatch:22", json.loads(self.state.read_text())["seenMatchKeys"])

    def test_sends_new_once(self):
        self.snapshot([example()])
        self.execute()
        self.snapshot([example(), example(22)])
        with mock.patch.dict("os.environ", {
            "ONESIGNAL_APP_ID": "test-app", "ONESIGNAL_REST_API_KEY": "test-secret",
        }):
            self.assertEqual(1, self.execute())
            self.assertEqual(0, self.execute())
        self.assertEqual(1, len(self.sender_calls))
        self.assertEqual("test-secret", self.sender_calls[0][1])

    def test_failed_delivery_is_retried(self):
        self.snapshot([example()])
        self.execute()
        self.snapshot([example(), example(22)])
        def bad_sender(*_):
            raise RuntimeError("OneSignal unavailable")
        with mock.patch.dict("os.environ", {
            "ONESIGNAL_APP_ID": "test-app", "ONESIGNAL_REST_API_KEY": "test-secret",
        }):
            self.assertEqual(0, self.execute(bad_sender))
            self.assertEqual(1, self.execute())
        self.assertEqual(1, len(self.sender_calls))

    def test_never_sends_old_newly_imported_history(self):
        self.snapshot([example()])
        self.execute()
        old = (NOW - timedelta(days=4)).isoformat()
        self.snapshot([example(), example(22, when=old)])
        with mock.patch.dict("os.environ", {
            "ONESIGNAL_APP_ID": "test-app", "ONESIGNAL_REST_API_KEY": "test-secret",
        }):
            self.assertEqual(0, self.execute())
        self.assertIn("leagueMatch:22", json.loads(self.state.read_text())["seenMatchKeys"])

    def test_rejects_wrong_club(self):
        self.dashboard.write_text(json.dumps({"clubId": 999, "matches": []}))
        with self.assertRaises(ValueError):
            self.execute()


if __name__ == "__main__":
    unittest.main()
