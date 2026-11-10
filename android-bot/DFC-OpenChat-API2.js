/*
 DOKDO FC FC27 - free Android Kakao OpenChat notifier (MessengerBotR API2)
 Fan-made, unofficial automation. Requires a powered Android device
 and a valid KakaoTalk notification-reply session.
 It reports only completed matches found in GitHub Pages archival JSON.
 It cannot detect kickoff/live match start.
 No login credentials, scraping of private chat, or paid service required.

 IMPORTANT: Test in a separate room first. Edit REQUIRED_ROOM before using.
 */
var bot = BotManager.getCurrentBot();
var REQUIRED_ROOM = "DOKDO FC"; // Must match your OpenChat room title exactly (case insensitive).
var DATA_URL = "https://insungmeta.github.io/dokdo-fc/data/dashboard.json";
var SITE_URL = "https://insungmeta.github.io/dokdo-fc/";
var STATE_FILE = "dfc-bot-state.json";
var POLL_MS = 5 * 60 * 1000;
var MAX_PER_CHECK = 3;
var state = Database.readObject(STATE_FILE) || {room:null,enabled:false,initialized:false,seen:[]};
var currentData = null;
var busy = false;
function persist(){ Database.writeObject(STATE_FILE, state); }
function isRoom(room){ return String(room||"").toLowerCase().trim() === String(REQUIRED_ROOM).toLowerCase().trim(); }
function seen(id){ return state.seen.indexOf(String(id)) !== -1; }
function key(m){ return String(m.matchType || "leagueMatch")+":"+String(m.matchId); }
function timestamp(m){ var t=m.timestamp; return typeof t==="number" ? (t>1e12?t:t*1000) : (new Date(t)).getTime() || 0; }
function fmt(v){ return v===undefined||v===null ? "—" : String(v); }
function formatMatch(m){
 var a=Number(m.goals), b=Number(m.goalsAgainst);
 var result= isNaN(a)||isNaN(b) ? "종료" : a>b?"승리":a<b?"패배":"무승부";
 var kind= m.matchType==="friendlyMatch"?"친선":m.matchType==="playoffMatch"?"플레이오프":"리그";
 var text="⚽ DOKDO FC | 경기 종료\n\n";
 text+="🏆 "+kind+" · "+result+"\nDFC "+fmt(m.goals)+" : "+fmt(m.goalsAgainst)+" "+fmt(m.opponentName||"상대팀")+"\n";
 var scorers=(m.players||[]).filter(function(p){return Number(p.goals)>0;}).map(function(p){return p.name+" "+p.goals+"골";});
 if(scorers.length) text+="⚽ 득점: "+scorers.join(", ")+"\n";
 var helpers=(m.players||[]).filter(function(p){return Number(p.assists)>0;}).map(function(p){return p.name+" "+p.assists+"도움";});
 if(helpers.length) text+="🎯 도움: "+helpers.join(", ")+"\n";
 var gks=(m.players||[]).filter(function(p){return String(p.position).toLowerCase()==="goalkeeper" && Number(p.playerId)>0 && Number(p.saves)>0;}).map(function(p){return p.name+" "+p.saves+"선방";});
 if(gks.length) text+="🧤 GK: "+gks.join(", ")+"\n";
 text+="\n📊 상세 경기·상대팀 선수 기록\n"+SITE_URL+"#matches";
 return text;
}
function updateMatches(data) {
 if(!data || Number(data.clubId)!==331042 || !Array.isArray(data.matches))return;
 currentData=data;
 var list=data.matches.filter(function(m){return m && m.matchId;}).sort(function(a,b){return timestamp(a)-timestamp(b);});
 if(!state.initialized) {
   // Do not flood the room with already played games on startup.
   state.seen=list.map(key).slice(-500);
   state.initialized=true;persist();
   console.info("[DFC] Initialized with "+state.seen.length+" archived matches. No backfill messages.");
   return;
 }
 if(!state.enabled || !state.room)return;
 var pending=list.filter(function(m){return !seen(key(m));});
 if(pending.length>MAX_PER_CHECK) {
    // If the mobile device was offline for a long time, announce only the newest ones.
    var older=pending.slice(0,pending.length-MAX_PER_CHECK);
    older.forEach(function(m){state.seen.push(key(m));});
    pending=pending.slice(-MAX_PER_CHECK);
    persist();
 }
 for(var i=0;i<pending.length;i++){
   var m=pending[i];
   var ok=bot.send(state.room,formatMatch(m),"com.kakao.talk");
   if(!ok){ console.warn("[DFC] Kakao room reply session missing. Waiting for new notification.");break; }
   state.seen.push(key(m));
   state.seen=state.seen.slice(-500);
   persist();
 }
}
function poll(){
 if(busy)return;
 busy=true;
 try{
  Http.request({url:DATA_URL+"?t="+Date.now(),method:"GET",timeout:12000,
   headers:{"Accept":"application/json"}}, function(err,response,doc){
    busy=false;
    if(err){console.warn("[DFC] Fetch error: "+err);return;}
    try{
      var d=JSON.parse(String(response.body()));
      updateMatches(d);
    }catch(e){console.warn("[DFC] Parse error: "+e);}
   });
 }catch(e){busy=false;console.warn("[DFC] Request error: "+e);}
}
function replyStats(msg,d){
 if(!d){msg.reply("⚽ DFC: 통계가 아직 로드되지 않았습니다. 잠시 후 다시 입력해 주세요.");poll();return;}
 var o=d.overall||{};
 if(msg.content==="!전적"){
  msg.reply("⚽ DOKDO FC 전적\n"+fmt(o.gamesPlayed)+"경기 | "+fmt(o.wins)+"승 "+fmt(o.ties)+"무 "+fmt(o.losses)+"패\n득점 "+fmt(o.goals)+" · 실점 "+fmt(o.goalsAgainst)+"\n"+SITE_URL);return;
 }
 if(msg.content==="!최근경기"){
  var m=(d.matches||[]).filter(function(x){return x.matchType==="leagueMatch";}).sort(function(a,b){return timestamp(b)-timestamp(a);})[0];
  msg.reply(m?formatMatch(m):"최근 리그 경기 정보가 없습니다.");return;
 }
 if(msg.content==="!득점왕"||msg.content==="!도움왕"){
  var prop=msg.content==="!득점왕"?"goals":"assists";
  var p=(d.members||[]).slice().sort(function(a,b){return Number(b[prop]||0)-Number(a[prop]||0);}).slice(0,5);
  msg.reply("🏆 DFC "+msg.content.slice(1)+" TOP 5\n"+p.map(function(x,i){return (i+1)+". "+x.name+" — "+fmt(x[prop]);}).join("\n")+"\n"+SITE_URL);return;
 }
 if(msg.content==="!골키퍼"){
  var p=(d.members||[]).filter(function(x){return String(x.position).toLowerCase()==="goalkeeper";});
  msg.reply("🧤 DFC GK 기록\n"+(p.map(function(x){return x.name+" · 시즌 클린시트 "+fmt(x.cleanSheetsGK)+" · 평점 "+fmt(x.ratingAve||x.averageRating);}).join("\n")||"GK 데이터 없음")+"\n"+SITE_URL+"#players");return;
 }
}
bot.addListener(Event.MESSAGE,function(msg){
 if(msg.packageName && msg.packageName!=="com.kakao.talk")return;
 if(!isRoom(msg.room))return;
 var cmd=String(msg.content||"").trim();
 if(cmd==="!DFC등록"){
   state.room=String(msg.room);state.enabled=false;state.initialized=false;
   // Seed first; operator must explicitly enable alerts afterward.
   persist();poll();
   msg.reply("✅ DFC 봇 방 연결 완료\n과거 경기 중복 알림을 막기 위해 기록을 먼저 등록합니다. 잠시 후 !DFC켜기 를 입력해 주세요.");
   return;
 }
 if(cmd==="!DFC켜기"){
   if(!state.room){msg.reply("먼저 !DFC등록 을 입력해 주세요.");return;}
   if(!state.initialized){msg.reply("통계 초기화 중입니다. 잠시 후 다시 입력해 주세요.");poll();return;}
   state.enabled=true;persist();msg.reply("🟢 DFC 경기 종료 알림 활성화! 새로운 경기 기록이 게시되면 자동 전송합니다. 경기 시작 실시간 알림은 지원하지 않습니다.");
   return;
 }
 if(cmd==="!DFC끄기"){state.enabled=false;persist();msg.reply("🔕 DFC 자동 알림 중지");return;}
 if(cmd==="!DFC상태"){msg.reply("DFC 봇: "+(state.enabled?"ON":"OFF")+"\n초기화: "+(state.initialized?"완료":"대기")+"\n저장된 경기 ID: "+state.seen.length+"개\n조회 간격: 5분(데이터 갱신은 약 30분 주기)");return;}
 if(["!전적","!최근경기","!득점왕","!도움왕","!골키퍼"].indexOf(cmd)>=0){replyStats(msg,currentData);}
});
setInterval(poll,POLL_MS);
poll();
