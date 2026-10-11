/* Gym — vista Evolución: elegís ejercicio y ves HISTORY/GRAPH (view).
 * Reutiliza ViewExercise; arriba van las 4 tarjetas resumen. */
(function () {
  "use strict";

  var L = function () { return window.GymLib; };
  var U = function () { return window.GymUI; };
  var ejSel = null;

  try { ejSel = localStorage.getItem("gym.ejEvol") || null; } catch (e) {}

  function render(el, ctx) {
    var nombres = [];
    var seen = {};
    ctx.ejercicios.forEach(function (e) {
      var n = e.nombre != null ? String(e.nombre) : "";
      if (n && !seen[n]) { seen[n] = true; nombres.push(n); }
    });
    nombres.sort(function (a, b) { return a.localeCompare(b, "es"); });
    if (!ejSel || nombres.indexOf(ejSel) === -1) ejSel = nombres[0] || null;

    if (!ejSel) {
      el.innerHTML = '<div class="card"><h2>Evolución</h2><p class="sub">Todavía no hay ejercicios. Cargalos en <strong>Configurar</strong>.</p></div>';
      return;
    }

    var rows = ctx.series.filter(function (s) { return String(s.ejercicio) === ejSel; });
    var res = L().resumenEjercicio(rows);

    el.innerHTML =
      '<div class="card"><div class="row"><label class="f">Ejercicio<select id="vEj">' +
      nombres.map(function (n) {
        return '<option value="' + U().esc(n) + '"' + (n === ejSel ? " selected" : "") + ">" + U().esc(n) + "</option>";
      }).join("") + "</select></label></div>" +
      '<div class="stats">' + stat("PR peso", res.prKg != null ? L().fmtKg(res.prKg) : "—", "kg") +
      stat("Mejor 1RM est.", res.mejor1RM != null ? L().fmtKg(res.mejor1RM) : "—", "kg") +
      stat("Tonelaje total", L().fmtKg(res.tonelajeTotal), "kg") +
      stat("Sesiones", String(res.sesiones), "") + "</div>" +
      '<p class="sub" style="margin:10px 0 0">1RM estimado (Epley): peso × (1 + reps/30). Referencia, no medición.</p></div>' +
      '<div id="vEx"></div>';

    el.querySelector("#vEj").addEventListener("change", function (ev) {
      ejSel = ev.target.value;
      try { localStorage.setItem("gym.ejEvol", ejSel); } catch (e) {}
      render(el, ctx);
    });

    window.ViewExercise.render(el.querySelector("#vEx"), {
      series: ctx.series, cfg: ctx.cfg,
      refresh: ctx.refresh, rerender: function () { render(el, ctx); },
      startTimer: function () {}, volver: function () {},
    }, { nombre: ejSel, modo: "view", sesion: null, item: null, atras: false });
  }

  function stat(label, value, u) {
    return '<div class="stat"><div class="stat-label">' + U().esc(label) + '</div><div class="stat-value">' +
      U().esc(value) + (u ? '<span class="u">' + U().esc(u) + "</span>" : "") + "</div></div>";
  }

  window.ViewEvol = { render: render };
})();
