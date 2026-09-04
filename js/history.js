(function () {
  var t = function (key, params) {
    return GWTranslator.t(key, params);
  };

  if (!GWApp.initProtectedPage("history")) return;

  var filter = "all";
  var query = "";

  var els = {
    search: document.getElementById("history-search"),
    clear: document.getElementById("history-clear"),
    filters: document.getElementById("history-filters"),
    count: document.getElementById("history-count"),
    results: document.getElementById("history-results"),
    empty: document.getElementById("history-empty")
  };

  function applyFilters(grants) {
    var q = query.trim().toLowerCase();
    return grants.filter(function (g) {
      if (filter === "approved" && !g.isApproved) return false;
      if (filter === "notApproved" && g.isApproved) return false;
      if (q && String(g.programName).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
  }

  function renderCount(n) {
    if (n === 1) {
      els.count.setAttribute("data-i18n", "history.countOne");
      els.count.removeAttribute("data-i18n-params");
      els.count.textContent = t("history.countOne");
    } else {
      els.count.setAttribute("data-i18n", "history.count");
      els.count.setAttribute("data-i18n-params", JSON.stringify({ n: n }));
      els.count.textContent = t("history.count", { n: n });
    }
  }

  function render(state) {
    var wallet = state.wallet;
    var all = wallet.grants;
    var list = applyFilters(all);
    renderCount(list.length);

    if (all.length === 0) {
      els.results.hidden = true;
      els.empty.hidden = false;
      els.empty.innerHTML =
        '<div class="card">' +
        GWUI.emptyState({
          iconSrc: "assets/icons/inbox.svg",
          titleKey: "dashboard.noGrants",
          title: t("dashboard.noGrants"),
          textKey: "dashboard.noGrantsHint",
          text: t("dashboard.noGrantsHint")
        }) +
        "</div>";
      return;
    }

    if (list.length === 0) {
      els.results.hidden = true;
      els.empty.hidden = false;
      els.empty.innerHTML =
        '<div class="card">' +
        GWUI.emptyState({
          iconSrc: "assets/icons/search.svg",
          titleKey: "history.noResults",
          title: t("history.noResults"),
          textKey: "history.noResultsHint",
          text: t("history.noResultsHint")
        }) +
        "</div>";
      return;
    }

    els.empty.hidden = true;
    els.results.hidden = false;
    els.results.innerHTML = GWApp.grantTableHTML(list, { currency: wallet.currency });
    GWTranslator.apply(GWTranslator.getLang(), els.results);
  }

  function rerender() {
    var state = GWApp.getState();
    if (state.user) render(state);
  }

  els.filters.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-filter]");
    if (!btn) return;
    filter = btn.getAttribute("data-filter");
    var buttons = els.filters.querySelectorAll("[data-filter]");
    for (var i = 0; i < buttons.length; i++) {
      var active = buttons[i] === btn;
      buttons[i].classList.toggle("is-active", active);
      buttons[i].setAttribute("aria-pressed", active ? "true" : "false");
    }
    rerender();
  });

  var searchTimer = null;
  els.search.addEventListener("input", function () {
    query = els.search.value;
    els.clear.hidden = !query;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(rerender, 120);
  });

  els.clear.addEventListener("click", function () {
    els.search.value = "";
    query = "";
    els.clear.hidden = true;
    rerender();
    els.search.focus();
  });

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
  document.addEventListener("gw:langchange", rerender);

  load();
})();
