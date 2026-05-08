// Global i18n + gender theme controller (v2 — catalog-loaded, persona-aware).
// — VI/EN swap via DOM text walker + MutationObserver (default VI)
// — Translates text nodes AND a defined attribute set (placeholder, aria-label, title, alt)
// — Persona ({child, parent}) resolved via nearest ancestor [data-persona]; default 'parent'
// — `data-i18n-key` escape hatch for homographs / interpolated copy
// — Catalog loaded from locales/{vi,en}.json at runtime (no inline DICT)
// — `__tbot.useLegacyDict()` swaps in locales/legacy-inline.json as the rollback path (AC16)
// — Format helpers (__tbot.fmtPrice/fmtDate/fmtNumber) dispatch on active locale
// — Gender theme via :root[data-gender] CSS overrides (default girl)
// Floating control sits top-right, on top of all views.

(function () {
  'use strict';

  const STORAGE_LANG = 'tbot.lang';
  const STORAGE_GENDER = 'tbot.gender';
  // Cache buster for catalog fetch — prototype iterates often, no SW.
  const APP_VERSION = String(Date.now());

  // Attribute set the walker translates in addition to text nodes.
  const I18N_ATTRS = ['placeholder', 'aria-label', 'title', 'alt'];

  // Per-text-node bookkeeping keys (assigned as JS properties on the Node instance).
  const TEXT_KEY = '__tbotOrig';
  const ATTR_KEY = '__tbotAttrOrig';        // map: attrName -> original literal
  const KEYED_GUARD = '__tbotKeyedDescent'; // marks elements walked via data-i18n-key

  // Catalogs: { vi: {...}, en: {...}, 'vi-pseudo': {...}, 'vi-stretched': {...} }
  // Each entry value is either a string or { child?, parent? } object.
  let CATALOGS = { vi: {}, en: {} };
  let CATALOG_READY = false;
  let LEGACY_MODE = false;

  // ── Persona resolution + cache ────────────────────────────────────────────
  // Cache key = element (WeakMap). Invalidated by attribute MutationObserver
  // when [data-persona] changes anywhere in the document.
  const PERSONA_CACHE = new WeakMap();

  function nearestPersona(el) {
    if (!el || el.nodeType !== 1) return null;
    if (PERSONA_CACHE.has(el)) return PERSONA_CACHE.get(el);
    let cur = el;
    let found = null;
    while (cur && cur.nodeType === 1) {
      if (cur.hasAttribute && cur.hasAttribute('data-persona')) {
        const v = cur.getAttribute('data-persona');
        if (v === 'child' || v === 'parent') { found = v; break; }
      }
      cur = cur.parentElement;
    }
    PERSONA_CACHE.set(el, found);
    return found;
  }

  function invalidatePersonaSubtree(root) {
    if (!root) return;
    PERSONA_CACHE.delete(root);
    if (root.querySelectorAll) {
      root.querySelectorAll('*').forEach(n => PERSONA_CACHE.delete(n));
    }
  }

  // ── Catalog load ──────────────────────────────────────────────────────────
  async function loadCatalog() {
    try {
      const [vi, en] = await Promise.all([
        fetch('./locales/vi.json?v=' + APP_VERSION).then(r => {
          if (!r.ok) throw new Error('vi ' + r.status);
          return r.json();
        }),
        fetch('./locales/en.json?v=' + APP_VERSION).then(r => {
          if (!r.ok) throw new Error('en ' + r.status);
          return r.json();
        }),
      ]);
      CATALOGS = { vi, en };
      CATALOG_READY = true;
    } catch (e) {
      console.warn('[i18n] catalog load failed; falling back to legacy-inline', e);
      try {
        const legacy = await fetch('./locales/legacy-inline.json?v=' + APP_VERSION).then(r => r.json());
        CATALOGS = { vi: legacy, en: {} };
      } catch (e2) {
        console.error('[i18n] legacy fallback also failed', e2);
        CATALOGS = { vi: {}, en: {} };
      }
      CATALOG_READY = true;
    }
    // Optional pseudo / stretched locales — pre-generated, may not exist.
    for (const variant of ['vi-pseudo', 'vi-stretched']) {
      try {
        const v = await fetch('./locales/' + variant + '.json?v=' + APP_VERSION).then(r => r.ok ? r.json() : null);
        if (v) CATALOGS[variant] = v;
      } catch (_) { /* optional */ }
    }
  }

  function lookupValue(catalogEntry, persona) {
    if (catalogEntry == null) return null;
    if (typeof catalogEntry === 'string') return catalogEntry || null;
    if (typeof catalogEntry === 'object') {
      const p = persona || 'parent';
      const v = catalogEntry[p] ?? catalogEntry.parent ?? catalogEntry.child;
      return v || null;
    }
    return null;
  }

  function lookupForKey(lang, key, persona) {
    if (!key) return null;
    const cat = CATALOGS[lang];
    if (!cat) return null;
    let entry = cat[key];
    if (entry == null) {
      // case-insensitive fallback (parity with legacy DICT behaviour)
      const lower = key.toLowerCase();
      for (const k in cat) {
        if (k === '_meta') continue;
        if (k.toLowerCase() === lower) { entry = cat[k]; break; }
      }
    }
    return lookupValue(entry, persona);
  }

  // ── Bilingual wrapper styles ──────────────────────────────────────────────
  const root = document.documentElement;

  function getLang() { return localStorage.getItem(STORAGE_LANG) || 'vi'; }
  function getGender() { return localStorage.getItem(STORAGE_GENDER) || 'girl'; }

  function applyGender(g) {
    root.setAttribute('data-gender', g);
    localStorage.setItem(STORAGE_GENDER, g);
  }

  if (!document.getElementById('tbot-bi-style')) {
    const st = document.createElement('style');
    st.id = 'tbot-bi-style';
    st.textContent = `
      .tbot-bi{ display:inline-flex; flex-direction:column; line-height:1.05; vertical-align:baseline; }
      .tbot-bi > .tbot-bi-en{ opacity:.55; font-size:.72em; font-weight:500; margin-top:1px; letter-spacing:.01em; }
    `;
    document.head.appendChild(st);
  }

  function unwrapAllBi() {
    document.querySelectorAll('span.tbot-bi').forEach(span => {
      const orig = span.getAttribute('data-bi-orig') || '';
      const tn = document.createTextNode(orig);
      tn[TEXT_KEY] = orig;
      if (span.parentNode) span.parentNode.replaceChild(tn, span);
    });
  }

  // ── Walker ────────────────────────────────────────────────────────────────
  function applyAttributesPass(el, lang) {
    if (!el || el.nodeType !== 1 || !el.hasAttribute) return;
    if (el.hasAttribute('data-no-i18n')) return;
    if (el.hasAttribute('data-no-i18n-attrs')) return;
    if (!el[ATTR_KEY]) el[ATTR_KEY] = {};
    const orig = el[ATTR_KEY];
    const persona = nearestPersona(el) || null;

    for (const a of I18N_ATTRS) {
      if (!el.hasAttribute(a) && orig[a] === undefined) continue;
      // First sighting → snapshot the literal authored in JSX.
      if (orig[a] === undefined && el.hasAttribute(a)) orig[a] = el.getAttribute(a);
      const source = orig[a];
      if (!source || !source.trim()) continue;
      if (lang === 'en') {
        if (el.getAttribute(a) !== source) el.setAttribute(a, source);
        continue;
      }
      const trimmed = source.trim();
      const before = source.match(/^\s*/)[0];
      const after = source.match(/\s*$/)[0];
      const v = lookupForKey(lang, trimmed, persona);
      const next = v ? before + v + after : source;
      if (el.getAttribute(a) !== next) el.setAttribute(a, next);
    }
  }

  function walkAndSwap(node, lang) {
    if (!node) return;

    // Element handling
    if (node.nodeType === 1) {
      const tag = node.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'CODE') return;
      if (node.hasAttribute && node.hasAttribute('data-no-i18n')) return;

      // Attribute pass (always first — does not interact with text walker).
      applyAttributesPass(node, lang);

      // Escape hatch: data-i18n-key forces lookup regardless of inner text.
      if (node.hasAttribute && node.hasAttribute('data-i18n-key')) {
        const key = node.getAttribute('data-i18n-key');
        const persona = nearestPersona(node) || null;
        // Snapshot the original DOM-rendered text on first encounter.
        if (node[TEXT_KEY] === undefined) node[TEXT_KEY] = node.textContent;
        const orig = node[TEXT_KEY];
        if (lang === 'en') {
          if (node.textContent !== orig) node.textContent = orig;
        } else {
          const v = lookupForKey(lang, key, persona);
          if (v != null) {
            if (lang === 'both' && v.toLowerCase() !== orig.trim().toLowerCase()) {
              // Render bilingual stack inside the element.
              node.textContent = '';
              const w = document.createElement('span');
              w.className = 'tbot-bi';
              w.setAttribute('data-bi-orig', orig);
              w.setAttribute('data-no-i18n', '');
              const viEl = document.createElement('span');
              viEl.textContent = v;
              const enEl = document.createElement('span');
              enEl.className = 'tbot-bi-en';
              enEl.textContent = orig;
              w.appendChild(viEl);
              w.appendChild(enEl);
              node.appendChild(w);
            } else if (node.textContent !== v) {
              node.textContent = v;
            }
          }
        }
        node[KEYED_GUARD] = true;
        return; // do not descend into children
      }

      if (node[KEYED_GUARD]) return; // safety — already handled above
      for (let c = node.firstChild; c; c = c.nextSibling) walkAndSwap(c, lang);
      return;
    }

    // Text-node handling
    if (node.nodeType !== 3) return;
    const orig = node[TEXT_KEY] !== undefined ? node[TEXT_KEY] : node.nodeValue;
    if (node[TEXT_KEY] === undefined) node[TEXT_KEY] = orig;
    const trimmed = orig.trim();
    if (!trimmed) return;
    if (lang === 'en') {
      if (node.nodeValue !== orig) node.nodeValue = orig;
      return;
    }
    const persona = nearestPersona(node.parentElement) || null;
    const vi = lookupForKey(lang, trimmed, persona);
    const before = orig.match(/^\s*/)[0];
    const after = orig.match(/\s*$/)[0];

    if (lang === 'both') {
      if (vi && vi.toLowerCase() !== trimmed.toLowerCase() && node.parentNode) {
        const w = document.createElement('span');
        w.className = 'tbot-bi';
        w.setAttribute('data-bi-orig', orig);
        w.setAttribute('data-no-i18n', '');
        if (persona) w.setAttribute('data-persona', persona);
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
    // VI / vi-pseudo / vi-stretched / etc.
    const next = vi ? before + vi + after : orig;
    if (node.nodeValue !== next) node.nodeValue = next;
  }

  // ── Observer ──────────────────────────────────────────────────────────────
  let observer = null;
  function ensureObserver() {
    if (observer) return;
    observer = new MutationObserver(muts => {
      const lang = getLang();
      for (const m of muts) {
        if (m.type === 'characterData') {
          walkAndSwap(m.target, lang);
        } else if (m.type === 'attributes') {
          if (m.attributeName === 'data-persona') {
            invalidatePersonaSubtree(m.target);
            walkAndSwap(m.target, lang);
          } else if (I18N_ATTRS.indexOf(m.attributeName) >= 0) {
            // Attribute mutated by React — reset our snapshot for that key.
            if (m.target[ATTR_KEY]) delete m.target[ATTR_KEY][m.attributeName];
            applyAttributesPass(m.target, lang);
          }
        } else {
          m.addedNodes.forEach(n => walkAndSwap(n, lang));
        }
      }
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['data-persona', ...I18N_ATTRS],
    });
  }

  function applyLang(lang) {
    localStorage.setItem(STORAGE_LANG, lang);
    root.setAttribute('lang', lang);
    unwrapAllBi();
    if (document.body) walkAndSwap(document.body, lang);
    ensureObserver();
  }

  // ── Format helpers (Intl, locale-aware) ───────────────────────────────────
  function fmtNumber(n) {
    const lang = getLang();
    const locale = (lang === 'en') ? 'en-US' : 'vi-VN';
    try { return new Intl.NumberFormat(locale).format(Number(n)); }
    catch (_) { return String(n); }
  }

  function fmtPrice(amount, currency) {
    const lang = getLang();
    // If catalog authors provided a {en, vi} pair via __tbot.fmtPrice, dispatch.
    if (typeof amount === 'object' && amount && (amount.en || amount.vi)) {
      return (lang === 'en') ? amount.en : (amount.vi || amount.en || '');
    }
    const cur = currency || 'USD';
    const locale = (lang === 'en') ? 'en-US' : 'vi-VN';
    try {
      return new Intl.NumberFormat(locale, { style: 'currency', currency: cur, maximumFractionDigits: 2 }).format(Number(amount));
    } catch (_) { return cur + ' ' + amount; }
  }

  function fmtDate(date, opts) {
    const lang = getLang();
    const locale = (lang === 'en') ? 'en-US' : 'vi-VN';
    try {
      const d = (date instanceof Date) ? date : new Date(date);
      return d.toLocaleDateString(locale, opts || { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (_) { return String(date); }
  }

  // ── Floating control ──────────────────────────────────────────────────────
  function mountControl() {
    if (document.getElementById('tbot-i18n-ctl')) return;
    const el = document.createElement('div');
    el.id = 'tbot-i18n-ctl';
    el.setAttribute('data-no-i18n', '');
    el.style.cssText = `
      position:fixed; top:14px; right:14px; z-index:99999;
      display:flex; gap:6px; padding:6px;
      background:rgba(255,255,255,.92); backdrop-filter:blur(8px);
      border:1px solid rgba(0,0,0,.08); border-radius:99px;
      box-shadow:0 4px 14px rgba(0,0,0,.08);
      font-family:-apple-system,"SF Pro Text",Inter,system-ui,sans-serif; font-size:11px;
    `;

    const seg = (label, items, current, onPick) => {
      const wrap = document.createElement('div');
      wrap.setAttribute('data-no-i18n', '');
      wrap.style.cssText = 'display:flex;align-items:center;gap:6px;padding:0 8px;';
      const lab = document.createElement('span');
      lab.setAttribute('data-no-i18n', '');
      lab.textContent = label;
      lab.style.cssText = 'font-family:ui-monospace,Menlo;font-size:9px;letter-spacing:.14em;color:#6B6675;text-transform:uppercase;';
      wrap.appendChild(lab);
      const segEl = document.createElement('div');
      segEl.setAttribute('data-no-i18n', '');
      segEl.style.cssText = 'display:flex;gap:2px;padding:2px;background:#F3EFE6;border-radius:99px;';
      items.forEach(it => {
        const b = document.createElement('button');
        b.setAttribute('data-no-i18n', '');
        b.textContent = it.label;
        b.dataset.value = it.value;
        b.style.cssText = `
          border:none; background:${current === it.value ? '#fff' : 'transparent'};
          color:${current === it.value ? '#1B1820' : '#6B6675'};
          padding:4px 10px; border-radius:99px; cursor:pointer;
          font-weight:600; font-size:11px;
          ${it.dot ? `box-shadow:inset 0 0 0 ${current === it.value ? 2 : 0}px ${it.dot};` : ''}
          display:inline-flex; align-items:center; gap:5px;
        `;
        if (it.dot) {
          const d = document.createElement('span');
          d.setAttribute('data-no-i18n', '');
          d.style.cssText = `width:7px;height:7px;border-radius:99px;background:${it.dot};display:inline-block`;
          b.prepend(d);
        }
        b.onclick = () => { onPick(it.value); rebuild(); };
        segEl.appendChild(b);
      });
      wrap.appendChild(segEl);
      return wrap;
    };

    const rebuild = () => {
      el.innerHTML = '';
      el.appendChild(seg('Lang', [
        { label: 'VI', value: 'vi' },
        { label: 'VI / EN', value: 'both' },
        { label: 'EN', value: 'en' },
      ], getLang(), v => applyLang(v)));
      el.appendChild(seg('Gender', [
        { label: 'Girl', value: 'girl', dot: '#FF8FB1' },
        { label: 'Boy', value: 'boy', dot: '#5DAEFF' },
      ], getGender(), v => applyGender(v)));
    };
    rebuild();
    document.body.appendChild(el);
  }

  // ── Init order ───────────────────────────────────────────────────────────
  // Register MutationObserver eagerly so user clicks during catalog fetch
  // get replayed once the catalog resolves and applyLang re-walks.
  function init() {
    applyGender(getGender());
    // Default every prototype root to parent persona. JSX subtrees that need
    // child persona (lesson player, course/progress kid screens, first-hello)
    // override via [data-persona] further down the tree.
    if (document.body && !document.body.hasAttribute('data-persona')) {
      document.body.setAttribute('data-persona', 'parent');
    }
    mountControl();
    ensureObserver();
    loadCatalog().then(() => {
      applyLang(getLang());
      // Late safety pass for slow Babel mounts.
      setTimeout(() => applyLang(getLang()), 4000);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ── Public API ────────────────────────────────────────────────────────────
  async function useLegacyDict() {
    LEGACY_MODE = true;
    try {
      const legacy = await fetch('./locales/legacy-inline.json?v=' + APP_VERSION).then(r => r.json());
      CATALOGS.vi = legacy;
      console.warn('[i18n] legacy inline DICT mode active. EN catalog cleared. Run __tbot.reloadCatalog() to exit.');
      applyLang(getLang());
    } catch (e) {
      console.error('[i18n] failed to load legacy-inline.json', e);
    }
  }

  async function reloadCatalog() {
    LEGACY_MODE = false;
    await loadCatalog();
    applyLang(getLang());
  }

  window.__tbot = {
    setLang: applyLang,
    setGender: applyGender,
    getLang,
    getGender,
    useLegacyDict,
    reloadCatalog,
    isLegacyMode: () => LEGACY_MODE,
    isCatalogReady: () => CATALOG_READY,
    fmtPrice,
    fmtDate,
    fmtNumber,
    // Diagnostic (read-only).
    _catalogs: () => CATALOGS,
  };
})();
