/* DOKDO FC / LIVE PLAYER-FIRST DASHBOARD / EA DATA */
(async()=>{
'use strict';
const $=id=>document.getElementById(id),E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>v==null||v===''||!Number.isFinite(Number(v))?0:Number(v);
const name=p=>String(p?.name||p?.playerName||'').trim();
const human=p=>Number(p?.playerId)>0&&!!name(p)&&!/^(AI|CPU|COM|BOT|VIRTUAL PRO AI)$/i.test(name(p));
const df=p=>/^(defender|def|df)$/i.test(String(p?.position||p?.favoritePosition||p?.proPos||'').trim());
const gk=p=>/^(goalkeeper|gk)$/i.test(String(p?.position||p?.favoritePosition||p?.proPos||'').trim());
const date=t=>{const d=new Date(t);return Number.isNaN(d.getTime())?'—':d.toLocaleString('ko-KR',{timeZone:'Asia/Seoul',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false})};
const fullDate=t=>{const d=new Date(t);return Number.isNaN(d.getTime())?'—':d.toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})};
const missing=m=>{if(!m.dnf)return false;const players=[...(m.players||[]),...(m.opponentPlayers||[])];return !players.length||players.every(p=>['shots','goals','assists','passesMade','passAttempts','interceptions','tacklesMade'].every(k=>!num(p[k]))&&(!num(p.rating)||num(p.rating)===6))};
let data;try{const response=await fetch('./data/dashboard.json?v='+Date.now(),{cache:'no-store'});if(!response.ok)throw Error('HTTP '+response.status);data=await response.json();if(!Array.isArray(data.matches)||!Array.isArray(data.members))throw Error('데이터 형식 오류')}catch(err){console.error(err);document.querySelector('main').innerHTML='<section class="panel" style="padding:32px"><h2>팀 데이터를 불러올 수 없습니다.</h2><p>새로고침하거나 자동 수집 상태를 확인해 주세요.</p><a href="./legacy.html">이전 홈페이지 열기 →</a></section>';return}
const members=data.members.filter(m=>m&&m.name),matches=[...data.matches].filter(m=>m.matchId).sort((a,b)=>String(b.timestamp||'').localeCompare(String(a.timestamp||'')));
const leagues=matches.filter(m=>m.matchType==='leagueMatch');
const SUM=(arr,key)=>arr.reduce((s,p)=>s+num(p[key]),0);
const profiles={};
const pos=p=>({forward:'공격수',midfielder:'미드필더',defender:'수비수',goalkeeper:'골키퍼'}[String(p?.position||p?.favoritePosition||p?.proPos||'').toLowerCase()]||'DFC 선수');
for(const p of members)profiles[p.name]={name:p.name,tag:pos(p),appearances:num(p.gamesPlayed),goals:num(p.goals),assists:num(p.assists),rating:num(p.ratingAve),mvp:num(p.manOfTheMatch),cleanSheets:num(p.cleanSheetsGK),gk:gk(p)};
const byId=new Map();
for(const m of matches){if(missing(m))continue;const seen=new Set();for(const p of m.players||[]){if(!human(p)||seen.has(String(p.playerId)))continue;seen.add(String(p.playerId));const id=String(p.playerId),nm=name(p);let v=byId.get(id);if(!v){v={name:nm,dfMatches:0,tackles:0,interceptions:0,aerial:0,yellow:0,red:0,cardMatches:0,gkMatches:0,saves:0};byId.set(id,v)}v.cardMatches++;v.yellow+=num(p.yellowCards);v.red+=num(p.redCards);if(df(p)){v.dfMatches++;v.tackles+=num(p.tacklesMade);v.interceptions+=num(p.interceptions);v.aerial+=num(p.aerialDuelsWonDefending)}if(gk(p)){v.gkMatches++;v.saves+=num(p.saves)}}}
for(const v of byId.values())profiles[v.name]={tag:'보관 경기 선수',...(profiles[v.name]||{}),...v};
const archived=[...byId.values()];
const specs={
goals:['시즌 득점','EA 시즌 선수 누적','골','⚽ GOLDEN BOOT','EA 시즌 누적 득점'],
assists:['시즌 도움','EA 시즌 선수 누적','도움','🎯 PLAYMAKER','EA 시즌 누적 도움'],
rating:['시즌 평균 평점','EA 시즌 선수 누적','점','⭐ PLAYER RATING','출전 경기 수가 서로 다른 선수들의 EA 평균 평점'],
mvp:['시즌 MVP','EA 시즌 선수 누적','회','🏅 MOST VALUABLE PLAYER','EA 시즌 MVP 선정 횟수'],
appearances:['시즌 출전','EA 시즌 선수 누적','경기','📅 APPEARANCES','EA 시즌 출전 경기 횟수'],
tackles:['DF 태클 성공','보관된 DF 경기','회','🦶 DEFENSE TACKLES','실제 DF로 출전한 경기의 태클만 집계'],
interceptions:['DF 인터셉트','보관된 DF 경기','회','🧱 DEFENSE INTERCEPTIONS','실제 DF로 출전한 경기의 인터셉트만 집계'],
aerial:['DF 수비 공중볼','보관된 DF 경기','승','🪂 DEFENSE AERIAL','실제 DF로 출전한 경기의 수비 공중볼 승리'],
cards:['경고·퇴장','보관 경기 · 전 포지션','','🟨🟥 CARDS','퇴장 수 우선, 다음 경고 수 · 보관 경기만 집계'],
goalkeepers:['골키퍼 클린시트','EA 시즌 골키퍼 누적','회','🧤 GOALKEEPER','EA 시즌 골키퍼 클린시트']
};
const field={goals:'goals',assists:'assists',rating:'rating',mvp:'mvp',appearances:'appearances',tackles:'tackles',interceptions:'interceptions',aerial:'aerial',cards:'red',goalkeepers:'cleanSheets'};
const boards={};
for(const [key,f] of Object.entries(field)){
const [label,period,unit,badge,note]=specs[key];
let arr=key==='goalkeepers'?members.filter(gk):['tackles','interceptions','aerial','cards'].includes(key)?archived.filter(x=>key==='cards'?x.cardMatches:x.dfMatches):members;
arr=arr.map(x=>profiles[x.name]||x).filter(x=>key!=='cards'||num(x.red)+num(x.yellow)>0);
arr.sort((a,b)=>num(b[f])-num(a[f])||(key==='cards'?num(b.yellow)-num(a.yellow):0)||num(b.appearances)-num(a.appearances)||String(a.name).localeCompare(String(b.name)));
boards[key]={label,period,unit,badge,note,rows:arr.slice(0,10).map(x=>key==='cards'?[x.name,num(x.red),'🟨 '+num(x.yellow)+' · 🟥 '+num(x.red)]:[x.name,num(x[f])])}}
let active='mvp';
function detail(n,k){const p=profiles[n]||{},b=boards[k],r=b.rows.find(x=>x[0]===n);if(!r)return;
$('profileCategory').textContent=b.badge;$('profileAvatar').textContent=n.slice(0,1).toUpperCase();$('profileName').textContent=n;$('profileRole').textContent=p.tag||'DFC 선수';$('profileMainLabel').textContent=b.label;$('profilePeriod').textContent=b.period;$('profileMainValue').textContent=k==='cards'?'카드':r[1]+b.unit;$('profileMainValue').style.fontSize=k==='cards'?'28px':'';
const items=['tackles','interceptions','aerial'].includes(k)?[['DF 출전',p.dfMatches??0],['태클 성공',p.tackles??0],['인터셉트',p.interceptions??0],['수비 공중볼',p.aerial??0]]:k==='cards'?[['경고',p.yellow??0],['퇴장',p.red??0],['보관 경기',p.cardMatches??0],['대상','모든 포지션']]:k==='goalkeepers'?[['GK 경기(보관)',p.gkMatches??'—'],['클린시트',p.cleanSheets??0],['선방(보관)',p.saves??'—'],['평점',p.rating??'—']]:[['출전',p.appearances??'—'],['득점',p.goals??'—'],['도움',p.assists??'—'],['MVP',p.mvp??'—']];
$('profileSecondary').innerHTML=items.map(([a,b])=>'<div class="profile-stat"><span>'+E(a)+'</span><strong>'+E(b)+'</strong></div>').join('');$('profileHint').textContent=b.note;$('profileBadge').textContent=b.period;document.querySelectorAll('.standing-row').forEach(el=>el.classList.toggle('active',el.dataset.name===n))}
function leader(k){active=k;const b=boards[k];document.querySelectorAll('[data-leader]').forEach(el=>el.classList.toggle('active',el.dataset.leader===k));const mx=Math.max(1,...b.rows.map(x=>x[1]));$('leaderRows').innerHTML=b.rows.length?b.rows.map(([n,v,c],i)=>'<div class="standing-row" role="button" tabindex="0" data-name="'+E(n)+'"><span class="order">'+String(i+1).padStart(2,'0')+'</span><div class="who"><strong>'+E(n)+'</strong><span>'+E(profiles[n]?.tag||'DFC 선수')+'</span></div><div class="progress"><i style="width:'+Math.max(3,Math.round(v/mx*100))+'%"></i></div><b class="amount">'+E(c||v+' '+b.unit)+'</b></div>').join(''):'<p class="note">해당 부문에 집계된 선수가 없습니다.</p>';$('leaderNote').textContent=b.note;if(b.rows.length)detail(b.rows[0][0],k)}
$('leaderTabs').addEventListener('click',e=>{const el=e.target.closest('[data-leader]');if(el)leader(el.dataset.leader)});
$('leaderRows').addEventListener('click',e=>{const el=e.target.closest('[data-name]');if(el){detail(el.dataset.name,active);$('playerDetails').open=true;if(window.matchMedia('(max-width:820px)').matches)$('playerDetails').scrollIntoView({behavior:'smooth',block:'start'})}});
$('leaderRows').addEventListener('keydown',e=>{const el=e.target.closest('[data-name]');if(el&&(e.key==='Enter'||e.key===' ')){e.preventDefault();detail(el.dataset.name,active);$('playerDetails').open=true;if(window.matchMedia('(max-width:820px)').matches)$('playerDetails').scrollIntoView({behavior:'smooth',block:'start'})}});
const crests=new Map(matches.filter(m=>m.opponentCrestUrl).map(m=>[String(m.opponentId),m.opponentCrestUrl]));
function crest(id,n,size='small'){const raw=crests.get(String(id))||'',url=/^https:\/\/eafc24\.content\.easports\.com\//.test(raw)?raw:'';const ab=String(n||'FC').trim().split(/\s+/).slice(0,2).map(s=>s.slice(0,1)).join('').toUpperCase();return '<span class="crest-frame '+size+'" role="img" aria-label="'+E(n)+' 엠블럼"><span class="crest-fallback">'+E(ab)+'</span>'+(url?'<img class="crest-img" src="'+E(url)+'" loading="lazy" alt="">':'')+'</span>'}
const dfc=cls=>'<svg class="mini-logo '+(cls||'')+'" role="img" aria-label="DOKDO FC 엠블럼"><use href="#dfc-crest"/></svg>';
document.addEventListener('error',e=>{if(e.target.matches?.('.crest-img'))e.target.parentElement.classList.add('is-fallback')},true);
const groups=new Map(),seen=new Set();
for(const m of matches){const id=String(m.matchId);if(seen.has(id))continue;seen.add(id);const key=String(m.opponentId||('name:'+String(m.opponentName).toLowerCase()));let v=groups.get(key);if(!v){v={key,name:String(m.opponentName||'상대팀'),opponentId:m.opponentId,fixtures:[]};groups.set(key,v)}v.fixtures.push(m)}
const rivals=[...groups.values()].sort((a,b)=>b.fixtures.length-a.fixtures.length||a.name.localeCompare(b.name));
$('rivalSelect').innerHTML=rivals.map(x=>'<option value="'+E(x.key)+'">'+E(x.name)+' ('+x.fixtures.length+'회)</option>').join('');
function h2h(k){const g=groups.get(String(k));if(!g)return;$('rivalSelect').value=g.key;const ms=[...g.fixtures].sort((a,b)=>String(b.timestamp||'').localeCompare(String(a.timestamp||'')));const w=ms.filter(m=>num(m.goals)>num(m.goalsAgainst)).length,d=ms.filter(m=>num(m.goals)===num(m.goalsAgainst)).length,l=ms.length-w-d;
$('h2hOpponentGroup').innerHTML=crest(g.opponentId,g.name,'small')+'<span>'+E(g.name)+'</span>';$('h2hCount').innerHTML=ms.length+'<span>번의 맞대결</span>';$('h2hCoverage').textContent=ms.length>1?'보관된 경기에서 재대결 확인':'보관된 경기 기준';$('h2hWin').textContent=w;$('h2hDraw').textContent=d;$('h2hLoss').textContent=l;$('h2hLine').innerHTML='<i style="width:'+Math.round(w/ms.length*100)+'%"></i>';$('h2hFor').textContent=SUM(ms,'goals');$('h2hAgainst').textContent=SUM(ms,'goalsAgainst');
$('h2hFixtures').innerHTML=ms.slice(0,10).map(m=>{const st=num(m.goals)>num(m.goalsAgainst)?'w':num(m.goals)<num(m.goalsAgainst)?'l':'d';return '<div class="h2h-fixture"><b class="result '+st+'">'+st.toUpperCase()+'</b><span class="fixture-logos">'+dfc()+crest(g.opponentId,g.name,'small')+'</span><span>'+E(date(m.timestamp))+(m.dnf?' · DNF':'')+'</span><strong>'+num(m.goals)+' : '+num(m.goalsAgainst)+'</strong></div>'}).join('')}
$('rivalSelect').addEventListener('change',e=>h2h(e.target.value));
function updateH2H(m){const key=String(m.opponentId||('name:'+String(m.opponentName).toLowerCase())),g=groups.get(key);if(!g)return;const a=g.fixtures,w=a.filter(x=>num(x.goals)>num(x.goalsAgainst)).length,d=a.filter(x=>num(x.goals)===num(x.goalsAgainst)).length;$('inlineH2H').textContent='🤝 '+g.name+' 상대전적 · 보관 '+a.length+'전 '+w+'승 '+d+'무 '+(a.length-w-d)+'패';h2h(key)}
const G=m=>{const ps=(m.players||[]).filter(human),op=(m.opponentPlayers||[]).filter(human),p=[ps,op],pair=k=>p.map(a=>SUM(a,k));return {raw:m,opp:String(m.opponentName||'상대팀'),id:m.opponentId,time:date(m.timestamp),score:[num(m.goals),num(m.goalsAgainst)],dnf:missing(m)||!ps.length,counts:p.map(x=>x.length),shots:pair('shots'),onTarget:pair('shotsOnTarget'),tackles:pair('tacklesWon'),interceptions:pair('interceptions'),passes:pair('passesCompleted'),attempts:pair('passAttempts')}};
const games=matches.map(G);

const matchReview=$('matchReviewPanel'),reviewDock=$('reviewDock');
let selectedMatchButton=null;
function closeMatchReview(){
 if(selectedMatchButton){selectedMatchButton.setAttribute('aria-expanded','false');selectedMatchButton.classList.remove('active')}
 selectedMatchButton=null;
 matchReview.hidden=true;
 reviewDock.appendChild(matchReview);
}
function toggleMatchReview(index,button){
 if(!button)return;
 if(selectedMatchButton===button&&!matchReview.hidden){closeMatchReview();return}
 closeMatchReview();
 game(index);
 button.insertAdjacentElement('afterend',matchReview);
 matchReview.hidden=false;
 button.setAttribute('aria-expanded','true');
 button.classList.add('active');
 selectedMatchButton=button;
}
$('matchReviewClose').addEventListener('click',()=>{
 const source=selectedMatchButton;
 closeMatchReview();
 if(source&&source.isConnected)source.focus({preventScroll:true});
});

function game(i){const m=games[i];if(!m)return;$('gameDate').textContent=m.time;$('gameTeamDisplay').innerHTML=dfc('detail-crest')+'<span class="team-name-pair">DOKDO FC <span>VS</span> '+E(m.opp)+'</span>'+crest(m.id,m.opp,'small');$('scoreUs').textContent=m.score[0];$('scoreThem').textContent=m.score[1];updateH2H(m.raw);
if(m.dnf){$('compareRows').innerHTML='<div class="coverage">이 경기의 선수별 세부 기록이 미집계되었습니다.</div>';$('coverage').textContent='세부 통계가 제공되지 않아 0으로 표시하지 않습니다.';$('ourPass').textContent='—';$('theirPass').textContent='—';return}
$('compareRows').innerHTML=[['슈팅','shots'],['유효슈팅','onTarget'],['태클 성공','tackles'],['인터셉트','interceptions']].map(([label,k])=>{const a=m[k][0],b=m[k][1],mx=Math.max(a,b,1);return '<div class="dual"><strong>'+a+'</strong><div class="lane"><i style="width:'+Math.round(a/mx*100)+'%"></i></div><span class="label">'+label+'</span><div class="lane r"><i style="width:'+Math.round(b/mx*100)+'%"></i></div><strong>'+b+'</strong></div>'}).join('');
$('coverage').innerHTML='수집된 사람 선수 기록 · DOKDO FC <b>'+m.counts[0]+'</b>명 / 상대 <b>'+m.counts[1]+'</b>명. AI 및 누락된 상대팀 기록은 제외합니다.';$('ourPass').textContent=m.attempts[0]?Math.round(m.passes[0]/m.attempts[0]*100)+'%':'—';$('theirPass').textContent=m.attempts[1]?Math.round(m.passes[1]/m.attempts[1]*100)+'%':'—'}

const matchItem=(m,i)=>{const st=m.score[0]>m.score[1]?'w':m.score[0]<m.score[1]?'l':'d';const type=({leagueMatch:'리그',friendlyMatch:'친선',playoffMatch:'플레이오프'})[m.raw.matchType]||'경기';return '<button type="button" class="match-item '+({w:'win',l:'loss',d:'draw'}[st])+'" data-game="'+i+'" aria-expanded="false" aria-controls="matchReviewPanel"><span class="wl">'+st.toUpperCase()+'</span><span class="match-logos">'+dfc()+crest(m.id,m.opp,'small')+'</span><span style="min-width:0"><div class="title">'+E(m.opp)+'</div><div class="date">'+E(m.time)+' · '+E(type)+(m.raw.dnf?' · DNF':'')+'</div></span><span class="score">'+m.score[0]+' : '+m.score[1]+'<span class="match-chevron" aria-hidden="true">⌄</span></span></button>'};
const topGames=games.map((m,i)=>({m,i})).slice(0,5);
$('heroRecentCount').textContent='최근 '+topGames.length+'경기';
$('heroRecentMatches').innerHTML=topGames.length?topGames.map(x=>matchItem(x.m,x.i)).join(''):'<p class="hero-loading">아직 보관된 경기가 없습니다.</p>';
$('heroRecentMatches').addEventListener('click',e=>{const el=e.target.closest('[data-game]');if(!el)return;toggleMatchReview(num(el.dataset.game),el)});
let archiveKind='all',archiveExpanded=false;
function renderArchive(){
 closeMatchReview();
 const indices=games.map((m,i)=>({m,i})).filter(x=>archiveKind==='all'||x.m.raw.matchType===archiveKind);
 const selected=archiveExpanded?indices:indices.slice(0,10);
 $('archiveTotal').textContent='('+games.length+'경기)';
 $('matchList').innerHTML=selected.length?selected.map(x=>matchItem(x.m,x.i)).join(''):'<p style="padding:16px;color:#98b5bf">이 종류로 보관된 경기는 아직 없습니다.</p>';
 $('archiveVisible').textContent='전체 '+indices.length+'경기 중 '+selected.length+'경기 표시';
 const more=$('archiveShowAll');more.hidden=selected.length>=indices.length;
 if(!more.hidden)more.textContent='나머지 '+(indices.length-selected.length)+'경기 모두 보기';
 $('archiveFilters').querySelectorAll('[data-archive-kind]').forEach(btn=>{const on=btn.dataset.archiveKind===archiveKind;btn.classList.toggle('active',on);btn.setAttribute('aria-pressed',String(on))});
}
renderArchive();
$('matchList').addEventListener('click',e=>{const el=e.target.closest('[data-game]');if(!el)return;toggleMatchReview(num(el.dataset.game),el)});
$('archiveFilters').addEventListener('click',e=>{const btn=e.target.closest('[data-archive-kind]');if(!btn)return;archiveKind=btn.dataset.archiveKind;archiveExpanded=false;renderArchive()});
$('archiveShowAll').addEventListener('click',()=>{archiveExpanded=true;renderArchive()});
document.querySelector('.hero-recent-all').addEventListener('click',()=>{archiveKind='all';archiveExpanded=true;renderArchive()});
const recent=leagues.slice(0,10),forms=recent.map(m=>num(m.goals)>num(m.goalsAgainst)?'w':num(m.goals)<num(m.goalsAgainst)?'l':'d');const w=forms.filter(x=>x==='w').length,d=forms.filter(x=>x==='d').length,l=forms.length-w-d,points=w*3+d;
for(const id of ['formLine','heroFormLine'])$(id).innerHTML=forms.map((x,i)=>'<span class="'+x+'" title="'+num(recent[i].goals)+':'+num(recent[i].goalsAgainst)+'">'+x.toUpperCase()+'</span>').join('');
$('formSummary').textContent=w+'승 · '+d+'무 · '+l+'패 · 승점 '+points+'점';$('heroFormRecord').textContent=w+'승 · '+d+'무 · '+l+'패';$('heroFormPoints').textContent='승점 '+points;$('formW').style.width=(forms.length?w/forms.length*100:0)+'%';$('formD').style.width=(forms.length?d/forms.length*100:0)+'%';$('formL').style.width=(forms.length?l/forms.length*100:0)+'%';
const division=n=>Number.isInteger(Number(n))&&Number(n)>=1&&Number(n)<=6?(Number(n)===1?'엘리트':(Number(n)-1)+'부'):'확인 중',league=data.league||{},overall=data.overall||{};
const dv=division(league.currentDivision);document.querySelector('.division-digit').innerHTML=E(dv.replace('부',''))+(dv.endsWith('부')?'<span>부</span>':'');document.querySelector('.division-showcase').setAttribute('aria-label','현재 '+dv+' 리그');
document.querySelector('.division-subline').innerHTML='<span class="best-division"><b>시즌 최고</b> '+E(division(league.bestDivision))+' 리그</span><span class="season-wdl"><b>리그 전적</b><span>승 <strong>'+num(league.wins)+'</strong></span><i>·</i><span>무 <strong>'+num(league.ties)+'</strong></span><i>·</i><span>패 <strong>'+num(league.losses)+'</strong></span></span>';
document.querySelector('.hero-chips').innerHTML='<span class="chip"><b>CLUB ID</b> '+E(overall.clubId||league.clubId||'331042')+'</span><span class="chip"><b>DIVISION</b> EA 수집 기준</span><span class="chip"><b>갱신</b> '+E(fullDate(data.sync?.lastSuccess))+'</span>';
const metrics=document.querySelectorAll('.metric-strip .metric');if(metrics.length===4){metrics[0].querySelector('b').textContent=num(overall.gamesPlayed)+'G';const wdlCells=metrics[1].querySelectorAll('.wdl-values strong');if(wdlCells.length===3){[overall.wins,overall.ties,overall.losses].forEach((n,i)=>wdlCells[i].textContent=num(n));}else{const wdlOld=metrics[1].querySelector('b');if(wdlOld)wdlOld.textContent=[overall.wins,overall.ties,overall.losses].map(num).join(' / ');}metrics[1].querySelector('small').textContent='승률 '+(num(overall.gamesPlayed)?(num(overall.wins)/num(overall.gamesPlayed)*100).toFixed(1):'0')+'%';metrics[2].querySelector('b').textContent=num(overall.goals);metrics[2].querySelector('small').textContent='실점 '+num(overall.goalsAgainst)+' · EA 누적';metrics[3].querySelector('b').textContent=num(overall.skillRating)}
const stars=document.querySelectorAll('.star-grid .star');['goals','assists','mvp','interceptions','goalkeepers'].forEach((k,i)=>{if(!stars[i])return;const x=boards[k].rows[0];stars[i].querySelector('.hero-number').textContent=x?x[1]:'—';stars[i].querySelector('.person').textContent=x?x[0]:'기록 없음';if(i===3)stars[i].querySelector('.detail').textContent='보관 DF 출전 경기 · 인터셉트'});
/* Match reviews are collapsed by default. */
if(rivals.length)h2h(rivals[0].key);
leader('goals');
const cards=document.querySelector('.cards-board');if(cards)cards.innerHTML=boards.cards.rows.slice(0,3).map(x=>'<div class="card-row"><div><div class="name">'+E(x[0])+'</div><div class="sub">보관된 경기 카드 기록</div></div><div class="card-count">'+E(x[2])+'</div></div>').join('')+'<div class="notice-ribbon"><b>집계 기준</b> · 보관 경기 카드만 표시 · 시즌 누적과 혼합하지 않음</div>';
document.querySelector('.data-disclaimer').innerHTML='<strong>EA 자동 수집 데이터 연동 · 운영 홈페이지</strong> 현재 '+E(dv)+' 리그, 선수 시즌 누적과 보관 경기 수비·상대전적을 집계합니다. 보관된 '+matches.length+'경기만 상대전적에 반영되며, 패스·태클 비교는 수집된 선수 기록이므로 팀 전체 공식 수치와 다를 수 있습니다. 볼 점유율은 원본이 없어 표시하지 않습니다. <button class="method-btn" type="button" id="methodBtn">데이터 표시 기준</button> · <a href="./legacy.html#matches">전체 경기 아카이브</a> · <a href="./legacy.html#board">게시판</a>';
document.querySelector('.h2h-foot').textContent='상대전적은 상대팀 ID와 경기 ID를 기준으로 계산하며 보관된 '+matches.length+'경기만 포함합니다.';
document.querySelector('footer.foot').textContent='DOKDO FC · EA FC27 · FAN PROJECT / NOT AFFILIATED WITH EA';
document.querySelector('.microtop .shell span:last-child').textContent='FC27 · LIVE TEAM DASHBOARD';
document.querySelector('.live').innerHTML='<span class="demo">AUTO UPDATE</span> EA 자동 연동';
document.querySelector('.nav').insertAdjacentHTML('beforeend','<a href="./legacy.html#matches">전체 기록</a><a href="./legacy.html#board">게시판</a>');

const nav=document.querySelector('.nav');
nav.addEventListener('click',e=>{
 const link=e.target.closest('a[href^="#"]');
 if(!link)return;
 const target=document.querySelector(link.getAttribute('href'));
 if(target&&target.tagName==='DETAILS')target.open=true;
 if(target?.id==='more')$('moreDetails').open=true;
 nav.querySelectorAll('a[href^="#"]').forEach(a=>a.classList.toggle('selected',a===link));
});
const backButton=$('backToTop');
const syncBackButton=()=>{backButton.hidden=window.scrollY<460};
window.addEventListener('scroll',syncBackButton,{passive:true});syncBackButton();
backButton.addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));

const modal=$('methodModal');$('methodBtn').addEventListener('click',()=>modal.showModal());$('methodClose').addEventListener('click',()=>modal.close());modal.addEventListener('click',e=>{if(e.target===modal)modal.close()});
window.__dokdoData=data;document.dispatchEvent(new Event('dokdo:ready'));
})();
