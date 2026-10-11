/* Gym — pantalla de ejercicio estilo FitNotes: tabs TRACK / HISTORY / GRAPH.
 * Reutilizada en Entrenar (modo full, con sesión) y Evolución (modo view).
 * opts: { nombre, modo: 'full'|'view', sesion, item }.
 * ctx: { series, cfg, refresh, rerender, startTimer } (startTimer solo en full).
 */
(function () {
  "use strict";

  var L = function () { return window.GymLib; };
  var U = function () { return window.GymUI; };
  var tab = "track";
  var metric = "1rm";
  var rango = "all";
  var stepKg = 2.5;
  try { stepKg = parseFloat(localStorage.getItem("gym.stepKg")) || 2.5; } catch (e) {}
  if ([1, 2.5, 5].indexOf(stepKg) === -1) stepKg = 2.5;

  var METRICAS = [
    { id: "1rm", label: "1RM estimado", fn: "serie1RM", u: "kg" },
    { id: "max", label: "Peso máximo", fn: "serieMaxKg", u: "kg" },
    { id: "ton", label: "Tonelaje", fn: "serieTonelaje", u: "kg" },
  ];
  var RANGOS = [["1m", "1m"], ["3m", "3m"], ["6m", "6m"], ["1y", "1a"], ["all", "Todo"]];
  var cur = { el: null, ctx: null, opts: null };

  function setTab(t, el, ctx, opts) { tab = t; render(el, ctx, opts); }
  function reset(nombre, modo) {
    var key = modo + "|" + nombre;
    if (key !== reset._last) { reset._last = key; tab = modo === "full" ? "track" : "history"; }
  }

  function render(el, ctx, opts) {
    reset(opts.nombre, opts.modo);
    cur.el = el; cur.ctx = ctx; cur.opts = opts;
    if (opts.modo !== "full" && tab === "track") tab = "history";
    var tabs = opts.modo === "full"
      ? [["track", "Anotar"], ["history", "Historial"], ["graph", "Gráfico"]]
      : [["history", "Historial"], ["graph", "Gráfico"]];

    el.innerHTML =
      '<div class="ex-head">' + (opts.atras === false ? "" : '<button class="ghost" id="exBack">‹ Atrás</button>') +
      "<h2>" + U().esc(opts.nombre) +
      (opts.item && opts.item.grupo ? '<span class="badge s">S' + U().esc(opts.item.grupo) + "</span>" : "") +
      (opts.item && L().esDrop(opts.item) ? '<span class="badge d">D</span>' : "") + "</h2></div>" +
      '<nav class="tabs" id="exTabs">' + tabs.map(function (t) {
        return '<button type="button" data-extab="' + t[0] + '"' + (t[0] === tab ? ' class="is-active"' : "") + ">" + t[1] + "</button>";
      }).join("") + "</nav>" +
      '<div id="exBody"></div>';

    var back = el.querySelector("#exBack");
    if (back) back.addEventListener("click", function () { ctx.volver(); });
    el.querySelectorAll("[data-extab]").forEach(function (b) {
      b.addEventListener("click", function () { setTab(b.getAttribute("data-extab"), el, ctx, opts); });
    });
    var body = el.querySelector("#exBody");
    if (tab === "track") renderTrack(body, ctx, opts);
    else if (tab === "history") renderHistory(body, ctx, opts);
    else renderGraph(body, ctx, opts);
  }

  /* ── TRACK: steppers + SAVE ── */
  function renderTrack(body, ctx, opts) {
    var nombre = opts.nombre, ses = opts.sesion, it = opts.item || {};
    var mias = ctx.series.filter(function (s) { return String(s.sesion) === ses.sesion && String(s.ejercicio) === nombre; });
    var otras = L().porSesion(ctx.series.filter(function (s) {
      return String(s.ejercicio) === nombre && String(s.sesion) !== ses.sesion;
    }));
    var pasada = otras.length ? otras[otras.length - 1] : null;
    var ult = mias.length ? mias[mias.length - 1] : (pasada && pasada.filas.length ? pasada.filas[pasada.filas.length - 1] : null);
    var kg0 = ult ? L().fmtKg(ult.kg) : "";
    var reps0 = ult && ult.reps ? String(ult.reps) : "";

    body.innerHTML =
      '<div class="card"><p class="sub" style="margin-top:0">' + (pasada
        ? "Vez pasada (" + U().esc(pasada.fecha) + "): " + pasada.filas.map(function (r) {
          return L().fmtKg(r.kg) + "×" + (r.reps || "–");
        }).join(" · ")
        : "Primera vez que lo registrás.") + "</p>" +
      '<div class="stepper"><span class="step-label">Peso (kg)</span>' +
      '<div class="step-row"><button type="button" class="step-btn" id="kgMinus">−</button>' +
      '<input id="sKg" inputmode="decimal" value="' + U().esc(kg0) + '" />' +
      '<button type="button" class="step-btn" id="sKgPlus">+</button>' +
      '<select id="sStep" aria-label="Paso">' + [1, 2.5, 5].map(function (s) {
        return '<option value="' + s + '"' + (s === stepKg ? " selected" : "") + ">±" + s + "</option>";
      }).join("") + "</select></div></div>" +
      '<div class="stepper"><span class="step-label">Reps</span>' +
      '<div class="step-row"><button type="button" class="step-btn" id="rpMinus">−</button>' +
      '<input id="sReps" inputmode="numeric" value="' + U().esc(reps0) + '" />' +
      '<button type="button" class="step-btn" id="sRpPlus">+</button></div></div>' +
      '<div class="row" style="margin-top:12px"><label class="f"><span><input type="checkbox" id="sDrop"' +
      (L().esDrop(it) ? " checked" : "") + ' /> Dropset</span></label></div>' +
      '<div class="row save-row"><button class="primary save-big" id="sAdd">Guardar serie</button>' +
      '<button class="ghost" id="sClear">Limpiar</button></div>' +
      '<p class="status" id="sStatus"></p></div>' +
      '<div class="card"><h2>Hoy</h2><div id="sList">' + (mias.length ? mias.map(function (r, i) {
        var bd = (it.grupo ? '<span class="badge s">S' + U().esc(it.grupo) + "</span>" : "") +
          (L().esDrop(r) ? '<span class="badge d">D</span>' : "");
        return '<div class="item" data-sid="' + U().esc(r.id) + '"><span><strong>' + (i + 1) + ".</strong> " +
          L().fmtKg(r.kg) + " kg × " + U().esc(r.reps) + bd + "</span>" +
          '<span class="acts"><button class="link" data-s-edit="' + U().esc(r.id) + '">Editar</button>' +
          '<button class="link del" data-s-del="' + U().esc(r.id) + '">Borrar</button></span></div>';
      }).join("") : '<p class="sub">Sin series todavía.</p>') + "</div></div>";

    function st() { return body.querySelector("#sStatus"); }
    function kg() { return body.querySelector("#sKg"); }
    function reps() { return body.querySelector("#sReps"); }

    body.querySelector("#kgMinus").addEventListener("click", function () { kg().value = L().fmtKg(L().stepNum(kg().value, -1, stepKg)); });
    body.querySelector("#sKgPlus").addEventListener("click", function () { kg().value = L().fmtKg(L().stepNum(kg().value, 1, stepKg)); });
    body.querySelector("#rpMinus").addEventListener("click", function () {
      var n = L().toNum(reps().value); reps().value = n == null ? "" : String(Math.max(0, Math.round(n) - 1));
    });
    body.querySelector("#sRpPlus").addEventListener("click", function () {
      var n = L().toNum(reps().value); reps().value = String((n == null ? 0 : Math.round(n)) + 1);
    });
    body.querySelector("#sStep").addEventListener("change", function (ev) {
      stepKg = parseFloat(ev.target.value) || 2.5;
      try { localStorage.setItem("gym.stepKg", String(stepKg)); } catch (e) {}
    });
    body.querySelector("#sClear").addEventListener("click", function () { kg().value = ""; reps().value = ""; kg().focus(); });

    body.querySelector("#sAdd").addEventListener("click", function () {
      var k = kg().value, rp = reps().value;
      if (L().toNum(k) == null) { U().status(st(), "Peso inválido.", "error"); return; }
      if (L().toNum(rp) == null || Math.round(L().toNum(rp)) < 0) { U().status(st(), "Reps inválidas.", "error"); return; }
      U().status(st(), "Guardando…", "");
      bt.append("series", {
        sesion: ses.sesion, rutina: opts.rutina || ses.rutina, ejercicio: nombre,
        kg: String(k).trim(), reps: String(Math.round(L().toNum(rp))),
        grupo: it.grupo || "", dropset: body.querySelector("#sDrop").checked ? "sí" : "",
      }).then(function (res) {
        if (!res || !res.ok) throw new Error((res && res.error) || "no se pudo guardar");
        U().status(st(), "Listo ✓", "ok");
        ctx.refresh().then(function () {
          ctx.startTimer(nombre, L().parseDescanso(it.descanso_seg, ctx.cfg.descanso));
        });
      }).catch(function (e) { U().status(st(), String((e && e.message) || e), "error"); });
    });

    body.querySelectorAll("[data-s-del]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (!window.confirm("¿Borrar esta serie?")) return;
        bt.remove("series", b.getAttribute("data-s-del")).then(function (res) {
          if (!res || !res.ok) throw new Error((res && res.error) || "no se pudo borrar");
          ctx.refresh();
        }).catch(function (e) { U().status(st(), String((e && e.message) || e), "error"); });
      });
    });

    body.querySelectorAll("[data-s-edit]").forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-s-edit");
        var r = mias.filter(function (x) { return String(x.id) === id; })[0];
        if (!r) return;
        var row = body.querySelector('[data-sid="' + id + '"]');
        row.innerHTML = '<span class="row"><label class="f">Kg<input data-f="kg" value="' + U().esc(r.kg) + '" /></label>' +
          '<label class="f">Reps<input data-f="reps" value="' + U().esc(r.reps) + '" /></label>' +
          '<label class="f"><span><input type="checkbox" data-f="drop"' + (L().esDrop(r) ? " checked" : "") + ' /> D</span></label></span>' +
          '<span class="acts"><button class="link" data-s-save="' + U().esc(id) + '">Guardar</button>' +
          '<button class="link" data-s-cancel>Cancelar</button></span>';
        row.querySelector("[data-s-cancel]").addEventListener("click", function () { ctx.rerender(); });
        row.querySelector("[data-s-save]").addEventListener("click", function () {
          var k2 = row.querySelector('[data-f="kg"]').value, rp2 = row.querySelector('[data-f="reps"]').value;
          if (L().toNum(k2) == null || L().toNum(rp2) == null) { U().status(st(), "Valores inválidos.", "error"); return; }
          bt.update("series", id, {
            kg: String(k2).trim(), reps: String(Math.round(L().toNum(rp2))),
            dropset: row.querySelector('[data-f="drop"]').checked ? "sí" : "",
          }).then(function (res) {
            if (!res || !res.ok) throw new Error((res && res.error) || "no se pudo guardar");
            ctx.refresh();
          }).catch(function (e) { U().status(st(), String((e && e.message) || e), "error"); });
        });
      });
    });
  }

  /* ── HISTORY ── */
  function renderHistory(body, ctx, opts) {
    var ses = L().porSesion(ctx.series.filter(function (s) { return String(s.ejercicio) === opts.nombre; })).slice().reverse();
    body.innerHTML = '<div class="card"><h2>Historial</h2>' +
      (ses.length ? ses.map(function (g) {
        return '<div class="block"><div class="block-head"><strong>' + U().esc(g.fecha || "s/f") + "</strong>" +
          '<span class="meta">' + U().esc(g.rutina) + " · " + g.nSeries + " series · " + L().fmtKg(g.tonelaje) + " kg</span></div>" +
          g.filas.map(function (r) {
            var bd = (r.grupo ? '<span class="badge s">S' + U().esc(r.grupo) + "</span>" : "") +
              (L().esDrop(r) ? '<span class="badge d">D</span>' : "");
            return '<div class="item"><span>' + L().fmtKg(r.kg) + " kg × " + U().esc(r.reps) + bd + "</span></div>";
          }).join("") + "</div>";
      }).join("") : '<p class="sub">Sin registros.</p>') + "</div>";
  }

  /* ── GRAPH: métrica + rangos + tendencia ── */
  function renderGraph(body, ctx, opts) {
    var m = METRICAS.filter(function (x) { return x.id === metric; })[0] || METRICAS[0];
    var rows = ctx.series.filter(function (s) { return String(s.ejercicio) === opts.nombre; });
    var pts = L().filtrarRango(L()[m.fn](rows), rango, Date.now());
    var trend = L().linTrend(pts);

    body.innerHTML =
      '<div class="card"><div class="row"><label class="f">Métrica<select id="gMet">' + METRICAS.map(function (x) {
        return '<option value="' + x.id + '"' + (x.id === m.id ? " selected" : "") + ">" + x.label + "</option>";
      }).join("") + "</select></label></div>" +
      '<div class="pills" id="gRango">' + RANGOS.map(function (r) {
        return '<button type="button" data-rango="' + r[0] + '"' + (r[0] === rango ? ' class="is-active"' : "") + ">" + r[1] + "</button>";
      }).join("") + "</div>" +
      '<div id="gChart">' + chartSVG(pts, trend, m.u) + "</div>" +
      '<p class="sub">Tocá un punto para ver el detalle.</p><p class="status" id="gTip"></p></div>';

    body.querySelector("#gMet").addEventListener("change", function (ev) { metric = ev.target.value; render(cur.el, cur.ctx, cur.opts); });
    body.querySelectorAll("[data-rango]").forEach(function (b) {
      b.addEventListener("click", function () { rango = b.getAttribute("data-rango"); render(cur.el, cur.ctx, cur.opts); });
    });
    body.querySelectorAll("#gChart circle[data-i]").forEach(function (c) {
      c.addEventListener("click", function () {
        var p = pts[+c.getAttribute("data-i")];
        U().status(body.querySelector("#gTip"), (p.fecha || "") + ": " + L().fmtKg(p.valor) + " " + m.u, "ok");
      });
    });
  }

  function chartSVG(pts, trend, u) {
    var W = 640, H = 240, pad = { t: 14, r: 12, b: 30, l: 48 };
    if (pts.length < 2) return '<p class="sub">Se necesitan al menos 2 sesiones en este rango.</p>';
    var iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    var xs = pts.map(function (p) { return p.t; });
    var ys = pts.map(function (p) { return p.valor; });
    var xMin = Math.min.apply(null, xs), xMax = Math.max.apply(null, xs);
    var yMin = Math.min.apply(null, ys), yMax = Math.max.apply(null, ys);
    if (yMax === yMin) { yMax += 1; yMin = Math.max(0, yMin - 1); }
    function X(t) { return xMax === xMin ? pad.l + iw / 2 : pad.l + (t - xMin) / (xMax - xMin) * iw; }
    function Y(v) { return pad.t + ih - (v - yMin) / (yMax - yMin) * ih; }
    var g = "";
    [yMin, (yMin + yMax) / 2, yMax].forEach(function (v) {
      var y = Y(v).toFixed(1);
      g += '<line x1="' + pad.l + '" y1="' + y + '" x2="' + (pad.l + iw) + '" y2="' + y + '" stroke="#eceee9" stroke-width="1"/>' +
        '<text x="' + (pad.l - 6) + '" y="' + (+y + 4).toFixed(1) + '" text-anchor="end" fill="#8b9199" font-size="11">' + Math.round(v) + "</text>";
    });
    var step = Math.max(1, Math.ceil(pts.length / 6));
    pts.forEach(function (p, i) {
      if (i % step !== 0 && i !== pts.length - 1) return;
      g += '<text x="' + X(p.t).toFixed(1) + '" y="' + (pad.t + ih + 18) + '" text-anchor="middle" fill="#8b9199" font-size="11">' +
        U().esc(String(p.fecha || "").slice(0, 5)) + "</text>";
    });
    var line = "M" + pts.map(function (p) { return X(p.t).toFixed(1) + " " + Y(p.valor).toFixed(1); }).join(" L");
    var area = line + " L" + X(pts[pts.length - 1].t).toFixed(1) + " " + (pad.t + ih) + " L" + X(pts[0].t).toFixed(1) + " " + (pad.t + ih) + " Z";
    var dots = pts.map(function (p, i) {
      return '<circle data-i="' + i + '" cx="' + X(p.t).toFixed(1) + '" cy="' + Y(p.valor).toFixed(1) + '" r="4" fill="#2b49e0" stroke="#fff" stroke-width="1.5" style="cursor:pointer"/>';
    }).join("");
    var tr = "";
    if (trend) {
      var x0 = xMin, x1 = xMax;
      tr = '<line x1="' + X(x0).toFixed(1) + '" y1="' + Y(trend.intercept + trend.slope * x0).toFixed(1) +
        '" x2="' + X(x1).toFixed(1) + '" y2="' + Y(trend.intercept + trend.slope * x1).toFixed(1) +
        '" stroke="#14161b" stroke-width="1.6" stroke-dasharray="5 4"/>';
    }
    var last = pts[pts.length - 1];
    return '<svg viewBox="0 0 ' + W + " " + H + '" style="width:100%;height:auto" role="img" aria-label="Gráfico">' +
      '<defs><linearGradient id="gf" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#2b49e0" stop-opacity="0.15"/>' +
      '<stop offset="100%" stop-color="#2b49e0" stop-opacity="0"/></linearGradient></defs>' + g +
      '<path d="' + area + '" fill="url(#gf)"/>' + tr +
      '<path d="' + line + '" fill="none" stroke="#2b49e0" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>' +
      dots +
      '<circle cx="' + X(last.t).toFixed(1) + '" cy="' + Y(last.valor).toFixed(1) + '" r="5.5" fill="#2b49e0" stroke="#fff" stroke-width="2"/>' +
      "</svg>";
  }

  window.ViewExercise = { render: render };
})();
