window.GWTranslator = (function () {
  var STORAGE_KEY = "gw_lang";
  var DEFAULT_LANG = "en";

  // Matches strings that are purely numeric / currency-like, e.g. "$5,000.00", "1.234,50 EUR", "10%".
  var NUMERIC_RE = /^[\s\u00a0]*[-+]?[$€£¥]?[\s\u00a0]*\d[\d.,\s\u00a0]*[\s\u00a0]*(%|[A-Z]{3})?[\s\u00a0]*$/;

  function dict() {
    return window.GW_TRANSLATIONS || { en: {} };
  }

  function getLang() {
    var stored = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      stored = null;
    }
    if (stored && dict()[stored]) return stored;
    return DEFAULT_LANG;
  }

  function lookup(obj, path) {
    if (!obj) return undefined;
    var parts = path.split(".");
    var cur = obj;
    for (var i = 0; i < parts.length; i++) {
      if (cur === null || cur === undefined || typeof cur !== "object") return undefined;
      cur = cur[parts[i]];
    }
    return typeof cur === "string" ? cur : undefined;
  }

  function interpolate(str, params) {
    if (!params) return str;
    return str.replace(/\{(\w+)\}/g, function (match, key) {
      return params[key] !== undefined && params[key] !== null ? String(params[key]) : match;
    });
  }

  function t(key, params) {
    var lang = getLang();
    var value = lookup(dict()[lang], key);
    if (value === undefined) value = lookup(dict()[DEFAULT_LANG], key);
    if (value === undefined) return key;
    return interpolate(value, params);
  }

  function isProtected(el) {
    return !!(el.closest && el.closest('[data-no-translate="true"]'));
  }

  function looksNumeric(text) {
    return !!text && NUMERIC_RE.test(text);
  }

  function paramsFor(el) {
    var raw = el.getAttribute("data-i18n-params");
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function applyTextNodes(root) {
    var nodes = root.querySelectorAll("[data-i18n]");
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (isProtected(el)) continue;
      var key = el.getAttribute("data-i18n");
      if (!key) continue;
      var current = (el.textContent || "").trim();
      if (looksNumeric(current)) continue;
      var value = t(key, paramsFor(el));
      if (value === key) continue;
      if (looksNumeric(value)) continue;
      if (el.textContent !== value) el.textContent = value;
    }
  }

  function applyAttribute(root, dataAttr, targetAttr) {
    var nodes = root.querySelectorAll("[" + dataAttr + "]");
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (isProtected(el)) continue;
      var key = el.getAttribute(dataAttr);
      if (!key) continue;
      var value = t(key, paramsFor(el));
      if (value === key) continue;
      el.setAttribute(targetAttr, value);
    }
  }

  function apply(lang, root) {
    var scope = root || document;
    var current = lang || getLang();
    if (document.documentElement) document.documentElement.setAttribute("lang", current);
    applyTextNodes(scope);
    applyAttribute(scope, "data-i18n-placeholder", "placeholder");
    applyAttribute(scope, "data-i18n-title", "title");
    applyAttribute(scope, "data-i18n-aria", "aria-label");
    var titleEl = document.querySelector("title[data-i18n]");
    if (titleEl) {
      var titleValue = t(titleEl.getAttribute("data-i18n"));
      if (titleValue !== titleEl.getAttribute("data-i18n")) {
        document.title = titleValue + " – " + t("app.name");
      }
    }
  }

  function setLang(lang) {
    if (!dict()[lang]) return;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {
      /* storage unavailable; language will still apply for this page */
    }
    apply(lang);
    document.dispatchEvent(new CustomEvent("gw:langchange", { detail: { lang: lang } }));
  }

  function locale() {
    return getLang() === "es" ? "es-ES" : "en-US";
  }

  return {
    STORAGE_KEY: STORAGE_KEY,
    getLang: getLang,
    setLang: setLang,
    t: t,
    apply: apply,
    locale: locale,
    looksNumeric: looksNumeric
  };
})();
