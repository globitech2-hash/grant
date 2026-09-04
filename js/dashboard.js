(function () {
  var t = function (key, params) {
    return GWTranslator.t(key, params);
  };

  if (!GWApp.initProtectedPage("dashboard")) return;

  var els = {
    greeting: document.getElementById("greeting"),
    statBalance: document.getElementById("stat-balance"),
    statGross: document.getElementById("stat-gross"),
    statTax: document.getElementById("stat-tax"),
    statGrants: document.getElementById("stat-grants"),
    statGrantsHint: document.getElementById("stat-grants-hint"),
    ctaSlot: document.getElementById("cta-slot"),
    recentSlot: document.getElementById("recent-slot"),
    recentCard: document.getElementById("recent-card")
  };

  function renderCta(wallet) {
    var html = "";
    if (wallet.balance > 0) {
      html =
        '<div class="cta-banner">' +
        '<div class="cta-banner-body">' +
        '<div class="cta-banner-icon">' + GWUI.icon("bank") + "</div>" +
        "<div>" +
        '<div class="cta-banner-title" data-i18n="dashboard.readyToWithdraw">' + t("dashboard.readyToWithdraw") + "</div>" +
        '<div class="cta-banner-text"><span data-i18n="dashboard.withdrawHint">' + t("dashboard.withdrawHint") + "</span> " +
        '<span class="cta-banner-amount" data-no-translate="true">' + GWUI.formatMoney(wallet.balance, wallet.currency) + "</span></div>" +
        "</div></div>" +
        '<a class="btn btn-primary" href="withdraw.html"><span data-i18n="dashboard.withdrawCta">' + t("dashboard.withdrawCta") + "</span>" + GWUI.icon("arrowRight") + "</a>" +
        "</div>";
    } else if (wallet.total === 0) {
      html =
        '<div class="card">' +
        GWUI.emptyState({
          iconSrc: "assets/icons/inbox.svg",
          titleKey: "dashboard.noGrants",
          title: t("dashboard.noGrants"),
          textKey: "dashboard.noGrantsHint",
          text: t("dashboard.noGrantsHint")
        }) +
        "</div>";
    } else {
      html =
        '<div class="card">' +
        GWUI.emptyState({
          iconSrc: "assets/icons/wallet.svg",
          titleKey: "dashboard.noApproved",
          title: t("dashboard.noApproved"),
          textKey: "dashboard.noApprovedHint",
          text: t("dashboard.noApprovedHint"),
          actionHtml: '<a class="btn btn-secondary btn-sm" href="history.html"><span data-i18n="common.viewAll">' + t("common.viewAll") + "</span></a>"
        }) +
        "</div>";
    }
    els.ctaSlot.innerHTML = html;
  }

  function renderRecent(wallet) {
    if (!wallet.grants.length) {
      els.recentCard.hidden = true;
      return;
    }
    els.recentCard.hidden = false;
    els.recentSlot.innerHTML = GWApp.grantTableHTML(wallet.grants.slice(0, 5), { currency: wallet.currency, compact: true });
  }

  function render(state) {
    var user = state.user;
    var wallet = state.wallet;
    var firstName = String(user.full_name || "").trim().split(/\s+/)[0] || user.email;

    els.greeting.setAttribute("data-i18n", "dashboard.greeting");
    els.greeting.setAttribute("data-i18n-params", JSON.stringify({ name: firstName }));
    els.greeting.textContent = t("dashboard.greeting", { name: firstName });

    els.statBalance.textContent = GWUI.formatMoney(wallet.balance, wallet.currency);
    els.statGross.textContent = GWUI.formatMoney(wallet.gross, wallet.currency);
    els.statTax.textContent = GWUI.formatMoney(wallet.tax, wallet.currency);
    els.statGrants.textContent = String(wallet.total);
    els.statGrantsHint.setAttribute("data-i18n-params", JSON.stringify({ approved: wallet.approvedCount, total: wallet.total }));
    els.statGrantsHint.textContent = t("dashboard.approvedOf", { approved: wallet.approvedCount, total: wallet.total });

    renderCta(wallet);
    renderRecent(wallet);
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
  });

  load();
})();
