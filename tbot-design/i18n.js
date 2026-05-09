// Global i18n + gender theme controller.
// — VI/EN swap via DOM text walker + MutationObserver (default VI)
// — Gender theme via :root[data-gender] CSS overrides (default girl)
// Floating control sits top-right, on top of all views.

(function(){
  const STORAGE_LANG = 'tbot.lang';
  const STORAGE_GENDER = 'tbot.gender';

  // ── Vietnamese catalog loaded from locales/bundle.js (window.__tbotLocales). ──
  // Source of truth: locales/{en,vi}.json. Run `npm run i18n:bundle` to regenerate
  // locales/bundle.js after editing the JSON catalogs.
  const LOCALES = (typeof window !== 'undefined' && window.__tbotLocales) || { en: {}, vi: {} };

  // Walk text-node ancestors looking for [data-persona]. Default 'parent' (neutral).
  function resolvePersona(node){
    for (let cur = node && node.parentNode; cur && cur.nodeType === 1; cur = cur.parentNode){
      const p = cur.getAttribute && cur.getAttribute('data-persona');
      if (p === 'child' || p === 'parent') return p;
    }
    return 'parent';
  }

  // VI lookup: handles both string entries and {child, parent} object entries.
  function lookupVi(key, persona){
    const entry = LOCALES.vi[key];
    if (entry == null) return undefined;
    if (typeof entry === 'string') return entry;
    return entry[persona] ?? entry.parent ?? entry.child;
  }

  // Cached non-_meta key list for case-insensitive scan.
  let _viKeysCache = null;
  function viKeys(){
    if (_viKeysCache) return _viKeysCache;
    _viKeysCache = Object.keys(LOCALES.vi).filter(k => k !== '_meta');
    return _viKeysCache;
  }

  // ── Apply
  const root = document.documentElement;

  function getLang(){ return localStorage.getItem(STORAGE_LANG) || 'en'; }
  function getGender(){ return localStorage.getItem(STORAGE_GENDER) || 'girl'; }

  function applyGender(g){
    root.setAttribute('data-gender', g);
    localStorage.setItem(STORAGE_GENDER, g);
  }

  // Text-node walker. Stores original on first encounter.
  const TEXT_KEY = '__tbotOrig';

  // Inject CSS for bilingual wrappers once.
  if (!document.getElementById('tbot-bi-style')) {
    const st = document.createElement('style');
    st.id = 'tbot-bi-style';
    st.textContent = `
      .tbot-bi{ display:inline-flex; flex-direction:column; line-height:1.05; vertical-align:baseline; }
      .tbot-bi > .tbot-bi-en{ opacity:.55; font-size:.72em; font-weight:500; margin-top:1px; letter-spacing:.01em; }
    `;
    document.head.appendChild(st);
  }

  function unwrapAllBi(){
    document.querySelectorAll('span.tbot-bi').forEach(span => {
      const orig = span.getAttribute('data-bi-orig') || '';
      const tn = document.createTextNode(orig);
      tn[TEXT_KEY] = orig;
      if (span.parentNode) span.parentNode.replaceChild(tn, span);
    });
  }

  function walkAndSwap(node, lang){
    if (!node) return;
    if (node.nodeType === 3) { // TEXT_NODE
      const orig = node[TEXT_KEY] !== undefined ? node[TEXT_KEY] : node.nodeValue;
      if (node[TEXT_KEY] === undefined) node[TEXT_KEY] = orig;
      const trimmed = orig.trim();
      if (!trimmed) return;
      if (lang === 'en') {
        if (node.nodeValue !== orig) node.nodeValue = orig;
        return;
      }
      // Resolve persona from nearest [data-persona] ancestor (fallback 'parent').
      const persona = resolvePersona(node);
      // Look up VI translation (exact then case-insensitive)
      let vi = lookupVi(trimmed, persona);
      if (!vi) {
        const lower = trimmed.toLowerCase();
        for (const k of viKeys()) { if (k.toLowerCase() === lower) { vi = lookupVi(k, persona); break; } }
      }
      // Numbered state titles: "12 · First Lesson Entry" → translate the tail,
      // recompose with the same numeric prefix. Handles "·", ".", ":", "-".
      if (!vi) {
        const m = trimmed.match(/^(\d+\s*[·\.\:\-]\s*)(.+)$/);
        if (m) {
          const tail = m[2].trim();
          let tailVi = lookupVi(tail, persona);
          if (!tailVi) {
            const lower = tail.toLowerCase();
            for (const k of viKeys()) { if (k.toLowerCase() === lower) { tailVi = lookupVi(k, persona); break; } }
          }
          if (tailVi) vi = m[1] + tailVi;
        }
      }
      // "Group · Title" pattern (e.g. "Home · Idle happy") — translate each side.
      if (!vi && trimmed.includes(' · ')) {
        const parts = trimmed.split(' · ');
        const tparts = parts.map(p => {
          const t = p.trim();
          const direct = lookupVi(t, persona);
          if (direct) return direct;
          const lower = t.toLowerCase();
          for (const k of viKeys()) { if (k.toLowerCase() === lower) return lookupVi(k, persona); }
          return t;
        });
        if (tparts.some((v,i)=>v !== parts[i].trim())) vi = tparts.join(' · ');
      }
      const before = orig.match(/^\s*/)[0];
      const after  = orig.match(/\s*$/)[0];
      if (lang === 'both') {
        // Bilingual: VI on top, EN below in smaller muted text.
        // Replace text node with a wrapper span so each language sits on
        // its own line and never collides inline with the other.
        if (vi && vi.toLowerCase() !== trimmed.toLowerCase() && node.parentNode) {
          const w = document.createElement('span');
          w.className = 'tbot-bi';
          w.setAttribute('data-bi-orig', orig);
          w.setAttribute('data-no-i18n','');
          const viEl = document.createElement('span');
          viEl.textContent = before + vi + after;
          const enEl = document.createElement('span');
          enEl.className = 'tbot-bi-en';
          enEl.textContent = trimmed;
          w.appendChild(viEl);
          w.appendChild(enEl);
          node.parentNode.replaceChild(w, node);
        } else if (node.nodeValue !== orig) {
          node.nodeValue = orig;
        }
        return;
      }
      // VI only
      const next = vi ? before + vi + after : orig;
      if (node.nodeValue !== next) node.nodeValue = next;
      return;
    }
    if (node.nodeType !== 1) return; // not element
    const tag = node.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'CODE') return;
    if (node.hasAttribute && node.hasAttribute('data-no-i18n')) return;
    for (let c = node.firstChild; c; c = c.nextSibling) walkAndSwap(c, lang);
  }

  let observer = null;
  function applyLang(lang){
    localStorage.setItem(STORAGE_LANG, lang);
    root.setAttribute('lang', lang);
    // Always start clean from any prior bilingual wrappers.
    unwrapAllBi();
    if (observer) { observer.disconnect(); observer = null; }
    if (lang === 'en') {
      // EN is the source language — no translation needed, no observer.
      // Avoids fighting React's reconciliation in a feedback loop.
      return;
    }
    // Empty-catalog guard: warn and behave as EN if bundle.js is missing/stale.
    if (viKeys().length === 0) {
      console.warn('[tbot.i18n] empty VI catalog — bundle.js missing or stale, run npm run i18n:bundle');
      return;
    }
    // VI / both: walk once, then observe for newly added nodes only.
    // characterData is intentionally NOT observed: when React reconciles a
    // text node back to EN, we ignore it — preventing the walker↔React loop.
    let muted = false;
    const walkSafely = (n) => {
      if (muted) return;
      muted = true;
      try { walkAndSwap(n, lang); } finally { muted = false; }
    };
    walkSafely(document.body);
    observer = new MutationObserver(muts => {
      if (muted) return;
      for (const m of muts) {
        m.addedNodes.forEach(n => walkSafely(n));
      }
    });
    observer.observe(document.body, { childList:true, subtree:true });
  }

  // ── Floating control ──
  function mountControl(){
    if (document.getElementById('tbot-i18n-ctl')) return;
    const el = document.createElement('div');
    el.id = 'tbot-i18n-ctl';
    el.setAttribute('data-no-i18n','');
    el.style.cssText = `
      position:fixed; top:14px; right:14px; z-index:99999;
      display:flex; gap:6px; padding:6px;
      background:rgba(255,255,255,.92); backdrop-filter:blur(8px);
      border:1px solid rgba(0,0,0,.08); border-radius:99px;
      box-shadow:0 4px 14px rgba(0,0,0,.08);
      font-family:-apple-system,"SF Pro Text",Inter,system-ui,sans-serif; font-size:11px;
    `;
    const lang = getLang(), gender = getGender();

    const seg = (label, items, current, onPick) => {
      const wrap = document.createElement('div');
      wrap.setAttribute('data-no-i18n','');
      wrap.style.cssText = 'display:flex;align-items:center;gap:6px;padding:0 8px;';
      const lab = document.createElement('span');
      lab.setAttribute('data-no-i18n','');
      lab.textContent = label;
      lab.style.cssText = 'font-family:ui-monospace,Menlo;font-size:9px;letter-spacing:.14em;color:#6B6675;text-transform:uppercase;';
      wrap.appendChild(lab);
      const seg = document.createElement('div');
      seg.setAttribute('data-no-i18n','');
      seg.style.cssText = 'display:flex;gap:2px;padding:2px;background:#F3EFE6;border-radius:99px;';
      items.forEach(it => {
        const b = document.createElement('button');
        b.setAttribute('data-no-i18n','');
        b.textContent = it.label;
        b.dataset.value = it.value;
        b.style.cssText = `
          border:none; background:${current===it.value?'#fff':'transparent'};
          color:${current===it.value?'#1B1820':'#6B6675'};
          padding:4px 10px; border-radius:99px; cursor:pointer;
          font-weight:600; font-size:11px;
          ${it.dot?`box-shadow:inset 0 0 0 ${current===it.value?2:0}px ${it.dot};`:''}
          display:inline-flex; align-items:center; gap:5px;
        `;
        if (it.dot) {
          const d = document.createElement('span');
          d.setAttribute('data-no-i18n','');
          d.style.cssText = `width:7px;height:7px;border-radius:99px;background:${it.dot};display:inline-block`;
          b.prepend(d);
        }
        b.onclick = () => { onPick(it.value); rebuild(); };
        seg.appendChild(b);
      });
      wrap.appendChild(seg);
      return wrap;
    };

    const rebuild = () => {
      el.innerHTML = '';
      el.appendChild(seg('Lang', [
        {label:'VI',value:'vi'},
        {label:'VI / EN',value:'both'},
        {label:'EN',value:'en'},
      ], getLang(), v => applyLang(v)));
      el.appendChild(seg('Gender', [
        {label:'Girl',value:'girl',dot:'#FF8FB1'},
        {label:'Boy', value:'boy', dot:'#5DAEFF'},
      ], getGender(), v => applyGender(v)));
    };
    rebuild();
    document.body.appendChild(el);
  }

  // Init on DOM ready — defer the walker so React has time to mount first.
  // The walker on a 3M-char canvas during initial layout can interfere with
  // the canvas's fit-to-viewport calculation.
  function init(){
    applyGender(getGender());
    mountControl();
    setTimeout(() => applyLang(getLang()), 1500);
    setTimeout(() => applyLang(getLang()), 4000);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.__tbot = {
    setLang: applyLang, setGender: applyGender, getLang, getGender,
  };
})();
