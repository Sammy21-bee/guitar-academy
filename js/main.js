/* ============================================================
   Guitar Academy — micro-interazioni e form
   Menu mobile · header sticky · reveal · validazione accessibile
   ============================================================ */

(function () {
  "use strict";

  /* Anno corrente nel footer */
  document.querySelectorAll(".js-year").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* Header: ombra dopo lo scroll */
  var head = document.querySelector(".site-head");
  function onScroll() {
    if (!head) return;
    head.classList.toggle("is-scrolled", window.scrollY > 4);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Menu mobile ---------- */
  var toggle = document.querySelector(".js-menu-toggle");
  var nav = document.getElementById("siteNav");

  function closeMenu() {
    if (!nav) return;
    nav.classList.remove("is-open");
    if (toggle) toggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("no-scroll");
  }
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      document.body.classList.toggle("no-scroll", open);
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) closeMenu();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeMenu();
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth > 940) closeMenu();
    });
  }

  /* ---------- Reveal sobrio allo scroll ---------- */
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && reveals.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---------- Validazione form ---------- */
  var RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var RE_TEL = /^[+0-9][0-9 ().\-]{5,19}$/;

  var MESSAGES = {
    nome: "Inserisci il tuo nome.",
    email: "Inserisci un indirizzo email valido (es. nome@dominio.it).",
    telefono: "Il numero non sembra valido: usa solo cifre, spazi, + ( ).",
    corso: "Seleziona il corso che ti interessa.",
    messaggio: "Scrivi una breve richiesta, così possiamo aiutarti subito.",
    privacy: "Per inviare la richiesta è necessario accettare la privacy."
  };

  function setFieldError(field, message) {
    var wrap = field.closest(".field");
    if (!wrap) return;
    var box = wrap.querySelector(".field-error");
    wrap.classList.add("field--error");
    if (box) {
      var text = box.querySelector("[data-msg]");
      if (text) text.textContent = message;
    }
    field.setAttribute("aria-invalid", "true");
  }
  function clearFieldError(field) {
    var wrap = field.closest(".field");
    if (!wrap) return;
    wrap.classList.remove("field--error");
    field.removeAttribute("aria-invalid");
  }

  document.querySelectorAll("form[data-validate]").forEach(function (form) {
    form.setAttribute("novalidate", "novalidate");
    var fields = form.querySelectorAll(".input");
    fields.forEach(function (f) {
      f.addEventListener("input", function () { clearFieldError(f); });
      f.addEventListener("change", function () { clearFieldError(f); });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var firstInvalid = null;
      var anyError = false;

      fields.forEach(function (field) {
        var name = field.getAttribute("name");
        var value = (field.value || "").trim();
        var required = field.hasAttribute("required");
        var needValue = required || (name === "email" && value) || (name === "telefono" && value);

        var valid = true;
        if (needValue && !value) {
          valid = false;
        } else if (value) {
          if (name === "email") valid = RE_EMAIL.test(value);
          if (name === "telefono") valid = RE_TEL.test(value);
        }
        if (!valid) {
          var msg = (field.getAttribute("data-err") || MESSAGES[name] || "Controlla questo campo.");
          if (required && !value && name === "email") msg = MESSAGES.email;
          setFieldError(field, msg);
          anyError = true;
          if (!firstInvalid) firstInvalid = field;
        } else {
          clearFieldError(field);
        }
      });

      var privacy = form.querySelector('input[name="privacy"]');
      if (privacy && !privacy.checked) {
        var pBox = form.querySelector(".form-error-box");
        if (pBox) pBox.classList.add("is-visible");
        anyError = true;
        if (!firstInvalid) firstInvalid = privacy;
      } else if (privacy) {
        var pBox2 = form.querySelector(".form-error-box");
        if (pBox2) pBox2.classList.remove("is-visible");
      }

      if (anyError) {
        if (firstInvalid) {
          firstInvalid.focus();
          if (firstInvalid.type === "checkbox") firstInvalid.closest(".check").scrollIntoView({ block: "center", behavior: "smooth" });
        }
        return;
      }

      /* ----------
         Integrazione backend: sostituire questo blocco con la
         chiamata al servizio scelto (email/CRM/endpoint API).
         ---------- */
      var btn = form.querySelector('[type="submit"]');
      if (btn) { btn.setAttribute("aria-disabled", "true"); btn.classList.add("btn--primary"); }
      window.setTimeout(function () {
        var ok = form.querySelector(".form-success");
        form.reset();
        if (ok) ok.classList.add("is-visible");
        if (btn) { btn.removeAttribute("aria-disabled"); btn.classList.add("btn--primary"); }
        if (ok) ok.scrollIntoView({ block: "center", behavior: "smooth" });
      }, 450);
    });
  });

  /* Consenso privacy: l'errore sparisce al click */
  document.querySelectorAll('input[name="privacy"]').forEach(function (cb) {
    cb.addEventListener("change", function () {
      var box = cb.closest("form").querySelector(".form-error-box");
      if (box) box.classList.remove("is-visible");
    });
  });
})();
