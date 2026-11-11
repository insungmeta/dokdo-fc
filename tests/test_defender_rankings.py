"""Regression checks for defender rankings without guessing or inflating EA data."""
import shutil
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class DefenderRankingsTests(unittest.TestCase):
    def setUp(self):
        if shutil.which("node") is None:
            self.skipTest("Node.js not available in test environment")

    def test_all_five_defender_leaderboards_and_source_separation(self):
        js = r"""
const fs=require('fs');
const assert=require('assert');
const html=fs.readFileSync('index.html','utf8');
const snippet=html.slice(
  html.indexOf('function ranked(field){'),
  html.indexOf('function isGoalkeeper(p){')
);
assert.ok(snippet.startsWith('function ranked'));
const players=[
 {name:'A',position:'defender',gamesPlayed:100,cleanSheetsDef:20,tacklesMade:80,tackleSuccessRate:50},
 {name:'B',position:'defender',gamesPlayed:80,cleanSheetsDef:25,tacklesMade:70,tackleSuccessRate:55},
 {name:'C',position:'defender',gamesPlayed:2,cleanSheetsDef:1,tacklesMade:2,tackleSuccessRate:100},
 {name:'GK',position:'goalkeeper',gamesPlayed:100,cleanSheetsDef:99,tacklesMade:99,tackleSuccessRate:99},
 {name:'FW',position:'forward',gamesPlayed:120,cleanSheetsDef:99,tacklesMade:99,tackleSuccessRate:99}
];
const game=(name,events,df=true)=>({
 matchType:'leagueMatch',dnf:false,players:[{name,playerId:42,
  position:df?'defender':'forward',...events}]
});
const games=[
 game('A',{interceptions:2,aerialDuelsWonDefending:4,crossesBlocked:1}),
 game('A',{interceptions:3,aerialDuelsWonDefending:0,crossesBlocked:2}),
 game('B',{interceptions:8,aerialDuelsWonDefending:1,crossesBlocked:1}),
 game('A',{interceptions:99,aerialDuelsWonDefending:99},false),
 {...game('A',{interceptions:99,aerialDuelsWonDefending:99}),dnf:true},
 game('FW',{interceptions:10,aerialDuelsWonDefending:9})
];
const num=v=>v===null||v===undefined||v===''||!Number.isFinite(Number(v))?null:Number(v);
const api=new Function('members','matches','num','humanName','confirmedHuman',
 'matchStatsUnavailable','E','fmt','val','rank','$',
  snippet+';return {defenderStats,defenseList,defenseHelp};')(
 ()=>players,()=>games,num,p=>!!p.name,p=>p.playerId>0,
 m=>m.dnf===true,x=>String(x),v=>String(v),v=>String(v),'goals',()=>null
);
const stats=api.defenderStats();
assert.equal(stats.length,3,'Only real current defenders should be ranked');
const a=stats.find(p=>p.name==='A');
assert.equal(a.archivedInterceptions,5,'Sum only real DF archive appearances');
assert.equal(a.archivedAerial,4,'Ignore DNF and forward appearances');
assert.equal(a.archivedDefMatches,2,'Keep archived match count separate');
assert.equal(a.tacklesMade,80,'Never add archive events to member totals');
assert.equal(api.defenseList('cleanSheetsDef')[0].name,'B');
assert.equal(api.defenseList('tacklesMade')[0].name,'A');
assert.equal(api.defenseList('tackleSuccessRate')[0].name,'B');
assert.equal(api.defenseList('tackleSuccessRate').length,2,
  'Do not rank two-game small samples as success rate champion');
assert.equal(api.defenseList('archivedInterceptions')[0].name,'B');
assert.equal(api.defenseList('archivedAerial')[0].name,'A');
assert.ok(api.defenseHelp('archivedAerial').includes('시즌 전체 기록 아님'));
assert.ok(html.includes('data-rank="cleanSheetsDef"'));
assert.ok(html.includes('data-sort="defenseAerial"'));
console.log('defender rankings regression checks pass');
"""
        result = subprocess.run(
            ["node", "-e", js],
            cwd=ROOT,
            text=True,
            encoding="utf-8",
            capture_output=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr)


if __name__ == "__main__":
    unittest.main()
