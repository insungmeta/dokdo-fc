import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from tools import discord_matches as d

URL = "https://discord.com/api/webhooks/123/test_token"
def match(i, **kwargs):
    return dict(matchType="leagueMatch", matchId=i, goals=3, goalsAgainst=1,
                opponentName="Test FC", players=[dict(playerId=5, name="Player", goals=2, assists=1, rating=9.5)], **kwargs)

class DiscordTests(unittest.TestCase):
    def test_baseline_and_new_matches(self):
        with tempfile.TemporaryDirectory() as folder:
            p, s = Path(folder)/"dashboard.json", Path(folder)/"state.json"
            def write(matches):
                p.write_text(json.dumps(dict(clubId=d.CLUB_ID, matches=matches)))
            calls = []
            send = lambda payload, url: calls.append(payload)
            write([match(1)])
            self.assertEqual(d.run(p,s,url="",sender=send),0)
            self.assertFalse(s.exists())
            self.assertEqual(d.run(p,s,url=URL,sender=send),0)
            write([match(1),match(2)])
            with patch.object(d.time,"sleep"):
                self.assertEqual(d.run(p,s,url=URL,sender=send),1)
                self.assertEqual(d.run(p,s,url=URL,sender=send),0)
            self.assertEqual(len(calls),1)
            self.assertIn("3 : 1",calls[0]["embeds"][0]["title"])
            self.assertEqual(calls[0]["allowed_mentions"],{"parse":[]})
    def test_retry(self):
        with tempfile.TemporaryDirectory() as folder:
            p,s=Path(folder)/"dashboard.json",Path(folder)/"state.json"
            p.write_text(json.dumps(dict(clubId=d.CLUB_ID,matches=[match(1)])))
            d.run(p,s,url=URL)
            p.write_text(json.dumps(dict(clubId=d.CLUB_ID,matches=[match(1),match(2)])))
            def fail(*args):
                raise OSError("failure")
            self.assertEqual(d.run(p,s,url=URL,sender=fail),0)
            self.assertNotIn("leagueMatch:2",json.loads(s.read_text())["seenMatchKeys"])
    def test_reject_untrusted_url(self):
        with self.assertRaises(ValueError):
            d.webhook_url("https://example.com/api/webhooks/123/token")
    def test_missing_score(self):
        m=match(1)
        del m["goals"]
        with self.assertRaises(ValueError):
            d.payload(m)

if __name__ == "__main__":
    unittest.main()
