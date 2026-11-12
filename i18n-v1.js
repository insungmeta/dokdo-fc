/* DOKDO FC bilingual interface: KO / EN, with dynamic content and shareable URLs. */
(function () {
  'use strict';
  var key = 'dfc-language';
  var query = new URLSearchParams(window.location.search).get('lang');
  var saved = '';
  try { saved = localStorage.getItem(key) || ''; } catch (_) {}
  var locale = (query === 'ko' || query === 'en') ? query :
    ((saved === 'ko' || saved === 'en') ? saved :
     (/^ko(?:-|$)/i.test(navigator.language || 'ko') ? 'ko' : 'en'));
  var english = locale === 'en';
  document.documentElement.lang = locale;
  document.documentElement.setAttribute('data-dfc-language', locale);
  try { if (query === 'ko' || query === 'en') localStorage.setItem(key, locale); } catch (_) {}

  var terms = (window.DFC_TRANSLATIONS || []).slice().sort(function (a, b) {
    return b[0].length - a[0].length;
  });
  var blocked = [
    '.dfc-lang-switch', 'script', 'style', 'noscript', 'pre', 'code',
    '.match-item .title', '.standing-row .who strong', '.roster-identity strong',
    '.roster-avatar', '.home-leader .hl-name', '.star .person', '.card-row .name',
    '.crest-fallback', '.team-name-pair', '#gameTeamDisplay',
    '#profileName', '#profileAvatar', '#h2hOpponentGroup',
    '#rivalSelect option', '.h2h-rival-brand', '.match-contributor-chip strong',
    '.roster-member summary strong', '.h2h-fixtures .name',
    '.board-post-content', '.board-comment-content', '.board-post h4', '.board-post p', '.board-post .board-post-top', '[translate="no"]',
    '[data-no-translate]'
  ].join(',');
  var cache = new Map();
  function protectedNode(node) {
    var el = node.nodeType === 1 ? node : node.parentElement;
    return !el || !!el.closest(blocked);
  }
  function translate(str) {
    if (!english || !str || !/[가-힣]/.test(str)) return str;
    if (cache.has(str)) return cache.get(str);
    var out = str;
    for (var i = 0; i < terms.length; i++) {
      var original = terms[i][0], target = terms[i][1];
      if (!original || out.indexOf(original) === -1) continue;
      // Short syllables and units must match an entire UI label, not player names.
      if (original.length < 3 && out.trim() !== original) continue;
      out = out.split(original).join(target);
    }
    // Dynamic EA labels include short Korean units joined to numbers; those
    // cannot be handled safely by the static dictionary alone.
    out = out.replace(/최근\s*(\d+)\s*경기/g, 'Latest $1 Matches');
    out = out.replace(/(?<=^|[\\s·,:])리그(?=$|[\\s·,:.!?])/g, 'League');
    out = out.replace(/(?<=^|[\\s·,:])친선(?=$|[\\s·,:.!?])/g, 'Friendly');
    out = out.replace(/(?<=^|[\\s·,:])갱신(?=$|[\\s·,:.!?])/g, 'Updated');
    out = out.replace(/(\d+(?:\.\d+)?)\s*골(?=$|[\\s·,:.!?])/g, '$1 goals');
    out = out.replace(/(\d+)\s*회(?=$|[\\s·,:.!?])/g, '$1 times');
    out = out.replace(/(\d+)\s*부(?:\s*리그)?(?=[\s·,:.!?)]|$)/g, 'Division $1');
    out = out.replace(/(\d+)\s*승\s*(?:[·,\/]\s*)?(\d+)\s*무\s*(?:[·,\/]\s*)?(\d+)\s*패/g, '$1W · $2D · $3L');
    out = out.replace(/(\d+)\s*경기(?=[\s·,.!)]|$)/g, '$1 matches');
    out = out.replace(/승점\s*(\d+(?:\.\d+)?)\s*점?/g, '$1 pts');
    out = out.replace(/(\d+(?:\.\d+)?)\s*점(?=[\s·,.!)]|$)/g, '$1 pts');
    out = out.replace(/(\d+)\s*명(?=[\s·,.!)]|$)/g, '$1 players');
    out = out.replace(/전체\s+(\d+)\s*matches?\s*중\s*(\d+)\s*matches?\s*표시/g, 'Showing $2 of $1 matches');
    out = out.replace(/(\d+)\s*전(?=[\s·,.!)]|$)/g, '$1 fixtures');
    out = out.replace(/\s*기준\s*[·,]/g, ' ·');
    out = out.replace(/^현재\s+(?=Division)/, 'Current ');
    if (cache.size > 3500) cache.clear();
    cache.set(str, out);
    return out;
  }
  function translateText(node) {
    if (protectedNode(node)) return;
    var before = node.nodeValue;
    var after = translate(before);
    if (after !== before) node.nodeValue = after;
  }
  function translateAttrs(root) {
    if (!root || root.nodeType !== 1 || protectedNode(root)) return;
    ['aria-label', 'title', 'placeholder', 'alt'].forEach(function (attr) {
      var before = root.getAttribute(attr);
      if (before && /[가-힣]/.test(before)) {
        var after = translate(before);
        if (before !== after) root.setAttribute(attr, after);
      }
    });
  }
  var translating = false, queued = false;
  function localize() {
    if (!english || translating || !document.body) return;
    translating = true;
    try {
      var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      var n;
      while ((n = walker.nextNode())) translateText(n);
      // A large numeric division card already says "Current Division" beside the number.
      // Avoid rendering "4Division" from separately translated Korean suffixes.
      var digit = document.querySelector('.division-digit');
      if (digit) {
        var match = digit.textContent.trim().match(/^(\d+)/);
        if (match && digit.textContent.trim() !== match[1]) digit.textContent = match[1];
      }
      var elements = document.body.querySelectorAll('[aria-label],[title],[placeholder],[alt]');
      for (var i = 0; i < elements.length; i++) translateAttrs(elements[i]);
      if (/[가-힣]/.test(document.title)) document.title = translate(document.title);
      var metas = document.querySelectorAll('meta[name="description"], meta[property="og:title"], meta[property="og:description"], meta[name="twitter:title"], meta[name="twitter:description"]');
      for (var j = 0; j < metas.length; j++) {
        if (/[가-힣]/.test(metas[j].content)) metas[j].content = translate(metas[j].content);
      }
      var og = document.querySelector('meta[property="og:locale"]');
      if (og) og.content = 'en_US';
      var links = document.querySelectorAll('a[href]');
      for (var k = 0; k < links.length; k++) {
        if (links[k].closest('.dfc-lang-switch')) continue;
        var href = links[k].getAttribute('href');
        if (!href || !/^\.\/(?:legacy|index)\.html(?:\?|#|$)/.test(href)) continue;
        var dest = new URL(href, location.href);
        if (dest.searchParams.get('lang') === 'en') continue;
        dest.searchParams.set('lang', 'en');
        // Keep the original relative ./legacy.html prefix. Turning it into an
        // absolute /dokdo-fc/legacy.html URL bypassed the site's hide rules
        // and exposed two unwanted legacy links in the English navigation.
        var filename = dest.pathname.split('/').pop();
        links[k].setAttribute('href', './' + filename + dest.search + dest.hash);
      }
      // Display short navigation labels in English so all five tabs stay
      // inside their actual allotted width, without adding another tab.
      var compact = {
        '#overview': ['Home', 'Club Home'],
        '#players': ['Players', 'Player Rankings'],
        '#matches': ['Matches', 'Match Records'],
        '#rivalry': ['Rivals', 'Head-to-Head'],
        '#more': ['Trends', 'Team Trends']
      };
      var primary = document.querySelectorAll('.header .nav a');
      for (var m = 0; m < primary.length; m++) {
        var info = compact[primary[m].getAttribute('href')];
        if (!info) continue;
        if (primary[m].textContent !== info[0]) primary[m].textContent = info[0];
        if (primary[m].getAttribute('aria-label') !== info[1]) primary[m].setAttribute('aria-label', info[1]);
      }
      var mobile = {
        home: ['Home', 'Club Home'],
        players: ['Players', 'Player Rankings'],
        matches: ['Matches', 'Match Records'],
        rivals: ['Rivals', 'Head-to-Head'],
        more: ['Trends', 'Team Trends']
      };
      var mobileTabs = document.querySelectorAll('.app-bottom-nav [data-screen]');
      for (var n = 0; n < mobileTabs.length; n++) {
        var labels = mobile[mobileTabs[n].dataset.screen];
        if (!labels) continue;
        var label = mobileTabs[n].querySelector('.app-nav-label');
        if (label && label.textContent !== labels[0]) label.textContent = labels[0];
        if (mobileTabs[n].getAttribute('aria-label') !== labels[1])
          mobileTabs[n].setAttribute('aria-label', labels[1]);
      }
      var trendHeading = document.querySelector('.division-trend-head strong');
      if (trendHeading && trendHeading.textContent !== '5-Match Avg. Points')
        trendHeading.textContent = '5-Match Avg. Points';
    } finally { translating = false; }
  }
  function languageLink(lang) {
    var current = new URL(location.href);
    current.searchParams.set('lang', lang);
    return current.pathname + current.search + current.hash;
  }
  function addStyles() {
    if (document.getElementById('dfc-lang-styles')) return;
    var st = document.createElement('style');
    st.id = 'dfc-lang-styles';
    st.textContent = [
      '.dfc-lang-switch{display:inline-flex;flex:none;align-items:center;gap:3px;background:#112a31;border:1px solid #688478;border-radius:10px;padding:3px;position:relative;z-index:140}',
      '.dfc-lang-switch a{display:grid;place-items:center;min-width:34px;min-height:34px;padding:5px;border-radius:7px;color:#d1e4e5;text-decoration:none;font:900 11px/1 Arial,sans-serif}',
      '.dfc-lang-switch a.is-active{background:#c8f35d;color:#10261c}',
      '.dfc-lang-switch a:focus-visible{outline:2px solid #c8f35d;outline-offset:2px}',
      '@media(max-width:800px){.header .shell>.dfc-lang-switch{margin-left:2px;gap:1px;padding:2px}.header .shell>.dfc-lang-switch a{min-width:33px;min-height:36px}.header .shell>.app-status{margin-left:auto}html[data-dfc-language="en"] .app-bottom-nav .app-nav-label{font-size:9px;letter-spacing:-.2px}}',
      '@media(max-width:385px){.header .shell>.app-status{display:none!important}.header .shell>.dfc-lang-switch{margin-left:auto}}',
      '.header>.dfc-lang-switch{margin-left:auto}',
      '@media(max-width:800px){.header>.dfc-lang-switch{margin-left:2px}}',
      'html[data-dfc-language="en"] .dfc-lang-switch{flex-shrink:0}',
      '@media(min-width:801px){html[data-dfc-language="en"] .header .shell{gap:8px;flex-wrap:nowrap}html[data-dfc-language="en"] .header .brand{flex:0 0 auto}html[data-dfc-language="en"] .header .nav{flex:1 1 auto;min-width:0;justify-content:center;gap:3px}html[data-dfc-language="en"] .header .nav a{font-size:11px;padding:9px 8px;min-width:0}}',
      '@media(max-width:800px){html[data-dfc-language="en"] .header .shell>.app-status{display:none!important}html[data-dfc-language="en"] .header .shell>.dfc-lang-switch{margin-left:auto}html[data-dfc-language="en"] .app-bottom-nav .app-nav-label{font-size:10px;white-space:nowrap;line-height:1.25}html[data-dfc-language="en"] .app-bottom-nav button{min-width:0;overflow:hidden}html[data-dfc-language="en"] .app-bottom-nav{grid-template-columns:repeat(5,minmax(0,1fr))}}',
      'html[data-dfc-language="en"] #app-home .division-trend{max-width:100%;min-width:0;box-sizing:border-box;overflow:hidden}',
      'html[data-dfc-language="en"] #app-home .division-trend-head{display:flex;flex-wrap:wrap;align-items:flex-start;gap:5px;min-width:0}',
      'html[data-dfc-language="en"] #app-home .division-trend-head strong{flex:1 1 100%;min-width:0;white-space:normal;line-height:1.4;overflow-wrap:break-word}',
      'html[data-dfc-language="en"] #app-home .division-trend-summary{min-width:0;max-width:100%;justify-content:flex-start;overflow-wrap:anywhere}',
      'html[data-dfc-language="en"] #app-home .division-trend-caption{max-width:100%;min-width:0;white-space:normal;overflow-wrap:anywhere;line-height:1.5}',
      'html[data-dfc-language="en"] #app-home .division-trend-chart{max-width:100%;width:100%;overflow:hidden;display:block}',
      'html[data-dfc-language="en"] #app-home .division-hero-main>*{min-width:0;max-width:100%}',
      'html[data-dfc-language="en"] #app-home .division-form-top{display:flex;flex-wrap:wrap;gap:7px;min-width:0}',
      'html[data-dfc-language="en"] #app-home .division-form-top strong{width:100%;white-space:normal;min-width:0}',
      'html[data-dfc-language="en"] #app-home .division-form-top span{min-width:0;white-space:normal;overflow-wrap:break-word}',
      'html[data-dfc-language="en"] #app-home .division-subline .season-wdl{flex-wrap:wrap;white-space:normal;min-width:0}',
      'html[data-dfc-language="en"] #app-home .division-subline .season-wdl b{white-space:normal;flex-basis:100%;margin-right:0}',
      'html[data-dfc-language="en"] #app-home .division-copy{min-width:0;overflow-wrap:break-word}',
      'html[data-dfc-language="en"] #app-home .division-showcase{min-width:0;max-width:100%;gap:9px}',
      'html[data-dfc-language="en"] #app-home .division-copy strong{white-space:normal}',
      'html[data-dfc-language="en"] .screen-head{min-width:0;flex-wrap:wrap}',
      'html[data-dfc-language="en"] .screen-head h2{overflow-wrap:break-word}',
      'html[data-dfc-language="en"] .metric h3,html[data-dfc-language="en"] .metric small{overflow-wrap:break-word;white-space:normal}',
      'html[data-dfc-language="en"] #more .compare-period-card{min-width:0;overflow-wrap:break-word}',
      'html[data-dfc-language="en"] .player-history-title{flex-wrap:wrap;overflow-wrap:break-word}',
      '@media(max-width:380px){html[data-dfc-language="en"] #app-home .division-trend-head{gap:4px}html[data-dfc-language="en"] #app-home .division-trend-summary b{font-size:15px}html[data-dfc-language="en"] #app-home .hero-chips{flex-wrap:wrap}}'
    ].join('\n');
    document.head.appendChild(st);
  }
  function addSwitch() {
    var target = document.querySelector('.header .shell') ||
       document.querySelector('.header .nav-right') ||
       document.querySelector('header.header');
    if (!target || document.querySelector('.dfc-lang-switch')) return;
    var panel = document.createElement('div');
    panel.className = 'dfc-lang-switch';
    panel.setAttribute('role', 'group');
    panel.setAttribute('aria-label', 'Language selection / 언어 선택');
    ['ko', 'en'].forEach(function (lang) {
      var a = document.createElement('a');
      a.href = languageLink(lang);
      a.textContent = lang.toUpperCase();
      a.lang = lang;
      a.setAttribute('aria-label', lang === 'ko' ? '한국어로 보기' : 'View in English');
      if (lang === locale) {
        a.className = 'is-active';
        a.setAttribute('aria-current', 'true');
      }
      a.addEventListener('click', function () {
        try { localStorage.setItem(key, lang); } catch (_) {}
      });
      panel.appendChild(a);
    });
    target.appendChild(panel);
  }
  function scheduleTranslate() {
    if (!english || queued) return;
    queued = true;
    Promise.resolve().then(function () {
      queued = false;
      localize();
    });
  }
  function init() {
    addStyles();
    addSwitch();
    if (!english) return;
    localize();
    var observer = new MutationObserver(scheduleTranslate);
    observer.observe(document.body, {
      subtree: true, childList: true, characterData: true, attributes: true,
      attributeFilter: ['aria-label', 'title', 'alt', 'placeholder']
    });
  }
  window.DOKDO_LANGUAGE = { current: locale, translate: translate };
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();