/* Gym — vista Evolución: por ejercicio, tonelaje, 1RM estimado y gráfico. */
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
    var pts = L().serie1RM(rows);
    var ses = L().porSesion(rows).slice().reverse(); // más reciente primero

    el.innerHTML =
      '<div class="card"><h2>' + U().esc(ejSel) + "</h2>" +
      '<div class="row"><label class="f">Ejercicio<select id="vEj">' +
      nombres.map(function (n) {
        return '<option value="' + U().esc(n) + '"' + (n === ejSel ? " selected" : "") + ">" + U().esc(n) + "</option>";
      }).join("") + "</select></label></div>" +
      '<div class="stats">' +
      stat("PR peso", res.prKg != null ? L().fmtKg(res.prKg) : "—", "kg") +
      stat("Mejor 1RM est.", res.mejor1RM != null ? L().fmtKg(res.mejor1RM) : "—", "kg") +
      stat("Tonelaje total", L().fmtKg(res.tonelajeTotal), "kg") +
      stat("Sesiones", String(res.sesiones), "") +
      "</div>" +
      '<p class="sub" style="margin:10px 0 0">1RM estimado (Epley): peso × (1 + reps/30). Referencia, no medición.</p></div>' +
      '<div class="card"><h2>Progreso (1RM est. por sesión)</h2><div id="vChart">' + chartSVG(pts) + "</div></div>" +
      '<div class="card"><h2>Historial</h2>' +
      (ses.length ? ses.map(function (g) {
        return '<div class="block"><div class="block-head"><strong>' + U().esc(g.fecha || "s/f") + "</strong>" +
          '<span class="meta">' + U().esc(g.rutina) + " · " + g.nSeries + " series · " + L().fmtKg(g.tonelaje) + " kg</span></div>" +
          g.filas.map(function (r) {
            var bd = (r.grupo ? '<span class="badge s">S' + U().esc(r.grupo) + "</span>" : "") +
              (L().esDrop(r) ? '<span class="badge d">D</span>' : "");
            return '<div class="item"><span>' + L().fmtKg(r.kg) + " kg × " + U().esc(r.reps) + bd + "</span></div>";
          }).join("") + "</div>";
      }).join("") : '<p class="sub">Sin registros para este ejercicio.</p>') + "</div>";

    el.querySelector("#vEj").addEventListener("change", function (ev) {
      ejSel = ev.target.value;
      try { localStorage.setItem("gym.ejEvol", ejSel); } catch (e) {}
      render(el, ctx);
    });
  }

  function stat(label, value, u) {
    return '<div class="stat"><div class="stat-label">' + U().esc(label) + '</div><div class="stat-value">' +
      U().esc(value) + (u ? '<span class="u">' + U().esc(u) + "</span>" : "") + "</div></div>";
  }

  function chartSVG(pts) {
    var W = 640, H = 240, pad = { t: 14, r: 12, b: 30, l: 48 };
    if (pts.length < 2) {
      return '<p class="sub">Se necesitan al menos 2 sesiones con datos para el gráfico.</p>';
    }
    var iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    var xs = pts.map(function (p) { return p.t; });
    var ys = pts.map(function (p) { return p.valor; });
    var xMin = Math.min.apply(null, xs), xMax = Math.max.apply(null, xs);
    var yMin = Math.min.apply(null, ys), yMax = Math.max.apply(null, ys);
    if (yMax === yMin) { yMax += 1; yMin -= 1; }
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
      var x = X(p.t).toFixed(1);
      g += '<text x="' + x + '" y="' + (pad.t + ih + 18) + '" text-anchor="middle" fill="#8b9199" font-size="11">' +
        U().esc(String(p.fecha || "").slice(0, 5)) + "</text>";
    });
    var line = "M" + pts.map(function (p) { return X(p.t).toFixed(1) + " " + Y(p.valor).toFixed(1); }).join(" L");
    var area = line + " L" + X(pts[pts.length - 1].t).toFixed(1) + " " + (pad.t + ih) + " L" + X(pts[0].t).toFixed(1) + " " + (pad.t + ih) + " Z";
    var dots = pts.map(function (p) {
      return '<circle cx="' + X(p.t).toFixed(1) + '" cy="' + Y(p.valor).toFixed(1) + '" r="3" fill="#2b49e0" stroke="#fff" stroke-width="1.5"/>';
    }).join("");
    var last = pts[pts.length - 1];
    return '<svg viewBox="0 0 ' + W + " " + H + '" style="width:100%;height:auto" role="img" aria-label="Progreso">' +
      '<defs><linearGradient id="gf" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#2b49e0" stop-opacity="0.15"/>' +
      '<stop offset="100%" stop-color="#2b49e0" stop-opacity="0"/></linearGradient></defs>' + g +
      '<path d="' + area + '" fill="url(#gf)"/>' +
      '<path d="' + line + '" fill="none" stroke="#2b49e0" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>' +
      dots +
      '<circle cx="' + X(last.t).toFixed(1) + '" cy="' + Y(last.valor).toFixed(1) + '" r="5.5" fill="#2b49e0" stroke="#fff" stroke-width="2"/>' +
      "</svg>";
  }

  window.ViewEvol = { render: render };
})();
