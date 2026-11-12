"""Visual smoke test for the real KO/EN dashboard at mobile and desktop widths.
Runs against a local HTTP server with the repository's actual JS, CSS and archive.
"""
import json
import os
from pathlib import Path

from selenium import webdriver
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait

BASE = os.getenv("DFC_TEST_URL", "http://127.0.0.1:8914/")
OUT = Path(os.getenv("DFC_SCREENSHOT_DIR", "layout-screenshots"))
OUT.mkdir(parents=True, exist_ok=True)
WIDTHS = (360, 390, 768, 820, 1024, 1280)

def script(driver, source):
    return driver.execute_script(source)

def validate(driver, lang, width):
    driver.set_window_size(width, 930)
    driver.get(BASE + "?lang=" + lang)
    WebDriverWait(driver, 18).until(
        lambda d: script(d, "return Boolean(window.__dokdoData) || Boolean(document.querySelector('main .panel h2'))")
    )
    WebDriverWait(driver, 10).until(
        lambda d: script(d, """
            const tabs = document.querySelectorAll('.app-bottom-nav [data-screen]');
            return tabs.length === 6 && document.querySelector('.dfc-lang-switch');
        """)
    )
    # MutationObserver localization runs in microtasks after all dynamically rendered cards.
    WebDriverWait(driver, 10).until(
        lambda d: script(d, """
            const el=document.querySelector('.app-bottom-nav [data-screen="home"] .app-nav-label');
            return el && el.textContent === (document.documentElement.lang==='en'?'Home':'클럽 홈');
        """)
    )
    info = script(driver, """
        const rect=e=>{let r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}};
        const within=(inner,outer,allow=2)=>inner.left>=outer.left-allow&&inner.right<=outer.right+allow;
        const margin=el=>{const range=document.createRange();range.selectNodeContents(el);return rect(range)};
        const visible=e=>e&&getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().height>0;
        const header=document.querySelector('.header .shell'),switcher=document.querySelector('.dfc-lang-switch');
        const nav=Array.from(document.querySelectorAll('.header .nav a')).filter(visible);
        const bottom=Array.from(document.querySelectorAll('.app-bottom-nav [data-screen]')).filter(visible);
        const trend=document.querySelector('.division-trend'),tr=rect(trend);
        const checks={},issues=[];
        checks.lang=document.documentElement.lang;
        checks.navCount=nav.length; checks.navLabels=nav.map(x=>x.textContent.trim());
        checks.mobileCount=bottom.length;checks.bottomLabels=bottom.map(x=>x.textContent.trim());
        checks.headerWidth=rect(header).width;checks.viewport=innerWidth;
        checks.documentWidth=document.documentElement.scrollWidth;
        checks.trendWidth=tr.width;checks.trendText=[];
        checks.switcher=Boolean(visible(switcher));
        if(checks.lang!==arguments[0])issues.push('wrong language '+checks.lang);
        if(!checks.switcher)issues.push('language switch hidden');
        if(nav.length!==(innerWidth>800?6:0))issues.push('wrong top nav count: '+nav.length);
        if(bottom.length!==(innerWidth<=800?6:0))issues.push('wrong bottom nav count: '+bottom.length);
        const expected=checks.lang==='en'?['Home','Players','Matches','Rivals','Trends','Tactics']:['클럽 홈','선수 랭킹','경기 기록','상대전적','팀 흐름','전술판'];
        if(innerWidth>800&&JSON.stringify(checks.navLabels)!==JSON.stringify(expected))issues.push('nav labels incorrect');
        if(innerWidth<=800&&JSON.stringify(checks.bottomLabels)!==JSON.stringify(expected))issues.push('bottom labels incorrect');
        for(let i=0;i<nav.length;i++){
            const r=rect(nav[i]);
            if(!within(r,rect(header)))issues.push('nav item '+i+' outside header');
            if(i&&rect(nav[i-1]).right>r.left+1)issues.push('nav items overlap at '+i);
        }
        for(let i=0;i<bottom.length;i++){
            const label=bottom[i].querySelector('.app-nav-label');
            if(label&&!within(margin(label),rect(bottom[i]),3))issues.push('bottom label overflow at '+i);
        }
        for(const selector of ['.division-trend-head strong','.division-trend-summary','#divisionTrendValue','#divisionTrendDelta','.division-trend-chart','.division-trend-caption']){
            const el=trend.querySelector(selector);
            if(!el)continue;
            const box=rect(el);
            const textRange=margin(el);
            checks.trendText.push({selector,text:el.textContent.trim().slice(0,80),box,textRange});
            if(!within(box,tr,3))issues.push('graph child box overflow '+selector);
            if(el.textContent.trim()&&!(el instanceof SVGElement)&&!within(textRange,tr,3))issues.push('graph child text overflow '+selector);
        }
        // Detect dashboard overlaps and clipped headline text on mobile AND desktop.
        const dashboard=document.querySelector('#app-home');
        const boxes=Array.from(dashboard.querySelectorAll('.dfc-summary-grid>.dfc-board-card,.dfc-lower-grid>.dfc-board-card')).filter(visible);
        checks.dashboardCards=boxes.map(x=>({className:x.className,rect:rect(x),scrollWidth:x.scrollWidth,clientWidth:x.clientWidth}));
        for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
          const a=rect(boxes[i]),b=rect(boxes[j]);
          const overlapX=Math.min(a.right,b.right)-Math.max(a.left,b.left);
          const overlapY=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);
          if(overlapX>3&&overlapY>3)issues.push('dashboard cards overlap '+i+' '+j);
        }
        // Compare actual rendered text glyph rectangles, not just element boxes.
        // A card may fit its width while absolutely-positioned labels collide.
        checks.textCollisions=[];
        for(const card of boxes){
          const walker=document.createTreeWalker(card,NodeFilter.SHOW_TEXT);
          const fragments=[];let node;
          while((node=walker.nextNode())){
            if(!node.nodeValue.trim())continue;
            const parent=node.parentElement;
            if(!parent||!visible(parent)||parent.closest('svg,details:not([open]),[hidden]'))continue;
            const range=document.createRange();range.selectNodeContents(node);
            for(const rr of Array.from(range.getClientRects())){
              if(rr.width<3||rr.height<3)continue;
              fragments.push({node,rect:{left:rr.left,right:rr.right,top:rr.top,bottom:rr.bottom},text:node.nodeValue.trim().slice(0,35)});
            }
          }
          for(let i=0;i<fragments.length;i++)for(let j=i+1;j<fragments.length;j++){
            const a=fragments[i],b=fragments[j];
            if(a.node===b.node)continue;
            const ox=Math.min(a.rect.right,b.rect.right)-Math.max(a.rect.left,b.rect.left);
            const oy=Math.min(a.rect.bottom,b.rect.bottom)-Math.max(a.rect.top,b.rect.top);
            if(ox>5&&oy>5){
              const collision={card:card.className,a:a.text,b:b.text,ox:Math.round(ox),oy:Math.round(oy)};
              checks.textCollisions.push(collision);
              if(checks.textCollisions.length<=12)issues.push('text collision '+JSON.stringify(collision));
            }
          }
        }
        const textTargets=Array.from(dashboard.querySelectorAll('.dfc-banner-title strong,.dfc-card-title,.dfc-summary-grid .division-digit,.dfc-summary-rating .metric b,.dfc-summary-stat .metric b'));
        checks.clippedText=[];
        for(const el of textTargets.filter(visible)){
          const r=rect(el),parent=el.closest('.dfc-board-card')||el.closest('.dfc-photo-banner');
          if(!parent)continue;
          const p=rect(parent),t=margin(el);
          if(r.width>0&&(t.right>p.right+3||t.left<p.left-3||t.bottom>p.bottom+3)){
            const item={className:el.className,text:el.textContent.trim().slice(0,45),textRect:t,parentRect:p};
            checks.clippedText.push(item);
            issues.push('dashboard text clipped '+item.className+' '+item.text);
          }
        }
        if(document.documentElement.scrollWidth>innerWidth+4)issues.push('page horizontal overflow '+checks.documentWidth+' > '+innerWidth);
        return {issues,checks};
    """.replace("arguments[0]",json.dumps(lang)))
    if lang=="en" and width in (390,1280):
        home_audit=script(driver, """
            const root=document.querySelector('#app-home');
            const skip='.roster-identity strong,.roster-avatar,.match-item .title,.standing-row .who strong,.home-leader .hl-name,.star .person,.card-row .name,.team-name-pair,.crest-fallback,.match-contributor-chip strong,option,.board-post';
            const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const untranslated=[];
            let n;while(n=walker.nextNode()){
              if(!/[가-힣]/.test(n.nodeValue))continue;
              const el=n.parentElement;if(!el||el.closest(skip)||getComputedStyle(el).display==='none')continue;
              const value=n.nodeValue.trim();if(value)untranslated.push(value.slice(0,125));
            }
            return {untranslated:untranslated.slice(0,35)};
        """)
        print(json.dumps({"lang":lang,"width":width,"screen":"home-translation",**home_audit},ensure_ascii=False),flush=True)
        if home_audit["untranslated"]:
            info["issues"].append("untranslated home labels "+str(home_audit["untranslated"]))
    screenshot = OUT / f"dfc-{lang}-{width}.png"
    driver.save_screenshot(str(screenshot))
    print(json.dumps({"lang":lang,"width":width,**info},ensure_ascii=False),flush=True)
    if lang=="ko" and width==390:
        roster_inspection=script(driver, """
          const arr=window.__dokdoData?.members||[];
          const hist={};
          for(const m of arr){const p=m.position||m.favoritePosition||m.proPos||'unknown';hist[p]=(hist[p]||0)+1;}
          return {members:arr.length,positions:hist,
           sample:arr.slice(0,5).map(m=>({name:m.name,position:m.position,favoritePosition:m.favoritePosition,
                gamesPlayed:m.gamesPlayed,ratingAve:m.ratingAve,goals:m.goals,assists:m.assists,
                manOfTheMatch:m.manOfTheMatch,cleanSheetsGK:m.cleanSheetsGK}))};
        """)
        print(json.dumps({"screen":"roster-inspection",**roster_inspection},ensure_ascii=False),flush=True)
        striker_inspection=script(driver, """
          const data=window.__dokdoData||{},names=(data.members||[]).filter(p=>/dududada/i.test(p.name||''));
          const byId=new Set(names.map(p=>String(p.playerId)));
          const matches=[];
          for(const m of data.matches||[]){
            for(const p of m.players||[]){
              const same=/dududada/i.test(p.name||p.playerName||'')||(p.playerId&&byId.has(String(p.playerId)));
              if(same)matches.push({type:m.matchType,date:m.timestamp,position:p.position,proPos:p.proPos,
                  favoritePosition:p.favoritePosition,id:p.playerId,goals:p.goals,assists:p.assists,name:p.name,
                  keys:Object.keys(p).slice(0,36)});
            }
          }
          const roles={};for(const m of matches){let p=m.position||m.proPos||m.favoritePosition||'unknown';roles[p]=(roles[p]||0)+1;}
          return {members:names,matched:matches.length,positionCounts:roles,
            recentMatches:matches.slice(0,35),matchKeys:(data.matches||[])[0]&&Object.keys((data.matches||[])[0])};
        """)
        print(json.dumps({"screen":"dududada-position-audit",**striker_inspection},ensure_ascii=False),flush=True)

    # Go beyond the home card: verify each of the five screens and the full
    # squad view at representative mobile and desktop sizes.
    if width in (390, 1280):
        for screen in ("players", "matches", "rivals", "more", "tactics"):
            driver.execute_script(
                "document.querySelector('.app-bottom-nav [data-screen=\"' + arguments[0] + '\"]').click()", screen
            )
            section = {
                "players": "#players", "matches": "#matches",
                "rivals": "#app-rivals", "more": "#more", "tactics": "#tactics"
            }[screen]
            WebDriverWait(driver, 6).until(
                lambda d: d.execute_script(
                    "return document.querySelector(arguments[0]).classList.contains('is-active')", section
                )
            )
            details=script(driver, """
                const active=document.querySelector('.app-screen.is-active');
                const issues=[],headings=Array.from(active.querySelectorAll('h2,h3,.panel-head strong'))
                  .filter(el=>getComputedStyle(el).display!=='none').map(el=>el.textContent.trim());
                const relevant=Array.from(active.querySelectorAll('.screen-head,.panel-head,.metric,.compare-period-card,.roster-heading,.archive-searchbar'));
                for(const el of relevant){
                  const rc=el.getBoundingClientRect();
                  if(rc.width&&el.scrollWidth>el.clientWidth+8 && getComputedStyle(el).overflowX!=='auto')
                    issues.push('overflow '+el.className+' '+el.scrollWidth+'>'+el.clientWidth);
                }
                if(document.documentElement.scrollWidth>innerWidth+4)
                  issues.push('page horizontal overflow '+document.documentElement.scrollWidth);
                const untranslated=[];
                if(document.documentElement.lang==='en'){
                  const skip='.roster-identity strong,.roster-avatar,.match-item .title,.standing-row .who strong,.home-leader .hl-name,.star .person,.card-row .name,.team-name-pair,.crest-fallback,.match-contributor-chip strong,option,.board-post';
                  const walker=document.createTreeWalker(active,NodeFilter.SHOW_TEXT);
                  let n;
                  while((n=walker.nextNode())){
                    if(!/[가-힣]/.test(n.nodeValue))continue;
                    const p=n.parentElement;if(!p||p.closest(skip)||getComputedStyle(p).display==='none')continue;
                    const content=n.nodeValue.trim();
                    if(content)untranslated.push(content.slice(0,115));
                  }
                }
                return {active:active.id,issues,headings:headings.slice(0,20),untranslated:untranslated.slice(0,30)};
            """)
            if screen=="players" and width==390:
                ranknav=script(driver, """
                  const tabs=document.querySelector('#leaderTabs'),controls=document.querySelector('#leaderMoreControls');
                  const hidden=controls?.hidden,more=tabs.scrollWidth-tabs.clientWidth;
                  const buttons=Array.from(tabs.querySelectorAll('[data-leader]'));
                  const last=buttons[buttons.length-1]?.textContent.trim();
                  controls?.querySelector('[data-rank-direction="1"]')?.click();
                  return {visible:Boolean(controls&&!hidden),overflow:more,lastCategory:last,
                   nextEnabled:!controls?.querySelector('[data-rank-direction="1"]')?.disabled,
                   hint:controls?.querySelector('#leaderScrollHint')?.textContent.trim()};
                """)
                print(json.dumps({"lang":lang,"width":width,"screen":"ranking-scroll-hint",**ranknav},ensure_ascii=False),flush=True)
                if ranknav["overflow"]>12 and (not ranknav["visible"] or not ranknav["hint"]):
                    info["issues"].append("mobile ranking categories hidden without scroll affordance")
            if screen=="tactics":
                view=script(driver, """
                    const el=document.querySelector('#tactics'),lab=document.querySelector('#tacticalLab');
                    const rect=el.getBoundingClientRect();
                    return {display:getComputedStyle(el).display,visible:rect.width>0&&rect.height>100,
                      ancestors:Array.from((function*(){let p=el.parentElement;while(p){yield {tag:p.tagName,id:p.id,display:getComputedStyle(p).display};p=p.parentElement;}})()),
                      heading:el.querySelector('h2')?.textContent,
                      labVisible:Boolean(lab&&lab.getBoundingClientRect().height>100),
                      location:window.location.hash};
                """)
                print(json.dumps({"lang":lang,"width":width,"screen":"tactics-route",**view},ensure_ascii=False),flush=True)
                if not view["visible"] or not view["labVisible"] or view["location"]!="#tactics":
                    info["issues"].append("tactics route shows active tab but page invisible: "+str(view))
            print(json.dumps({"lang":lang,"width":width,"screen":screen,**details},ensure_ascii=False),flush=True)
            driver.save_screenshot(str(OUT / f"dfc-{lang}-{width}-{screen}.png"))
            info["issues"].extend(screen+": "+x for x in details["issues"])
            if lang=="en" and details.get("untranslated"):
                info["issues"].append(screen+" untranslated UI text: "+str(details["untranslated"]))
            if screen=="tactics":
                WebDriverWait(driver,12).until(
                    lambda d: d.execute_script("return Boolean(document.querySelector('#tlPitch svg'))")
                )
                quick=script(driver, """
                    const root=document.querySelector('#tacticalLab');
                    const count=()=>Array.from(root.querySelectorAll('#tlPitch text')).filter(x=>x.textContent==='USER').length;
                    const cards=Array.from(root.querySelectorAll('[data-tl-forecast]'));
                    const detail=root.querySelector('.tl-more-details');
                    const out={
                        visible:root.getBoundingClientRect().height>100,
                        options:cards.map(c=>c.dataset.tlForecast),
                        forecastCount:cards.length,
                        actionCount:root.querySelectorAll('#tlActions li').length,
                        detailsInitiallyClosed:!detail.open,
                        trialRemoved:!root.querySelector('#tlTrialStart,#tlTrialStop,#tlTrialMatches'),
                        people5:count(),dataEvidence:root.querySelector('#tlEvidence')?.textContent,
                        english:document.documentElement.lang
                    };
                    root.querySelector('[data-tl-people="9"]').click();
                    out.people9=count();
                    root.querySelector('[data-tl-forecast="4-4-2"]').click();
                    out.fourFourTwo=root.querySelector('[data-tl-formation="4-4-2"]').getAttribute('aria-pressed');
                    out.formationLabel=root.querySelector('#tlTitle').textContent;
                    out.selectedVisual=root.querySelector('[data-tl-forecast="4-4-2"]').classList.contains('is-selected');
                    detail.open=true;
                    out.detailsOpen=detail.open;
                    out.rationale=Boolean(root.querySelector('#tlForecastDetails').textContent.trim());
                    root.querySelector('[data-tl-people="5"]').click();
                    root.querySelector('[data-tl-forecast="4-2-3-1"]').click();
                    root.querySelector('#tlBestXI').click();
                    const rows=Array.from(root.querySelectorAll('#tlXIList .tl-xi-row'));
                    out.xiRows=rows.length;out.bestOpen=!root.querySelector('#tlBestXIPanel').hidden;
                    const names=rows.map(r=>r.querySelector('.tl-xi-name')?.textContent.trim())
                       .filter(x=>x&&!x.includes('AI /')&&!x.includes('미확인'));
                    out.uniqueNames=new Set(names).size;out.namedPlayers=names.length;
                    const st=rows.find(r=>r.querySelector('strong')?.textContent==='ST');
                    out.striker=st?.querySelector('.tl-xi-name')?.textContent.trim();
                    out.pageWidth=document.documentElement.scrollWidth;
                    return out;
                """)
                print(json.dumps({"lang":lang,"width":width,"screen":"quick-tactics",**quick},ensure_ascii=False),flush=True)
                driver.save_screenshot(str(OUT / f"dfc-{lang}-{width}-quick-tactics.png"))
                if not quick["visible"] or sorted(quick["options"])!=["4-2-3-1","4-3-3","4-4-2"]:
                    info["issues"].append("quick tactics route or formation cards missing")
                if quick["people5"]!=5 or quick["people9"]!=9 or not quick["fourFourTwo"]=="true" or not quick["selectedVisual"]:
                    info["issues"].append("tactics player count or formation selector fails")
                if quick["actionCount"]!=2 or not quick["detailsInitiallyClosed"] or not quick["trialRemoved"]:
                    info["issues"].append("quick tactic screen too verbose or trial controls remain")
                if not quick["detailsOpen"] or not quick["rationale"] or not quick["bestOpen"] or quick["xiRows"]!=11:
                    info["issues"].append("optional analysis or Best XI not available")
                if quick["namedPlayers"]!=quick["uniqueNames"]:
                    info["issues"].append("Best XI duplicated player")
                if quick["pageWidth"]>width+4:
                    info["issues"].append("quick tactical UI horizontal overflow")
                current=script(driver, """
                    const data=window.__dokdoData||{};
                    const name=(data.members||[]).find(p=>p.name==='dududada3472')?.name;
                    const hist=(data.matches||[]).flatMap(m=>(m.players||[])
                         .filter(p=>p.name===name && Number(p.playerId)>0));
                    return {name,forwards:hist.filter(p=>p.position==='forward').length};
                """)
                if current["name"] and current["forwards"]>=3 and quick["striker"]!=current["name"]:
                    info["issues"].append("Archived top scorer not selected as ST")
            if screen=="matches":
                driver.execute_script("document.querySelector('#matchList .match-item').click()")
                detail=script(driver, """
                  const node=document.querySelector('#matchReviewPanel');
                  const ko=Array.from(node.querySelectorAll('h3,strong,.coverage,.review-utility,.match-contribution-label'))
                   .map(x=>x.textContent.trim()).filter(x=>/[가-힣]/.test(x));
                  return {open:!node.hidden,visibleWidth:document.documentElement.scrollWidth,untranslated:ko.slice(0,25)};
                """)
                print(json.dumps({"lang":lang,"width":width,"screen":"match-detail",**detail},ensure_ascii=False),flush=True)
                driver.save_screenshot(str(OUT / f"dfc-{lang}-{width}-match-detail.png"))
                if detail["visibleWidth"]>width+4:info["issues"].append('match-detail page overflow')
        # The optional complete squad tab is a common source of long player names.
        driver.execute_script("document.querySelector('.app-bottom-nav [data-screen=\"players\"]').click()")
        driver.execute_script("document.querySelector('[data-squad-view=\"roster\"]').click()")
        r=script(driver, """
            return {width:document.documentElement.scrollWidth,
                    selected:document.querySelector('[data-squad-view="roster"]').classList.contains('is-selected'),
                    playerCount:document.querySelectorAll('.roster-member').length};
        """)
        print(json.dumps({"lang":lang,"width":width,"screen":"roster",**r},ensure_ascii=False),flush=True)
        if r["width"]>width+4:info["issues"].append('roster page overflow')
        driver.save_screenshot(str(OUT / f"dfc-{lang}-{width}-roster.png"))
    return info["issues"]

