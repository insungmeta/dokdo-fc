/* DOKDO FC · Mobile app interface V8 */
(()=>{'use strict';
const init=()=>{
const $=s=>document.querySelector(s),main=$('main.shell'),hero=$('section.hero'),metrics=$('.metric-strip'),players=$('#players'),matches=$('#matches'),rivalry=$('#rivalry'),more=$('#more'),tactics=$('#tactics');
if(!main||!hero||!metrics||!players||!matches||!rivalry||!more||!tactics)return;
const home=document.createElement('section');home.id='app-home';home.className='app-screen';
home.innerHTML='<div class="screen-head"><div><span class="eyebrow">DOKDO FC · EA FC 27</span><h2>클럽 홈</h2></div><small>팀 현황과 최근 경기</small></div>';
hero.before(home);home.append(hero,metrics);
const lead=document.createElement('div');lead.className='home-leaders';lead.innerHTML='<div class="screen-head"><div><span class="eyebrow">SQUAD LEADERS</span><h2>우리 팀 주인공</h2></div><a href="#players">전체 랭킹 ↗</a></div><div class="home-leader-grid" id="homeLeaderGrid"><p class="loading">선수 기록을 불러오는 중</p></div>';home.append(lead);
/* Editorial homepage: keep original live data nodes, change only their layout. */
const banner=document.createElement('div');banner.className='dfc-photo-banner';
banner.innerHTML='<div class="dfc-banner-title"><span>DOKDO FC</span><strong>PRO CLUBS</strong><small>TEAM / RECORD / ANALYSIS</small></div>';
home.insertBefore(banner,hero);
const board=document.createElement('div');board.className='dfc-match-board';
const summary=document.createElement('div');summary.className='dfc-summary-grid';
const lower=document.createElement('div');lower.className='dfc-lower-grid';
board.append(summary,lower);home.insertBefore(board,hero);
const primary=hero.querySelector('.division-primary'),rating=metrics.querySelector('.metric-rating'),form=hero.querySelector('.division-form'),trend=hero.querySelector('.division-trend'),recent=hero.querySelector('.hero-right');
const wrap=(cls,title,node)=>{const card=document.createElement('section');card.className='dfc-board-card '+cls;if(title){const heading=document.createElement('div');heading.className='dfc-card-title';heading.textContent=title;card.append(heading)}if(node)card.append(node);return card};
summary.append(wrap('dfc-summary-division','DIVISION',primary),wrap('dfc-summary-rating','클럽 레이팅',rating),wrap('dfc-summary-form','최근 10경기 폼',form));
const stat=wrap('dfc-summary-stat','시즌 팀 기록',null);stat.append(metrics);summary.append(stat);
lower.append(wrap('dfc-board-matches','',recent),wrap('dfc-board-trend','팀 흐름 · 최근 경기',trend),wrap('dfc-board-leaders','주요 랭킹',lead));
hero.classList.add('dfc-legacy-hero');hero.style.display='none';
players.classList.add('app-screen');matches.classList.add('app-screen');more.classList.add('app-screen');tactics.classList.add('app-screen');
const rivals=document.createElement('section');rivals.className='app-screen';rivals.id='app-rivals';rivals.innerHTML='<div class="screen-head"><div><span class="eyebrow">HEAD TO HEAD</span><h2>상대전적</h2></div><small>상대팀별 맞대결</small></div>';
matches.after(rivals);rivals.append(rivalry);rivalry.open=true;
const disclaimer=$('.data-disclaimer');if(disclaimer)more.append(disclaimer);
const moreDetails=$('#moreDetails');if(moreDetails)moreDetails.open=false;
const teamHead=document.createElement('div');teamHead.className='screen-head';teamHead.innerHTML='<div><span class="eyebrow">TEAM MOMENTUM</span><h2>팀 흐름</h2></div><small>최근 폼과 카드 기록</small>';more.prepend(teamHead);
const tools=document.createElement('div');tools.className='app-tools';
tools.innerHTML='<a class="app-tool" href="./legacy.html#board"><span>팀 게시판<small>팀 소식과 공지 확인</small></span><b>↗</b></a><a class="app-tool" href="./legacy.html#matches"><span>기존 전체 경기 아카이브<small>모든 보관 경기와 이전 화면</small></span><b>↗</b></a>';
if(moreDetails)moreDetails.after(tools);else more.append(tools);
const pt=$('#players .section-title h2');if(pt)pt.textContent='선수 랭킹';
const mt=$('#matches .section-title h2');if(mt)mt.textContent='경기 기록';
const header=$('.header .shell');if(header){const x=document.createElement('span');x.className='app-status';x.innerHTML='<i></i><span id="appDivisionText">FC27</span>';header.append(x)}
const icons={
home:'<path d="m3 10 9-7 9 7v10H3z"/><path d="M9 21v-8h6v8"/>',
players:'<circle cx="9" cy="8" r="3"/><path d="M2.5 20v-2a6.5 6.5 0 0 1 13 0v2M17 7a3 3 0 0 1 0 6m1 3a4 4 0 0 1 4 4"/>',
matches:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16M3 12h18"/><circle cx="12" cy="12" r="2"/>',
rivals:'<path d="M7 3h10v6a5 5 0 0 1-10 0V3ZM7 5H4v3a5 5 0 0 0 5 5m8-8h3v3a5 5 0 0 1-5 5M12 14v4m-4 3h8"/>',
more:'<path d="M4 6h16M4 12h16M4 18h16"/>',
tactics:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 12h18M12 3v18"/><circle cx="8" cy="8" r="1.5"/><path d="m13 15 4-3"/>'};
const labels={home:'클럽 홈',players:'선수 랭킹',matches:'경기 기록',rivals:'상대전적',more:'팀 흐름',tactics:'전술판'};
const bottom=document.createElement('nav');bottom.className='app-bottom-nav';bottom.setAttribute('aria-label','주요 화면');
bottom.innerHTML=Object.entries(labels).map(([id,label])=>'<button type="button" data-screen="'+id+'" aria-label="'+label+' 메뉴"><span class="app-nav-icon"><svg viewBox="0 0 24 24" aria-hidden="true">'+icons[id]+'</svg></span><span class="app-nav-label">'+label+'</span></button>').join('');document.body.append(bottom);

/* The ranking categories are a horizontal swipe strip on phones.
 * Arrows and an explicit "next" hint keep the hidden categories discoverable. */
const leaderTabs=$('#leaderTabs');
if(leaderTabs){
 const controls=document.createElement('div');
 controls.id='leaderMoreControls';controls.className='leader-more-controls';
 controls.setAttribute('role','group');controls.setAttribute('aria-label','선수 랭킹 이동');
 controls.innerHTML='<button type="button" data-rank-direction="-1" aria-label="이전 랭킹 항목">‹</button>'+
 '<span id="leaderScrollHint" aria-live="polite"></span>'+
 '<button type="button" data-rank-direction="1" aria-label="다음 랭킹 항목">›</button>';
 leaderTabs.insertAdjacentElement('afterend',controls);
 const prev=controls.querySelector('[data-rank-direction="-1"]');
 const next=controls.querySelector('[data-rank-direction="1"]');
 const hint=controls.querySelector('#leaderScrollHint');
 const update=()=>{
  const isMobile=window.innerWidth<=1000;
  const max=Math.max(0,leaderTabs.scrollWidth-leaderTabs.clientWidth);
  controls.hidden=!isMobile||max<12;
  if(controls.hidden)return;
  prev.disabled=leaderTabs.scrollLeft<=4;
  next.disabled=leaderTabs.scrollLeft>=max-4;
  const bounds=leaderTabs.getBoundingClientRect();
  const right=Array.from(leaderTabs.querySelectorAll('button')).filter(b=>b.getBoundingClientRect().right>bounds.right+12)
    .map(b=>b.textContent.trim()).filter(Boolean);
  const english=document.documentElement.lang==='en';
  hint.textContent=right.length?(english?'More rankings: ':'다음 항목: ')+right.slice(0,2).join(' · '):
     (english?'Swipe right for previous rankings':'오른쪽으로 밀어 이전 랭킹 보기');
 };
 controls.addEventListener('click',e=>{
  const button=e.target.closest('[data-rank-direction]');if(!button)return;
  leaderTabs.scrollBy({left:Number(button.dataset.rankDirection)*Math.max(170,leaderTabs.clientWidth*.65),behavior:'smooth'});
 });
 leaderTabs.addEventListener('scroll',update,{passive:true});
 window.addEventListener('resize',update,{passive:true});
 leaderTabs.addEventListener('click',()=>requestAnimationFrame(update));
 requestAnimationFrame(update);
 document.addEventListener('dokdo:ready',()=>requestAnimationFrame(update));
}



/* Squad: compact rankings and complete EA-observed member directory, no extra main menu. */
let updateRoster=()=>{},selectSquad=()=>{};
const squadHeading=players.querySelector('.section-title');
const squadStars=players.querySelector('.star-grid');
const squadStats=players.querySelector('.squad-layout');
const squadNotes=players.querySelector('.separate-row');
if(squadHeading&&squadStars&&squadStats&&squadNotes){
 const switcher=document.createElement('div');
 switcher.className='squad-switch';
 switcher.setAttribute('role','group');
 switcher.setAttribute('aria-label','선수 랭킹과 전체 선수 명단 선택');
 switcher.innerHTML='<button type="button" class="is-selected" data-squad-view="ranking" aria-pressed="true">🏆 선수 랭킹</button><button type="button" data-squad-view="roster" aria-pressed="false">👥 전체 선수 명단 <span id="rosterTabCount"></span></button>';
 const ranking=document.createElement('div');
 ranking.id='squadRankingView';
 ranking.append(squadStars,squadStats,squadNotes);
 const roster=document.createElement('section');
 roster.id='squadRosterView';
 roster.className='roster-panel';
 roster.hidden=true;
 roster.innerHTML='<div class="roster-heading"><div><span class="roster-kicker">DOKDO FC · SQUAD DIRECTORY</span><h3>전체 선수 명단 <b id="rosterCount">—</b></h3></div><span class="roster-live" id="rosterObserved">EA 수집 기준</span></div>'+
 '<p class="roster-caution">EA에서 수집·보관된 선수 명단입니다. 과거 소속 선수가 포함될 수 있으며, 현역 여부는 이 데이터만으로 확인할 수 없습니다.</p>'+
 '<div class="roster-toolbar"><label class="roster-search">선수 검색<input id="rosterSearch" type="search" placeholder="선수 닉네임 검색" autocomplete="off"></label><label class="roster-position">포지션<select id="rosterPosition"><option value="all">전체 포지션</option><option value="forward">공격수 (FW)</option><option value="midfielder">미드필더 (MF)</option><option value="defender">수비수 (DF)</option><option value="goalkeeper">골키퍼 (GK)</option><option value="unknown">미확인</option></select></label></div>'+
 '<div class="roster-status" role="group" aria-label="출전 기록 필터"><button type="button" data-roster-status="all" aria-pressed="true" class="is-selected">전체</button><button type="button" data-roster-status="played" aria-pressed="false">출전 기록 있음</button><button type="button" data-roster-status="unplayed" aria-pressed="false">출전 기록 0</button></div>'+
 '<div id="rosterList" class="roster-list" aria-live="polite"></div><div class="roster-bottom"><span id="rosterVisible">기록을 불러오는 중</span><button id="rosterShowAll" type="button" hidden>나머지 선수 모두 보기</button></div>'+
 '<p class="roster-footnote">출전·득점·도움·평점·MVP는 수집된 EA 선수 기록입니다. 출전 기록 0은 비활동 또는 탈퇴를 의미하지 않습니다. <a href="./legacy.html#players">전체 통계 표 ↗</a></p>';
 squadHeading.after(switcher,ranking,roster);
 const rosterSearch=roster.querySelector('#rosterSearch');
 const rosterPosition=roster.querySelector('#rosterPosition');
 const rosterList=roster.querySelector('#rosterList');
 let allRoster=[],rosterStatus='all',rosterExpanded=false;
 const normalizeName=x=>String(x??'').trim().toLocaleLowerCase();
 const posLabel={forward:'FW · 공격수',midfielder:'MF · 미드필더',defender:'DF · 수비수',goalkeeper:'GK · 골키퍼'};
 const positionOf=p=>['forward','midfielder','defender','goalkeeper'].includes(String(p.position||'').toLowerCase())?String(p.position).toLowerCase():'unknown';
 const value=p=>Math.max(0,Number(p)||0);
 const fmtRating=p=>value(p.gamesPlayed)>0&&value(p.ratingAve||p.averageRating)>0?value(p.ratingAve||p.averageRating).toFixed(1):'—';
 const renderRoster=()=>{
  const query=normalizeName(rosterSearch.value),position=rosterPosition.value;
  const matched=allRoster.filter(p=>(!query||normalizeName(p.name).includes(query)||normalizeName(p.playerName).includes(query))&&(position==='all'||positionOf(p)===position)&&(rosterStatus==='all'||(rosterStatus==='played'?value(p.gamesPlayed)>0:value(p.gamesPlayed)===0)));
  const visible=rosterExpanded?matched:matched.slice(0,12);
  rosterList.innerHTML=visible.length?visible.map((p,i)=>{
   const games=value(p.gamesPlayed),goals=value(p.goals),assists=value(p.assists),mvp=value(p.manOfTheMatch),role=posLabel[positionOf(p)]||'포지션 미확인';
   return '<details class="roster-member"><summary><span class="roster-avatar" aria-hidden="true">'+esc(String(p.name||'?').slice(0,1).toUpperCase())+'</span><span class="roster-identity"><strong>'+esc(p.name)+'</strong><small>'+role+'</small></span><span class="roster-gamecount"><b>'+games+'</b><small>출전 경기</small></span><span class="roster-chevron" aria-hidden="true">⌄</span></summary><div class="roster-member-details"><div><span>출전 경기</span><b>'+games+'</b></div><div><span>득점</span><b>'+goals+'</b></div><div><span>도움</span><b>'+assists+'</b></div><div><span>시즌 평점</span><b>'+fmtRating(p)+'</b></div><div><span>MVP</span><b>'+mvp+'</b></div></div>'+(games===0?'<p class="roster-zero-note">보관된 시즌 출전 기록이 0입니다. 실제 소속·활동 상태는 별도 확인이 필요합니다.</p>':'')+'</details>';
  }).join(''):'<div class="roster-empty">해당 조건에 맞는 선수가 없습니다.</div>';
  roster.querySelector('#rosterVisible').textContent='검색 결과 '+matched.length+'명 중 '+visible.length+'명 표시';
  const more=roster.querySelector('#rosterShowAll');more.hidden=visible.length===matched.length;
  if(!more.hidden)more.textContent='나머지 '+(matched.length-visible.length)+'명 모두 보기';
 };
 updateRoster=users=>{
  const seen=new Set();
  allRoster=users.filter(p=>p&&p.name).filter(p=>{const k=normalizeName(p.name);if(seen.has(k))return false;seen.add(k);return true}).sort((a,b)=>value(b.gamesPlayed)-value(a.gamesPlayed)||String(a.name).localeCompare(String(b.name)));
  roster.querySelector('#rosterCount').textContent=allRoster.length+'명';
  switcher.querySelector('#rosterTabCount').textContent=allRoster.length?'('+allRoster.length+')':'';
  renderRoster();
 };
 const setSquadView=view=>{
  const isRoster=view==='roster';
  ranking.hidden=isRoster;roster.hidden=!isRoster;
  switcher.querySelectorAll('[data-squad-view]').forEach(button=>{
   const yes=button.dataset.squadView===view;button.classList.toggle('is-selected',yes);button.setAttribute('aria-pressed',String(yes));
  });
 };
 selectSquad=setSquadView;
 switcher.addEventListener('click',e=>{const b=e.target.closest('[data-squad-view]');if(b)setSquadView(b.dataset.squadView)});
 rosterSearch.addEventListener('input',()=>{rosterExpanded=false;renderRoster()});
 rosterPosition.addEventListener('change',()=>{rosterExpanded=false;renderRoster()});
 roster.querySelector('.roster-status').addEventListener('click',e=>{const b=e.target.closest('[data-roster-status]');if(!b)return;rosterStatus=b.dataset.rosterStatus;rosterExpanded=false;roster.querySelectorAll('[data-roster-status]').forEach(x=>{const selected=x===b;x.classList.toggle('is-selected',selected);x.setAttribute('aria-pressed',String(selected))});renderRoster()});
 roster.querySelector('#rosterShowAll').addEventListener('click',()=>{rosterExpanded=true;renderRoster()});
 rosterList.addEventListener('toggle',e=>{if(e.target.tagName!=='DETAILS'||!e.target.open)return;rosterList.querySelectorAll('details[open]').forEach(d=>{if(d!==e.target)d.open=false})},true);
}

const paths={home,players,matches,rivals,more,tactics},alias={overview:'home',players:'players',matches:'matches',rivalry:'rivals',more:'more',tactics:'tactics',tacticalLab:'tactics','app-home':'home','app-rivals':'rivals'};
let current='';
function show(id,opt={}){
id=paths[id]?id:'home';
Object.entries(paths).forEach(([key,el])=>{const on=key===id;el.classList.toggle('is-active',on);el.setAttribute('aria-hidden',String(!on))});
bottom.querySelectorAll('[data-screen]').forEach(b=>{const on=b.dataset.screen===id;b.classList.toggle('active',on);b.setAttribute('aria-current',on?'page':'false')});
const fragment={home:'overview',players:'players',matches:'matches',rivals:'rivalry',more:'more',tactics:'tactics'}[id];
document.querySelectorAll('.header .nav a[href^="#"]').forEach(a=>{const on=a.getAttribute('href')==='#'+fragment;a.classList.toggle('selected',on);a.setAttribute('aria-current',on?'page':'false')});
if(id==='rivals')rivalry.open=true;
if(id==='more'&&moreDetails)moreDetails.open=true;
if(current!==id||opt.scroll)window.scrollTo({top:0,behavior:'instant'});
current=id;
if(opt.hash!==false&&location.hash!=='#'+fragment){try{history.replaceState(null,'',location.pathname+location.search+'#'+fragment)}catch(_){}}
}
bottom.addEventListener('click',e=>{const b=e.target.closest('[data-screen]');if(b)show(b.dataset.screen,{scroll:true})});
document.addEventListener('click',e=>{const a=e.target.closest('a[href^="#"]');if(!a)return;const key=alias[a.getAttribute('href').slice(1)];if(!key)return;e.preventDefault();show(key,{scroll:true,expandMore:key==='more'})},true);
window.addEventListener('hashchange',()=>{const k=alias[location.hash.slice(1)];if(k)show(k,{hash:false,scroll:true})});
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function update(data){
if(!data||!Array.isArray(data.members))return;
const users=data.members.filter(m=>m&&m.name),types=[['goals','goals','득점왕','골'],['assists','assists','도움왕','도움'],['mvp','manOfTheMatch','MVP','회']];
$('#homeLeaderGrid').innerHTML=types.map(([tab,key,label,unit])=>{const p=[...users].sort((a,b)=>(Number(b[key])||0)-(Number(a[key])||0))[0];return '<button type="button" class="home-leader" data-lead="'+tab+'"><span class="hl-label">'+label+'</span><strong>'+(p?(Number(p[key])||0):'—')+'<small>'+unit+'</small></strong><span class="hl-name">'+esc(p?.name||'기록 없음')+'</span></button>'}).join('');
updateRoster(users);
const n=Number(data.league?.currentDivision),division=Number.isInteger(n)&&n>=1&&n<=6?(n===1?'엘리트':(n-1)+'부'):'FC27';const label=$('#appDivisionText');if(label)label.textContent=division+' 리그';
}
document.addEventListener('dokdo:ready',()=>update(window.__dokdoData));
if(window.__dokdoData)update(window.__dokdoData);
$('#homeLeaderGrid').addEventListener('click',e=>{const x=e.target.closest('[data-lead]');if(!x)return;show('players',{scroll:true});selectSquad('ranking');const tab=document.querySelector('[data-leader="'+x.dataset.lead+'"]');if(tab)tab.click()});
show(alias[location.hash.slice(1)]||'home',{hash:false});
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();