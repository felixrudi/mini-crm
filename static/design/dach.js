/* ============================================================
   Kopfleiste (Dach) — Live-Prüfung & Status
   ------------------------------------------------------------
   Prüft per fetch(..., {mode: 'no-cors'}), ob die lokalen
   Dienste (CRM, Todoist, Mail Genie) erreichbar sind.
   Aktualisiert Statuspunkte, Kacheln und Tastaturkürzel.
   ============================================================ */
(function () {
  'use strict';

  var FRIST_MS = 2000;

  function erreichbar(url) {
    var stopp = new AbortController();
    var uhr = setTimeout(function () { stopp.abort(); }, FRIST_MS);
    return fetch(url, { mode: 'no-cors', cache: 'no-store', signal: stopp.signal })
      .then(function () { clearTimeout(uhr); return true; })
      .catch(function () { clearTimeout(uhr); return false; });
  }

  function setStatus(el, online) {
    if (!el) return;
    el.setAttribute('data-online', online ? 'ja' : 'nein');
    if (online) {
      el.removeAttribute('data-offline');
      el.removeAttribute('aria-disabled');
      if (el.hasAttribute('data-alt-title')) {
        el.setAttribute('title', el.getAttribute('data-alt-title'));
      }
    } else {
      el.setAttribute('data-offline', 'true');
      el.setAttribute('aria-disabled', 'true');
      if (!el.hasAttribute('data-alt-title') && el.getAttribute('title')) {
        el.setAttribute('data-alt-title', el.getAttribute('title'));
      }
      el.setAttribute('title', 'Läuft gerade nicht — starte ./start.sh');
    }
  }

  function pruefen() {
    // 1. Reiter in der Kopfleiste (data-probe oder href)
    document.querySelectorAll('.dach-reiter[href], .dach-reiter[data-probe]').forEach(function (reiter) {
      if (reiter.getAttribute('aria-current') === 'page') return;
      var probeUrl = reiter.getAttribute('data-probe') || reiter.getAttribute('href');
      if (!probeUrl || probeUrl === '#') return;
      erreichbar(probeUrl).then(function (ok) {
        setStatus(reiter, ok);
      });
    });

    // 2. Kacheln auf der Übersichtsseite mit data-probe oder href
    document.querySelectorAll('.kachel[data-probe], .kachel[href]').forEach(function (kachel) {
      var probeUrl = kachel.getAttribute('data-probe') || kachel.getAttribute('href');
      if (!probeUrl) return;
      erreichbar(probeUrl).then(function (ok) {
        kachel.dataset.da = ok ? 'ja' : 'nein';
        setStatus(kachel, ok);
      });
    });

    // 3. Status-Pillen in der Leiste
    document.querySelectorAll('.dach-pill[data-probe]').forEach(function (pill) {
      var probeUrl = pill.getAttribute('data-probe');
      erreichbar(probeUrl).then(function (ok) {
        setStatus(pill, ok);
      });
    });
  }

  // Klick auf nicht laufende Anwendung verhindern (kein Verbindungsfehler im Browser)
  document.addEventListener('click', function (e) {
    var offlineEl = e.target.closest && e.target.closest('[data-offline="true"], [data-da="nein"]');
    if (offlineEl) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  window.ArbeitsbereichDach = {
    pruefen: pruefen,
    erreichbar: erreichbar
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', pruefen);
  } else {
    pruefen();
  }

  // Erneut prüfen bei Tab-Fokus und Sichtbarkeitswechsel
  window.addEventListener('focus', pruefen);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) pruefen();
  });

  // Mail Genie htmx Swap-Support
  document.addEventListener('htmx:afterSwap', pruefen);

  // Alle 15 Sekunden im Hintergrund kurz sanft abtasten
  setInterval(pruefen, 15000);
})();

