/* Gym — vista Entrenar: sesión del día, registro de series y timer. */
(function () {
  "use strict";

  var L = function () { return window.GymLib; };
  var U = function () { return window.GymUI; };
  var ejSel = null;
  var cd = null;         // Countdown (GymTimer)
  var tickH = null;
  var cfgRef = null;

  function sesionActiva() {
    try {
      var s = JSON.parse(localStorage.getItem("gym.sesion") || "null");
      return s && s.sesion ? s : null;
    } catch (e) { return null; }
  }
  function setSesion(s) {
    try {
      if (s) localStorage.setItem("gym.sesion", JSON.stringify(s));
      else localStorage.removeItem("gym.sesion");
    } catch (e) {}
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
    var ses = sesionActiva();
    if (!ses) return renderInicio(el, ctx);
    var items = ctx.rutinas.filter(function (r) { return String(r.rutina || "").trim() === ses.rutina; });
    if (!items.length) {
      setSesion(null);
      return renderInicio(el, ctx);
    }
    renderSesion(el, ctx, ses, items);
  }

  /* ── Sin sesión: elegir rutina y arrancar ── */
  function renderInicio(el, ctx) {
    var rutinas = nombresRutina(ctx.rutinas);
    el.innerHTML =
      '<div class="card"><h2>Hoy entreno…</h2>' +
      '<p class="sub">Elegí la rutina en el momento. La sesión queda abierta hasta que la termines.</p>' +
      (rutinas.length ? '<div class="row"><label class="f">Rutina<select id="tRut">' +
        rutinas.map(function (r) { return '<option value="' + U().esc(r) + '">' + U().esc(r) + "</option>"; }).join("") +
        '</select></label><button class="primary" id="tStart">Empezar</button></div>'
        : '<p class="sub">No hay rutinas todavía. Creá una en <strong>Configurar</strong>.</p>') +
      "</div>" +
      '<div class="card"><h2>Descanso y avisos</h2>' +
      '<p class="sub">Default cuando el ítem no tiene el suyo. El timer corre con timestamp: si el celu se duerme, avisa al volver.</p>' +
      '<div class="row"><label class="f">Descanso default (s)<input id="cDesc" inputmode="numeric" value="' + ctx.cfg.descanso + '" /></label></div>' +
      '<div class="row" style="margin-top:10px">' +
      '<label class="f"><span><input type="checkbox" id="cSnd"' + (ctx.cfg.sonido ? " checked" : "") + ' /> Sonido</span></label>' +
      '<label class="f"><span><input type="checkbox" id="cVib"' + (ctx.cfg.vibracion ? " checked" : "") + ' /> Vibración</span></label>' +
      '<label class="f"><span><input type="checkbox" id="cNot"' + (ctx.cfg.noti ? " checked" : "") + ' /> Notificación</span></label>' +
      '<button class="ghost" id="cNotPerm">Permitir notificaciones</button></div>' +
      '<p class="status" id="cStatus"></p></div>';

    var start = el.querySelector("#tStart");
    if (start) start.addEventListener("click", function () {
      var r = el.querySelector("#tRut").value;
      setSesion({ sesion: L().newSesionId(), rutina: r, inicio: new Date().toISOString() });
      ejSel = null;
      ctx.rerender();
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

  /* ── Sesión abierta ── */
  function renderSesion(el, ctx, ses, items) {
    var bloques = L().agruparRutina(items);
    if (!ejSel || !items.some(function (it) { return String(it.ejercicio) === ejSel; })) {
      ejSel = items.slice().sort(function (a, b) {
        var oa = L().toNum(a.orden), ob = L().toNum(b.orden);
        return (oa == null ? 9999 : oa) - (ob == null ? 9999 : ob);
      })[0].ejercicio;
    }
    var seriesHoy = ctx.series.filter(function (s) { return String(s.sesion) === ses.sesion; });

    el.innerHTML =
      '<div class="card"><div class="block-head"><div><h2>' + U().esc(ses.rutina) + '</h2>' +
      '<p class="sub" style="margin:0">Sesión abierta · ' + seriesHoy.length + ' registros</p></div>' +
      '<button class="ghost" id="tEnd">Terminar</button></div>' +
      '<div id="tBlocks">' + bloques.map(function (bl) {
        return '<div class="block' + (bl.tipo === "super" ? " super" : "") + '"><div class="block-head"><strong>' +
          (bl.tipo === "super" ? "Superserie " + U().esc(bl.letra) : U().esc(bl.items[0].ejercicio)) + "</strong>" +
          '<span class="meta">' + L().tonelaje(seriesHoy.filter(function (s) {
            return bl.items.some(function (it) { return String(it.ejercicio) === String(s.ejercicio); });
          })) + ' kg</span></div>' +
          bl.items.map(function (it) {
            var nHoy = L().contarSeries(seriesHoy.filter(function (s) { return String(s.ejercicio) === String(it.ejercicio); }));
            var badges = (it.grupo ? '<span class="badge s">S' + U().esc(it.grupo) + "</span>" : "") +
              (L().esDrop(it) ? '<span class="badge d">D</span>' : "");
            return '<div class="item"><button class="link" data-ej="' + U().esc(it.ejercicio) + '" style="font-size:1rem;color:' +
              (String(it.ejercicio) === ejSel ? "var(--ink);font-weight:700" : "var(--ink-2)") + '">' +
              (String(it.ejercicio) === ejSel ? "▸ " : "") + U().esc(it.ejercicio) + "</button>" +
              "<span>" + badges + ' <span class="dash">' + nHoy + " series · " + U().esc(it.descanso_seg || ctx.cfg.descanso) + "s</span></span></div>";
          }).join("") + "</div>";
      }).join("") + "</div></div>" +
      '<div class="card" id="tDetail"></div>';

    el.querySelector("#tEnd").addEventListener("click", function () {
      if (!window.confirm("¿Terminar la sesión? Queda guardada en el historial.")) return;
      setSesion(null);
      ejSel = null;
      stopTimer();
      ctx.rerender();
    });

    el.querySelectorAll("[data-ej]").forEach(function (b) {
      b.addEventListener("click", function () { ejSel = b.getAttribute("data-ej"); ctx.rerender(); });
    });

    renderDetalle(el.querySelector("#tDetail"), ctx, ses, items, seriesHoy);
  }

  function renderDetalle(box, ctx, ses, items, seriesHoy) {
    var it = items.filter(function (x) { return String(x.ejercicio) === ejSel; })[0];
    if (!it) return;
    var mias = seriesHoy.filter(function (s) { return String(s.ejercicio) === ejSel; })
      .sort(function (a, b) {
        var da = L().parseCreado(a.creado), db = L().parseCreado(b.creado);
        return (da ? da.getTime() : 0) - (db ? db.getTime() : 0);
      });
    // Vez pasada: última sesión distinta con este ejercicio.
    var otras = L().porSesion(ctx.series.filter(function (s) {
      return String(s.ejercicio) === ejSel && String(s.sesion) !== ses.sesion;
    }));
    var pasada = otras.length ? otras[otras.length - 1] : null;

    box.innerHTML =
      "<h2>" + U().esc(ejSel) +
      (it.grupo ? '<span class="badge s">S' + U().esc(it.grupo) + "</span>" : "") +
      (L().esDrop(it) ? '<span class="badge d">D</span>' : "") + "</h2>" +
      '<p class="sub">' + (pasada
        ? "Vez pasada (" + U().esc(pasada.fecha) + "): " + pasada.filas.map(function (r) {
          return L().fmtKg(r.kg) + "×" + (r.reps || "–");
        }).join(" · ")
        : "Primera vez que lo registrás.") + "</p>" +
      '<div class="row"><label class="f">Kg<input id="sKg" inputmode="decimal" placeholder="80" /></label>' +
      '<label class="f">Reps<input id="sReps" inputmode="numeric" placeholder="8" /></label>' +
      '<label class="f"><span><input type="checkbox" id="sDrop"' + (L().esDrop(it) ? " checked" : "") + ' /> Dropset</span></label>' +
      '<button class="primary" id="sAdd">Anotar serie</button></div>' +
      '<p class="status" id="sStatus"></p>' +
      '<div id="sList">' + (mias.length ? mias.map(function (r, i) {
        var badges = (it.grupo ? '<span class="badge s">S' + U().esc(it.grupo) + "</span>" : "") +
          (L().esDrop(r) ? '<span class="badge d">D</span>' : "");
        return '<div class="item" data-sid="' + U().esc(r.id) + '"><span><strong>' + (i + 1) + ".</strong> " +
          L().fmtKg(r.kg) + " kg × " + U().esc(r.reps) + badges + "</span>" +
          '<span class="acts"><button class="link" data-s-edit="' + U().esc(r.id) + '">Editar</button>' +
          '<button class="link del" data-s-del="' + U().esc(r.id) + '">Borrar</button></span></div>';
      }).join("") : '<p class="sub">Sin series todavía en esta sesión.</p>') + "</div>";

    function st() { return box.querySelector("#sStatus"); }

    box.querySelector("#sAdd").addEventListener("click", function () {
      var kg = box.querySelector("#sKg").value, reps = box.querySelector("#sReps").value;
      if (L().toNum(kg) == null) { U().status(st(), "Kg inválido. Ej: 80 o 80,5", "error"); return; }
      if (L().toNum(reps) == null || Math.round(L().toNum(reps)) <= 0) { U().status(st(), "Reps inválidas.", "error"); return; }
      U().status(st(), "Guardando…", "");
      bt.append("series", {
        sesion: ses.sesion, rutina: ses.rutina, ejercicio: ejSel,
        kg: String(kg).trim(), reps: String(Math.round(L().toNum(reps))),
        grupo: it.grupo || "", dropset: box.querySelector("#sDrop").checked ? "sí" : "",
      }).then(function (res) {
        if (!res || !res.ok) throw new Error((res && res.error) || "no se pudo guardar");
        U().status(st(), "Listo ✓", "ok");
        ctx.refresh().then(function () {
          startTimer(ejSel, L().parseDescanso(it.descanso_seg, ctx.cfg.descanso));
        });
      }).catch(function (e) { U().status(st(), String((e && e.message) || e), "error"); });
    });

    box.querySelectorAll("[data-s-del]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (!window.confirm("¿Borrar esta serie?")) return;
        bt.remove("series", b.getAttribute("data-s-del")).then(function (res) {
          if (!res || !res.ok) throw new Error((res && res.error) || "no se pudo borrar");
          ctx.refresh();
        }).catch(function (e) { U().status(st(), String((e && e.message) || e), "error"); });
      });
    });

    box.querySelectorAll("[data-s-edit]").forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-s-edit");
        var r = mias.filter(function (x) { return String(x.id) === id; })[0];
        if (!r) return;
        var row = box.querySelector('[data-sid="' + id + '"]');
        row.innerHTML = '<span class="row"><label class="f">Kg<input data-f="kg" value="' + U().esc(r.kg) + '" /></label>' +
          '<label class="f">Reps<input data-f="reps" value="' + U().esc(r.reps) + '" /></label>' +
          '<label class="f"><span><input type="checkbox" data-f="drop"' + (L().esDrop(r) ? " checked" : "") + ' /> D</span></label></span>' +
          '<span class="acts"><button class="link" data-s-save="' + U().esc(id) + '">Guardar</button>' +
          '<button class="link" data-s-cancel>Cancelar</button></span>';
        row.querySelector("[data-s-cancel]").addEventListener("click", function () { ctx.rerender(); });
        row.querySelector("[data-s-save]").addEventListener("click", function () {
          var kg = row.querySelector('[data-f="kg"]').value, reps = row.querySelector('[data-f="reps"]').value;
          if (L().toNum(kg) == null || L().toNum(reps) == null) { U().status(st(), "Valores inválidos.", "error"); return; }
          bt.update("series", id, {
            kg: String(kg).trim(), reps: String(Math.round(L().toNum(reps))),
            dropset: row.querySelector('[data-f="drop"]').checked ? "sí" : "",
          }).then(function (res) {
            if (!res || !res.ok) throw new Error((res && res.error) || "no se pudo guardar");
            ctx.refresh();
          }).catch(function (e) { U().status(st(), String((e && e.message) || e), "error"); });
        });
      });
    });
  }

  /* ── Timer ── */
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
    document.getElementById("timerLabel").textContent = "Descanso · " + nombre + " (" + seg + 's)';
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

  window.ViewTrain = { render: render, wireGlobal: wireGlobal, pollTimer: function () { if (cd && cd.active()) cd.poll(); } };
})();
