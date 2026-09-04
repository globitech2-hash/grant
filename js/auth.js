(function () {
  var t = function (key, params) {
    return GWTranslator.t(key, params);
  };

  GWApp.initAuthPage();

  // Register page: nothing to do beyond shell/translation.
  var form = document.getElementById("login-form");
  if (!form) return;

  // Already signed in: skip the login form.
  if (GWApp.getSession()) {
    window.location.replace("dashboard.html");
    return;
  }

  var params = new URLSearchParams(window.location.search);
  if (params.get("reason") === "session") {
    GWUI.toast(t("common.sessionEnded"), "info", { duration: 5000 });
  }

  var emailInput = document.getElementById("email");
  var passwordInput = document.getElementById("password");
  var emailError = document.getElementById("email-error");
  var passwordError = document.getElementById("password-error");
  var formError = document.getElementById("form-error");
  var submitBtn = document.getElementById("login-submit");
  var submitLabel = submitBtn.querySelector("span");
  var toggleBtn = document.getElementById("toggle-password");

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var attempted = false;

  function setFieldError(input, errorEl, key) {
    if (key) {
      errorEl.textContent = t(key);
      errorEl.setAttribute("data-i18n", key);
      errorEl.hidden = false;
      input.setAttribute("aria-invalid", "true");
    } else {
      errorEl.textContent = "";
      errorEl.removeAttribute("data-i18n");
      errorEl.hidden = true;
      input.removeAttribute("aria-invalid");
    }
  }

  function showFormError(key) {
    if (key) {
      formError.innerHTML = GWUI.icon("alert") + '<span data-i18n="' + key + '">' + GWUI.escapeHtml(t(key)) + "</span>";
      formError.hidden = false;
    } else {
      formError.innerHTML = "";
      formError.hidden = true;
    }
  }

  function validateEmail() {
    var value = emailInput.value.trim();
    if (!value) {
      setFieldError(emailInput, emailError, "auth.emailRequired");
      return false;
    }
    if (!EMAIL_RE.test(value)) {
      setFieldError(emailInput, emailError, "auth.emailInvalid");
      return false;
    }
    setFieldError(emailInput, emailError, null);
    return true;
  }

  function validatePassword() {
    if (!passwordInput.value) {
      setFieldError(passwordInput, passwordError, "auth.passwordRequired");
      return false;
    }
    setFieldError(passwordInput, passwordError, null);
    return true;
  }

  emailInput.addEventListener("blur", function () {
    if (attempted || emailInput.value) validateEmail();
  });
  emailInput.addEventListener("input", function () {
    if (attempted) validateEmail();
    showFormError(null);
  });
  passwordInput.addEventListener("input", function () {
    if (attempted) validatePassword();
    showFormError(null);
  });

  if (toggleBtn) {
    toggleBtn.addEventListener("click", function () {
      var showing = passwordInput.type === "text";
      passwordInput.type = showing ? "password" : "text";
      toggleBtn.innerHTML = GWUI.icon(showing ? "eye" : "eyeOff");
      var key = showing ? "auth.showPassword" : "auth.hidePassword";
      toggleBtn.setAttribute("data-i18n-aria", key);
      toggleBtn.setAttribute("aria-label", t(key));
      toggleBtn.setAttribute("aria-pressed", showing ? "false" : "true");
      passwordInput.focus();
    });
  }

  function setLoading(loading) {
    submitBtn.disabled = loading;
    emailInput.disabled = loading;
    passwordInput.disabled = loading;
    if (loading) {
      submitLabel.setAttribute("data-i18n", "auth.signingIn");
      submitLabel.textContent = t("auth.signingIn") + "…";
      submitBtn.insertAdjacentHTML("afterbegin", GWUI.icon("refresh"));
      submitBtn.classList.add("is-loading");
    } else {
      submitLabel.setAttribute("data-i18n", "auth.signIn");
      submitLabel.textContent = t("auth.signIn");
      var svg = submitBtn.querySelector("svg");
      if (svg) svg.remove();
      submitBtn.classList.remove("is-loading");
    }
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    attempted = true;
    showFormError(null);
    var okEmail = validateEmail();
    var okPassword = validatePassword();
    if (!okEmail || !okPassword) {
      (okEmail ? passwordInput : emailInput).focus();
      return;
    }

    setLoading(true);
    var email = emailInput.value.trim();
    var password = passwordInput.value;

    GWApi.getUsers()
      .then(function (result) {
        if (result.source === "cache") {
          GWUI.toast(t("common.usingCached"), "warning");
        }
        var user = GWApi.findUserByEmail(result.users, email);
        if (!user || String(user.password) !== password) {
          setLoading(false);
          showFormError("auth.invalid");
          passwordInput.value = "";
          passwordInput.focus();
          return;
        }
        GWApp.setSession({
          userId: user.id,
          email: user.email,
          loginAt: new Date().toISOString()
        });
        window.location.href = "dashboard.html";
      })
      .catch(function () {
        setLoading(false);
        showFormError("common.fetchFailed");
      });
  });
})();
