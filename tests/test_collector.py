import json
import tempfile
import unittest
from pathlib import Path
from datetime import datetime, timezone

from collect import (
    CLUB_ID, PLATFORM, base, collect, key, merge, merge_members, _same,
)


class FakeApi:
    def __init__(self, **kwargs):
        pass

    def get_club_details(self, club_id):
        return [{"clubName": "DOKDO FC", "clubId": club_id}]

    def get_club_overall_stats(self, club_id):
        return [{"gamesPlayed": 11, "wins": 6, "goals": 17, "skillRating": 1400}]

    def get_member_stats(self, club_id):
        return [{"name": "PLAYER", "goals": 8, "assists": 4, "gamesPlayed": 11}]

    def get_member_career_stats(self, club_id):
        return [{"name": "PLAYER", "goals": 20}]

    def get_club_matches(self, club_id, match_type, count):
        if match_type != "leagueMatch":
            return []
        return [{
            "matchId": "202", "matchType": match_type, "clubId": club_id,
            "opponentId": 99, "opponentName": "Team Two",
            "goals": 2, "goalsAgainst": 0, "timestamp": 200,
        }]

    def get_match_players(self, club_id, match_type, count, **kwargs):
        if match_type != "leagueMatch":
            return []
        assert kwargs["both_teams"] is True
        assert kwargs["include_events"] is True
        return [
            {"matchId": "202", "clubId": CLUB_ID, "playerId": 1,
             "name": "PLAYER", "position": "goalkeeper", "saves": 3},
            {"matchId": "202", "clubId": 99, "playerId": 9,
             "name": "OPPONENT HUMAN", "position": "forward", "goals": 0},
        ]


class CollectorTests(unittest.TestCase):
    def test_config(self):
        self.assertEqual(base()["clubId"], CLUB_ID)

    def test_dedupe_and_keep_detailed_players(self):
        old = {
            "matchId": "10", "matchType": "leagueMatch", "timestamp": 100,
            "opponentName": "Team One", "players": [
                {"playerId": 1, "clubId": CLUB_ID, "name": "PLAYER",
                 "saves": 3, "throughBallAssists": 1}
            ],
            "opponentPlayers": [
                {"playerId": 9, "clubId": 99, "name": "OPPONENT",
                 "passesCompletedCross": 4}
            ],
        }
        new = {
            "matchId": "10", "matchType": "leagueMatch", "timestamp": 100,
            "players": [{"playerId": 1, "clubId": CLUB_ID, "name": "PLAYER", "rating": 9.1}],
            "opponentPlayers": [],
        }
        saved = merge([old], [new])
        self.assertEqual(len(saved), 1)
        self.assertEqual(saved[0]["opponentName"], "Team One")
        self.assertEqual(saved[0]["players"][0]["saves"], 3)
        self.assertEqual(saved[0]["players"][0]["rating"], 9.1)
        self.assertEqual(saved[0]["players"][0]["throughBallAssists"], 1)
        self.assertEqual(saved[0]["opponentPlayers"][0]["passesCompletedCross"], 4)

    def test_iso_datetime_is_same_as_saved_timestamp(self):
        # FC27 client supplies datetime; GitHub JSON stores ISO strings.
        instant = datetime(2026, 11, 10, 1, 55, 1, tzinfo=timezone.utc)
        self.assertTrue(_same(
            {"matchId": 20, "timestamp": instant},
            {"timestamp": instant.isoformat(), "matchId": 20},
        ))

    def test_members_do_not_disappear(self):
        prior = [{"name": "FORMER", "goals": 8, "cleanSheetsGK": 1},
                 {"name": "PLAYER", "goals": 5, "assists": 2}]
        now = [{"name": "PLAYER", "goals": 6}]
        updated = merge_members(prior, now)
        self.assertEqual(len(updated), 2)
        self.assertEqual(updated[0]["goals"], 8)
        self.assertEqual(updated[1]["goals"], 6)
        self.assertEqual(updated[1]["assists"], 2)

    def test_bootstrap_keep_historic_and_append_updates(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "dashboard.json"
            previous = base()
            previous["matches"] = [{
                "matchId": "101", "matchType": "leagueMatch",
                "timestamp": 100, "opponentName": "Old Opponent",
                "players": [{"name": "OLD GK", "saves": 5}],
            }]
            previous["members"] = [{"name": "OLD GK", "cleanSheetsGK": 4}]
            previous["overall"] = {"gamesPlayed": 10, "wins": 5}
            previous["sync"]["lastSuccess"] = "2026-11-10T00:00:00Z"
            path.write_text(json.dumps(previous), encoding="utf-8")

            d = collect(FakeApi, path)
            history_path = Path(directory) / "history.json"
            archive = json.loads(history_path.read_text(encoding="utf-8"))
            self.assertEqual(len(d["matches"]), 2)
            self.assertEqual(len(d["members"]), 2)
            self.assertEqual(d["matches"][-1]["players"][0]["saves"], 5)
            self.assertEqual(d["matches"][0]["opponentPlayers"][0]["name"], "OPPONENT HUMAN")
            self.assertEqual(len(archive["changes"]), 2)
            self.assertEqual(archive["changes"][0]["kind"], "preserved-baseline")
            self.assertEqual(archive["changes"][0]["matches"][0]["matchId"], "101")
            self.assertEqual(archive["changes"][1]["matches"][0]["matchId"], "202")
            self.assertEqual(archive["changes"][1]["members"][0]["goals"], 8)

            # Identical information should not create duplicate history events.
            collect(FakeApi, path)
            archive2 = json.loads(history_path.read_text(encoding="utf-8"))
            self.assertEqual(len(archive2["changes"]), 2)
            self.assertEqual(len(json.loads(path.read_text())["matches"]), 2)

    def test_archive_missing_fails_closed(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "dashboard.json"
            previous = base()
            previous["archiveVersion"] = 1
            path.write_text(json.dumps(previous), encoding="utf-8")
            with self.assertRaises(FileNotFoundError):
                collect(FakeApi, path)

    def test_no_fabrication_when_api_down(self):
        def unavailable(**kwargs):
            raise RuntimeError("offline")
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "dashboard.json"
            result = collect(unavailable, path)
            self.assertEqual(result["matches"], [])
            self.assertIsNone(result["sync"]["lastSuccess"])
            self.assertIn("offline", result["sync"]["error"])
            saved = json.loads((Path(directory) / "history.json").read_text())
            self.assertEqual(saved["changes"], [])


if __name__ == "__main__":
    unittest.main()
