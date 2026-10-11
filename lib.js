/* Gym — lógica pura (sin DOM): testeable con node --test.
 * Se expone como window.GymLib en el navegador y como módulo en node. */
(function () {
  "use strict";

  /** Número es-AR: "80", "80,5", "1.200,50", "1200.50", "$ 1.200". null si inválido. */
  function toNum(v) {
    if (v == null || v === "") return null;
    if (typeof v === "number") return isFinite(v) ? v : null;
    var s = String(v).trim().replace(/\$/g, "").replace(/\s/g, "");
    if (s.indexOf(",") !== -1) {
      s = s.replace(/\./g, "").replace(",", ".").replace(/[^0-9.\-]/g, "");
    } else if (/\.\d{3}$/.test(s)) {
      s = s.replace(/\./g, "");
    }
    var n = parseFloat(s);
    return isFinite(n) ? n : null;
  }

  function toIntReps(v) {
    var n = toNum(v);
    if (n == null) return null;
    n = Math.round(n);
    return n > 0 ? n : null;
  }

  function fmtKg(v) {
    var n = toNum(v);
    if (n == null) return v == null ? "" : String(v);
    return n.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  /** Parsea el `creado` del motor ("yyyy-MM-dd'T'HH:mm:ss", hora local AR). */
  function parseCreado(s) {
    if (s == null || s === "") return null;
    var m = String(s).trim().match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/);
    if (m) {
      var d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0));
      return isNaN(d.getTime()) ? null : d;
    }
    var fb = String(s).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (fb) return new Date(+fb[3], +fb[2] - 1, +fb[1], 12);
    return null;
  }

  function fmtFecha(d) {
    if (!(d instanceof Date) || isNaN(d.getTime())) return "";
    function p(n) { return (n < 10 ? "0" : "") + n; }
    return p(d.getDate()) + "/" + p(d.getMonth() + 1) + "/" + d.getFullYear();
  }

  function newSesionId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  /** Categorías = valores distintos de `categoria` en ejercicios. */
  function distinctCategorias(ejercicios) {
    var seen = {}, out = [];
    (ejercicios || []).forEach(function (e) {
      var c = e && e.categoria != null ? String(e.categoria).trim() : "";
      if (!c || seen[c]) return;
      seen[c] = true;
      out.push(c);
    });
    return out.sort(function (a, b) { return a.localeCompare(b, "es"); });
  }

  /**
   * Agrupa ítems de rutina en bloques para el selector.
   * Misma `grupo` no vacía = un bloque superserie. Ordena por `orden`.
   * Devuelve [{tipo:'solo'|'super', letra, items:[...]}].
   */
  function agruparRutina(items) {
    var arr = (items || []).slice();
    arr.forEach(function (it, i) { it.__i = i; });
    arr.sort(function (a, b) {
      var oa = toNum(a.orden), ob = toNum(b.orden);
      if (oa == null && ob == null) return a.__i - b.__i;
      if (oa == null) return 1;
      if (ob == null) return -1;
      return oa - ob || a.__i - b.__i;
    });
    var bloques = [], porGrupo = {};
    arr.forEach(function (it) {
      var g = it.grupo != null ? String(it.grupo).trim() : "";
      if (!g) { bloques.push({ tipo: "solo", letra: "", items: [it] }); return; }
      if (!porGrupo[g]) { porGrupo[g] = { tipo: "super", letra: g, items: [] }; bloques.push(porGrupo[g]); }
      porGrupo[g].items.push(it);
    });
    return bloques;
  }

  function esDrop(r) {
    var v = r && r.dropset != null ? String(r.dropset).trim().toLowerCase() : "";
    return v === "sí" || v === "si" || v === "1" || v === "true" || v === "x";
  }

  /**
   * Cuenta series: un drop encadenado a su primera no suma (primera+drops = 1).
   * Un drop huérfano (sin primera previa) cuenta 1. Orden: por creado asc.
   */
  function contarSeries(rows) {
    var arr = (rows || []).slice().sort(function (a, b) {
      var da = parseCreado(a.creado), db = parseCreado(b.creado);
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return da - db;
    });
    var n = 0, prevEraPrimeraODrop = false;
    arr.forEach(function (r) {
      if (esDrop(r) && prevEraPrimeraODrop) return; // drop de la serie anterior
      n++;
      prevEraPrimeraODrop = true;
    });
    // Si hubo filas, la primera siempre contó; el flag solo encadena.
    void prevEraPrimeraODrop;
    return n;
  }

  /** Tonelaje = Σ kg×reps válidos. */
  function tonelaje(rows) {
    var t = 0;
    (rows || []).forEach(function (r) {
      var kg = toNum(r.kg), reps = toIntReps(r.reps);
      if (kg == null || reps == null) return;
      t += kg * reps;
    });
    return Math.round(t * 100) / 100;
  }

  /** 1RM estimado (Epley). null si inválido. */
  function epley(kg, reps) {
    var k = toNum(kg), r = toIntReps(reps);
    if (k == null || r == null) return null;
    if (r === 1) return Math.round(k * 10) / 10;
    return Math.round(k * (1 + r / 30) * 10) / 10;
  }

  /** Agrupa series por sesion (orden cronológico). */
  function porSesion(rows) {
    var map = {}, orden = [];
    (rows || []).forEach(function (r) {
      var s = r.sesion != null ? String(r.sesion) : "";
      if (!s) return;
      if (!map[s]) { map[s] = { sesion: s, rutina: r.rutina || "", filas: [] }; orden.push(s); }
      map[s].filas.push(r);
    });
    var out = orden.map(function (s) {
      var g = map[s];
      var fechas = g.filas.map(function (r) { return parseCreado(r.creado); }).filter(Boolean).sort(function (a, b) { return a - b; });
      return {
        sesion: s, rutina: g.rutina, filas: g.filas,
        fecha: fechas.length ? fmtFecha(fechas[0]) : "",
        t: fechas.length ? fechas[0].getTime() : 0,
        tonelaje: tonelaje(g.filas),
        nSeries: contarSeries(g.filas),
      };
    });
    out.sort(function (a, b) { return a.t - b.t; });
    return out;
  }

  /** Resumen de un ejercicio sobre sus series. */
  function resumenEjercicio(rows) {
    var prKg = null, prReps = null, mejor1RM = null;
    (rows || []).forEach(function (r) {
      var kg = toNum(r.kg), reps = toIntReps(r.reps);
      if (kg != null && (prKg == null || kg > prKg)) prKg = kg;
      if (reps != null && (prReps == null || reps > prReps)) prReps = reps;
      var e = epley(kg, reps);
      if (e != null && (mejor1RM == null || e > mejor1RM)) mejor1RM = e;
    });
    var ses = porSesion(rows);
    return { prKg: prKg, prReps: prReps, mejor1RM: mejor1RM, tonelajeTotal: tonelaje(rows), sesiones: ses.length };
  }

  /** 1RM estimado máximo por sesión (para el gráfico). */
  function serie1RM(rows) {
    return porSesion(rows).map(function (g) {
      var m = null;
      g.filas.forEach(function (r) {
        var e = epley(r.kg, r.reps);
        if (e != null && (m == null || e > m)) m = e;
      });
      return { fecha: g.fecha, t: g.t, valor: m };
    }).filter(function (p) { return p.valor != null; });
  }

  /** Descanso en segundos con fallback al default. */
  function parseDescanso(v, fb) {
    var n = typeof v === "number" ? v : parseInt(String(v == null ? "" : v).trim(), 10);
    if (!isFinite(n) || n <= 0) return fb;
    return Math.min(n, 3600);
  }

  var GymLib = {
    toNum: toNum, toIntReps: toIntReps, fmtKg: fmtKg,
    parseCreado: parseCreado, fmtFecha: fmtFecha, newSesionId: newSesionId,
    distinctCategorias: distinctCategorias, agruparRutina: agruparRutina,
    esDrop: esDrop, contarSeries: contarSeries, tonelaje: tonelaje,
    epley: epley, porSesion: porSesion, resumenEjercicio: resumenEjercicio,
    serie1RM: serie1RM, parseDescanso: parseDescanso,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = GymLib;
  else if (typeof window !== "undefined") window.GymLib = GymLib;
})();
