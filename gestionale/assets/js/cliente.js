/* ==========================================================================
   Area Cliente — logica
   ========================================================================== */
(function () {
  'use strict';

  function getClienti() {
    try {
      var raw = localStorage.getItem('dt_gestionale_demo_clienti_v1');
      if (raw) {
        var draft = JSON.parse(raw);
        if (Array.isArray(draft) && draft.length) return draft;
      }
    } catch (e) { /* ignora */ }
    return window.CLIENTI_DATA || [];
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  var loginScreen = document.getElementById('login-screen');
  var dashboardScreen = document.getElementById('dashboard-screen');

  (function wireWhatsapp() {
    var cfg = window.SITE_CONFIG || {};
    if (/^https:\/\//i.test(cfg.whatsapp)) {
      document.querySelector('.js-whatsapp').setAttribute('href', cfg.whatsapp);
    }
  })();

  document.getElementById('login-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var pin = document.getElementById('login-pin').value.trim();
    var clienti = getClienti();

    var cliente = clienti.find(function (c) { return c.pin === pin; });

    if (!cliente) {
      document.getElementById('login-msg').innerHTML =
        '<div class="msg msg--error">Password non corretta. Controlla con Damiano i dati di accesso.</div>';
      return;
    }

    sessionStorage.setItem('dt_cliente_id', cliente.id);
    showDashboard(cliente);
  });

  document.getElementById('btn-logout').addEventListener('click', function () {
    sessionStorage.removeItem('dt_cliente_id');
    location.reload();
  });

  document.getElementById('btn-print').addEventListener('click', function () { window.print(); });

  var savedId = sessionStorage.getItem('dt_cliente_id');
  if (savedId) {
    var found = getClienti().find(function (c) { return c.id === savedId; });
    if (found) showDashboard(found);
  }

  function giorniAScadenza(scadenza) {
    if (!scadenza) return null;
    return Math.ceil((new Date(scadenza) - new Date()) / 86400000);
  }

  function showDashboard(c) {
    loginScreen.hidden = true;
    dashboardScreen.hidden = false;

    document.getElementById('welcome-msg').innerHTML = '<strong>Ciao, ' + esc(c.nome) + '!</strong>';
    document.getElementById('c-obiettivo').textContent = c.obiettivo || 'Nessun obiettivo registrato ancora.';

    var infoBits = [];
    if (c.dataInizio) infoBits.push('Percorso iniziato il ' + esc(c.dataInizio));
    document.getElementById('c-info').innerHTML = infoBits.map(function (t) { return '<p style="font-size:.85rem">' + t + '</p>'; }).join('');

    var abb = c.abbonamento || {};
    var giorni = giorniAScadenza(abb.scadenza);
    var abbHtml = '';
    if (abb.tipo) abbHtml += '<p>Periodo: ' + esc(abb.tipo) + (abb.importo ? ' · € ' + esc(abb.importo) : '') + '</p>';
    if (abb.scadenza) {
      var tag = giorni < 0
        ? '<span class="tag tag--danger">Scaduto da ' + Math.abs(giorni) + ' giorni</span>'
        : (giorni <= 7 ? '<span class="tag tag--warn">Scade tra ' + giorni + ' giorni (' + esc(abb.scadenza) + ')</span>'
          : '<span class="tag tag--ok">Attivo fino al ' + esc(abb.scadenza) + '</span>');
      abbHtml += '<p>' + tag + '</p>';
    } else {
      abbHtml += '<p class="tag tag--muted">Nessuna scadenza impostata</p>';
    }
    document.getElementById('c-abbonamento').innerHTML = abbHtml || '<p>Nessuna informazione disponibile.</p>';

    var video = c.videoEsercizi || [];
    document.getElementById('video-box').innerHTML = video.length
      ? '<div class="card"><h2>Video esercizi</h2>' + video.map(function (v) {
          return '<div class="card card--tight" style="margin-bottom:10px"><h3>' + esc(v.titolo || 'Esercizio') + '</h3>' +
            (v.video ? '<p><a href="' + esc(v.video) + '" target="_blank" rel="noopener noreferrer">Guarda il video →</a></p>' : '') + '</div>';
        }).join('') + '</div>'
      : '';

    var prog = c.programma || {};
    document.getElementById('c-prog-titolo').textContent = prog.titolo || 'Scheda di allenamento';
    document.getElementById('c-prog-agg').textContent = prog.aggiornata ? 'Inizio scheda: ' + prog.aggiornata : '';
    var giorniHtml = (prog.giorni || []).map(function (g) {
      var righe = (g.esercizi || []).map(function (es) {
        return '<tr><td>' + esc(es.nome) + '</td><td>' + esc(es.serieRip) + '</td><td>' + esc(es.recupero) + '</td><td>' + esc(es.note) + '</td></tr>';
      }).join('');
      var tabella = righe
        ? '<table><thead><tr><th>Esercizio</th><th>Serie e ripetizioni</th><th>Recupero</th><th>Note</th></tr></thead><tbody>' + righe + '</tbody></table>'
        : (g.contenuto ? '<p style="white-space:pre-line">' + esc(g.contenuto) + '</p>' : '<p style="font-size:.85rem">Nessun esercizio inserito.</p>');
      return '<div class="card card--tight" style="margin-bottom:10px"><h3>' + esc(g.nome || 'Giorno') + '</h3>' + tabella + '</div>';
    }).join('');
    document.getElementById('c-giorni').innerHTML = giorniHtml || '<p>La tua scheda non è ancora stata caricata: parlane con Damiano.</p>';
    document.getElementById('c-prog-note').textContent = prog.note || '';

    var alim = c.alimentazione || {};
    var macroBits = [];
    if (alim.inizio) macroBits.push('Inizio alimentazione: ' + esc(alim.inizio));
    if (alim.calorie || alim.carboidrati || alim.proteine || alim.grassi) {
      macroBits.push('Calorie: ' + esc(alim.calorie || '-') + ' · Carboidrati: ' + esc(alim.carboidrati || '-') +
        ' · Proteine: ' + esc(alim.proteine || '-') + ' · Grassi: ' + esc(alim.grassi || '-'));
    }
    document.getElementById('c-alim-macro').innerHTML = macroBits.map(function (t) { return '<p>' + t + '</p>'; }).join('');
    var pasti = alim.pasti || [];
    document.getElementById('c-alim-pasti').innerHTML = pasti.length
      ? pasti.map(function (p) {
          return '<div class="card card--tight" style="margin-bottom:10px"><h3>' + esc(p.tipo) + '</h3><p style="white-space:pre-line">' + esc(p.contenuto) + '</p></div>';
        }).join('')
      : '<p style="font-size:.85rem">Nessuna indicazione alimentare caricata ancora.</p>';
    document.getElementById('c-alim-note').textContent = alim.note || '';

    var foto = c.foto || [];
    document.getElementById('c-foto').innerHTML = foto.length
      ? foto.map(function (f) {
          return '<div><img src="' + f.src + '" alt="Foto del ' + esc(f.data || '') + '">' +
            '<div style="font-size:.76rem;margin-top:4px">' + esc(f.data || '') + '</div></div>';
        }).join('')
      : '<p style="font-size:.85rem">Nessuna foto caricata ancora.</p>';
  }
})();
