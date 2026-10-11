/* Gym — vista Entrenar: home por día (estilo FitNotes) + pantalla de ejercicio.
 * Día = navegador ‹ HOY › + sesiones de ese día + empezar/copiar.
 * Tocar un ejercicio abre ViewExercise (full con sesión activa, view si no).
 */
(function () {
  "use strict";

  var L = function () { return window.GymLib; };
  var U = function () { return window.GymUI; };
  var diaSel = null;
  var ejSel = null;
  var cd = null;
  var tickH = null;
  var cfgRef = null;

  function isoHoy() {
    var d = new Date();
    return d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate());
  }
  function p2(n) { return (n < 10 ? "0" : "") + n; }
  function isoAdd(iso, n) {
    var p = iso.split("-");
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    d.setDate(d.getDate() + n);
    return d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate());
  }
  function isoToFecha(iso) {
    var p = String(iso || "").split("-");
    return p.length === 3 ? p[2] + "/" + p[1] + "/" + p[0] : "";
  }
  function labelDia(iso) {
    if (iso === isoHoy()) return "HOY";
    if (iso === isoAdd(isoHoy(), -1)) return "Ayer";
    return isoToFecha(iso);
  }

  function todayId() { return "dia-" + isoHoy(); }

  function visibles(ctx) {
    return nombresRutina(ctx.rutinas).filter(function (r) { return U().rutVisible(r); });
  }
  function itemsVisibles(ctx) {
    var vis = visibles(ctx);
    return ctx.rutinas.filter(function (r) { return vis.indexOf(String(r.rutina || "").trim()) !== -1; });
  }

  function nombresRutina(rutinas) {
    var seen = {}, out = [];
    (rutinas || []).forEach(function (r) {
      var n = r.rutina != null ? String(r.rutina).trim() : "";
      if (n && !seen[n]) { seen[n] = true; out.push(n); }
    });
    return out.sort(function (a, b) { return a.localeCompare(b, "es"); });
  }

  function render(el, ctx) {
    cfgRef = ctx.cfg;
    if (!diaSel) diaSel = isoHoy();
    if (ejSel) return renderEjercicio(el, ctx);
    renderDia(el, ctx);
  }

  function volver(ctx) { ejSel = null; ctx.rerender(); }

  /* ── Pantalla de ejercicio (sesión implícita = el día) ── */
  function renderEjercicio(el, ctx) {
    var hoy = diaSel === isoHoy();
    var items = hoy ? itemsVisibles(ctx) : [];
    var it = items.filter(function (x) { return String(x.ejercicio) === ejSel; })[0] || null;
    var ses = hoy ? { sesion: todayId(), rutina: it ? it.rutina : "" } : null;
    window.ViewExercise.render(el, {
      series: ctx.series, cfg: ctx.cfg,
      refresh: ctx.refresh, rerender: ctx.rerender,
      startTimer: startTimer, volver: function () { volver(ctx); },
    }, { nombre: ejSel, modo: it && hoy ? "full" : "view", sesion: ses, item: it, rutina: it ? it.rutina : "" });
  }

  /* ── Home del día ── */
  function renderDia(el, ctx) {
    var hoy = diaSel === isoHoy();
    var grupos = L().porSesion(ctx.series).filter(function (g) { return g.fecha === isoToFecha(diaSel); });

    var h = '<div class="card daynav"><button class="ghost" id="dPrev">‹</button>' +
      '<strong id="dLabel">' + U().esc(labelDia(diaSel)) + "</strong>" +
      '<button class="ghost" id="dNext">›</button>' +
      '<input type="date" id="dCal" value="' + diaSel + '" aria-label="Elegir día" /></div>';

    if (hoy) {
      var vis = visibles(ctx);
      var items = itemsVisibles(ctx);
      var seriesHoy = ctx.series.filter(function (s) { return String(s.sesion) === todayId(); });
      h += '<div class="card"><div class="block-head"><div><h2>Hoy</h2>' +
        '<p class="sub" style="margin:0">' + L().fmtKg(L().tonelaje(seriesHoy)) + ' kg movidos · tocá un ejercicio y anotá</p></div></div>' +
        (items.length ? L().agruparPorRutina(items, vis).map(function (gr) {
          var bloques = L().agruparRutina(gr.items);
          return '<div class="block rut-group"><div class="block-head"><strong>' + U().esc(gr.rutina) + "</strong></div>" +
            bloques.map(function (bl) {
              var inner = bl.items.map(function (it) {
                var nHoy = L().contarSeries(seriesHoy.filter(function (s) { return String(s.ejercicio) === String(it.ejercicio); }));
                var bd = (it.grupo ? '<span class="badge s">S' + U().esc(it.grupo) + "</span>" : "") +
                  (L().esDrop(it) ? '<span class="badge d">D</span>' : "");
                return '<div class="item"><button class="link ex-name" data-ej="' + U().esc(it.ejercicio) + '">' +
                  U().esc(it.ejercicio) + "</button>" +
                  "<span>" + bd + ' <span class="dash">' + nHoy + " series</span></span></div>";
              }).join("");
              if (bl.tipo === "super") {
                return '<div class="block super" style="margin-top:8px"><div class="block-head"><strong>Superserie ' +
                  U().esc(bl.letra) + "</strong></div>" + inner + "</div>";
              }
              return inner;
            }).join("") + "</div>";
        }).join("") : '<p class="sub">No hay rutinas visibles. Tildalas en <strong>Configurar</strong>.</p>') + "</div>";
    }

    if (grupos.length) {
      h += '<div class="card"><h2>' + (hoy ? "Registrado hoy" : "Ese día") + "</h2>" +
        grupos.slice().reverse().map(function (g) {
          var nombres = [];
          var seen = {};
          g.filas.forEach(function (r) {
            var n = String(r.ejercicio);
            if (!seen[n]) { seen[n] = true; nombres.push(n); }
          });
          return '<div class="block"><div class="block-head"><strong>' + U().esc(g.rutina || "Sin rutina") + "</strong>" +
            '<span class="meta">' + g.nSeries + " series · " + L().fmtKg(g.tonelaje) + " kg</span></div>" +
            nombres.map(function (n) {
              return '<div class="item"><button class="link ex-name" data-ej="' + U().esc(n) + '">' + U().esc(n) + "</button></div>";
            }).join("") + "</div>";
        }).join("") + "</div>";
    } else if (!hoy) {
      h += '<div class="card"><p class="sub">Sin registros ese día.</p></div>';
    }

    h += '<div class="card"><h2>Descanso y avisos</h2>' +
      '<div class="row"><label class="f">Descanso default (s)<input id="cDesc" inputmode="numeric" value="' + ctx.cfg.descanso + '" /></label></div>' +
      '<div class="row" style="margin-top:10px">' +
      '<label class="f"><span><input type="checkbox" id="cSnd"' + (ctx.cfg.sonido ? " checked" : "") + ' /> Sonido</span></label>' +
      '<label class="f"><span><input type="checkbox" id="cVib"' + (ctx.cfg.vibracion ? " checked" : "") + ' /> Vibración</span></label>' +
      '<label class="f"><span><input type="checkbox" id="cNot"' + (ctx.cfg.noti ? " checked" : "") + ' /> Notificación</span></label>' +
      '<button class="ghost" id="cNotPerm">Permitir notificaciones</button></div>' +
      '<p class="status" id="cStatus"></p></div>';

    el.innerHTML = h;

    el.querySelector("#dPrev").addEventListener("click", function () { diaSel = isoAdd(diaSel, -1); ejSel = null; ctx.rerender(); });
    el.querySelector("#dNext").addEventListener("click", function () {
      if (diaSel === isoHoy()) return;
      diaSel = isoAdd(diaSel, 1); ejSel = null; ctx.rerender();
    });
    el.querySelector("#dCal").addEventListener("change", function (ev) {
      if (ev.target.value) { diaSel = ev.target.value; ejSel = null; ctx.rerender(); }
    });

    el.querySelectorAll("[data-ej]").forEach(function (b) {
      b.addEventListener("click", function () { ejSel = b.getAttribute("data-ej"); ctx.rerender(); });
    });

    function saveCfg() {
      ctx.cfg.descanso = L().parseDescanso(el.querySelector("#cDesc").value, 90);
      ctx.cfg.sonido = el.querySelector("#cSnd").checked;
      ctx.cfg.vibracion = el.querySelector("#cVib").checked;
      ctx.cfg.noti = el.querySelector("#cNot").checked;
      ctx.saveCfg();
      U().status(el.querySelector("#cStatus"), "Ajustes guardados ✓", "ok");
    }
    ["#cDesc", "#cSnd", "#cVib", "#cNot"].forEach(function (s) {
      el.querySelector(s).addEventListener("change", saveCfg);
    });
    el.querySelector("#cNotPerm").addEventListener("click", function () {
      U().pedirPermisoNoti().then(function (p) {
        U().status(el.querySelector("#cStatus"), p === "granted" ? "Notificaciones activadas ✓" : "No se pudo activar (" + p + ").", p === "granted" ? "ok" : "error");
      });
    });
  }

  /* ── Timer (sin cambios) ── */
  function ensureCd() {
    if (!cd) {
      cd = new window.GymTimer.Countdown({
        onTick: paintTimer,
        onDone: function () {
          paintTimer();
          var c = cfgRef || { sonido: true, vibracion: true, noti: false };
          if (c.sonido) U().beep(3);
          if (c.vibracion) U().vibrar([250, 120, 250]);
          if (c.noti) U().notificar("Gym", "Terminó el descanso.");
        },
      });
    }
    return cd;
  }

  function paintTimer() {
    var bar = document.getElementById("timerbar");
    if (!bar || !cd || !cd.active()) { if (bar) bar.hidden = true; return; }
    bar.hidden = false;
    document.getElementById("timerTime").textContent = U().fmtMMSS(cd.remaining());
  }

  function startTimer(nombre, seg) {
    ensureCd().start(seg);
    document.getElementById("timerLabel").textContent = "Descanso · " + nombre + " (" + seg + "s)";
    paintTimer();
    if (tickH) clearInterval(tickH);
    tickH = setInterval(function () { if (cd) cd.poll(); }, 500);
  }

  function stopTimer() {
    if (cd) cd.stop();
    if (tickH) { clearInterval(tickH); tickH = null; }
    var bar = document.getElementById("timerbar");
    if (bar) bar.hidden = true;
  }

  function wireGlobal() {
    document.getElementById("timerSkip").addEventListener("click", stopTimer);
    document.getElementById("timerClose").addEventListener("click", stopTimer);
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden && cd && cd.active()) cd.poll();
    });
  }

  window.ViewTrain = { render: render, wireGlobal: wireGlobal, startTimer: startTimer, pollTimer: function () { if (cd && cd.active()) cd.poll(); } };
})();
