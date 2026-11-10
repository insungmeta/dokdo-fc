import tempfile
import unittest
from pathlib import Path
from collect import base, collect, key, merge, CLUB_ID

class CollectorTests(unittest.TestCase):
    def test_config(self):
        self.assertEqual(base()["clubId"], CLUB_ID)

    def test_dedupe(self):
        x={"matchId":"10","matchType":"leagueMatch","timestamp":100,"players":[{"name":"x"}]}
        y={"matchId":"10","matchType":"leagueMatch","timestamp":100,"players":[]}
        saved=merge([x],[y])
        self.assertEqual(len(saved),1)
        self.assertEqual(len(saved[0]["players"]),1)

    def test_no_fabrication_when_api_down(self):
        def unavailable(**kw):
            raise RuntimeError("offline")
        with tempfile.TemporaryDirectory() as d:
            result=collect(unavailable,Path(d)/"dashboard.json")
            self.assertEqual(result["matches"],[])
            self.assertIsNone(result["sync"]["lastSuccess"])
            self.assertIn("offline",result["sync"]["error"])

if __name__=="__main__":
    unittest.main()
