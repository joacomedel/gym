/* Gym — arranque, tabs, estado y ajustes. El acceso lo maneja bt-core.js. */
(function () {
  "use strict";

  var state = { ejercicios: [], rutinas: [], series: [], tab: "entrenar", cfg: null };

  function $(id) { return document.getElementById(id); }

  function loadCfg() {
    var d = { descanso: 90, sonido: true, vibracion: true, noti: false };
    try {
      var s = JSON.parse(localStorage.getItem("gym.cfg") || "null");
      if (s) {
        if (isFinite(s.descanso) && s.descanso > 0) d.descanso = Math.min(3600, Math.round(s.descanso));
        d.sonido = !!s.sonido;
        d.vibracion = !!s.vibracion;
        d.noti = !!s.noti;
      }
    } catch (e) {}
    return d;
  }

  function saveCfg() {
    try { localStorage.setItem("gym.cfg", JSON.stringify(state.cfg)); } catch (e) {}
  }

  document.addEventListener("DOMContentLoaded", function () {
    state.cfg = loadCfg();
    document.querySelectorAll("#tabs button").forEach(function (b) {
      b.addEventListener("click", function () {
        state.tab = b.getAttribute("data-tab");
        document.querySelectorAll("#tabs button").forEach(function (x) {
          x.classList.toggle("is-active", x === b);
        });
        rerender();
      });
    });
    $("logoutBtn").addEventListener("click", function () {
      $("appRoot").hidden = true;
      bt.logout();
    });
    window.ViewTrain.wireGlobal();
    bt.init({
      brand: "Gym",
      onReady: function () { $("appRoot").hidden = false; refresh(); },
      onLocked: function () { $("appRoot").hidden = true; },
    });
  });

  function ctx() {
    return {
      ejercicios: state.ejercicios, rutinas: state.rutinas, series: state.series,
      cfg: state.cfg, saveCfg: saveCfg, refresh: refresh, rerender: rerender,
    };
  }

  function refresh() {
    return Promise.all([
      bt.query("ejercicios", { limite: 1000 }),
      bt.query("rutinas", { limite: 1000 }),
      bt.query("series", { limite: 2000 }),
    ]).then(function (rs) {
      var ok = rs.every(function (r) { return r && r.ok; });
      if (!ok) {
        var err = rs.filter(function (r) { return !r || !r.ok; }).map(function (r) { return (r && r.error) || "error"; }).join("; ");
        throw new Error(err);
      }
      state.ejercicios = rs[0].filas || [];
      state.rutinas = rs[1].filas || [];
      state.series = rs[2].filas || [];
      var d = new Date();
      $("updated").textContent = "Actualizado " + d.toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
      rerender();
      return true;
    }).catch(function (e) {
      console.error(e);
      return false;
    });
  }

  function rerender() {
    var c = ctx();
    $("view-entrenar").hidden = state.tab !== "entrenar";
    $("view-config").hidden = state.tab !== "config";
    $("view-evol").hidden = state.tab !== "evol";
    if (state.tab === "entrenar") window.ViewTrain.render($("view-entrenar"), c);
    else if (state.tab === "config") window.ViewConfig.render($("view-config"), c);
    else window.ViewEvol.render($("view-evol"), c);
  }
})();
