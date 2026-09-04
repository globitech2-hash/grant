window.GWNav = (function () {
  var initialized = false;
  var MOBILE_BREAKPOINT = 900;

  function currentPage() {
    var segment = window.location.pathname.split("/").pop();
    if (!segment) return "index.html";
    return segment.toLowerCase();
  }

  function markActive() {
    var page = currentPage();
    var links = document.querySelectorAll(".nav-link[href]");
    for (var i = 0; i < links.length; i++) {
      var href = (links[i].getAttribute("href") || "").split("?")[0].split("#")[0].toLowerCase();
      var active = href === page;
      links[i].classList.toggle("is-active", active);
      if (active) links[i].setAttribute("aria-current", "page");
      else links[i].removeAttribute("aria-current");
    }
  }

  function setExpanded(value) {
    var toggles = document.querySelectorAll("[data-nav-toggle]");
    for (var i = 0; i < toggles.length; i++) {
      toggles[i].setAttribute("aria-expanded", value ? "true" : "false");
    }
  }

  function isOpen() {
    return document.body.classList.contains("nav-open");
  }

  function open() {
    document.body.classList.add("nav-open");
    setExpanded(true);
    var first = document.querySelector(".sidebar .nav-link.is-active") || document.querySelector(".sidebar .nav-link");
    if (first) {
      try {
        first.focus({ preventScroll: true });
      } catch (e) {
        /* ignore */
      }
    }
  }

  function close() {
    if (!isOpen()) return;
    document.body.classList.remove("nav-open");
    setExpanded(false);
    var toggle = document.querySelector("[data-nav-toggle]");
    if (toggle && window.innerWidth <= MOBILE_BREAKPOINT) {
      try {
        toggle.focus({ preventScroll: true });
      } catch (e) {
        /* ignore */
      }
    }
  }

  function toggle() {
    if (isOpen()) close();
    else open();
  }

  function init() {
    if (initialized) {
      markActive();
      return;
    }
    initialized = true;
    markActive();

    document.addEventListener("click", function (e) {
      if (e.target.closest("[data-nav-toggle]")) {
        e.preventDefault();
        toggle();
        return;
      }
      if (e.target.closest("[data-nav-close]") || e.target.closest("#nav-overlay")) {
        close();
        return;
      }
      if (e.target.closest(".sidebar .nav-link")) {
        close();
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && isOpen()) close();
    });

    var resizeTimer = null;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        if (window.innerWidth > MOBILE_BREAKPOINT && isOpen()) {
          document.body.classList.remove("nav-open");
          setExpanded(false);
        }
      }, 80);
    });
  }

  return {
    init: init,
    open: open,
    close: close,
    toggle: toggle,
    markActive: markActive,
    currentPage: currentPage
  };
})();
