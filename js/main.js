/* ============================================================
   Barbershop — interazioni
   Vanilla JS, niente dipendenze. Caricato con `defer`.
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Anno corrente nel footer ---------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Menu mobile ---------- */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("primary-nav");

  function closeNav() {
    if (!toggle || !nav) return;
    nav.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Apri il menu");
  }

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Chiudi il menu" : "Apri il menu");
    });
    // Chiudi cliccando un link
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) closeNav();
    });
    // Chiudi con Esc
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeNav();
    });
  }

  /* ---------- Logo → torna in cima (senza lasciare #top nell'URL) ---------- */
  document.querySelectorAll("a.logo").forEach(function (link) {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
      // ripulisce l'hash dall'indirizzo senza ricaricare
      if (history.replaceState) {
        history.replaceState(null, "", location.pathname + location.search);
      }
    });
  });

  /* ---------- Reveal allo scroll (IntersectionObserver) ---------- */
  var reveals = document.querySelectorAll(".reveal");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduceMotion || !("IntersectionObserver" in window)) {
    reveals.forEach(function (el) { el.classList.add("is-visible"); });
  } else {
    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Data minima = oggi ---------- */
  var dateInput = document.getElementById("date");
  if (dateInput) {
    var today = new Date();
    var iso = today.toISOString().split("T")[0];
    dateInput.min = iso;
  }

  /* ---------- "Prenota" dalle card → prefilla servizio + scroll ---------- */
  // Mappa nome breve della card → valore nella <select>
  var serviceSelect = document.getElementById("service");
  document.querySelectorAll(".service__cta").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var label = btn.getAttribute("data-service");
      if (serviceSelect) {
        // Trova l'option che inizia col nome del servizio
        Array.prototype.forEach.call(serviceSelect.options, function (opt) {
          if (opt.text.indexOf(label) === 0) opt.selected = true;
        });
      }
      var target = document.getElementById("prenota");
      if (target) target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
      // focus sul primo campo per accessibilità
      var name = document.getElementById("name");
      if (name) setTimeout(function () { name.focus(); }, reduceMotion ? 0 : 450);
    });
  });

  /* ---------- Validazione form ---------- */
  var form = document.getElementById("booking-form");
  var success = document.getElementById("form-success");

  function setError(field, message) {
    var input = document.getElementById(field);
    var err = document.querySelector('[data-error-for="' + field + '"]');
    if (input) input.classList.add("is-invalid");
    if (err) err.textContent = message;
  }
  function clearError(field) {
    var input = document.getElementById(field);
    var err = document.querySelector('[data-error-for="' + field + '"]');
    if (input) input.classList.remove("is-invalid");
    if (err) err.textContent = "";
  }

  function validate() {
    var ok = true;
    var firstInvalid = null;

    // Nome
    var name = document.getElementById("name");
    if (!name.value.trim() || name.value.trim().length < 2) {
      setError("name", "Inserisci il tuo nome (almeno 2 caratteri).");
      ok = false; firstInvalid = firstInvalid || name;
    } else clearError("name");

    // Telefono — accetta cifre, spazi, +, -, ()  con almeno 7 cifre
    var phone = document.getElementById("phone");
    var digits = (phone.value.match(/\d/g) || []).length;
    var phoneOk = /^[+()0-9\s\-]{7,}$/.test(phone.value.trim()) && digits >= 7;
    if (!phoneOk) {
      setError("phone", "Inserisci un numero di telefono valido.");
      ok = false; firstInvalid = firstInvalid || phone;
    } else clearError("phone");

    // Servizio
    var service = document.getElementById("service");
    if (!service.value) {
      setError("service", "Seleziona un servizio.");
      ok = false; firstInvalid = firstInvalid || service;
    } else clearError("service");

    // Data — obbligatoria e non nel passato
    var date = document.getElementById("date");
    if (!date.value) {
      setError("date", "Scegli una data.");
      ok = false; firstInvalid = firstInvalid || date;
    } else {
      var chosen = new Date(date.value + "T00:00:00");
      var now = new Date(); now.setHours(0, 0, 0, 0);
      if (chosen < now) {
        setError("date", "La data non può essere nel passato.");
        ok = false; firstInvalid = firstInvalid || date;
      } else if (chosen.getDay() === 1 || chosen.getDay() === 0) {
        // 0 = domenica, 1 = lunedì → chiuso
        setError("date", "Siamo chiusi domenica e lunedì.");
        ok = false; firstInvalid = firstInvalid || date;
      } else clearError("date");
    }

    // Ora
    var time = document.getElementById("time");
    if (!time.value) {
      setError("time", "Scegli un orario.");
      ok = false; firstInvalid = firstInvalid || time;
    } else clearError("time");

    return { ok: ok, firstInvalid: firstInvalid };
  }

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (success) success.hidden = true;

      var result = validate();
      if (!result.ok) {
        if (result.firstInvalid) result.firstInvalid.focus();
        return;
      }

      // Nessun backend in questa demo: simuliamo l'invio.
      if (success) {
        success.hidden = false;
        success.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
      }
      form.reset();
      if (dateInput) dateInput.min = new Date().toISOString().split("T")[0];
    });

    // Pulisci l'errore mentre l'utente corregge
    form.addEventListener("input", function (e) {
      if (e.target.id) clearError(e.target.id);
    });
  }

  /* ---------- Cursore custom (cerchio singolo, mix-blend difference) ---------- */
  (function customCursor() {
    var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (!fine) return; // niente cursore custom su touch

    var cur = document.createElement("div");
    cur.className = "cursor";
    cur.setAttribute("aria-hidden", "true");
    document.body.appendChild(cur);
    document.documentElement.classList.add("has-custom-cursor");

    // Segue il mouse in modo preciso (nessun ritardo)
    window.addEventListener("mousemove", function (e) {
      cur.style.transform = "translate(" + e.clientX + "px," + e.clientY + "px)";
      document.body.classList.add("cursor-active");
    }, { passive: true });

    // Crescita su elementi interattivi
    var interactive = "a, button, input, select, textarea, label, .service, .gallery__item, [role='button']";
    document.addEventListener("mouseover", function (e) {
      if (e.target.closest(interactive)) document.body.classList.add("cursor-hover");
    });
    document.addEventListener("mouseout", function (e) {
      if (e.target.closest(interactive)) document.body.classList.remove("cursor-hover");
    });

    // Pulse al click
    document.addEventListener("mousedown", function () { document.body.classList.add("cursor-down"); });
    document.addEventListener("mouseup", function () { document.body.classList.remove("cursor-down"); });

    // Nascondi quando il mouse esce dalla finestra
    document.addEventListener("mouseleave", function () { document.body.classList.remove("cursor-active"); });
    document.addEventListener("mouseenter", function () { document.body.classList.add("cursor-active"); });
  })();
})();
