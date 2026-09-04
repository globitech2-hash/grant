window.GWUI = (function () {
  var ICONS = {
    dashboard: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    history: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    bank: '<path d="M3 9.5 12 4l9 5.5H3z"/><path d="M5 10v8M10 10v8M14 10v8M19 10v8"/><path d="M3 20h18"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    logout: '<path d="M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h5"/><path d="m15 8 4 4-4 4"/><path d="M19 12H9"/>',
    refresh: '<path d="M20 12a8 8 0 1 1-2.34-5.66"/><path d="M20 4v5h-5"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    search: '<circle cx="11" cy="11" r="6"/><path d="m20 20-4.5-4.5"/>',
    check: '<path d="m5 12 5 5L20 7"/>',
    alert: '<circle cx="12" cy="12" r="9"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/>',
    arrowLeft: '<path d="M19 12H5"/><path d="m11 18-6-6 6-6"/>',
    arrowRight: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
    wallet: '<path d="M3 7a2 2 0 0 1 2-2h13v4"/><path d="M3 7v11a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1V10a1 1 0 0 0-1-1H5a2 2 0 0 1-2-2z"/><circle cx="16.5" cy="14.5" r="1"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18"/><path d="M12 3a14 14 0 0 0 0 18"/>',
    eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="m3 3 18 18"/><path d="M10.6 10.6a3 3 0 0 0 2.8 2.8"/><path d="M9.9 5.2A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4"/><path d="M6.2 6.2A16 16 0 0 0 2 12s3.5 7 10 7c1.3 0 2.5-.3 3.6-.7"/>',
    convert: '<path d="M4 7h13"/><path d="m14 4 3 3-3 3"/><path d="M20 17H7"/><path d="m10 14-3 3 3 3"/>',
    fileText: '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5"/><path d="M9 13h6"/><path d="M9 17h6"/>',
    shield: '<path d="M12 3 4 6v6c0 5 3.4 8.4 8 9 4.6-.6 8-4 8-9V6z"/>'
  };

  function icon(name, cls) {
    var body = ICONS[name] || ICONS.info;
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"' +
      (cls ? ' class="' + cls + '"' : "") +
      ">" +
      body +
      "</svg>"
    );
  }

  function escapeHtml(value) {
    return String(value === null || value === undefined ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /* ---------- Formatting (amounts are ALWAYS en-US, never localized) ---------- */

  function formatMoney(amount, currency) {
    if (amount === null || amount === undefined || isNaN(Number(amount))) return "—";
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency || "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(Number(amount));
    } catch (e) {
      return (currency || "USD") + " " + Number(amount).toFixed(2);
    }
  }

  function formatPercent(rate) {
    if (rate === null || rate === undefined || isNaN(Number(rate))) return "—";
    var pct = Number(rate) * 100;
    return (Math.round(pct * 100) / 100).toString() + "%";
  }

  function toDate(value) {
    if (!value) return null;
    var d = value instanceof Date ? value : new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  function formatDate(value) {
    var d = toDate(value);
    if (!d) return "—";
    try {
      return new Intl.DateTimeFormat(GWTranslator.locale(), { year: "numeric", month: "short", day: "numeric" }).format(d);
    } catch (e) {
      return d.toLocaleDateString();
    }
  }

  function formatDateTime(value) {
    var d = toDate(value);
    if (!d) return "—";
    try {
      return new Intl.DateTimeFormat(GWTranslator.locale(), {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }).format(d);
    } catch (e) {
      return d.toLocaleString();
    }
  }

  function formatTime(value) {
    var d = toDate(value);
    if (!d) return "—";
    try {
      return new Intl.DateTimeFormat(GWTranslator.locale(), { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(d);
    } catch (e) {
      return d.toLocaleTimeString();
    }
  }

  function initials(name) {
    var parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "?";
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  /* ---------- Toasts ---------- */

  function toastContainer() {
    var c = document.getElementById("gw-toasts");
    if (!c) {
      c = document.createElement("div");
      c.id = "gw-toasts";
      c.className = "toast-container";
      c.setAttribute("aria-live", "polite");
      document.body.appendChild(c);
    }
    c.classList.add("toast-container");
    return c;
  }

  function dismissToast(el) {
    if (!el || el.dataset.leaving) return;
    el.dataset.leaving = "1";
    el.classList.add("is-leaving");
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 180);
  }

  function toast(message, type, options) {
    var kind = type || "info";
    var opts = options || {};
    var container = toastContainer();
    while (container.children.length >= 4) {
      container.removeChild(container.firstChild);
    }
    var el = document.createElement("div");
    el.className = "toast toast-" + kind;
    el.setAttribute("role", kind === "error" ? "alert" : "status");
    var iconName = kind === "success" ? "check" : kind === "error" || kind === "warning" ? "alert" : "info";
    el.innerHTML =
      '<span class="toast-icon">' +
      icon(iconName) +
      '</span><span class="toast-msg"></span><button type="button" class="toast-close" aria-label="Close">' +
      icon("close") +
      "</button>";
    el.querySelector(".toast-msg").textContent = message;
    el.querySelector(".toast-close").addEventListener("click", function () {
      dismissToast(el);
    });
    container.appendChild(el);
    var duration = typeof opts.duration === "number" ? opts.duration : kind === "error" ? 5000 : 3200;
    if (duration > 0) {
      setTimeout(function () {
        dismissToast(el);
      }, duration);
    }
    return el;
  }

  /* ---------- Modal ---------- */

  var activeModal = null;

  function closeModal() {
    if (!activeModal) return;
    var m = activeModal;
    activeModal = null;
    document.removeEventListener("keydown", m.onKey);
    if (m.el.parentNode) m.el.parentNode.removeChild(m.el);
    if (m.restoreFocus && typeof m.restoreFocus.focus === "function") {
      try {
        m.restoreFocus.focus();
      } catch (e) {
        /* ignore */
      }
    }
  }

  function modal(options) {
    closeModal();
    var opts = options || {};
    var backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    var actions = opts.actions || [];
    var actionsHtml = actions
      .map(function (a, i) {
        var cls = "btn " + (a.variant === "secondary" ? "btn-secondary" : a.variant === "ghost" ? "btn-ghost" : "btn-primary");
        var label = escapeHtml(a.label);
        var i18n = a.i18n ? ' data-i18n="' + escapeHtml(a.i18n) + '"' : "";
        if (a.href) {
          return '<a class="' + cls + '" href="' + escapeHtml(a.href) + '" data-modal-action="' + i + '"><span' + i18n + ">" + label + "</span></a>";
        }
        return '<button type="button" class="' + cls + '" data-modal-action="' + i + '"><span' + i18n + ">" + label + "</span></button>";
      })
      .join("");

    backdrop.innerHTML =
      '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="gw-modal-title">' +
      (opts.icon ? '<div class="modal-icon">' + icon(opts.icon) + "</div>" : "") +
      '<h2 class="modal-title" id="gw-modal-title"' +
      (opts.titleKey ? ' data-i18n="' + escapeHtml(opts.titleKey) + '"' : "") +
      ">" +
      escapeHtml(opts.title || "") +
      "</h2>" +
      '<p class="modal-message"' +
      (opts.messageKey ? ' data-i18n="' + escapeHtml(opts.messageKey) + '"' : "") +
      ">" +
      escapeHtml(opts.message || "") +
      "</p>" +
      (opts.bodyHtml ? opts.bodyHtml : "") +
      (actionsHtml ? '<div class="modal-actions">' + actionsHtml + "</div>" : "") +
      "</div>";

    var record = {
      el: backdrop,
      restoreFocus: document.activeElement,
      onKey: function (e) {
        if (e.key === "Escape" && opts.dismissible !== false) closeModal();
      }
    };

    backdrop.addEventListener("click", function (e) {
      if (e.target === backdrop && opts.dismissible !== false) closeModal();
    });

    var actionEls = backdrop.querySelectorAll("[data-modal-action]");
    for (var i = 0; i < actionEls.length; i++) {
      (function (btn) {
        btn.addEventListener("click", function (e) {
          var a = actions[Number(btn.getAttribute("data-modal-action"))];
          if (a && typeof a.onClick === "function") {
            var result = a.onClick(e);
            if (result === false) return;
          }
          if (!a || !a.href) closeModal();
        });
      })(actionEls[i]);
    }

    document.addEventListener("keydown", record.onKey);
    document.body.appendChild(backdrop);
    activeModal = record;

    var first = backdrop.querySelector(".modal-actions .btn") || backdrop.querySelector(".modal");
    if (first) {
      if (!first.hasAttribute("tabindex") && first.classList.contains("modal")) first.setAttribute("tabindex", "-1");
      try {
        first.focus();
      } catch (e) {
        /* ignore */
      }
    }
    return { close: closeModal, el: backdrop };
  }

  /* ---------- Skeleton / section helpers ---------- */

  function show(el) {
    if (el) el.hidden = false;
  }

  function hide(el) {
    if (el) el.hidden = true;
  }

  function setText(id, value) {
    var el = typeof id === "string" ? document.getElementById(id) : id;
    if (el) el.textContent = value;
  }

  function emptyState(opts) {
    var o = opts || {};
    return (
      '<div class="empty">' +
      (o.iconSrc ? '<img src="' + escapeHtml(o.iconSrc) + '" alt="" width="36" height="36">' : "") +
      '<div class="empty-title"' +
      (o.titleKey ? ' data-i18n="' + escapeHtml(o.titleKey) + '"' : "") +
      ">" +
      escapeHtml(o.title || "") +
      "</div>" +
      '<div class="empty-text"' +
      (o.textKey ? ' data-i18n="' + escapeHtml(o.textKey) + '"' : "") +
      ">" +
      escapeHtml(o.text || "") +
      "</div>" +
      (o.actionHtml || "") +
      "</div>"
    );
  }

  return {
    icon: icon,
    escapeHtml: escapeHtml,
    formatMoney: formatMoney,
    formatPercent: formatPercent,
    formatDate: formatDate,
    formatDateTime: formatDateTime,
    formatTime: formatTime,
    initials: initials,
    toast: toast,
    modal: modal,
    closeModal: closeModal,
    show: show,
    hide: hide,
    setText: setText,
    emptyState: emptyState
  };
})();
