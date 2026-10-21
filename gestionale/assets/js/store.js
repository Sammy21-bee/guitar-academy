/* ==========================================================================
   Gestionale Damiano Tropea PT — livello dati condiviso
   Demo pubblica: i dati rimangono nel localStorage di questo browser.
   ========================================================================== */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'dt_gestionale_demo_clienti_v1';

  /* Due livelli di accesso al pannello (la password del cliente è un'altra cosa,
     gestito per singolo cliente in area-cliente.html):
       - titolare: Damiano, può gestire tutti i dati dei clienti
       - admin: potere assoluto, in più gestisce le password e le operazioni
         delicate (import che sovrascrive tutto, eliminazione definitiva) */
  var PWD_KEYS = {
    titolare: 'dt_gestionale_demo_titolare_pwd_v1',
    admin: 'dt_gestionale_demo_admin_pwd_v1'
  };

  /* Password predefinite di primo accesso.
     IMPORTANTE: non hardcoddarle qui nel codice del repo, verrebbero esposte.
       La configurazione caricata qui contiene credenziali pubbliche, valide
       solo per questa demo senza dati reali. */
  var DEFAULT_PASSWORDS = (global.__DEFAULT_PASSWORDS || {});

  function uid() {
    return 'c-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  }

  function loadClienti() {
    try {
      var raw = global.localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* localStorage non disponibile o dati corrotti */ }
    return (global.CLIENTI_DATA || []).slice();
  }

  function saveClienti(list) {
    global.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  function nuovoCliente() {
    return {
      id: uid(),
      pin: generatePin(loadClienti()),
      attivo: true,
      nome: '',
      cognome: '',
      email: '',
      telefono: '',
      dataNascita: '',
      dataInizio: new Date().toISOString().slice(0, 10),
      obiettivo: '',
      noteMediche: '',
      programma: { titolo: '', aggiornata: '', note: '', giorni: [] },
      alimentazione: { inizio: '', calorie: '', carboidrati: '', proteine: '', grassi: '', pasti: [], note: '' },
      foto: [],
      abbonamento: { tipo: '', importo: '', scadenza: '', storicoPagamenti: [] },
      videoEsercizi: []
    };
  }

  function generatePin(existingList) {
    var pins = {};
    (existingList || []).forEach(function (c) { pins[c.pin] = true; });
    var pin;
    do {
      pin = String(Math.floor(1000 + Math.random() * 9000));
    } while (pins[pin]);
    return pin;
  }

  function pinIsUnique(pin, list, excludeId) {
    return !list.some(function (c) { return c.pin === pin && c.id !== excludeId; });
  }

  function exportAsBackup(list) {
    return JSON.stringify(list, null, 2);
  }

  function randomPwd() {
    return 'pwd-' + Math.random().toString(36).slice(2, 10);
  }

  /* Restituisce la password corrente. Se non impostata, la genera casualmente
     e la salva in localStorage: così il pannello resta utilizzabile su deploy
     senza esporre alcuna password nel codice. */
  function passwordFor(role) {
    var stored = global.localStorage.getItem(PWD_KEYS[role]);
    if (stored) return stored;
    var pwd = DEFAULT_PASSWORDS[role] || randomPwd();
    global.localStorage.setItem(PWD_KEYS[role], pwd);
    return pwd;
  }

  /* Prova la password su entrambi i ruoli e restituisce quello che
     corrisponde ('admin' ha la precedenza se, per assurdo, coincidessero). */
  function loginWithPassword(value) {
    if (value === passwordFor('admin')) return 'admin';
    if (value === passwordFor('titolare')) return 'titolare';
    return null;
  }

  function setPassword(role, value) {
    global.localStorage.setItem(PWD_KEYS[role], value);
  }

  /* Utilità di recupero: chiamabile dalla console. Imposta nuove password
     casuali e le stampa, permettendo di riaccedere. */
  function resetPasswords() {
    var tp = randomPwd(), ap = randomPwd();
    global.localStorage.setItem(PWD_KEYS.titolare, tp);
    global.localStorage.setItem(PWD_KEYS.admin, ap);
    return { titolare: tp, admin: ap };
  }
  global.__resetPwd = function () { return resetPasswords(); };

  global.DTStore = {
    loadClienti: loadClienti,
    saveClienti: saveClienti,
    nuovoCliente: nuovoCliente,
    generatePin: generatePin,
    pinIsUnique: pinIsUnique,
    exportAsBackup: exportAsBackup,
    loginWithPassword: loginWithPassword,
    setPassword: setPassword,
    uid: uid
  };
})(window);
