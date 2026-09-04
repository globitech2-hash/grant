(function () {
  var t = function (key, params) {
    return GWTranslator.t(key, params);
  };

  if (!GWApp.initProtectedPage("profile")) return;

  var els = {
    avatar: document.getElementById("profile-avatar"),
    headName: document.getElementById("profile-head-name"),
    headEmail: document.getElementById("profile-head-email"),
    fullName: document.getElementById("acct-full-name"),
    email: document.getElementById("acct-email"),
    userId: document.getElementById("acct-user-id"),
    memberSince: document.getElementById("acct-member-since"),
    lastLogin: document.getElementById("acct-last-login"),
    balance: document.getElementById("wallet-balance"),
    gross: document.getElementById("wallet-gross"),
    tax: document.getElementById("wallet-tax"),
    approvedCount: document.getElementById("wallet-approved-count"),
    notApprovedCount: document.getElementById("wallet-not-approved-count"),
    lastActivity: document.getElementById("wallet-last-activity"),
    langValue: document.getElementById("pref-lang-value")
  };

  function renderLanguage() {
    var lang = GWTranslator.getLang();
    els.langValue.setAttribute("data-i18n", "lang." + lang);
    els.langValue.textContent = t("lang." + lang);
  }

  function render(state) {
    var user = state.user;
    var wallet = state.wallet;
    var session = state.session || GWApp.getSession() || {};

    els.avatar.textContent = GWUI.initials(user.full_name);
    els.headName.textContent = user.full_name || "—";
    els.headEmail.textContent = user.email || "—";

    els.fullName.textContent = user.full_name || "—";
    els.email.textContent = user.email || "—";
    els.userId.textContent = String(user.id);
    els.memberSince.textContent = user.created_at ? GWUI.formatDate(user.created_at) : "—";
    els.lastLogin.textContent = session.loginAt ? GWUI.formatDateTime(session.loginAt) : "—";

    els.balance.textContent = GWUI.formatMoney(wallet.balance, wallet.currency);
    els.gross.textContent = GWUI.formatMoney(wallet.gross, wallet.currency);
    els.tax.textContent = GWUI.formatMoney(wallet.tax, wallet.currency);
    els.approvedCount.textContent = String(wallet.approvedCount);
    els.notApprovedCount.textContent = String(wallet.notApprovedCount);
    els.lastActivity.textContent = wallet.lastActivity ? GWUI.formatDate(wallet.lastActivity) : "—";

    renderLanguage();
    GWTranslator.apply(GWTranslator.getLang(), document.getElementById("page-content"));
  }

  function load() {
    GWApp.showSkeleton();
    GWApp.loadData()
      .then(function (state) {
        render(state);
        GWApp.showContent();
      })
      .catch(function () {
        GWApp.showLoadError(load);
      });
  }

  GWApp.bindRefresh(render);

  document.addEventListener("gw:langchange", function () {
    var state = GWApp.getState();
    if (state.user) render(state);
    else renderLanguage();
  });

  renderLanguage();
  load();
})();
