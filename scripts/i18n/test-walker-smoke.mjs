#!/usr/bin/env node
// test-walker-smoke.mjs
// Hand-rolled DOM stub + i18n.js eval to exercise the runtime walker
// without a browser. Asserts AC3 (persona resolver), AC7 (numbered/dot
// fallback chains), and AC8 (bilingual mode wrapper) against vi.json data.
//
// This is unit-grade, not pixel-grade — visual layout still needs a real
// browser. See plan AC checklist.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');

// ── Minimal DOM stub ──────────────────────────────────────────────
const TEXT_NODE = 3;
const ELEMENT_NODE = 1;

function elem(tag, attrs = {}, ...children) {
  const e = {
    nodeType: ELEMENT_NODE,
    tagName: tag.toUpperCase(),
    _attrs: { ...attrs },
    parentNode: null,
    childNodes: [],
    get firstChild() { return this.childNodes[0] || null; },
    appendChild(c) { c.parentNode = this; this.childNodes.push(c); return c; },
    insertBefore(c, ref) {
      const i = this.childNodes.indexOf(ref);
      c.parentNode = this;
      if (i < 0) this.childNodes.push(c);
      else this.childNodes.splice(i, 0, c);
      return c;
    },
    replaceChild(n, old) {
      const i = this.childNodes.indexOf(old);
      if (i < 0) return old;
      n.parentNode = this;
      old.parentNode = null;
      this.childNodes[i] = n;
      return old;
    },
    removeChild(c) {
      const i = this.childNodes.indexOf(c);
      if (i >= 0) { this.childNodes.splice(i, 1); c.parentNode = null; }
      return c;
    },
    getAttribute(n) { return this._attrs[n] != null ? String(this._attrs[n]) : null; },
    setAttribute(n, v) { this._attrs[n] = v; },
    hasAttribute(n) { return n in this._attrs; },
    querySelectorAll() { return []; }, // i18n.js only uses for unwrapAllBi cleanup
    classList: { add() {}, remove() {} },
    style: { cssText: '' },
    set className(v) { this._attrs.class = v; },
    set id(v) { this._attrs.id = v; },
    get id() { return this._attrs.id || ''; },
    set textContent(v) {
      this.childNodes = [textNode(v)];
      this.childNodes[0].parentNode = this;
    },
  };
  // Inject sibling pointers lazily via getter.
  Object.defineProperty(e, 'nextSibling', {
    get() { if (!this.parentNode) return null;
      const sibs = this.parentNode.childNodes; const i = sibs.indexOf(this);
      return i >= 0 && i + 1 < sibs.length ? sibs[i + 1] : null;
    }
  });
  for (const c of children) e.appendChild(c);
  return e;
}

function textNode(value) {
  const t = {
    nodeType: TEXT_NODE,
    nodeValue: String(value),
    parentNode: null,
    get nextSibling() { if (!this.parentNode) return null;
      const sibs = this.parentNode.childNodes; const i = sibs.indexOf(this);
      return i >= 0 && i + 1 < sibs.length ? sibs[i + 1] : null;
    }
  };
  return t;
}

// Walk a subtree to collect all text-node values for assertion.
function collectText(node, out = []) {
  if (!node) return out;
  if (node.nodeType === TEXT_NODE) out.push(node.nodeValue);
  else if (node.childNodes) for (const c of node.childNodes) collectText(c, out);
  return out;
}

// ── Fake browser globals ──────────────────────────────────────────
const html = elem('html');
const head = elem('head'); html.appendChild(head);
const body = elem('body'); html.appendChild(body);

const fakeStorage = {};
globalThis.localStorage = {
  getItem: k => Object.hasOwn(fakeStorage, k) ? fakeStorage[k] : null,
  setItem: (k, v) => { fakeStorage[k] = String(v); },
  removeItem: k => { delete fakeStorage[k]; },
};
globalThis.document = {
  documentElement: html,
  body,
  head,
  readyState: 'loading', // suppresses init() (which builds the floating UI control)
  addEventListener() {},
  createElement: tag => elem(tag),
  createTextNode: textNode,
  getElementById: id => {
    const stack = [html];
    while (stack.length) { const n = stack.shift();
      if (n._attrs && n._attrs.id === id) return n;
      if (n.childNodes) stack.push(...n.childNodes);
    }
    return null;
  },
  querySelectorAll() { return []; },
};
globalThis.window = { __TJBotLocales: undefined };
globalThis.MutationObserver = class { constructor(){} observe(){} disconnect(){} };
// Load the bundle into the fake window.__TJBotLocales
const bundleSrc = readFileSync(join(root, 'locales', 'bundle.js'), 'utf8');
(new Function(bundleSrc)).call(globalThis);

// ── Load i18n.js into the fake DOM ────────────────────────────────
const i18nSrc = readFileSync(join(root, 'i18n.js'), 'utf8');
(new Function(i18nSrc)).call(globalThis);

// Drive applyLang directly (boot is async via setTimeout — bypass).
const TJBot = globalThis.window.__TJBot;
if (!TJBot || typeof TJBot.setLang !== 'function') {
  console.error('FAIL: window.__TJBot.setLang not exposed by i18n.js');
  process.exit(1);
}

