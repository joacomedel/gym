/* Gym — utilidades de UI (DOM + avisos). Sin lógica de negocio. */
(function () {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function fmtMMSS(sec) {
    sec = Math.max(0, Math.round(sec || 0));
    var m = Math.floor(sec / 60), s = sec % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  function status(el, msg, kind) {
    if (!el) return;
    el.textContent = msg || "";
    el.classList.toggle("is-error", kind === "error");
    el.classList.toggle("is-ok", kind === "ok");
  }

  /* Bip corto con WebAudio (sin assets). Debe llamarse tras un gesto del usuario
   * al menos una vez para desbloquear el audio en el celu. */
  var audioCtx = null;
  function beep(times) {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!audioCtx) audioCtx = new AC();
      if (audioCtx.state === "suspended") audioCtx.resume();
      var t0 = audioCtx.currentTime;
      for (var i = 0; i < (times || 3); i++) {
        var o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.connect(g); g.connect(audioCtx.destination);
        o.frequency.value = 880;
        var t = t0 + i * 0.35;
        g.gain.setValueAtTime(0.001, t);
        g.gain.exponentialRampToValueAtTime(0.5, t + 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        o.start(t); o.stop(t + 0.32);
      }
    } catch (e) { /* sin audio no se rompe nada */ }
  }

  function vibrar(patron) {
    try {
      if (navigator.vibrate) navigator.vibrate(patron || [200, 100, 200]);
    } catch (e) {}
  }

  function notificar(titulo, cuerpo) {
    try {
      if (!("Notification" in window) || Notification.permission !== "granted") return false;
      new Notification(titulo, { body: cuerpo || "", tag: "gym-timer" });
      return true;
    } catch (e) { return false; }
  }

  function pedirPermisoNoti() {
    try {
      if (!("Notification" in window)) return Promise.resolve("unsupported");
      if (Notification.permission === "granted" || Notification.permission === "denied") {
        return Promise.resolve(Notification.permission);
      }
      return Notification.requestPermission();
    } catch (e) { return Promise.resolve("error"); }
  }

  /* Rutinas visibles en Entrenar (se tildan en Configurar). Default: todas. */
  function loadRutVis() {
    try { return JSON.parse(localStorage.getItem("gym.rutVis") || "null") || {}; }
    catch (e) { return {}; }
  }
  function rutVisible(nombre) {
    var v = loadRutVis();
    if (!(nombre in v)) return true;
    return !!v[nombre];
  }
  function setRutVisible(nombre, on) {
    var v = loadRutVis();
    v[nombre] = !!on;
    try { localStorage.setItem("gym.rutVis", JSON.stringify(v)); } catch (e) {}
  }

  window.GymUI = {
    esc: esc, fmtMMSS: fmtMMSS, status: status,
    beep: beep, vibrar: vibrar, notificar: notificar, pedirPermisoNoti: pedirPermisoNoti,
    rutVisible: rutVisible, setRutVisible: setRutVisible,
  };
})();