def main():
    opts=Options()
    opts.add_argument("--headless=new")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--force-device-scale-factor=1")
    opts.add_argument("--window-size=1280,930")
    driver=webdriver.Chrome(options=opts)
    all_issues=[]
    try:
        # Root and archived URLs default to Korean even with an English browser.
        # An earlier explicit EN visit must not persist to an ordinary visit.
        for page in ("", "legacy.html"):
            driver.get(BASE + page + "?lang=en")
            WebDriverWait(driver, 12).until(
                lambda d: d.execute_script("return document.documentElement.lang==='en' && Boolean(document.querySelector('.dfc-lang-switch'))")
            )
            driver.get(BASE + page)
            WebDriverWait(driver, 12).until(
                lambda d: d.execute_script("return document.documentElement.lang==='ko' && Boolean(document.querySelector('.dfc-lang-switch'))")
            )
            expected=script(driver, """
                return {lang:document.documentElement.lang,
                        active:document.querySelector('.dfc-lang-switch .is-active')?.textContent.trim()};
            """)
            if expected["lang"]!="ko" or expected["active"]!="KO":
                all_issues.append("Default Korean failed on "+(page or "index")+": "+str(expected))
            print(json.dumps({"page":page or "index","defaultLanguage":expected},ensure_ascii=False),flush=True)
        for lang in ("ko","en"):
            for width in WIDTHS:
                try:
                    issues=validate(driver,lang,width)
                    for issue in issues:
                        all_issues.append(f"{lang} {width}px: {issue}")
                except (TimeoutException,Exception) as ex:
                    all_issues.append(f"{lang} {width}px: automation exception: {str(ex)[:250]}")
        # Archived full-match/board page also exposes the same language toggle.
        for lang in ("ko","en"):
            for width in (390,1280):
                driver.set_window_size(width,930)
                driver.get(BASE+"legacy.html?lang="+lang)
                WebDriverWait(driver,15).until(
                    lambda d: d.execute_script("return Boolean(document.querySelector('.dfc-lang-switch'))")
                )
                view=script(driver, """
                    const lang=document.documentElement.lang,rect=x=>x.getBoundingClientRect();
                    const toggle=document.querySelector('.dfc-lang-switch');
                    const header=document.querySelector('.header');
                    return {language:lang,viewport:innerWidth,pageWidth:document.documentElement.scrollWidth,
                      headerRight:rect(header).right,toggleRight:rect(toggle).right,
                      visible:rect(toggle).width>0&&rect(toggle).height>0};
                """)
                driver.save_screenshot(str(OUT / f"dfc-legacy-{lang}-{width}.png"))
                print(json.dumps({"lang":lang,"width":width,"screen":"legacy",**view},ensure_ascii=False),flush=True)
                if not view["visible"] or view["toggleRight"]>width+2:
                    all_issues.append(f"legacy {lang} {width}px language switch out of viewport")
                if view["pageWidth"]>width+4:
                    all_issues.append(f"legacy {lang} {width}px page horizontal overflow {view['pageWidth']}")
        # Rights/privacy must be readable in both languages on phone and desktop.
        for page in ("privacy.html","legal.html"):
            for lang in ("ko","en"):
                for width in (390,1280):
                    driver.set_window_size(width,930)
                    driver.get(BASE+page+"?lang="+lang)
                    result=script(driver, """
                        const lang=document.documentElement.lang;
                        const visible=Array.from(document.querySelectorAll('[data-language]'))
                           .filter(x=>x.getBoundingClientRect().height>0).map(x=>x.dataset.language);
                        return {lang,visible,width:document.documentElement.scrollWidth,
                          heading:document.querySelector('[data-language="'+lang+'"] h1')?.textContent};
                    """)
                    print(json.dumps({"page":page,"lang":lang,"viewport":width,**result},ensure_ascii=False),flush=True)
                    driver.save_screenshot(str(OUT / f"dfc-{page}-{lang}-{width}.png"))
                    if result["lang"]!=lang or result["visible"]!=[lang] or not result["heading"]:
                        all_issues.append(f"{page} {lang} {width}px wrong visible language")
                    if result["width"]>width+4:
                        all_issues.append(f"{page} {lang} {width}px horizontal overflow")
        if all_issues:
            print("\nFAILURES:\n"+"\n".join(all_issues),flush=True)
            raise SystemExit(1)
        print("\nLAYOUT AUDIT PASSED: 12 actual Chromium renders at 360-1280px, KO and EN",flush=True)
    finally:
        driver.quit()

if __name__=="__main__":
    main()
