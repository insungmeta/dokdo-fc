/* DOKDO FC · Mobile app interface V8 */
(()=>{'use strict';
const init=()=>{
const $=s=>document.querySelector(s),main=$('main.shell'),hero=$('section.hero'),metrics=$('.metric-strip'),players=$('#players'),matches=$('#matches'),rivalry=$('#rivalry'),more=$('#more');
if(!main||!hero||!metrics||!players||!matches||!rivalry||!more)return;
const home=document.createElement('section');home.id='app-home';home.className='app-screen';
home.innerHTML='<div class="screen-head"><div><span class="eyebrow">DOKDO FC · EA FC 27</span><h2>클럽 홈</h2></div><small>팀 현황과 최근 경기</small></div>';
hero.before(home);home.append(hero,metrics);
const lead=document.createElement('div');lead.className='home-leaders';lead.innerHTML='<div class="screen-head"><div><span class="eyebrow">SQUAD LEADERS</span><h2>우리 팀 주인공</h2></div><a href="#players">전체 랭킹 ↗</a></div><div class="home-leader-grid" id="homeLeaderGrid"><p class="loading">선수 기록을 불러오는 중</p></div>';home.append(lead);
players.classList.add('app-screen');matches.classList.add('app-screen');more.classList.add('app-screen');
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
more:'<path d="M4 6h16M4 12h16M4 18h16"/>'};
const labels={home:'클럽 홈',players:'선수 랭킹',matches:'경기 기록',rivals:'상대전적',more:'팀 흐름'};
const bottom=document.createElement('nav');bottom.className='app-bottom-nav';bottom.setAttribute('aria-label','주요 화면');
bottom.innerHTML=Object.entries(labels).map(([id,label])=>'<button type="button" data-screen="'+id+'" aria-label="'+label+' 메뉴"><span class="app-nav-icon"><svg viewBox="0 0 24 24" aria-hidden="true">'+icons[id]+'</svg></span><span class="app-nav-label">'+label+'</span></button>').join('');document.body.append(bottom);

const quick=document.createElement('section');quick.className='app-quick-menu';quick.setAttribute('aria-label','주요 메뉴 바로가기');
const quickActions=[['players','선수 랭킹','득점왕 · MVP'],['matches','경기 기록','전체 경기 · 매치 리뷰'],['rivals','상대전적','팀별 맞대결 기록'],['more','팀 흐름','최근 10경기 · 카드']];
quick.innerHTML='<div class="app-quick-heading"><strong>메뉴 바로가기</strong><small>항목을 눌러 이동하세요</small></div><div class="app-quick-grid">'+quickActions.map(([id,label,desc])=>'<button type="button" class="app-quick-action" data-go="'+id+'"><span class="app-quick-icon"><svg viewBox="0 0 24 24" aria-hidden="true">'+icons[id]+'</svg></span><span class="app-quick-copy"><strong>'+label+'</strong><small>'+desc+'</small></span><span class="app-quick-arrow" aria-hidden="true">›</span></button>').join('')+'</div>';
home.insertBefore(quick,hero);
quick.addEventListener('click',e=>{const b=e.target.closest('[data-go]');if(b)show(b.dataset.go,{scroll:true})});
const paths={home,players,matches,rivals,more},alias={overview:'home',players:'players',matches:'matches',rivalry:'rivals',more:'more','app-home':'home','app-rivals':'rivals'};
let current='';
function show(id,opt={}){
id=paths[id]?id:'home';
Object.entries(paths).forEach(([key,el])=>{const on=key===id;el.classList.toggle('is-active',on);el.setAttribute('aria-hidden',String(!on))});
bottom.querySelectorAll('[data-screen]').forEach(b=>{const on=b.dataset.screen===id;b.classList.toggle('active',on);b.setAttribute('aria-current',on?'page':'false')});
const fragment={home:'overview',players:'players',matches:'matches',rivals:'rivalry',more:'more'}[id];
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
const n=Number(data.league?.currentDivision),division=Number.isInteger(n)&&n>=1&&n<=6?(n===1?'엘리트':(n-1)+'부'):'FC27';const label=$('#appDivisionText');if(label)label.textContent=division+' 리그';
}
document.addEventListener('dokdo:ready',()=>update(window.__dokdoData));
if(window.__dokdoData)update(window.__dokdoData);
$('#homeLeaderGrid').addEventListener('click',e=>{const x=e.target.closest('[data-lead]');if(!x)return;show('players',{scroll:true});const tab=document.querySelector('[data-leader="'+x.dataset.lead+'"]');if(tab)tab.click()});
show(alias[location.hash.slice(1)]||'home',{hash:false});
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();