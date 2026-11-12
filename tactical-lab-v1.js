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
 '4-3-3':[['GK',50,91],['LB',17,77],['LCB',39,77],['RCB',61,77],['RB',83,77],['CDM',50,60],['LCM',29,48],['RCM',71,48],['LW',17,29],['ST',50,15],['RW',83,29]]
};
const allocations={
 '4-2-3-1':{5:['ST','LW','CAM','RW','LCDM'],7:['ST','LW','CAM','RW','LCDM','RCDM','LCB'],9:['ST','LW','CAM','RW','LCDM','RCDM','LCB','LB','RB']},
 '4-3-3':{5:['ST','LW','RW','LCM','CDM'],7:['ST','LW','RW','LCM','RCM','CDM','LCB'],9:['ST','LW','RW','LCM','RCM','CDM','LCB','LB','RB']}
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
 return {now,before,pass,delta,suggested,updated:data?.sync?.lastSuccess||null,roster:Array.isArray(data?.members)?data.members:[]};
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

/* Transparent positional shortlist, not an official EA Best XI.
 * EA roster positions are broad (FW/MF/DF/GK), not verified LB/CB/CAM roles.
 * Do not invent specialists, field positions, player availability or online status.
 */
const roleCategory=pos=>pos==='GK'?'goalkeeper':
 ['ST','LW','RW'].includes(pos)?'forward':
 ['LB','LCB','RCB','RB'].includes(pos)?'defender':'midfielder';
function candidateScore(player,category){
 const games=Math.max(0,Number(player.gamesPlayed)||0);
 const rating=Math.max(0,Math.min(10,Number(player.ratingAve)||0));
 const gf=Math.max(0,Number(player.goals)||0)/Math.max(1,games);
 const assists=Math.max(0,Number(player.assists)||0)/Math.max(1,games);
 const mvp=Math.max(0,Number(player.manOfTheMatch)||0)/Math.max(1,games);
 // Prioritize EA season average rating and minimum experience.
 // Role-specific rates are secondary; there is NO detailed positional tracking.
 if(category==='goalkeeper')return Math.max(0,Number(player.cleanSheetsGK)||0)*8+Math.min(games,50)/10;
 return rating*10+Math.min(games,80)/8+(category==='forward'?gf*24+assists*10:
 category==='midfielder'?gf*9+assists*20:gf*2+assists*3)+mvp*7;
}
function bestXI(roster,formation){
 const members=Array.isArray(roster)?roster:[],used=new Set(),chosen={};
 const valid=members.filter(p=>p&&p.name&&Number(p.gamesPlayed)>=5&&
   Number.isFinite(Number(p.ratingAve))&&Number(p.ratingAve)>0);
 const priority=formation==='4-3-3'
 ? ['GK','LCB','RCB','LB','RB','CDM','LCM','RCM','ST','LW','RW']
 : ['GK','LCB','RCB','LB','RB','LCDM','RCDM','CAM','ST','LW','RW'];
 for(const role of priority){
  const category=roleCategory(role);
  const options=valid.filter(p=>{
   const position=String(p.position||p.favoritePosition||'').toLowerCase();
   // GK clean sheets demonstrate some historical GK participation; not current GK status.
   return category==='goalkeeper'?
       position==='goalkeeper'||Number(p.cleanSheetsGK)>0:
       position===category;
  }).filter(p=>!used.has(String(p.name).toLowerCase()));
  options.sort((a,b)=>candidateScore(b,category)-candidateScore(a,category)||
      Number(b.gamesPlayed)-Number(a.gamesPlayed)||String(a.name).localeCompare(String(b.name)));
  if(options.length){
   const p=options[0];chosen[role]=p;used.add(String(p.name).toLowerCase());
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
  const xi=bestXI(r.roster,formation);
  lines.push('',t('기록 기반 베스트11 후보','Stats-based Best XI candidates')+':');
  formations[formation].forEach(([role])=>lines.push(role+': '+(xi[role]?.name||'AI / Unverified')));
 }
 lines.push(t('주의: 경기 결과 기반 전술 실험안이며 EA 공식 추천이 아닙니다.','Note: These are experimental suggestions based on results, not official EA recommendations.'));
 lines.push('https://insungmeta.github.io/dokdo-fc/'+(en()?'?lang=en#more':'#more'));
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
 const lineup=lineupMode?bestXI(model.roster,formation):null;
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
     '<span class="tl-xi-info">'+(p?escape(t('평점 ','Rating ')+rating+' · '+Number(p.gamesPlayed)+t('경기',' games')):'—')+'</span>'+
     '<span class="tl-xi-tag '+(human?'is-human':'')+'">'+(human?'USER':'AI')+'</span></div>';
  }).join('');
  id('tlXIExplanation').textContent=t(
   'EA 시즌 평균 평점·출전 수·포지션별 득점/도움 기여를 활용한 비공식 추천입니다. 포지션은 FW/MF/DF 등 대분류만 확인되어 LB·CB 등 세부 적합도, 현재 접속·출전 가능 여부는 검증되지 않았습니다. GK는 클린시트 보유 기록으로 후보를 판단합니다. 실제 조작 선수는 위 인원 설정에 따른 일부이며 나머지는 AI로 표시됩니다.',
   'Unofficial shortlist based on EA season rating, appearances and position-weighted goals/assists. EA provides broad FW/MF/DF roles only; specialist roles and online availability cannot be verified. GK candidates use recorded clean sheets. Human selections follow the player-count setting; remaining slots show AI.'
  );
 }
 id('tlRecommendFormation').textContent=t('추천 포메이션 적용','Apply Suggested Formation');
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
 selected=null;
 id('tlShareStatus').textContent='';
 render();
});
root.addEventListener('click',event=>{
 const btn=event.target.closest('[data-tl-people],[data-tl-formation]');
 if(!btn)return;
 if(btn.dataset.tlPeople){people=Number(btn.dataset.tlPeople)||5;}
 if(btn.dataset.tlFormation){selected=btn.dataset.tlFormation;}
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