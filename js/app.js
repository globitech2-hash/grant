window.GWApp = (function () {
  var SESSION_KEY = "gw_session";
  var ACTIVITY_KEY = "gw_activity";

  var t = function (key, params) {
    return GWTranslator.t(key, params);
  };

  var state = {
    pageKey: null,
    session: null,
    user: null,
    wallet: null,
    source: null,
    fetchedAt: null,
    loading: false,
  };

  /* ---------- Session ---------- */

  function getSession() {
    try {
      var raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      var s = JSON.parse(raw);
      return s && s.userId ? s : null;
    } catch (e) {
      return null;
    }
  }

  function setSession(session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  function logout() {
    clearSession();
    window.location.href = "login.html";
  }

  function requireAuth() {
    var session = getSession();
    if (!session) {
      window.location.replace("login.html");
      return null;
    }
    return session;
  }

  /* ---------- Local activity (withdrawal attempts) ---------- */

  function getActivity() {
    try {
      var raw = localStorage.getItem(ACTIVITY_KEY);
      var list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }

  function addActivity(entry) {
    var list = getActivity();
    list.unshift(entry);
    if (list.length > 50) list = list.slice(0, 50);
    try {
      localStorage.setItem(ACTIVITY_KEY, JSON.stringify(list));
    } catch (e) {
      /* ignore */
    }
    return entry;
  }

  /* ---------- Grant math ---------- */

  function round2(n) {
    return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
  }

    function computeGrant(grant) {
    var g = grant || {};
    
    // Check if approved AND has a valid numeric approved_amount
    var isApproved = g.approved === true && typeof g.approved_amount === "number" && !isNaN(g.approved_amount);
    
    // NEW: Extract fee (default to 0 if missing/null/invalid)
    var fee = 0;
    if (typeof g.fee === "number" && !isNaN(g.fee)) {
      fee = round2(g.fee);
    }

    var approvedAmount = isApproved ? round2(g.approved_amount) : null;
    var taxRate = isApproved ? Number(g.tax_rate || 0) : null;
    
    // Tax calculation: ONLY on approved_amount (fee is excluded from tax base)
    var taxDeducted = isApproved ? round2(approvedAmount * taxRate) : null;
    
    // Net calculation: (Approved Amount - Tax) + Fee
    var netAmount = null;
    if (isApproved) {
      netAmount = round2((approvedAmount - taxDeducted) + fee);
    }

    var created = g.created_at ? new Date(g.created_at) : null;
    if (created && isNaN(created.getTime())) created = null;
    
    return {
      id: g.id,
      programName: g.program_name || "—",
      purpose: g.purpose || "",
      requestedAmount: typeof g.requested_amount === "number" ? round2(g.requested_amount) : null,
      isApproved: isApproved,
      approvedAmount: approvedAmount,
      taxRate: taxRate,
      taxDeducted: taxDeducted,
      // NEW: Expose fee for debugging/UI if needed later
      fee: fee, 
      netAmount: netAmount,
      createdAt: g.created_at || null,
      createdDate: created
    };
  }

  function computeWallet(user) {
    var grants = (user && Array.isArray(user.grants) ? user.grants : []).map(
      computeGrant,
    );
    grants.sort(function (a, b) {
      var ta = a.createdDate ? a.createdDate.getTime() : 0;
      var tb = b.createdDate ? b.createdDate.getTime() : 0;
      return tb - ta;
    });
    var balance = 0;
    var gross = 0;
    var tax = 0;
    var approvedCount = 0;
    var notApprovedCount = 0;
    var last = null;
    grants.forEach(function (g) {
      if (g.isApproved) {
        balance += g.netAmount;
        gross += g.approvedAmount;
        tax += g.taxDeducted;
        approvedCount += 1;
      } else {
        notApprovedCount += 1;
      }
      if (g.createdDate && (!last || g.createdDate > last))
        last = g.createdDate;
    });
    return {
      grants: grants,
      balance: round2(balance),
      gross: round2(gross),
      tax: round2(tax),
      approvedCount: approvedCount,
      notApprovedCount: notApprovedCount,
      total: grants.length,
      lastActivity: last,
      currency: (user && user.currency) || "USD",
    };
  }

  /* ---------- Shell rendering ---------- */

  function langToggleHTML() {
    var current = GWTranslator.getLang();
    return (
      '<div class="lang-toggle" role="group" aria-label="Language" data-i18n-aria="lang.label">' +
      '<button type="button" data-lang="en" class="' +
      (current === "en" ? "is-active" : "") +
      '" aria-pressed="' +
      (current === "en") +
      '">EN</button>' +
      '<button type="button" data-lang="es" class="' +
      (current === "es" ? "is-active" : "") +
      '" aria-pressed="' +
      (current === "es") +
      '">ES</button>' +
      "</div>"
    );
  }

  function brandHTML() {
    return (
      '<span class="brand-mark">' +
      GWUI.icon("wallet") +
      "</span>" +
      '<span class="brand-text"><span class="brand-name">Grant Wallet</span><span class="brand-sub" data-i18n="app.tagline" style="display:block">' +
      t("app.tagline") +
      "</span></span>"
    );
  }

  function navLink(href, key, iconName) {
    return (
      '<a class="nav-link" href="' +
      href +
      '">' +
      GWUI.icon(iconName) +
      '<span data-i18n="nav.' +
      key +
      '">' +
      t("nav." + key) +
      "</span></a>"
    );
  }

  function renderSidebar() {
    var sidebar = document.getElementById("sidebar");
    if (!sidebar) return;
    sidebar.innerHTML =
      '<div class="sidebar-brand">' +
      '<a class="brand" href="dashboard.html">' +
      brandHTML() +
      "</a>" +
      '<button type="button" class="icon-btn sidebar-close" data-nav-close aria-label="Close menu" data-i18n-aria="nav.closeMenu">' +
      GWUI.icon("close") +
      "</button>" +
      "</div>" +
      '<nav class="sidebar-nav" aria-label="Main">' +
      '<div class="nav-section" data-i18n="nav.section">' +
      t("nav.section") +
      "</div>" +
      navLink("dashboard.html", "dashboard", "dashboard") +
      navLink("history.html", "history", "history") +
      navLink("withdraw.html", "withdraw", "bank") +
      navLink("profile.html", "profile", "user") +
      "</nav>" +
      '<div class="sidebar-footer">' +
      '<div class="user-chip" id="user-chip"><span class="avatar" id="user-avatar">—</span><div><div class="user-name" id="user-name">&nbsp;</div><div class="user-email" id="user-email">&nbsp;</div></div></div>' +
      '<button type="button" class="icon-btn" data-action="logout" aria-label="Log out" data-i18n-aria="nav.logout" title="Log out" data-i18n-title="nav.logout">' +
      GWUI.icon("logout") +
      "</button>" +
      "</div>";

    if (!document.getElementById("nav-overlay")) {
      var overlay = document.createElement("div");
      overlay.id = "nav-overlay";
      overlay.className = "nav-overlay";
      document.body.appendChild(overlay);
    }
  }

  function renderTopbar(pageKey) {
    var topbar = document.getElementById("topbar");
    if (!topbar) return;
    topbar.innerHTML =
      '<button type="button" class="icon-btn menu-btn" data-nav-toggle aria-label="Open menu" data-i18n-aria="nav.menu" aria-expanded="false" aria-controls="sidebar">' +
      GWUI.icon("menu") +
      "</button>" +
      '<div class="topbar-title" data-i18n="nav.' +
      pageKey +
      '">' +
      t("nav." + pageKey) +
      "</div>" +
      '<div class="topbar-right">' +
      '<div class="last-updated is-idle" id="last-updated"><span class="dot"></span><span class="label"><span data-i18n="common.lastUpdated">' +
      t("common.lastUpdated") +
      '</span>:</span> <time id="last-updated-time">' +
      t("common.never") +
      "</time></div>" +
      langToggleHTML() +
      "</div>";
  }

  function renderAuthTopbar() {
    var bar = document.getElementById("auth-topbar");
    if (!bar) return;
    bar.innerHTML =
      '<a class="brand" href="login.html">' +
      brandHTML() +
      "</a>" +
      langToggleHTML();
  }

  function updateUserChip(user) {
    if (!user) return;
    GWUI.setText("user-avatar", GWUI.initials(user.full_name));
    GWUI.setText("user-name", user.full_name || "");
    GWUI.setText("user-email", user.email || "");
  }

  function setLastUpdated(date, source) {
    var wrap = document.getElementById("last-updated");
    var time = document.getElementById("last-updated-time");
    if (!wrap || !time) return;
    wrap.classList.remove("is-idle", "is-cache");
    if (!date) {
      wrap.classList.add("is-idle");
      time.textContent = t("common.never");
      time.removeAttribute("datetime");
      wrap.removeAttribute("title");
      return;
    }
    if (source === "cache") {
      wrap.classList.add("is-cache");
      wrap.setAttribute("title", t("common.cached"));
    } else {
      wrap.removeAttribute("title");
    }
    time.textContent = GWUI.formatDateTime(date);
    time.setAttribute("datetime", new Date(date).toISOString());
  }

  /* ---------- Language toggles (event delegation) ---------- */

  var langBound = false;

  function syncLangToggles() {
    var current = GWTranslator.getLang();
    var buttons = document.querySelectorAll("[data-lang]");
    for (var i = 0; i < buttons.length; i++) {
      var active = buttons[i].getAttribute("data-lang") === current;
      buttons[i].classList.toggle("is-active", active);
      buttons[i].setAttribute("aria-pressed", active ? "true" : "false");
    }
  }

  function bindGlobalEvents() {
    if (langBound) return;
    langBound = true;
    document.addEventListener("click", function (e) {
      var langBtn = e.target.closest("[data-lang]");
      if (langBtn) {
        var lang = langBtn.getAttribute("data-lang");
        if (lang !== GWTranslator.getLang()) GWTranslator.setLang(lang);
        return;
      }
      var logoutBtn = e.target.closest('[data-action="logout"]');
      if (logoutBtn) {
        e.preventDefault();
        logout();
      }
    });
    document.addEventListener("gw:langchange", function () {
      syncLangToggles();
      GWTranslator.apply();
      setLastUpdated(state.fetchedAt, state.source);
    });
  }

  /* ---------- Data loading ---------- */

  function loadData(options) {
    var opts = options || {};
    var session = state.session || getSession();
    if (!session) {
      window.location.replace("login.html");
      return Promise.reject(new Error("No session"));
    }
    state.loading = true;
    return GWApi.getUsers()
      .then(function (result) {
        var user = GWApi.findUserById(result.users, session.userId);
        if (!user) {
          if (result.source === "network") {
            clearSession();
            window.location.replace("login.html?reason=session");
          }
          throw new Error("User not found");
        }
        state.user = user;
        state.wallet = computeWallet(user);
        state.source = result.source;
        state.fetchedAt = result.fetchedAt;
        setLastUpdated(result.fetchedAt, result.source);
        updateUserChip(user);
        if (result.source === "cache") {
          GWUI.toast(t("common.usingCached"), "warning");
        } else if (opts.notify) {
          GWUI.toast(t("common.dataRefreshed"), "success");
        }
        return state;
      })
      .catch(function (err) {
        if (err && err.message !== "User not found") {
          GWUI.toast(t("common.fetchFailed"), "error");
        }
        throw err;
      })
      .then(
        function (s) {
          state.loading = false;
          return s;
        },
        function (err) {
          state.loading = false;
          throw err;
        },
      );
  }

  /* ---------- Page section helpers ---------- */

  function showSkeleton() {
    GWUI.show(document.getElementById("skeleton"));
    GWUI.hide(document.getElementById("page-content"));
    GWUI.hide(document.getElementById("load-error"));
  }

  function showContent() {
    GWUI.hide(document.getElementById("skeleton"));
    GWUI.show(document.getElementById("page-content"));
    GWUI.hide(document.getElementById("load-error"));
  }

  function showLoadError(retry) {
    var box = document.getElementById("load-error");
    if (!box) return;
    GWUI.hide(document.getElementById("skeleton"));
    GWUI.hide(document.getElementById("page-content"));
    box.innerHTML =
      '<div class="card load-error">' +
      '<div class="alert alert-error">' +
      GWUI.icon("alert") +
      '<div><span class="alert-title" data-i18n="common.loadErrorTitle">' +
      t("common.loadErrorTitle") +
      "</span>" +
      '<span data-i18n="common.fetchFailed">' +
      t("common.fetchFailed") +
      "</span></div></div>" +
      '<button type="button" class="btn btn-secondary" id="load-retry">' +
      GWUI.icon("refresh") +
      '<span data-i18n="common.retry">' +
      t("common.retry") +
      "</span></button>" +
      "</div>";
    GWUI.show(box);
    var btn = document.getElementById("load-retry");
    if (btn && typeof retry === "function") {
      btn.addEventListener("click", function () {
        retry();
      });
    }
  }

  function bindRefresh(onDone) {
    var buttons = document.querySelectorAll("[data-refresh]");
    for (var i = 0; i < buttons.length; i++) {
      (function (btn) {
        if (btn.dataset.bound) return;
        btn.dataset.bound = "1";
        if (!btn.querySelector("svg")) {
          btn.insertAdjacentHTML("afterbegin", GWUI.icon("refresh"));
        }
        btn.addEventListener("click", function () {
          if (btn.disabled) return;
          btn.disabled = true;
          btn.classList.add("is-loading");
          loadData({ notify: true })
            .then(function (s) {
              if (typeof onDone === "function") onDone(s);
              showContent();
            })
            .catch(function () {
              /* toast already shown; keep current content */
            })
            .then(function () {
              btn.disabled = false;
              btn.classList.remove("is-loading");
            });
        });
      })(buttons[i]);
    }
  }

  /* ---------- Shared grant rendering ---------- */

  function statusBadge(g) {
    return g.isApproved
      ? '<span class="badge badge-success" data-i18n="common.approved">' +
          t("common.approved") +
          "</span>"
      : '<span class="badge badge-neutral" data-i18n="common.notApproved">' +
          t("common.notApproved") +
          "</span>";
  }

  function money(v, currency) {
    return v === null || v === undefined
      ? '<span class="cell-muted">—</span>'
      : GWUI.formatMoney(v, currency);
  }

  function grantTableHTML(grants, options) {
    var opts = options || {};
    var cur = opts.currency || "USD";
    var esc = GWUI.escapeHtml;

    var rows = grants
      .map(function (g) {
        return (
          "<tr>" +
          '<td><div class="cell-strong">' +
          esc(g.programName) +
          "</div>" +
          (g.purpose && !opts.compact
            ? '<div class="cell-sub" title="' +
              esc(g.purpose) +
              '">' +
              esc(g.purpose) +
              "</div>"
            : "") +
          "</td>" +
          '<td class="num" data-no-translate="true">' +
          money(g.requestedAmount, cur) +
          "</td>" +
          '<td class="num" data-no-translate="true">' +
          money(g.approvedAmount, cur) +
          "</td>" +
          '<td class="num" data-no-translate="true">' +
          money(g.taxDeducted, cur) +
          (g.isApproved
            ? ' <span class="cell-muted small">(' +
              GWUI.formatPercent(g.taxRate) +
              ")</span>"
            : "") +
          "</td>" +
          '<td class="num cell-strong" data-no-translate="true">' +
          money(g.netAmount, cur) +
          "</td>" +
          "<td>" +
          statusBadge(g) +
          "</td>" +
          '<td class="cell-muted" style="white-space:nowrap">' +
          GWUI.formatDate(g.createdDate) +
          "</td>" +
          "</tr>"
        );
      })
      .join("");

    var table =
      '<div class="table-wrap desktop-only"><table class="table">' +
      "<thead><tr>" +
      '<th data-i18n="history.program">' +
      t("history.program") +
      "</th>" +
      '<th class="num" data-i18n="history.requested">' +
      t("history.requested") +
      "</th>" +
      '<th class="num" data-i18n="history.approvedAmt">' +
      t("history.approvedAmt") +
      "</th>" +
      '<th class="num" data-i18n="history.tax">' +
      t("history.tax") +
      "</th>" +
      '<th class="num" data-i18n="history.net">' +
      t("history.net") +
      "</th>" +
      '<th data-i18n="history.status">' +
      t("history.status") +
      "</th>" +
      '<th data-i18n="history.date">' +
      t("history.date") +
      "</th>" +
      "</tr></thead><tbody>" +
      rows +
      "</tbody></table></div>";

    var cards =
      '<div class="grant-cards mobile-only">' +
      grants
        .map(function (g) {
          return (
            '<article class="grant-card">' +
            '<div class="grant-card-head"><div><div class="grant-card-title">' +
            esc(g.programName) +
            "</div>" +
            '<div class="muted small">' +
            GWUI.formatDate(g.createdDate) +
            "</div></div>" +
            statusBadge(g) +
            "</div>" +
            '<dl class="grant-card-grid">' +
            '<div><dt data-i18n="history.requested">' +
            t("history.requested") +
            '</dt><dd data-no-translate="true">' +
            money(g.requestedAmount, cur) +
            "</dd></div>" +
            '<div><dt data-i18n="history.approvedAmt">' +
            t("history.approvedAmt") +
            '</dt><dd data-no-translate="true">' +
            money(g.approvedAmount, cur) +
            "</dd></div>" +
            '<div><dt data-i18n="history.tax">' +
            t("history.tax") +
            '</dt><dd data-no-translate="true">' +
            money(g.taxDeducted, cur) +
            "</dd></div>" +
            '<div><dt data-i18n="history.net">' +
            t("history.net") +
            '</dt><dd data-no-translate="true">' +
            money(g.netAmount, cur) +
            "</dd></div>" +
            "</dl></article>"
          );
        })
        .join("") +
      "</div>";

    return table + cards;
  }

  /* ---------- Page initialisers ---------- */

  function initProtectedPage(pageKey) {
    var session = requireAuth();
    if (!session) return null;
    state.session = session;
    state.pageKey = pageKey;
    renderSidebar();
    renderTopbar(pageKey);
    bindGlobalEvents();
    if (window.GWNav) GWNav.init();
    GWTranslator.apply();
    syncLangToggles();
    return session;
  }

  function initAuthPage() {
    renderAuthTopbar();
    bindGlobalEvents();
    GWTranslator.apply();
    syncLangToggles();
  }

  function getState() {
    return state;
  }

  return {
    SESSION_KEY: SESSION_KEY,
    ACTIVITY_KEY: ACTIVITY_KEY,
    getSession: getSession,
    setSession: setSession,
    clearSession: clearSession,
    logout: logout,
    requireAuth: requireAuth,
    getActivity: getActivity,
    addActivity: addActivity,
    round2: round2,
    computeGrant: computeGrant,
    computeWallet: computeWallet,
    initProtectedPage: initProtectedPage,
    initAuthPage: initAuthPage,
    loadData: loadData,
    bindRefresh: bindRefresh,
    showSkeleton: showSkeleton,
    showContent: showContent,
    showLoadError: showLoadError,
    setLastUpdated: setLastUpdated,
    grantTableHTML: grantTableHTML,
    statusBadge: statusBadge,
    langToggleHTML: langToggleHTML,
    syncLangToggles: syncLangToggles,
    getState: getState,
  };
})();
