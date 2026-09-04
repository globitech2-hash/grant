(function () {
  var t = function (key, params) {
    return GWTranslator.t(key, params);
  };

  if (!GWApp.initProtectedPage("withdraw")) return;

  var COUNTRIES = [
    "Argentina", "Australia", "Austria", "Belgium", "Brazil", "Canada", "Chile", "Colombia", "Costa Rica",
    "Czech Republic", "Denmark", "Dominican Republic", "Ecuador", "Finland", "France", "Germany", "Ghana",
    "Greece", "Guatemala", "Honduras", "India", "Indonesia", "Ireland", "Italy", "Japan", "Kenya", "Malaysia",
    "Mexico", "Netherlands", "New Zealand", "Nigeria", "Norway", "Panama", "Peru", "Philippines", "Poland",
    "Portugal", "Singapore", "South Africa", "South Korea", "Spain", "Sweden", "Switzerland", "Thailand",
    "Turkey", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Vietnam"
  ];

  var els = {
    form: document.getElementById("withdraw-form"),
    layout: document.getElementById("withdraw-layout"),
    result: document.getElementById("withdraw-result"),
    noBalance: document.getElementById("withdraw-no-balance"),
    available: document.getElementById("available-balance"),
    summaryApproved: document.getElementById("summary-approved"),
    summaryTax: document.getElementById("summary-tax"),
    fullName: document.getElementById("full-name"),
    bankName: document.getElementById("bank-name"),
    account: document.getElementById("account-number"),
    routing: document.getElementById("routing-number"),
    country: document.getElementById("country"),
    amount: document.getElementById("amount"),
    amountPrefix: document.getElementById("amount-prefix"),
    amountHint: document.getElementById("amount-hint"),
    useMax: document.getElementById("use-max"),
    submit: document.getElementById("withdraw-submit")
  };

  var balance = 0;
  var currency = "USD";
  var attempted = false;
  var submitted = false;

  function populateCountries() {
    if (els.country.options.length > 1) return;
    COUNTRIES.forEach(function (name) {
      var opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      els.country.appendChild(opt);
    });
  }

  function currencySymbol(code) {
    try {
      var parts = new Intl.NumberFormat("en-US", { style: "currency", currency: code }).formatToParts(0);
      for (var i = 0; i < parts.length; i++) {
        if (parts[i].type === "currency") return parts[i].value;
      }
    } catch (e) {
      /* fall through */
    }
    return code;
  }

  function parseAmount(raw) {
    var s = String(raw || "").replace(/[\s,$€£¥]/g, "");
    if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
    return Number(s);
  }

  function errorEl(input) {
    return document.getElementById(input.id + "-error");
  }

  function setError(input, key) {
    var el = errorEl(input);
    if (!el) return;
    if (key) {
      el.textContent = t(key);
      el.setAttribute("data-i18n", key);
      el.hidden = false;
      input.setAttribute("aria-invalid", "true");
    } else {
      el.textContent = "";
      el.removeAttribute("data-i18n");
      el.hidden = true;
      input.removeAttribute("aria-invalid");
    }
  }

  var validators = {
    "full-name": function (v) {
      var s = v.trim();
      if (!s) return "withdraw.errRequired";
      if (s.length < 3 || !/\s/.test(s)) return "withdraw.errName";
      return null;
    },
    "bank-name": function (v) {
      return v.trim().length >= 2 ? null : "withdraw.errRequired";
    },
    "account-number": function (v) {
      var s = v.replace(/\s+/g, "");
      if (!s) return "withdraw.errRequired";
      return /^[A-Za-z0-9]{8,34}$/.test(s) ? null : "withdraw.errAccount";
    },
    country: function (v) {
      return v ? null : "withdraw.errRequired";
    },
    amount: function (v) {
      if (!String(v).trim()) return "withdraw.errRequired";
      var n = parseAmount(v);
      if (n === null) return "withdraw.errAmountInvalid";
      if (n <= 0) return "withdraw.errAmountMin";
      if (n > balance + 0.000001) return "withdraw.errAmountMax";
      return null;
    }
  };

  function validateField(input) {
    var fn = validators[input.id];
    if (!fn) return true;
    var key = fn(input.value);
    setError(input, key);
    return !key;
  }

  function validateAll() {
    var ok = true;
    var firstBad = null;
    [els.fullName, els.bankName, els.account, els.country, els.amount].forEach(function (input) {
      if (!validateField(input)) {
        ok = false;
        if (!firstBad) firstBad = input;
      }
    });
    if (firstBad) firstBad.focus();
    return ok;
  }

  [els.fullName, els.bankName, els.account, els.country, els.amount].forEach(function (input) {
    input.addEventListener("blur", function () {
      if (attempted || input.value) validateField(input);
    });
    input.addEventListener("input", function () {
      if (attempted) validateField(input);
    });
    input.addEventListener("change", function () {
      if (attempted) validateField(input);
    });
  });

  els.useMax.addEventListener("click", function () {
    els.amount.value = balance.toFixed(2);
    validateField(els.amount);
    els.amount.focus();
  });

  function renderSummary(wallet) {
    els.available.textContent = GWUI.formatMoney(wallet.balance, wallet.currency);
    els.summaryApproved.textContent = String(wallet.approvedCount);
    els.summaryTax.textContent = GWUI.formatMoney(wallet.tax, wallet.currency);
    els.amountPrefix.textContent = currencySymbol(wallet.currency);
    els.amountHint.setAttribute("data-i18n-params", JSON.stringify({ max: GWUI.formatMoney(wallet.balance, wallet.currency) }));
    els.amountHint.textContent = t("withdraw.amountHint", { max: GWUI.formatMoney(wallet.balance, wallet.currency) });
  }

  function render(state) {
    var wallet = state.wallet;
    var user = state.user;
    var previousBalance = balance;
    balance = wallet.balance;
    currency = wallet.currency;

    if (submitted) return;

    if (balance <= 0) {
      els.layout.hidden = true;
      els.result.hidden = true;
      els.noBalance.hidden = false;
      els.noBalance.innerHTML =
        '<div class="card">' +
        GWUI.emptyState({
          iconSrc: "assets/icons/wallet.svg",
          titleKey: "withdraw.noBalance",
          title: t("withdraw.noBalance"),
          textKey: "withdraw.noBalanceHint",
          text: t("withdraw.noBalanceHint"),
          actionHtml: '<a class="btn btn-secondary btn-sm" href="dashboard.html">' + GWUI.icon("arrowLeft") + '<span data-i18n="withdraw.backToDashboard">' + t("withdraw.backToDashboard") + "</span></a>"
        }) +
        "</div>";
      return;
    }

    els.noBalance.hidden = true;
    els.result.hidden = true;
    els.layout.hidden = false;
    populateCountries();
    renderSummary(wallet);

    if (!els.fullName.value) els.fullName.value = user.full_name || "";
    if (!els.amount.value || parseAmount(els.amount.value) === previousBalance) {
      els.amount.value = balance.toFixed(2);
    }
    if (attempted) validateField(els.amount);
    GWTranslator.apply(GWTranslator.getLang(), document.getElementById("page-content"));
  }

  function makeReference() {
    var stamp = Date.now().toString(36).toUpperCase();
    var rand = Math.floor(Math.random() * 1296).toString(36).toUpperCase();
    return "WD-" + stamp.slice(-6) + (rand.length < 2 ? "0" + rand : rand);
  }

  function showResult(record) {
    submitted = true;
    els.layout.hidden = true;
    els.noBalance.hidden = true;
    els.result.hidden = false;
    els.result.innerHTML =
      '<div class="card result-card">' +
      '<div class="result-head">' +
      '<div class="result-icon">' + GWUI.icon("convert") + "</div>" +
      "<div>" +
      '<h2 class="result-title" data-i18n="withdraw.resultTitle">' + t("withdraw.resultTitle") + "</h2>" +
      '<p class="result-text" data-i18n="withdraw.resultMessage">' + t("withdraw.resultMessage") + "</p>" +
      "</div></div>" +
      '<dl class="kv">' +
      '<div class="kv-row"><dt data-i18n="withdraw.reference">' + t("withdraw.reference") + '</dt><dd class="mono" data-no-translate="true">' + GWUI.escapeHtml(record.reference) + "</dd></div>" +
      '<div class="kv-row"><dt data-i18n="withdraw.requested">' + t("withdraw.requested") + '</dt><dd data-no-translate="true">' + GWUI.formatMoney(record.amount, record.currency) + "</dd></div>" +
      '<div class="kv-row"><dt data-i18n="withdraw.destination">' + t("withdraw.destination") + '</dt><dd data-no-translate="true">' + GWUI.escapeHtml(record.bankName) + " ····" + GWUI.escapeHtml(record.accountLast4) + "</dd></div>" +
      '<div class="kv-row"><dt data-i18n="withdraw.country">' + t("withdraw.country") + '</dt><dd data-no-translate="true">' + GWUI.escapeHtml(record.country) + "</dd></div>" +
      "</dl>" +
      '<div class="form-actions">' +
      '<a class="btn btn-primary" href="dashboard.html">' + GWUI.icon("arrowLeft") + '<span data-i18n="withdraw.backToDashboard">' + t("withdraw.backToDashboard") + "</span></a>" +
      "</div></div>";

    GWUI.modal({
      icon: "convert",
      title: t("withdraw.resultTitle"),
      titleKey: "withdraw.resultTitle",
      message: t("withdraw.resultMessage"),
      messageKey: "withdraw.resultMessage",
      actions: [
        { label: t("withdraw.backToDashboard"), i18n: "withdraw.backToDashboard", href: "dashboard.html", variant: "primary" }
      ]
    });
  }

  els.form.addEventListener("submit", function (e) {
    e.preventDefault();
    attempted = true;
    if (!validateAll()) return;

    var amount = parseAmount(els.amount.value);
    var accountClean = els.account.value.replace(/\s+/g, "");
    var session = GWApp.getSession();
    var label = els.submit.querySelector("span");

    els.submit.disabled = true;
    els.submit.classList.add("is-loading");
    els.submit.insertAdjacentHTML("afterbegin", GWUI.icon("refresh"));
    label.setAttribute("data-i18n", "withdraw.processing");
    label.textContent = t("withdraw.processing") + "…";

    setTimeout(function () {
      var record = {
        type: "withdrawal_attempt",
        reference: makeReference(),
        userId: session ? session.userId : null,
        amount: GWApp.round2(amount),
        currency: currency,
        fullName: els.fullName.value.trim(),
        bankName: els.bankName.value.trim(),
        accountLast4: accountClean.slice(-4),
        country: els.country.value,
        status: "conversion_required",
        createdAt: new Date().toISOString()
      };
      GWApp.addActivity(record);
      showResult(record);
    }, 900);
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

  document.addEventListener("gw:langchange", function () {
    var state = GWApp.getState();
    if (!state.user) return;
    if (submitted) {
      GWTranslator.apply(GWTranslator.getLang(), els.result);
      return;
    }
    render(state);
    [els.fullName, els.bankName, els.account, els.country, els.amount].forEach(function (input) {
      var el = errorEl(input);
      if (el && !el.hidden && el.getAttribute("data-i18n")) el.textContent = t(el.getAttribute("data-i18n"));
    });
  });

  load();
})();