// ── Assertions ────────────────────────────────────────────────────
let failures = 0;
function assert(name, cond, detail = '') {
  if (cond) console.log(`  PASS — ${name}`);
  else { console.log(`  FAIL — ${name}${detail ? ' :: ' + detail : ''}`); failures++; }
}

// AC3a — persona=child gets soft-particle child translation
{
  const div = elem('div', { 'data-persona': 'child' }, textNode('Continue'));
  body.appendChild(div);
  TJBot.setLang('vi');
  const out = collectText(div);
  assert('AC3a — child persona resolves to "Tiếp tục nào"',
    out.includes('Tiếp tục nào'), `got=${JSON.stringify(out)}`);
  body.removeChild(div);
}

// AC3b — persona=parent gets neutral translation
{
  const div = elem('div', { 'data-persona': 'parent' }, textNode('Continue'));
  body.appendChild(div);
  TJBot.setLang('vi');
  const out = collectText(div);
  assert('AC3b — parent persona resolves to "Tiếp tục"',
    out.includes('Tiếp tục'), `got=${JSON.stringify(out)}`);
  body.removeChild(div);
}

// AC3c — no [data-persona] ancestor falls back to 'parent'
{
  const div = elem('div', {}, textNode('Continue'));
  body.appendChild(div);
  TJBot.setLang('vi');
  const out = collectText(div);
  assert('AC3c — missing persona falls back to parent',
    out.includes('Tiếp tục'), `got=${JSON.stringify(out)}`);
  body.removeChild(div);
}

// AC3d — string-only entry (no persona split) still works
{
  const div = elem('div', { 'data-persona': 'child' }, textNode('Start'));
  body.appendChild(div);
  TJBot.setLang('vi');
  const out = collectText(div);
  assert('AC3d — string entry "Start" → "Bắt đầu" with persona=child',
    out.includes('Bắt đầu'), `got=${JSON.stringify(out)}`);
  body.removeChild(div);
}

// AC7a — numbered prefix splits correctly. Uses "Continue" (in catalog) so this
// validates the mechanism, not catalog coverage. Original plan example
// "12 · First Lesson Entry" relied on a key that exists in legacy DICT but was
// not migrated to locales/{en,vi}.json — separate catalog-coverage issue.
{
  const div = elem('div', {}, textNode('7 · Continue'));
  body.appendChild(div);
  TJBot.setLang('vi');
  const out = collectText(div).join('|');
  assert('AC7a — numbered prefix preserved, tail translated',
    /7\s*·\s*Tiếp tục/.test(out), `got=${out}`);
  body.removeChild(div);
}

// AC7b — " · " split: each side translated independently
{
  const div = elem('div', {}, textNode('Home · Today'));
  body.appendChild(div);
  TJBot.setLang('vi');
  const out = collectText(div).join('|');
  assert('AC7b — "Home · Today" → "Trang chủ · Hôm nay" (each side translated)',
    out.includes('Trang chủ') && out.includes('Hôm nay'), `got=${out}`);
  body.removeChild(div);
}

// AC7c — case-insensitive fallback: "back" should match "Back"
{
  const div = elem('div', { 'data-persona': 'child' }, textNode('back'));
  body.appendChild(div);
  TJBot.setLang('vi');
  const out = collectText(div);
  // vi.Back is {child: "Quay lại nhé", parent: "Quay lại"}
  assert('AC7c — case-insensitive match "back" → child translation',
    out.includes('Quay lại nhé'), `got=${JSON.stringify(out)}`);
  body.removeChild(div);
}

// AC8 — bilingual mode wraps text in span.TJBot-bi with VI on top + EN below
{
  const div = elem('div', {}, textNode('Continue'));
  body.appendChild(div);
  TJBot.setLang('both');
  // Find the wrapper
  const child = div.childNodes[0];
  const ok = child && child.nodeType === ELEMENT_NODE && child.tagName === 'SPAN'
    && child.getAttribute('class') === 'TJBot-bi'
    && child.childNodes.length === 2;
  assert('AC8 — bilingual mode produces span.TJBot-bi with VI + EN children',
    ok, `child=${child && child.tagName}/${child && child.getAttribute && child.getAttribute('class')}/${child && child.childNodes.length}`);
  body.removeChild(div);
}

// Phase 11.1.b — runtime dot-split translates allowlisted composite strings.
// These strings are allowlisted (so the static scanner skips them) but their
// sub-strings are in catalog so the runtime walker translates each side.
{
  const cases = [
    ['Robot · activated', /Robot · đã kích hoạt/],
    ['● Online · all good', /● Trực tuyến · tất cả đều tốt/],
    ['v1.4.2 · update available', /v1\.4\.2 · có bản cập nhật/],
    ['Working · last test today', /Đang hoạt động · lần kiểm tra gần nhất hôm nay/],
    ['3 installed · 1.2 GB used', /Đã cài 3 · Đã dùng 1\.2 GB/],
  ];
  for (const [input, expected] of cases) {
    const div = elem('div', {}, textNode(input));
    body.appendChild(div);
    TJBot.setLang('vi');
    const out = collectText(div).join('|');
    assert(`11.1.b dot-split: "${input}"`, expected.test(out), `got=${out}`);
    body.removeChild(div);
  }
}

// Final summary
console.log();
if (failures > 0) {
  console.error(`FAIL: ${failures} assertion(s) failed`);
  process.exit(1);
}
console.log('All walker smoke assertions passed.');
process.exit(0);
