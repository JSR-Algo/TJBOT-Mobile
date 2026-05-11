// Web-only bridge to the window.__tbot i18n global (injected by i18n.js via index.html).
export function getLang() {
  return (window.__tbot && window.__tbot.getLang && window.__tbot.getLang()) || 'vi';
}

export function setLang(v) {
  if (window.__tbot && window.__tbot.setLang) window.__tbot.setLang(v);
}
