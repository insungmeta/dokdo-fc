/* DOKDO FC Tactical Lab
 * Analytical evidence: archived league scores; collected human-player passes where available.
 * No claim about unseen tactical actions, AI positioning, possession, xG or causal goals.
 */
(() => {
'use strict';
const root=document.getElementById('tacticalLab'); if(!root)return;
const id=x=>root.querySelector('#'+x);
const en=()=>document.documentElement.lang==='en';
const t=(ko,eng)=>en()?eng:ko;
const escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const avg=n=>Number(n).toFixed(2);
const formations={
 '4-2-3-1':[['GK',50,91],['LB',17,77],['LCB',39,77],['RCB',61,77],['RB',83,77],['LCDM',38,58],['RCDM',62,58],['LW',17,38],['CAM',50,38],['RW',83,38],['ST',50,15]],
 '4-3-3':[['GK',50,91],['LB',17,77],['LCB',39,77],['RCB',61,77],['RB',83,77],['CDM',50,60],['LCM',29,48],['RCM',71,48],['LW',17,29],['ST',50,15],['RW',83,29]],
 '4-4-2':[['GK',50,91],['LB',17,76],['LCB',39,76],['RCB',61,76],['RB',83,76],['LM',17,49],['LCM',39,53],['RCM',61,53],['RM',83,49],['ST',38,19],['ST2',62,19]]
};
const allocations={
 '4-2-3-1':{5:['ST','LW','CAM','RW','LCDM'],7:['ST','LW','CAM','RW','LCDM','RCDM','LCB'],9:['ST','LW','CAM','RW','LCDM','RCDM','LCB','LB','RB']},
 '4-3-3':{5:['ST','LW','RW','LCM','CDM'],7:['ST','LW','RW','LCM','RCM','CDM','LCB'],9:['ST','LW','RW','LCM','RCM','CDM','LCB','LB','RB']},
 '4-4-2':{5:['ST','ST2','LM','RM','LCM'],7:['ST','ST2','LM','RM','LCM','RCM','LCB'],9:['ST','ST2','LM','RM','LCM','RCM','LCB','RCB','LB']}
};
let people=5,selected=null,model=null,lineupMode=false;
const isValid=m=>m&&m.matchType==='leagueMatch'&&m.matchId&&
 m.goals!==null&&m.goals!==undefined&&m.goalsAgainst!==null&&m.goalsAgainst!==undefined&&
 Number.isFinite(Number(m.goals))&&Number.isFinite(Number(m.goalsAgainst))&&
 !Number.isNaN(Date.parse(m.timestamp||''));
function summary(rows){
 const n=rows.length;
 const gf=rows.reduce((a,m)=>a+Number(m.goals),0),ga=rows.reduce((a,m)=>a+Number(m.goalsAgainst),0);
 const wins=rows.filter(m=>Number(m.goals)>Number(m.goalsAgainst)).length,draws=rows.filter(m=>Number(m.goals)===Number(m.goalsAgainst)).length;
 return {n,gf,ga,wins,draws,losses:n-wins-draws,clean:rows.filter(m=>Number(m.goalsAgainst)===0).length,
         gfAvg:n?gf/n:0,gaAvg:n?ga/n:0,pts:n?(3*wins+draws)/n:0};
}
function passing(rows){
 let made=0,tried=0,games=0;
 for(const m of rows){
  let c=0,a=0;
  for(const p of Array.isArray(m.players)?m.players:[]){
   if(!p||!Number.isFinite(Number(p.playerId))||Number(p.playerId)<=0)continue;
   const attempt=Number(p.passAttempts),completed=Number(p.passesCompleted);
   if(!Number.isFinite(attempt)||!Number.isFinite(completed)||attempt<0||completed<0||completed>attempt)continue;
   a+=attempt;c+=completed;
  }
  if(a>0){tried+=a;made+=c;games++;}
 }
 return {games,tried,made,ratio:tried?made/tried:null};
}
function compute(data){
 const dedup=new Set();
 const league=(Array.isArray(data?.matches)?data.matches:[]).filter(isValid)
  .sort((a,b)=>String(b.timestamp).localeCompare(String(a.timestamp)))
  .filter(m=>{const k=String(m.matchId);if(dedup.has(k))return false;dedup.add(k);return true;});
 const current=league.slice(0,10),prior=league.slice(10,20);
 const now=summary(current),before=summary(prior),pass=passing(current);
 const delta=now.n===10&&before.n===10?now.pts-before.pts:null;
 // These are editorial tactical heuristics, not validated EA formation recommendations.
 const suggested=now.n>=5&&now.gaAvg<1.3&&now.gfAvg<1.2?'4-3-3':'4-2-3-1';
 return {now,before,pass,delta,suggested,updated:data?.sync?.lastSuccess||null,roster:Array.isArray(data?.members)?data.members:[],history:archivedRoleHistory(data?.matches),league};
}
function diagnoses(r){
 const {now,pass,delta}=r;
 const strengths=[],risks=[];
 if(now.n===0)return {
  strengths:[t('아직 확인된 리그 경기 결과가 없습니다.','No verified league match results yet.')],
  risks:[t('데이터가 확보되기 전에는 강점·약점을 판단할 수 없습니다.','Strengths and weaknesses cannot be assessed until results are collected.')]
 };

 if(now.gaAvg<=1.1)strengths.push(t('경기당 실점 '+avg(now.gaAvg)+'골로 최근 수비 결과가 안정적인 편입니다.','Recent defensive results: '+avg(now.gaAvg)+' goals conceded per game.'));
 if(now.gfAvg>=1.8)strengths.push(t('경기당 득점 '+avg(now.gfAvg)+'골로 공격 결과가 비교적 좋습니다.','Recent scoring: '+avg(now.gfAvg)+' goals per game.'));
 if(delta!==null&&delta>=.35)strengths.push(t('이전 10경기 대비 경기당 승점이 '+avg(delta)+'점 상승했습니다.','Points per game improved by '+avg(delta)+' compared with the previous 10.'));
 if(pass.games>=4&&pass.ratio!==null&&pass.ratio>=.8)strengths.push(t('수집된 사람 선수의 패스 성공률 '+Math.round(pass.ratio*100)+'%입니다. AI 패스는 제외됩니다.','Collected human-player pass completion: '+Math.round(pass.ratio*100)+'%; AI passes excluded.'));
 if(now.gaAvg>=1.6)risks.push(t('최근 경기당 '+avg(now.gaAvg)+'실점. 중앙 수비 보호와 공을 잃은 뒤 복귀를 점검하세요.','Conceding '+avg(now.gaAvg)+'/match. Review central cover and recovery after turnovers.'));
 if(now.gfAvg<1.2)risks.push(t('최근 경기당 '+avg(now.gfAvg)+'득점. 박스 진입과 마지막 패스 선택을 개선할 여지가 있습니다.','Scoring '+avg(now.gfAvg)+'/match. Review final passes and box entries.'));
 if(delta!==null&&delta<=-.35)risks.push(t('이전 10경기보다 경기당 승점이 '+avg(Math.abs(delta))+'점 낮습니다.','Points per game fell by '+avg(Math.abs(delta))+' compared with the previous 10.'));
 if(pass.games>=4&&pass.ratio!==null&&pass.ratio<.7)risks.push(t('수집된 사람 선수 패스 성공률 '+Math.round(pass.ratio*100)+'%. 무리한 전진 패스보다 안전한 연결을 검토하세요.','Human-player passing: '+Math.round(pass.ratio*100)+'%. Prioritize safer support options over forced forward passes.'));
 if(!strengths.length)strengths.push(t('명확한 강점 기준에 해당하는 항목이 없습니다. 표본을 더 모아 비교하세요.','No strong result indicator meets the sample thresholds yet.'));
 if(!risks.length)risks.push(t('선택한 지표에서 큰 경고는 없지만, 세부 수비 위치나 실수는 이 데이터로 판단할 수 없습니다.','No major threshold warnings; positioning errors and individual mistakes cannot be assessed from scores.'));
 return {strengths:strengths.slice(0,3),risks:risks.slice(0,3)};
}

/* Match-by-match player positions are better evidence of a person's primary role
 * than the EA member row, which can describe only their most recently used role.
 * Historic match positions are broad FW/MF/DF/GK. We do not fabricate ST/CAM/CB
 * specialists, online availability, or player intent.
 */
const roleCategory=pos=>pos==='GK'?'goalkeeper':
 ['ST','ST2','LW','RW'].includes(pos)?'forward':
 ['LB','LCB','RCB','RB'].includes(pos)?'defender':'midfielder';
const roleNames={
 forward:['공격수','Forward'],midfielder:['미드필더','Midfielder'],
 defender:['수비수','Defender'],goalkeeper:['골키퍼','Goalkeeper']
};
const normalizeRole=value=>{
 const v=String(value||'').trim().toLowerCase();
 if(/^(forward|fw|striker|attacker|st|cf|lw|rw)$/.test(v))return 'forward';
 if(/^(midfielder|midfield|mf|cam|cdm|cm|lm|rm)$/.test(v))return 'midfielder';
 if(/^(defender|def|df|cb|lb|rb|lcb|rcb)$/.test(v))return 'defender';
 if(/^(goalkeeper|gk|keeper)$/.test(v))return 'goalkeeper';
 return null;
};
const personKey=name=>String(name||'').trim().toLocaleLowerCase();
function archivedRoleHistory(matches){
 const hist={},seen=new Set();
 for(const match of Array.isArray(matches)?matches:[]){
  if(!match?.matchId||!Array.isArray(match.players))continue;
  for(const p of match.players){
   const key=personKey(p?.name||p?.playerName),role=normalizeRole(p?.position||p?.favoritePosition||p?.proPos);
   // Exclude AI and unavailable positions; duplicate match/player events count once.
   if(!key||!role||!(Number(p.playerId)>0))continue;
   const once=String(match.matchId)+'|'+key;
   if(seen.has(once))continue;
   seen.add(once);
   if(!hist[key])hist[key]={forward:0,midfielder:0,defender:0,goalkeeper:0,total:0};
   hist[key][role]++;hist[key].total++;
  }
 }
 return hist;
}
function primaryPosition(p,history){
 const obs=history?.[personKey(p.name)],reported=normalizeRole(p.position||p.favoritePosition||p.proPos);
 if(obs?.total>=3){
  const sorted=['forward','midfielder','defender','goalkeeper']
   .sort((a,b)=>obs[b]-obs[a]);
  const dominant=sorted[0];
  // At least 3 corroborating appearances and >=60% across the archive.
  if(obs[dominant]>=3&&obs[dominant]/obs.total>=.6)
   return {category:dominant,source:'archive',observed:obs[dominant],total:obs.total,
     reported:reported||null};
 }
 return {category:reported||(Number(p.cleanSheetsGK)>0?'goalkeeper':null),
   source:reported?'roster':'unverified',observed:0,total:obs?.total||0,
   reported:reported||null};
}
function candidateScore(p,role){
 const games=Math.max(1,Number(p.gamesPlayed)||1),rating=Math.max(0,Math.min(10,Number(p.ratingAve)||0));
 const goals=Math.max(0,Number(p.goals)||0),assists=Math.max(0,Number(p.assists)||0),mvp=Math.max(0,Number(p.manOfTheMatch)||0);
 // Explicit heuristic, not an EA rating formula. For ST, verified season scoring
 // has priority; for other attackers use a combined goals/assists contribution.
 if(role==='ST'||role==='ST2')return goals*.8+(goals/games)*35+rating*4+assists*.13+Math.min(games,100)*.12;
 if(role==='LW'||role==='RW')return goals*.3+assists*.55+goals/games*12+assists/games*15+rating*6+Math.min(games,90)*.1;
 if(role==='GK')return Math.max(0,Number(p.cleanSheetsGK)||0)*8+Math.min(games,60)*.15+rating*5;
 if(roleCategory(role)==='midfielder')return rating*7+assists*.38+goals*.12+Math.min(games,90)*.12+(mvp/games)*10;
 return rating*9+Math.min(games,100)*.15+(mvp/games)*9; // DF, archival tackle events not used as season totals
}
function bestXI(roster,formation,history={}){
 const members=Array.isArray(roster)?roster:[],used=new Set(),chosen={};
 const valid=members.filter(p=>p&&p.name&&Number(p.gamesPlayed)>=5&&
   Number.isFinite(Number(p.ratingAve))&&Number(p.ratingAve)>0);
 // Reserve ST first so a prolific, mainly-forward player cannot be consumed
 // by midfield when EA's last listed position says MF.
 const priority=formation==='4-3-3'
 ? ['ST','LW','RW','GK','LCB','RCB','LB','RB','CDM','LCM','RCM']
 : formation==='4-4-2'
 ? ['ST','ST2','GK','LCB','RCB','LB','RB','LM','RM','LCM','RCM']
 : ['ST','LW','RW','GK','LCB','RCB','LB','RB','LCDM','RCDM','CAM'];
 for(const role of priority){
  const category=roleCategory(role);
  const options=valid.filter(p=>primaryPosition(p,history).category===category)
   .filter(p=>!used.has(personKey(p.name)));
  options.sort((a,b)=>candidateScore(b,role)-candidateScore(a,role)||
      Number(b.gamesPlayed)-Number(a.gamesPlayed)||String(a.name).localeCompare(String(b.name)));
  if(options.length){
   const p=options[0];chosen[role]=p;used.add(personKey(p.name));
  }else chosen[role]=null;
 }
 return chosen;
}
const trimLabel=x=>String(x||'').length>12?String(x).slice(0,11)+'…':String(x||'');

function pitch(formation,count,lineup){
 const current=allocations[formation],active=new Set(current[count]),pts=formations[formation];
 const parts=[
 '<svg viewBox="0 0 340 445" class="tl-pitch-svg" role="img" aria-label="'+escape(t('포메이션 '+formation+'; 연두색은 사람 조작, 회색은 AI','Formation '+formation+'; lime means human, gray means AI'))+'">',
 '<rect x="5" y="5" width="330" height="435" rx="14" fill="#103e38" stroke="#a4c2af" stroke-opacity=".75" stroke-width="2"/>',
 '<rect x="20" y="20" width="300" height="405" fill="none" stroke="#8cad9c" stroke-opacity=".6"/>',
 '<line x1="20" y1="222" x2="320" y2="222" stroke="#8cad9c" stroke-opacity=".6"/>',
 '<circle cx="170" cy="222" r="45" stroke="#8cad9c" stroke-opacity=".6" fill="none"/>',
 '<rect x="106" y="20" width="128" height="59" stroke="#8cad9c" fill="none" stroke-opacity=".65"/>',
 '<rect x="106" y="366" width="128" height="59" stroke="#8cad9c" fill="none" stroke-opacity=".65"/>',
 '<rect x="140" y="20" width="60" height="21" stroke="#8cad9c" fill="none" stroke-opacity=".65"/>',
 '<rect x="140" y="404" width="60" height="21" stroke="#8cad9c" fill="none" stroke-opacity=".65"/>'
 ];
 for(const [position,x,y] of pts){
  const cx=5+x*3.3,cy=5+y*4.35,p=lineup?lineup[position]:null;
  const human=active.has(position)&&(!lineup||Boolean(p)),name=human&&p?trimLabel(p.name):human?'USER':'AI';
  const label=human&&p?position+' · '+p.name+' · '+(Number(p.ratingAve)||0).toFixed(1):position+' · '+(human?'USER':'AI');
  parts.push('<g><title>'+escape(label)+'</title><rect x="'+(cx-27).toFixed(1)+'" y="'+(cy-16).toFixed(1)+'" width="54" height="32" rx="9" fill="'+(human?'#c8f35d':'#2f5360')+'" stroke="'+(human?'#f0ffb6':'#92b0b7')+'"/>',
   '<text x="'+cx.toFixed(1)+'" y="'+(cy-4).toFixed(1)+'" font-size="10.5" text-anchor="middle" dominant-baseline="middle" font-weight="800" fill="'+(human?'#163022':'#f2f7f8')+'">'+position+'</text>',
   '<text x="'+cx.toFixed(1)+'" y="'+(cy+11).toFixed(1)+'" font-size="'+(p?'7.2':'8.3')+'" text-anchor="middle" fill="'+(human?'#244c32':'#c5d4d7')+'">'+escape(name)+'</text></g>');
 }
 return parts.join('')+'</svg>';
}
const descriptions={
 ST:['등지고 연결한 후 박스 진입','Hold up play, combine, then attack the box'],
 ST2:['두 번째 공격수로 침투, 세컨드볼 압박','Second striker: make runs and press for second balls'],
 LM:['좌측에서 폭 확보, 수비 시 미드필드 복귀','Keep left width, track back in defense'],
 RM:['우측에서 폭 확보, 수비 시 미드필드 복귀','Keep right width, track back in defense'],
 LW:['터치라인 폭 유지 → 침투 또는 컷백','Stay wide, run in behind or cut back'],
 RW:['반대쪽 폭 유지 → 뒷공간 침투','Maintain opposite-side width and make runs in behind'],
 CAM:['ST 주변 연계, 세컨드볼, 역압박','Link with ST, recover second balls and counter-press'],
 LCDM:['중앙 수비 앞 보호, 안전한 패스 옵션','Protect central defense, offer safe passing outlet'],
 RCDM:['볼 반대편 공간 관리, 수비 전환','Protect the far-side channel and recover on turnovers'],
 CDM:['센터백 앞 잔류, 전진 패스 방향 전환','Hold in front of CBs and switch buildup'],
 LCM:['좌측 하프스페이스 지원, 복귀','Support left half-space, recover defensively'],
 RCM:['우측 하프스페이스 지원, 복귀','Support right half-space, recover defensively'],
 LB:['한쪽 측면만 선택적으로 오버래핑','Overlap selectively, not with both fullbacks'],
 RB:['반대편 풀백과 역할 교대, 수비 대비','Balance the other fullback and cover transitions'],
 LCB:['수비라인 유지, 중앙 커버','Maintain the back line and cover the center'],
 RCB:['수비라인 유지, 중앙 커버','Maintain the back line and cover the center'],
 GK:['후방 패스 옵션 및 박스 보호','Support buildup and protect the box']
};
function roleRows(formation,count){
 const assigned=allocations[formation][count]||[],all=formations[formation].map(x=>x[0]);
 return {humans:assigned.map(p=>({position:p,description:descriptions[p]||[p,p]})),
         ai:all.filter(p=>!assigned.includes(p))};
}
function shareText(){
 const r=model,formation=selected||r.suggested,rows=roleRows(formation,people),dx=diagnoses(r);
 const lines=[
  'DOKDO FC · '+t('경기 전 전술 요약','Pre-match Tactical Brief'),
  t('포메이션','Formation')+': '+formation,
  t('사람 선수','Human players')+': '+people+' / AI: '+(11-people),
  t('기준','Basis')+': '+t('최근 보관 리그','Last archived league')+' '+r.now.n+t('경기',' matches'),
  t('경기당 득점/실점/승점','Goals for/against/points per match')+': '+avg(r.now.gfAvg)+' / '+avg(r.now.gaAvg)+' / '+avg(r.now.pts),
  t('사람 선수 포지션','Human-controlled positions')+': '+rows.humans.map(x=>x.position).join(', '),
  t('AI 포지션','AI positions')+': '+rows.ai.join(', '),
  t('출전 포지션별 역할','Role assignments')+':'
 ];
 for(const role of rows.humans)lines.push('- '+role.position+': '+role.description[en()?1:0]);
 lines.push('',t('전술 근거','Analysis')+': '+dx.risks.join(' '));
 if(lineupMode){
  const xi=bestXI(r.roster,formation,r.history);
  lines.push('',t('기록 기반 베스트11 후보','Stats-based Best XI candidates')+':');
  formations[formation].forEach(([role])=>lines.push(role+': '+(xi[role]?.name||'AI / Unverified')));
 }
 lines.push(t('주의: 경기 결과 기반 전술 실험안이며 EA 공식 추천이 아닙니다.','Note: These are experimental suggestions based on results, not official EA recommendations.'));
 lines.push('https://insungmeta.github.io/dokdo-fc/'+(en()?'?lang=en#tactics':'#tactics'));
 return lines.join('\n');
}
function render(){
 if(!model)return;
 const {now,before,pass,delta,suggested,updated}=model,formation=selected||suggested;
 const qualified=now.n>=5,dx=diagnoses(model);
 for(const button of root.querySelectorAll('[data-tl-formation]')){
  const current=button.dataset.tlFormation===formation;button.classList.toggle('is-selected',current);
  button.setAttribute('aria-pressed',String(current));
 }
 for(const button of root.querySelectorAll('[data-tl-people]')){
  const current=Number(button.dataset.tlPeople)===people;button.classList.toggle('is-selected',current);
  button.setAttribute('aria-pressed',String(current));
 }
 const status=updated&&!Number.isNaN(Date.parse(updated))?new Date(updated).toLocaleString(en()?'en-GB':'ko-KR',{timeZone:'Asia/Seoul',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}):t('시각 미확인','time unknown');
 const stale=!updated||Date.now()-Date.parse(updated)>20*60*1000;
 id('tlEvidence').textContent=(stale?t('데이터 지연 · ','Data delayed · '):'')+t('최근 보관 리그 ','Last ')+now.n+t('경기 · 마지막 수집 ',' archived league games · last collected ')+status;
 id('tlEvidence').classList.toggle('is-stale',stale);
 id('tlStats').innerHTML=[
  [t('경기당 득점','Goals per Game'),avg(now.gfAvg)],
  [t('경기당 실점','Conceded per Game'),avg(now.gaAvg)],
  [t('경기당 승점','Points per Game'),avg(now.pts)],
  [t('무실점 경기','Clean Sheets'),now.clean+'/'+now.n]
 ].map(([name,value])=>'<div class="tl-stat"><span>'+escape(name)+'</span><strong>'+escape(value)+'</strong></div>').join('');
 id('tlTitle').textContent=formation+' · '+(qualified?t('추천 배치','Suggested Setup'):t('기본 전술 예시','Example Setup'));
 const lineup=lineupMode?bestXI(model.roster,formation,model.history):null;
 id('tlPitch').innerHTML=pitch(formation,people,lineup);
 const assigned=lineup?allocations[formation][people].filter(pos=>lineup[pos]).length:people;
 id('tlLegend').textContent=lineupMode?
   t('연두색: 실제 기록 있는 선발 후보 '+assigned+'명 · 나머지 AI (현재 접속 여부 미확인)','Lime: '+assigned+' candidates with saved stats · others AI (online status unverified)'):
   t('연두색: 직접 조작 '+people+'명 · 회색: AI '+(11-people)+'명 (골키퍼 AI 포함)','Lime: '+people+' human-controlled · Grey: '+(11-people)+' AI (including GK)');
 id('tlBestXI').classList.toggle('is-selected',lineupMode);
 id('tlBestXI').setAttribute('aria-pressed',String(lineupMode));
 id('tlBestXIPanel').hidden=!lineupMode;
 if(lineupMode){
  const positions=formations[formation].map(row=>row[0]);
  const active=new Set(allocations[formation][people]);
  const filled=positions.filter(pos=>Boolean(lineup[pos])).length;
  id('tlBestXICount').textContent=t('선수 후보 '+filled+'명 / 11자리','Candidates '+filled+' / 11 slots');
  id('tlXIList').innerHTML=positions.map(pos=>{
   const p=lineup[pos],human=active.has(pos)&&Boolean(p),rating=p?Number(p.ratingAve).toFixed(1):'—';
   return '<div class="tl-xi-row"><strong>'+escape(pos)+'</strong><span class="tl-xi-name">'+escape(p?.name||t('AI / 미확인','AI / Unverified'))+'</span>'+
     '<span class="tl-xi-info">'+(p?(()=>{
      const primary=primaryPosition(p,model.history),roleLabel=roleNames[primary.category]?.[en()?1:0]||t('미확인','Unverified');
      const proof=primary.source==='archive'?t('보관 출전 ','Archived appearances ')+primary.observed+'/'+primary.total:
        t('EA 명단 기준','EA roster only');
      return escape(t('시즌 ','Season ')+Number(p.goals)+t('골',' goals')+' · '+t('평점 ','Rating ')+rating+' · '+roleLabel+' · '+proof);
     })():'—')+'</span>'+
     '<span class="tl-xi-tag '+(human?'is-human':'')+'">'+(human?'USER':'AI')+'</span></div>';
  }).join('');
  id('tlXIExplanation').textContent=t(
   '선수 주 포지션은 보관된 경기에서 3회 이상, 전체 관측의 60% 이상으로 확인되면 그 기록을 우선합니다. 기록이 부족하면 EA 명단의 최근 포지션을 임시 사용합니다. 시즌 득점·도움·평점으로 후보를 비교하며, ST는 득점 실적을 더 중시합니다. LB·CB 등의 세부 적합도와 현재 접속 여부는 알 수 없습니다. 실제 조작 인원 설정과 나머지 AI는 별도입니다.',
   'Primary position uses archived match roles when at least 3 appearances and 60% agree. Otherwise the latest EA roster position is provisional. Selection considers season goals, assists and rating, with ST weighted toward scoring. Specialist roles and online status are unknown. Human/AI slots remain separate.'
  );
 }
 id('tlRecommendFormation').textContent=t('추천 포메이션 보기','View Suggested Formation');
 id('tlReason').textContent=!qualified
  ?t('5경기 미만이므로 실제 결과 기반 추천을 보류합니다. 4-2-3-1은 기본 예시일 뿐입니다.','Fewer than 5 matches: there is not enough evidence for a result-based recommendation.')
  :formation!==suggested
  ?t('직접 선택한 대안 전술입니다. 최근 결과만으로 효과가 보장되지 않습니다.','Manually selected alternative; outcomes cannot be guaranteed from match results.')
  :formation==='4-3-3'
  ?t('최근 득점 부족과 상대적으로 낮은 실점을 기준으로 폭넓은 공격을 시험해 볼 수 있습니다.','Low recent scoring with comparatively controlled concessions suggests testing wider attacking patterns.')
  :t('중앙 수비 보호와 ST–CAM 연계를 함께 유지하는 균형형 제안입니다.','Balanced starting point with central cover and ST–CAM link play.');
 id('tlStrengths').innerHTML=dx.strengths.map(s=>'<li>'+escape(s)+'</li>').join('');
 id('tlRisks').innerHTML=dx.risks.map(s=>'<li>'+escape(s)+'</li>').join('');
 const actions=[
 now.gaAvg>=1.6
 ?t('수비: CDM 한 명은 중앙을 지키고, 사람이 조작하는 양쪽 풀백의 동시 오버래핑을 피하세요.','Defense: keep one CDM central; avoid simultaneous forward runs from both human-controlled fullbacks.')
 :t('수비: 중앙 수비 보호 역할을 정하고 공을 잃으면 미드필더가 복귀하세요.','Defense: assign central cover and recover midfielders after losing possession.'),
 now.gfAvg<1.2
 ?t('공격: ST 등지기 → CAM 연결 → 측면 침투 또는 컷백을 반복 연습하세요.','Attack: practice ST hold-up → CAM layoff → winger run or cutback.')
 :t('공격: 기존 득점 패턴을 유지하되 ST와 CAM이 같은 공간을 차지하지 않게 조정하세요.','Attack: preserve working patterns while keeping ST and CAM in distinct spaces.'),
 pass.games>=4&&pass.ratio!==null&&pass.ratio<.7
 ?t('빌드업: 짧은 3각 패스로 압박을 벗어난 뒤 전진 패스를 시도하세요.','Build-up: escape pressure through short triangles before playing forward.')
 :t('빌드업: CDM을 안전한 후방 패스 옵션으로 남기고 윙어에게 폭을 유지하도록 역할을 지정하세요.','Build-up: keep a CDM as a safe outlet; ask wingers to maintain width.')
 ];
 id('tlActions').innerHTML=actions.map(a=>'<li>'+escape(a)+'</li>').join('');
 const roles=roleRows(formation,people);
 id('tlRoles').innerHTML=roles.humans.map(role=>'<li><strong>'+escape(role.position)+'</strong> · '+escape(role.description[en()?1:0])+'</li>').join('');
 id('tlAIPositions').textContent=t('AI 조작 포지션: ','AI-controlled positions: ')+roles.ai.join(' · ');
 id('tlCopy').textContent=t('전술 요약 복사','Copy Tactical Brief');
 const extra=delta===null?t('이전 10경기와 비교할 20경기 표본은 부족합니다.','Fewer than 20 archived matches to compare two periods.')
  :t('이전 10경기 대비 경기당 승점 변화 ','Points/game vs previous 10: ')+(delta>0?'+':'')+avg(delta)+t('점','.'); 
 id('tlMethod').textContent=t('분석 범위: 보관된 리그 결과 최근 '+now.n+'경기의 득점·실점·승점·무실점. ','Analysis: goals for/against, points and clean sheets from the last '+now.n+' archived league matches. ')+extra+' '+t('포메이션 추천은 전술 실험안이며, EA 공식 알고리즘이나 실제 실점 원인 분석이 아닙니다. 사람 선수 패스 통계는 누락될 수 있습니다.','Formation advice is editorial, not an official EA model or a diagnosis of causes. Human pass stats may be incomplete.');
}
id('tlBestXI').addEventListener('click',()=>{
 lineupMode=!lineupMode;
 if(lineupMode)selected=null;
 id('tlShareStatus').textContent='';
 render();
});
id('tlRecommendFormation').addEventListener('click',()=>{
 if(!model){
  id('tlFormationFeedback').textContent=t('경기 데이터가 로드된 뒤 추천 전술을 볼 수 있습니다.','Suggested formation is available after match data loads.');
  return;
 }
 const prior=selected||model.suggested;
 selected=null;
 id('tlShareStatus').textContent='';
 render();
 id('tlFormationFeedback').textContent=(prior===model.suggested?
  t('현재 추천 전술은 ','Current suggested formation: '):
  t('선택한 전술에서 추천 전술로 전환했습니다. ','Switched to the suggested formation. '))+
  model.suggested+t(' · 게임 안에서는 직접 포메이션을 설정해야 합니다.',' · This does not change settings inside EA FC.');
});
root.addEventListener('click',event=>{
 const btn=event.target.closest('[data-tl-people],[data-tl-formation]');
 if(!btn)return;
 if(btn.dataset.tlPeople){people=Number(btn.dataset.tlPeople)||5;}
 if(btn.dataset.tlFormation){
  selected=btn.dataset.tlFormation;
  id('tlFormationFeedback').textContent=t('선택한 포메이션 보기: ','Viewing formation: ')+selected+
   t(' · 게임 안에서는 직접 설정해야 합니다.',' · Set this separately in EA FC.');
 }
 id('tlShareStatus').textContent='';
 render();
});
id('tlCopy').addEventListener('click',async()=>{
 if(!model){id('tlShareStatus').textContent=t('경기 데이터 준비 후 사용할 수 있습니다.','Available after match data has loaded.');return;}
 const btn=id('tlCopy');
 btn.disabled=true;
 try{
  if(!navigator.clipboard||!navigator.clipboard.writeText)throw Error('Clipboard API unavailable');
  await navigator.clipboard.writeText(shareText());
  id('tlShareStatus').textContent=t('복사되었습니다. 팀 채팅에 붙여넣으세요.','Copied. Paste it into the team chat.');
 }catch(error){
  id('tlShareStatus').textContent=t('복사 권한이 차단됐습니다. HTTPS에서 다시 시도해 주세요.','Clipboard permission was denied. Retry on HTTPS.');
 }finally{btn.disabled=false;}
});
const receive=()=>{if(window.__dokdoData){model=compute(window.__dokdoData);render();}};
document.addEventListener('dokdo:ready',receive);
receive();
})();