/* ==========================================================================
   Pannello Admin — logica
   ========================================================================== */
(function () {
  'use strict';

  var clienti = [];
  var currentId = null;
  var role = null; // 'titolare' | 'admin'

  var loginScreen = document.getElementById('login-screen');
  var dashboardScreen = document.getElementById('dashboard-screen');
  var editorScreen = document.getElementById('editor-screen');

  /* ------------------------- LOGIN ------------------------- */
  document.getElementById('login-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var pwd = document.getElementById('login-password').value;
    var matched = window.DTStore.loginWithPassword(pwd);
    if (matched) {
      role = matched;
      sessionStorage.setItem('dt_admin_role', role);
      showDashboard();
    } else {
      document.getElementById('login-msg').innerHTML = '<div class="msg msg--error">Password non corretta.</div>';
    }
  });

  document.getElementById('btn-logout').addEventListener('click', function () {
    sessionStorage.removeItem('dt_admin_role');
    location.reload();
  });

  var savedRole = sessionStorage.getItem('dt_admin_role');
  if (savedRole === 'admin' || savedRole === 'titolare') {
    role = savedRole;
    showDashboard();
  }

  function applyRoleUI() {
    var badge = document.getElementById('role-badge');
    badge.textContent = role === 'admin' ? 'Accesso: Admin' : 'Accesso: Titolare (Damiano)';
    badge.className = 'tag ' + (role === 'admin' ? 'tag--danger' : 'tag--ok');
    Array.prototype.forEach.call(document.querySelectorAll('[data-admin-only]'), function (el) {
      el.hidden = role !== 'admin';
    });
  }

  function showDashboard() {
    loginScreen.hidden = true;
    editorScreen.hidden = true;
    dashboardScreen.hidden = false;
    applyRoleUI();
    clienti = window.DTStore.loadClienti();
    renderList();
  }

  /* ------------------------- IMPOSTAZIONI ------------------------- */
  document.getElementById('btn-impostazioni').addEventListener('click', function () {
    var panel = document.getElementById('settings-panel');
    panel.hidden = !panel.hidden;
  });

  document.getElementById('btn-save-password-titolare').addEventListener('click', function () {
    var val = document.getElementById('new-password-titolare').value.trim();
    if (!val) return;
    window.DTStore.setPassword('titolare', val);
    document.getElementById('new-password-titolare').value = '';
    flashMsg('import-export-msg', 'Password del titolare aggiornata.', 'ok');
  });

  document.getElementById('btn-save-password-admin').addEventListener('click', function () {
    if (role !== 'admin') return;
    var val = document.getElementById('new-password-admin').value.trim();
    if (!val) return;
    window.DTStore.setPassword('admin', val);
    document.getElementById('new-password-admin').value = '';
    flashMsg('import-export-msg', 'Password admin aggiornata.', 'ok');
  });

  /* ------------------------- LISTA CLIENTI ------------------------- */
  function giorniAScadenza(scadenza) {
    if (!scadenza) return null;
    var diff = (new Date(scadenza) - new Date());
    return Math.ceil(diff / 86400000);
  }

  function renderList() {
    var filter = (document.getElementById('search-clienti').value || '').toLowerCase();
    var container = document.getElementById('clienti-list');
    var filtered = clienti.filter(function (c) {
      return (c.nome + ' ' + c.cognome).toLowerCase().indexOf(filter) !== -1;
    });

    if (!filtered.length) {
      container.innerHTML = '<div class="empty-state"><p>Nessun cliente trovato. Usa "+ Nuovo cliente" per iniziare.</p></div>';
      return;
    }

    container.innerHTML = filtered.map(function (c) {
      var giorni = giorniAScadenza(c.abbonamento && c.abbonamento.scadenza);
      var tag = '<span class="tag tag--muted">Scadenza non impostata</span>';
      if (giorni !== null) {
        if (giorni < 0) tag = '<span class="tag tag--danger">Scaduto da ' + Math.abs(giorni) + ' giorni</span>';
        else if (giorni <= 7) tag = '<span class="tag tag--warn">Scade tra ' + giorni + ' giorni</span>';
        else tag = '<span class="tag tag--ok">Attivo (scade ' + c.abbonamento.scadenza + ')</span>';
      }
      var statoTag = c.attivo === false ? '<span class="tag tag--muted">Non attivo</span>' : '';
      return '<div class="list-row">' +
        '<div><strong>' + esc(c.nome) + ' ' + esc(c.cognome) + '</strong> &nbsp; Password: <code>' + esc(c.pin) + '</code>' +
        '<div style="margin-top:6px">' + tag + ' ' + statoTag + '</div></div>' +
        '<div class="btn-row">' +
        '<button class="btn btn--ghost btn--sm" data-edit="' + c.id + '">Apri scheda</button>' +
        '</div></div>';
    }).join('');

    Array.prototype.forEach.call(container.querySelectorAll('[data-edit]'), function (btn) {
      btn.addEventListener('click', function () { openEditor(btn.getAttribute('data-edit')); });
    });
  }

  document.getElementById('search-clienti').addEventListener('input', renderList);

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  /* ------------------------- EXPORT / IMPORT ------------------------- */
  document.getElementById('btn-export').addEventListener('click', function () {
    var content = window.DTStore.exportAsBackup(clienti);
    var blob = new Blob([content], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'clienti-backup.json';
    a.click();
    flashMsg('import-export-msg', 'Backup scaricato. Conservalo in un luogo privato e non pubblicarlo.', 'ok');
  });

  document.getElementById('btn-import-trigger').addEventListener('click', function () {
    document.getElementById('btn-import').click();
  });

  document.getElementById('btn-import').addEventListener('change', function (e) {
    if (role !== 'admin') { flashMsg('import-export-msg', 'Solo l\'admin può importare dati (sovrascrive tutto).', 'error'); e.target.value = ''; return; }
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var text = reader.result;
        var data;
        if (file.name.endsWith('.js')) {
          var match = text.match(/window\.CLIENTI_DATA\s*=\s*(\[[\s\S]*\]);?/);
          if (!match) throw new Error('Formato .js non riconosciuto');
          data = JSON.parse(match[1]);
        } else {
          data = JSON.parse(text);
        }
        if (!Array.isArray(data)) throw new Error('Il file non contiene un elenco clienti valido');
        clienti = data;
        window.DTStore.saveClienti(clienti);
        renderList();
        flashMsg('import-export-msg', 'Dati importati correttamente (' + clienti.length + ' clienti).', 'ok');
      } catch (err) {
        flashMsg('import-export-msg', 'Errore nell\'importazione: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  function flashMsg(containerId, text, type) {
    document.getElementById(containerId).innerHTML =
      '<div class="msg msg--' + (type === 'ok' ? 'ok' : 'error') + '">' + esc(text) + '</div>';
  }

  /* ------------------------- NUOVO CLIENTE ------------------------- */
  document.getElementById('btn-nuovo-cliente').addEventListener('click', function () {
    var c = window.DTStore.nuovoCliente();
    clienti.push(c);
    window.DTStore.saveClienti(clienti);
    openEditor(c.id);
  });

  /* ------------------------- TABS ------------------------- */
  Array.prototype.forEach.call(document.querySelectorAll('.tab-btn'), function (btn) {
    btn.addEventListener('click', function () {
      Array.prototype.forEach.call(document.querySelectorAll('.tab-btn'), function (b) { b.classList.remove('is-active'); });
      Array.prototype.forEach.call(document.querySelectorAll('.tab-panel'), function (p) { p.classList.remove('is-active'); });
      btn.classList.add('is-active');
      document.querySelector('[data-panel="' + btn.getAttribute('data-tab') + '"]').classList.add('is-active');
    });
  });

  /* ------------------------- EDITOR ------------------------- */
  function findCliente(id) { return clienti.find(function (c) { return c.id === id; }); }

  function openEditor(id) {
    currentId = id;
    var c = findCliente(id);
    if (!c) return;

    dashboardScreen.hidden = true;
    editorScreen.hidden = false;
    applyRoleUI();
    document.getElementById('editor-title').textContent = (c.nome || c.cognome) ? (c.nome + ' ' + c.cognome) : 'Nuovo cliente';

    document.getElementById('f-pin').value = c.pin;
    document.getElementById('f-nome').value = c.nome || '';
    document.getElementById('f-cognome').value = c.cognome || '';
    document.getElementById('f-attivo').value = String(c.attivo !== false);
    document.getElementById('f-telefono').value = c.telefono || '';
    document.getElementById('f-email').value = c.email || '';
    document.getElementById('f-nascita').value = c.dataNascita || '';
    document.getElementById('f-inizio').value = c.dataInizio || '';
    document.getElementById('f-obiettivo').value = c.obiettivo || '';
    document.getElementById('f-note-mediche').value = c.noteMediche || '';

    c.programma = c.programma || { titolo: '', aggiornata: '', note: '', giorni: [] };
    document.getElementById('f-prog-titolo').value = c.programma.titolo || '';
    document.getElementById('f-prog-agg').value = c.programma.aggiornata || '';
    document.getElementById('f-prog-note').value = c.programma.note || '';
    renderGiorni(c);

    c.alimentazione = c.alimentazione || { inizio: '', calorie: '', carboidrati: '', proteine: '', grassi: '', pasti: [], note: '' };
    document.getElementById('f-alim-inizio').value = c.alimentazione.inizio || '';
    document.getElementById('f-alim-calorie').value = c.alimentazione.calorie || '';
    document.getElementById('f-alim-carbo').value = c.alimentazione.carboidrati || '';
    document.getElementById('f-alim-proteine').value = c.alimentazione.proteine || '';
    document.getElementById('f-alim-grassi').value = c.alimentazione.grassi || '';
    document.getElementById('f-alim-note').value = c.alimentazione.note || '';
    renderPasti(c);

    renderFoto(c);
    renderPagamenti(c);
    renderVideo(c);

    document.querySelector('.tab-btn[data-tab="anagrafica"]').click();
    window.scrollTo(0, 0);
  }

  document.getElementById('btn-torna-lista').addEventListener('click', function () {
    editorScreen.hidden = true;
    dashboardScreen.hidden = false;
    renderList();
  });

  document.getElementById('btn-nuovo-pin').addEventListener('click', function () {
    var pin = window.DTStore.generatePin(clienti.filter(function (c) { return c.id !== currentId; }));
    document.getElementById('f-pin').value = pin;
  });

  document.getElementById('f-pin').addEventListener('input', function () {
    var val = document.getElementById('f-pin').value;
    var ok = /^\d{4}$/.test(val) && window.DTStore.pinIsUnique(val, clienti, currentId);
    document.getElementById('pin-msg').textContent = ok ? '' : 'La password deve avere 4 cifre ed essere univoca.';
  });

  /* --- giorni scheda allenamento --- */
  function migraGiorno(g) {
    if (!g.esercizi) {
      g.esercizi = (g.contenuto || '').split('\n').filter(function (r) { return r.trim(); })
        .map(function (riga) { return { nome: riga.trim(), serieRip: '', recupero: '' }; });
      delete g.contenuto;
    }
    return g;
  }

  function renderGiorni(c) {
    var list = document.getElementById('giorni-list');
    (c.programma.giorni || []).forEach(migraGiorno);

    list.innerHTML = (c.programma.giorni || []).map(function (g, gi) {
      var esercizi = (g.esercizi || []).map(function (es, ei) {
        return '<div class="grid-3 es-row" style="margin-bottom:10px">' +
          '<div class="field"><label>Esercizio</label><input data-es="nome|' + gi + '|' + ei + '" value="' + esc(es.nome) + '" placeholder="Es. Panca piana"></div>' +
          '<div class="field"><label>Serie e ripetizioni</label><input data-es="serieRip|' + gi + '|' + ei + '" value="' + esc(es.serieRip) + '" placeholder="Es. 4x8"></div>' +
          '<div class="field"><label>Recupero</label><input data-es="recupero|' + gi + '|' + ei + '" value="' + esc(es.recupero) + '" placeholder="Es. 90 sec"></div>' +
          '<div class="field" style="grid-column:1/-1"><label>Note</label><input data-es="note|' + gi + '|' + ei + '" value="' + esc(es.note) + '" placeholder="Es. tecnica, esecuzione, avvertenze..."></div>' +
          '<button class="btn btn--danger btn--sm" data-es-del="' + gi + '|' + ei + '" style="grid-column:1/-1;justify-self:start">Rimuovi esercizio</button>' +
          '</div>';
      }).join('') || '<p style="font-size:.85rem">Nessun esercizio aggiunto.</p>';

      return '<div class="card card--tight" style="margin-bottom:10px">' +
        '<div class="field"><label>Split allenamento</label><input data-giorno-nome="' + gi + '" value="' + esc(g.nome) + '" placeholder="Es. Giorno A — Push"></div>' +
        '<div data-es-list="' + gi + '">' + esercizi + '</div>' +
        '<button class="btn btn--ghost btn--sm" data-add-es="' + gi + '">+ Aggiungi esercizio</button>' +
        '<button class="btn btn--danger btn--sm" data-giorno-del="' + gi + '" style="margin-left:10px">Rimuovi giorno</button>' +
        '</div>';
    }).join('') || '<p>Nessun giorno impostato.</p>';

    Array.prototype.forEach.call(list.querySelectorAll('[data-giorno-del]'), function (btn) {
      btn.addEventListener('click', function () {
        c.programma.giorni.splice(Number(btn.getAttribute('data-giorno-del')), 1);
        renderGiorni(c);
      });
    });
    Array.prototype.forEach.call(list.querySelectorAll('[data-add-es]'), function (btn) {
      btn.addEventListener('click', function () {
        var gi = Number(btn.getAttribute('data-add-es'));
        c.programma.giorni[gi].esercizi.push({ nome: '', serieRip: '', recupero: '', note: '' });
        renderGiorni(c);
      });
    });
    Array.prototype.forEach.call(list.querySelectorAll('[data-es-del]'), function (btn) {
      btn.addEventListener('click', function () {
        var parts = btn.getAttribute('data-es-del').split('|');
        c.programma.giorni[Number(parts[0])].esercizi.splice(Number(parts[1]), 1);
        renderGiorni(c);
      });
    });
    Array.prototype.forEach.call(list.querySelectorAll('[data-es]'), function (input) {
      input.addEventListener('change', function () {
        var parts = input.getAttribute('data-es').split('|');
        c.programma.giorni[Number(parts[1])].esercizi[Number(parts[2])][parts[0]] = input.value;
      });
    });
  }

  document.getElementById('btn-add-giorno').addEventListener('click', function () {
    var c = findCliente(currentId);
    c.programma.giorni = c.programma.giorni || [];
    c.programma.giorni.push({ nome: '', esercizi: [] });
    renderGiorni(c);
  });

  /* --- foto e progressi --- */
  function renderFoto(c) {
    c.foto = c.foto || [];
    var grid = document.getElementById('foto-grid');
    grid.innerHTML = c.foto.map(function (f, i) {
      return '<div><img src="' + f.src + '" alt="Foto del ' + esc(f.data || '') + '">' +
        '<div class="field" style="margin-top:6px"><label>Data</label><input type="date" data-foto-data="' + i + '" value="' + esc(f.data || '') + '"></div>' +
        '<label style="margin-top:4px">Sostituisci immagine</label><input type="file" accept="image/*" data-foto-sostituisci="' + i + '">' +
        '<button class="btn btn--danger btn--sm" data-foto-del="' + i + '" style="margin-top:4px">Rimuovi</button></div>';
    }).join('');

    Array.prototype.forEach.call(grid.querySelectorAll('[data-foto-del]'), function (btn) {
      btn.addEventListener('click', function () {
        c.foto.splice(Number(btn.getAttribute('data-foto-del')), 1);
        renderFoto(c);
      });
    });
    Array.prototype.forEach.call(grid.querySelectorAll('[data-foto-data]'), function (input) {
      input.addEventListener('change', function () {
        c.foto[Number(input.getAttribute('data-foto-data'))].data = input.value;
      });
    });
    Array.prototype.forEach.call(grid.querySelectorAll('[data-foto-sostituisci]'), function (input) {
      input.addEventListener('change', function () {
        var idx = Number(input.getAttribute('data-foto-sostituisci'));
        var file = input.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function () {
          c.foto[idx].src = reader.result;
          renderFoto(c);
        };
        reader.readAsDataURL(file);
      });
    });
  }

  document.getElementById('btn-add-foto').addEventListener('click', function () {
    var c = findCliente(currentId);
    var fileInput = document.getElementById('f-foto-file');
    var file = fileInput.files[0];
    if (!file) { flashMsg('import-export-msg', 'Seleziona un\'immagine da caricare.', 'error'); return; }
    var reader = new FileReader();
    reader.onload = function () {
      c.foto.push({
        data: document.getElementById('f-foto-data').value,
        src: reader.result
      });
      fileInput.value = '';
      renderFoto(c);
    };
    reader.readAsDataURL(file);
  });

  /* --- pagamenti --- */
  function renderPagamenti(c) {
    c.abbonamento = c.abbonamento || { tipo: '', importo: '', scadenza: '', storicoPagamenti: [] };
    document.getElementById('f-abb-tipo').value = c.abbonamento.tipo || '';
    document.getElementById('f-abb-importo').value = c.abbonamento.importo || '';
    document.getElementById('f-abb-scadenza').value = c.abbonamento.scadenza || '';

    c.abbonamento.storicoPagamenti = c.abbonamento.storicoPagamenti || [];
    var tbody = document.querySelector('#pagamenti-table tbody');
    tbody.innerHTML = c.abbonamento.storicoPagamenti.map(function (p, i) {
      return '<tr>' +
        '<td><input type="date" data-pag="data|' + i + '" value="' + esc(p.data || '') + '"></td>' +
        '<td><input type="number" step="0.01" data-pag="importo|' + i + '" value="' + esc(p.importo || '') + '"></td>' +
        '<td><input data-pag="metodo|' + i + '" value="' + esc(p.metodo || '') + '"></td>' +
        '<td><input data-pag="note|' + i + '" value="' + esc(p.note || '') + '"></td>' +
        '<td><button class="btn btn--danger btn--sm" data-pag-del="' + i + '">✕</button></td></tr>';
    }).join('') || '<tr><td colspan="5">Nessun pagamento registrato.</td></tr>';

    Array.prototype.forEach.call(tbody.querySelectorAll('[data-pag]'), function (input) {
      input.addEventListener('change', function () {
        var parts = input.getAttribute('data-pag').split('|');
        c.abbonamento.storicoPagamenti[Number(parts[1])][parts[0]] = input.value;
      });
    });
    Array.prototype.forEach.call(tbody.querySelectorAll('[data-pag-del]'), function (btn) {
      btn.addEventListener('click', function () {
        c.abbonamento.storicoPagamenti.splice(Number(btn.getAttribute('data-pag-del')), 1);
        renderPagamenti(c);
      });
    });
  }

  document.getElementById('btn-add-pagamento').addEventListener('click', function () {
    var c = findCliente(currentId);
    c.abbonamento.storicoPagamenti.push({ data: new Date().toISOString().slice(0, 10), importo: '', metodo: '', note: '' });
    renderPagamenti(c);
  });

  /* --- video esercizi --- */
  function renderVideo(c) {
    c.videoEsercizi = c.videoEsercizi || [];
    var list = document.getElementById('video-list');
    list.innerHTML = c.videoEsercizi.map(function (v, i) {
      return '<div class="card card--tight" style="margin-bottom:10px">' +
        '<div class="field"><label>Titolo esercizio</label><input data-video="titolo|' + i + '" value="' + esc(v.titolo) + '" placeholder="Es. Squat bilanciere"></div>' +
        '<div class="field"><label>Video (link YouTube, Drive, ecc.)</label><input data-video="video|' + i + '" value="' + esc(v.video) + '" placeholder="https://..."></div>' +
        '<button class="btn btn--danger btn--sm" data-video-del="' + i + '">Rimuovi esercizio</button>' +
        '</div>';
    }).join('') || '<p>Nessun video aggiunto.</p>';

    Array.prototype.forEach.call(list.querySelectorAll('[data-video]'), function (input) {
      input.addEventListener('change', function () {
        var parts = input.getAttribute('data-video').split('|');
        c.videoEsercizi[Number(parts[1])][parts[0]] = input.value;
      });
    });
    Array.prototype.forEach.call(list.querySelectorAll('[data-video-del]'), function (btn) {
      btn.addEventListener('click', function () {
        c.videoEsercizi.splice(Number(btn.getAttribute('data-video-del')), 1);
        renderVideo(c);
      });
    });
  }

  document.getElementById('btn-add-video').addEventListener('click', function () {
    var c = findCliente(currentId);
    c.videoEsercizi.push({ titolo: '', video: '' });
    renderVideo(c);
  });

  /* --- alimentazione: pasti --- */
  var TIPI_PASTO = ['Colazione', 'Spuntino', 'Pranzo', 'Spuntino 2', 'Cena', 'Pre nanna'];

  function renderPasti(c) {
    c.alimentazione.pasti = c.alimentazione.pasti || [];
    var list = document.getElementById('pasti-list');
    list.innerHTML = c.alimentazione.pasti.map(function (p, i) {
      var opzioni = TIPI_PASTO.map(function (t) {
        return '<option value="' + t + '"' + (p.tipo === t ? ' selected' : '') + '>' + t + '</option>';
      }).join('');
      return '<div class="card card--tight" style="margin-bottom:10px">' +
        '<div class="field"><label>Tipo di pasto</label><select data-pasto="tipo|' + i + '">' + opzioni + '</select></div>' +
        '<div class="field"><label>Indicazioni</label><textarea data-pasto="contenuto|' + i + '" placeholder="Es. alimenti, quantità, orario...">' + esc(p.contenuto) + '</textarea></div>' +
        '<button class="btn btn--danger btn--sm" data-pasto-del="' + i + '">Rimuovi pasto</button>' +
        '</div>';
    }).join('') || '<p>Nessun pasto aggiunto.</p>';

    Array.prototype.forEach.call(list.querySelectorAll('[data-pasto]'), function (field) {
      field.addEventListener('change', function () {
        var parts = field.getAttribute('data-pasto').split('|');
        c.alimentazione.pasti[Number(parts[1])][parts[0]] = field.value;
      });
    });
    Array.prototype.forEach.call(list.querySelectorAll('[data-pasto-del]'), function (btn) {
      btn.addEventListener('click', function () {
        c.alimentazione.pasti.splice(Number(btn.getAttribute('data-pasto-del')), 1);
        renderPasti(c);
      });
    });
  }

  document.getElementById('btn-add-pasto').addEventListener('click', function () {
    var c = findCliente(currentId);
    c.alimentazione.pasti.push({ tipo: 'Colazione', contenuto: '' });
    renderPasti(c);
  });

  /* --- esportazione PDF --- */
  function esportaPdf(titolo, html) {
    var w = window.open('', '_blank');
    if (!w) { flashMsg('import-export-msg', 'Abilita i popup per esportare in PDF.', 'error'); return; }
    w.document.write('<!doctype html><html lang="it"><head><meta charset="utf-8">' +
      '<title>' + esc(titolo) + '</title><style>' +
      'body{font-family:Arial,Helvetica,sans-serif;color:#111;padding:24px;}' +
      'h1{font-size:1.6rem;margin-bottom:4px}h2{font-size:1.2rem;margin:18px 0 6px}' +
      'table{width:100%;border-collapse:collapse;margin-bottom:12px}' +
      'th,td{border:1px solid #ccc;padding:6px 8px;text-align:left;font-size:.9rem}' +
      'p{white-space:pre-line}' +
      '</style></head><body>' + html + '</body></html>');
    w.document.close();
    w.focus();
    w.onload = function () { w.print(); };
    setTimeout(function () { w.print(); }, 300);
  }

  document.getElementById('btn-export-pdf-allenamento').addEventListener('click', function () {
    var c = findCliente(currentId);
    var titolo = c.programma.titolo || 'Scheda allenamento';
    var html = '<h1>' + esc(titolo) + '</h1>' +
      (c.programma.aggiornata ? '<p>Inizio scheda: ' + esc(c.programma.aggiornata) + '</p>' : '') +
      (c.programma.giorni || []).map(function (g) {
        var righe = (g.esercizi || []).map(function (es) {
          return '<tr><td>' + esc(es.nome) + '</td><td>' + esc(es.serieRip) + '</td><td>' + esc(es.recupero) + '</td><td>' + esc(es.note) + '</td></tr>';
        }).join('');
        return '<h2>' + esc(g.nome || 'Giorno') + '</h2>' +
          '<table><thead><tr><th>Esercizio</th><th>Serie e ripetizioni</th><th>Recupero</th><th>Note</th></tr></thead><tbody>' + righe + '</tbody></table>';
      }).join('') +
      (c.programma.note ? '<h2>Note e consigli</h2><p>' + esc(c.programma.note) + '</p>' : '');
    esportaPdf(titolo, html);
  });

  document.getElementById('btn-export-pdf-alimentazione').addEventListener('click', function () {
    var c = findCliente(currentId);
    var alim = c.alimentazione;
    var html = '<h1>Piano alimentare</h1>' +
      (alim.inizio ? '<p>Inizio alimentazione: ' + esc(alim.inizio) + '</p>' : '') +
      '<p>Calorie: ' + esc(alim.calorie) + ' · Carboidrati: ' + esc(alim.carboidrati) +
      ' · Proteine: ' + esc(alim.proteine) + ' · Grassi: ' + esc(alim.grassi) + '</p>' +
      (alim.pasti || []).map(function (p) {
        return '<h2>' + esc(p.tipo) + '</h2><p>' + esc(p.contenuto) + '</p>';
      }).join('') +
      (alim.note ? '<h2>Note generali su alimentazione</h2><p>' + esc(alim.note) + '</p>' : '');
    esportaPdf('Piano alimentare', html);
  });

  /* ------------------------- SALVA / ELIMINA ------------------------- */
  document.getElementById('btn-salva-cliente').addEventListener('click', function () {
    var c = findCliente(currentId);
    var pin = document.getElementById('f-pin').value;
    if (!/^\d{4}$/.test(pin) || !window.DTStore.pinIsUnique(pin, clienti, currentId)) {
      flashMsg('import-export-msg', 'Password non valida o già usata da un altro cliente: correggila prima di salvare.', 'error');
      return;
    }
    c.pin = pin;
    c.nome = document.getElementById('f-nome').value;
    c.cognome = document.getElementById('f-cognome').value;
    c.attivo = document.getElementById('f-attivo').value === 'true';
    c.telefono = document.getElementById('f-telefono').value;
    c.email = document.getElementById('f-email').value;
    c.dataNascita = document.getElementById('f-nascita').value;
    c.dataInizio = document.getElementById('f-inizio').value;
    c.obiettivo = document.getElementById('f-obiettivo').value;
    c.noteMediche = document.getElementById('f-note-mediche').value;

    c.programma.titolo = document.getElementById('f-prog-titolo').value;
    c.programma.aggiornata = document.getElementById('f-prog-agg').value;
    c.programma.note = document.getElementById('f-prog-note').value;
    Array.prototype.forEach.call(document.querySelectorAll('[data-giorno-nome]'), function (input) {
      c.programma.giorni[Number(input.getAttribute('data-giorno-nome'))].nome = input.value;
    });

    c.alimentazione.inizio = document.getElementById('f-alim-inizio').value;
    c.alimentazione.calorie = document.getElementById('f-alim-calorie').value;
    c.alimentazione.carboidrati = document.getElementById('f-alim-carbo').value;
    c.alimentazione.proteine = document.getElementById('f-alim-proteine').value;
    c.alimentazione.grassi = document.getElementById('f-alim-grassi').value;
    c.alimentazione.note = document.getElementById('f-alim-note').value;

    c.abbonamento.tipo = document.getElementById('f-abb-tipo').value;
    c.abbonamento.importo = document.getElementById('f-abb-importo').value;
    c.abbonamento.scadenza = document.getElementById('f-abb-scadenza').value;

    window.DTStore.saveClienti(clienti);
    editorScreen.hidden = true;
    dashboardScreen.hidden = false;
    renderList();
    flashMsg('import-export-msg', 'Dati salvati solo in questo browser. Scarica un backup privato per conservarli.', 'ok');
  });

  document.getElementById('btn-elimina-cliente').addEventListener('click', function () {
    if (role !== 'admin') { flashMsg('import-export-msg', 'Solo l\'admin può eliminare un cliente.', 'error'); return; }
    if (!confirm('Eliminare definitivamente questo cliente dalla bozza di lavoro?')) return;
    clienti = clienti.filter(function (c) { return c.id !== currentId; });
    window.DTStore.saveClienti(clienti);
    editorScreen.hidden = true;
    dashboardScreen.hidden = false;
    renderList();
  });
})();
