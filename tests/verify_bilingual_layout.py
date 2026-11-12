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
            return tabs.length === 5 && document.querySelector('.dfc-lang-switch');
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
        if(nav.length!==(innerWidth>800?5:0))issues.push('wrong top nav count: '+nav.length);
        if(bottom.length!==(innerWidth<=800?5:0))issues.push('wrong bottom nav count: '+bottom.length);
        const expected=checks.lang==='en'?['Home','Players','Matches','Rivals','Trends']:['클럽 홈','선수 랭킹','경기 기록','상대전적','팀 흐름'];
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
        if(document.documentElement.scrollWidth>innerWidth+4)issues.push('page horizontal overflow '+checks.documentWidth+' > '+innerWidth);
        return {issues,checks};
    """.replace("arguments[0]",json.dumps(lang)))
    screenshot = OUT / f"dfc-{lang}-{width}.png"
    driver.save_screenshot(str(screenshot))
    print(json.dumps({"lang":lang,"width":width,**info},ensure_ascii=False),flush=True)
    # Go beyond the home card: verify each of the five screens and the full
    # squad view at representative mobile and desktop sizes.
    if width in (390, 1280):
        for screen in ("players", "matches", "rivals", "more"):
            driver.execute_script(
                "document.querySelector('.app-bottom-nav [data-screen=\"' + arguments[0] + '\"]').click()", screen
            )
            section = {
                "players": "#players", "matches": "#matches",
                "rivals": "#app-rivals", "more": "#more"
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
                return {active:active.id,issues,headings:headings.slice(0,20)};
            """)
            print(json.dumps({"lang":lang,"width":width,"screen":screen,**details},ensure_ascii=False),flush=True)
            driver.save_screenshot(str(OUT / f"dfc-{lang}-{width}-{screen}.png"))
            info["issues"].extend(screen+": "+x for x in details["issues"])
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
        for lang in ("ko","en"):
            for width in WIDTHS:
                try:
                    issues=validate(driver,lang,width)
                    for issue in issues:
                        all_issues.append(f"{lang} {width}px: {issue}")
                except (TimeoutException,Exception) as ex:
                    all_issues.append(f"{lang} {width}px: automation exception: {str(ex)[:250]}")
        if all_issues:
            print("\nFAILURES:\n"+"\n".join(all_issues),flush=True)
            raise SystemExit(1)
        print("\nLAYOUT AUDIT PASSED: 12 actual Chromium renders at 360-1280px, KO and EN",flush=True)
    finally:
        driver.quit()

if __name__=="__main__":
    main()
