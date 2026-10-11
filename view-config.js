/* Gym — vista Configurar: categorías (derivadas), ejercicios y rutinas. */
(function () {
  "use strict";

  var L = function () { return window.GymLib; };
  var U = function () { return window.GymUI; };
  var LETRAS = ["", "A", "B", "C", "D", "E", "F"];
  var rutinaSel = null;

  try { rutinaSel = localStorage.getItem("gym.rutinaEdit") || null; } catch (e) {}

  function render(el, ctx) {
    var cats = L().distinctCategorias(ctx.ejercicios);
    var rutinas = nombresRutina(ctx.rutinas);
    if (rutinaSel && rutinas.indexOf(rutinaSel) === -1) rutinaSel = null;

    el.innerHTML =
      '<div class="card"><h2>Categorías</h2>' +
      '<p class="sub">Salen de tus ejercicios: usá un nombre nuevo al cargar y nace sola.</p>' +
      '<div id="cfgCats">' + cats.map(function (c) {
        var n = ctx.ejercicios.filter(function (e) { return String(e.categoria || "").trim() === c; }).length;
        return '<div class="item"><span>' + U().esc(c) + ' <span class="meta dash">· ' + n + '</span></span>' +
          '<span class="acts"><button class="link" data-cat-ren="' + U().esc(c) + '">Renombrar</button></span></div>';
      }).join("") + (cats.length ? "" : '<p class="sub">Todavía no hay. Cargá tu primer ejercicio abajo.</p>') + "</div></div>" +

      '<div class="card"><h2>Ejercicios</h2>' +
      '<p class="sub">Nombre + categoría + nota técnica opcional.</p>' +
      '<div class="row"><label class="f">Nombre<input id="eNombre" maxlength="60" placeholder="Sentadilla" /></label>' +
      '<label class="f">Categoría<input id="eCat" list="dlCats" maxlength="40" placeholder="Pierna" /></label></div>' +
      '<datalist id="dlCats">' + cats.map(function (c) { return '<option value="' + U().esc(c) + '">'; }).join("") + "</datalist>" +
      '<div class="row" style="margin-top:10px"><label class="f">Nota técnica <span class="dash">(opcional)</span><input id="eNota" maxlength="120" placeholder="Espalda neutra, rodillas afuera" /></label></div>' +
      '<div class="row" style="margin-top:10px"><button class="primary" id="eAdd">Agregar ejercicio</button></div>' +
      '<p class="status" id="eStatus"></p>' +
      '<div id="eList">' + ctx.ejercicios.map(function (e) {
        return '<div class="item" data-eid="' + U().esc(e.id) + '"><span><strong>' + U().esc(e.nombre) + "</strong>" +
          (e.categoria ? ' <span class="dash">· ' + U().esc(e.categoria) + "</span>" : "") +
          (e.nota ? '<br><span class="dash">' + U().esc(e.nota) + "</span>" : "") + "</span>" +
          '<span class="acts"><button class="link" data-e-edit="' + U().esc(e.id) + '">Editar</button>' +
          '<button class="link del" data-e-del="' + U().esc(e.id) + '">Borrar</button></span></div>';
      }).join("") + "</div></div>" +

      '<div class="card"><h2>Rutinas</h2>' +
      '<p class="sub">Una rutina = lista de ejercicios con su descanso, superseries y dropsets.</p>' +
      '<div class="row"><label class="f">Rutina<input id="rNombre" maxlength="60" placeholder="Pierna A" /></label>' +
      '<button class="primary" id="rNew">Nueva / elegir</button>' +
      (rutinaSel ? '<button class="ghost danger" id="rDel">Borrar "' + U().esc(rutinaSel) + '"</button>' : "") + "</div>" +
      (rutinas.length ? '<p class="sub" style="margin-top:10px">Existentes: ' + rutinas.map(function (r) {
        return '<button class="ghost" data-r-sel="' + U().esc(r) + '">' + U().esc(r) + "</button>";
      }).join(" ") + "</p>" : "") +
      '<p class="status" id="rStatus"></p>' +
      '<div id="rEdit"></div></div>';

    bind(el, ctx, cats);
    if (rutinaSel) renderEditor(el, ctx);
  }

  function nombresRutina(rutinas) {
    var seen = {}, out = [];
    (rutinas || []).forEach(function (r) {
      var n = r.rutina != null ? String(r.rutina).trim() : "";
      if (n && !seen[n]) { seen[n] = true; out.push(n); }
    });
    return out.sort(function (a, b) { return a.localeCompare(b, "es"); });
  }

  function setSel(n) {
    rutinaSel = n;
    try { localStorage.setItem("gym.rutinaEdit", n || ""); } catch (e) {}
  }

  function bind(el, ctx, cats) {
    function st(id) { return el.querySelector("#" + id); }

    el.querySelector("#eAdd").addEventListener("click", function () {
      var nombre = st("eNombre").value.trim(), cat = st("eCat").value.trim(), nota = st("eNota").value.trim();
      if (!nombre) { U().status(st("eStatus"), "Poné el nombre del ejercicio.", "error"); return; }
      U().status(st("eStatus"), "Guardando…", "");
      bt.append("ejercicios", { nombre: nombre, categoria: cat, nota: nota }).then(function (res) {
        if (!res || !res.ok) throw new Error((res && res.error) || "no se pudo guardar");
        U().status(st("eStatus"), "Listo ✓", "ok");
        ctx.refresh();
      }).catch(function (e) { U().status(st("eStatus"), String((e && e.message) || e), "error"); });
    });

    el.querySelectorAll("[data-e-del]").forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-e-del");
        var ej = ctx.ejercicios.filter(function (e) { return String(e.id) === id; })[0] || {};
        var usado = ctx.rutinas.some(function (r) { return String(r.ejercicio || "").trim() === String(ej.nombre || "").trim(); });
        if (usado) { U().status(st("eStatus"), "Está en una rutina: quitalo de ahí primero.", "error"); return; }
        if (!window.confirm('¿Borrar "' + (ej.nombre || "") + '"?')) return;
        bt.remove("ejercicios", id).then(function (res) {
          if (!res || !res.ok) throw new Error((res && res.error) || "no se pudo borrar");
          ctx.refresh();
        }).catch(function (e) { U().status(st("eStatus"), String((e && e.message) || e), "error"); });
      });
    });

    el.querySelectorAll("[data-e-edit]").forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-e-edit");
        var ej = ctx.ejercicios.filter(function (e) { return String(e.id) === id; })[0];
        if (!ej) return;
        st("eNombre").value = ej.nombre || "";
        st("eCat").value = ej.categoria || "";
        st("eNota").value = ej.nota || "";
        st("eNombre").focus();
        U().status(st("eStatus"), "Editando: guardá con “Agregar” y borrá la fila vieja si cambió el nombre.", "");
      });
    });

    el.querySelectorAll("[data-cat-ren]").forEach(function (b) {
      b.addEventListener("click", function () {
        var vieja = b.getAttribute("data-cat-ren");
        var nueva = window.prompt('Renombrar categoría "' + vieja + '" a:', vieja);
        if (!nueva) return;
        nueva = nueva.trim();
        if (!nueva || nueva === vieja) return;
        var filas = ctx.ejercicios.filter(function (e) { return String(e.categoria || "").trim() === vieja; });
        U().status(st("eStatus"), "Renombrando " + filas.length + "…", "");
        filas.reduce(function (p, e) {
          return p.then(function () { return bt.update("ejercicios", e.id, { categoria: nueva }); });
        }, Promise.resolve()).then(function () { ctx.refresh(); })
          .catch(function (e) { U().status(st("eStatus"), String((e && e.message) || e), "error"); });
      });
    });

    el.querySelector("#rNew").addEventListener("click", function () {
      var n = st("rNombre").value.trim();
      if (!n) { U().status(st("rStatus"), "Poné el nombre de la rutina.", "error"); return; }
      setSel(n);
      ctx.rerender();
    });

    el.querySelectorAll("[data-r-sel]").forEach(function (b) {
      b.addEventListener("click", function () { setSel(b.getAttribute("data-r-sel")); ctx.rerender(); });
    });

    var del = el.querySelector("#rDel");
    if (del) del.addEventListener("click", function () {
      if (!window.confirm('¿Borrar la rutina "' + rutinaSel + '" con todos sus ítems?')) return;
      var items = ctx.rutinas.filter(function (r) { return String(r.rutina || "").trim() === rutinaSel; });
      items.reduce(function (p, it) {
        return p.then(function () { return bt.remove("rutinas", it.id); });
      }, Promise.resolve()).then(function () { setSel(null); ctx.refresh(); })
        .catch(function (e) { U().status(st("rStatus"), String((e && e.message) || e), "error"); });
    });
  }

  function renderEditor(el, ctx) {
    var box = el.querySelector("#rEdit");
    var items = ctx.rutinas
      .filter(function (r) { return String(r.rutina || "").trim() === rutinaSel; })
      .sort(function (a, b) {
        var oa = L().toNum(a.orden), ob = L().toNum(b.orden);
        return (oa == null ? 9999 : oa) - (ob == null ? 9999 : ob);
      });
    var bloques = L().agruparRutina(items);
    var ejOpts = ctx.ejercicios.map(function (e) {
      return '<option value="' + U().esc(e.nombre) + '">' + U().esc(e.nombre) +
        (e.categoria ? " (" + U().esc(e.categoria) + ")" : "") + "</option>";
    }).join("");

    box.innerHTML =
      '<h3 style="margin:14px 0 4px">Ítems de "' + U().esc(rutinaSel) + '"</h3>' +
      bloques.map(function (bl) {
        return '<div class="block' + (bl.tipo === "super" ? " super" : "") + '"><div class="block-head"><strong>' +
          (bl.tipo === "super" ? "Superserie " + U().esc(bl.letra) : U().esc(bl.items[0].ejercicio)) + "</strong>" +
          '<span class="meta">' + bl.items.length + (bl.items.length === 1 ? " ejercicio" : " ejercicios") + "</span></div>" +
          bl.items.map(function (it) {
            var badges = (it.grupo ? '<span class="badge s">S' + U().esc(it.grupo) + "</span>" : "") +
              (L().esDrop(it) ? '<span class="badge d">D</span>' : "");
            return '<div class="item"><span>' + (bl.tipo === "super" ? "<strong>" + U().esc(it.ejercicio) + "</strong>" : "Descanso: " + U().esc(it.descanso_seg || ctx.cfg.descanso) + "s") + badges +
              (bl.tipo === "super" ? ' <span class="dash">· ' + U().esc(it.descanso_seg || ctx.cfg.descanso) + 's</span>' : "") + "</span>" +
              '<span class="acts"><button class="link" data-it-up="' + U().esc(it.id) + '">↑</button>' +
              '<button class="link" data-it-down="' + U().esc(it.id) + '">↓</button>' +
              '<button class="link" data-it-desc="' + U().esc(it.id) + '">Descanso</button>' +
              '<button class="link del" data-it-del="' + U().esc(it.id) + '">Quitar</button></span></div>';
          }).join("") + "</div>";
      }).join("") +
      '<div class="row" style="margin-top:12px"><label class="f">Ejercicio<select id="itEj">' + ejOpts + "</select></label>" +
      '<label class="f">Descanso (s)<input id="itDesc" inputmode="numeric" value="' + ctx.cfg.descanso + '" /></label>' +
      '<label class="f">Grupo<select id="itGrupo">' + LETRAS.map(function (l) {
        return '<option value="' + l + '">' + (l || "— solo —") + "</option>";
      }).join("") + "</select></label>" +
      '<label class="f">Dropset<input type="checkbox" id="itDrop" /></label>' +
      '<button class="primary" id="itAdd">Agregar</button></div>' +
      '<p class="status" id="itStatus"></p>' +
      '<p class="sub">Grupo con la misma letra = superserie (se muestra junta al entrenar, se anota por ejercicio). Dropset = ese ítem se trabaja con drops.</p>';

    function st() { return box.querySelector("#itStatus"); }

    box.querySelector("#itAdd").addEventListener("click", function () {
      var ej = box.querySelector("#itEj").value;
      if (!ej) { U().status(st(), "Primero cargá ejercicios.", "error"); return; }
      var desc = L().parseDescanso(box.querySelector("#itDesc").value, ctx.cfg.descanso);
      var max = items.reduce(function (m, it) {
        var o = L().toNum(it.orden);
        return o != null && o > m ? o : m;
      }, -1);
      U().status(st(), "Guardando…", "");
      bt.append("rutinas", {
        rutina: rutinaSel, ejercicio: ej, descanso_seg: desc,
        grupo: box.querySelector("#itGrupo").value,
        orden: max + 1, dropset: box.querySelector("#itDrop").checked ? "sí" : "",
      }).then(function (res) {
        if (!res || !res.ok) throw new Error((res && res.error) || "no se pudo guardar");
        ctx.refresh();
      }).catch(function (e) { U().status(st(), String((e && e.message) || e), "error"); });
    });

    box.querySelectorAll("[data-it-del]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (!window.confirm("¿Quitar este ítem de la rutina?")) return;
        bt.remove("rutinas", b.getAttribute("data-it-del")).then(function (res) {
          if (!res || !res.ok) throw new Error((res && res.error) || "no se pudo quitar");
          ctx.refresh();
        }).catch(function (e) { U().status(st(), String((e && e.message) || e), "error"); });
      });
    });

    function mover(id, dir) {
      var ord = items.slice().sort(function (a, b) {
        var oa = L().toNum(a.orden), ob = L().toNum(b.orden);
        return (oa == null ? 9999 : oa) - (ob == null ? 9999 : ob);
      });
      var i = -1;
      ord.forEach(function (it, k) { if (String(it.id) === id) i = k; });
      var j = i + dir;
      if (i < 0 || j < 0 || j >= ord.length) return;
      var a = ord[i], b = ord[j];
      var oa = L().toNum(a.orden), ob = L().toNum(b.orden);
      if (oa == null || ob == null || oa === ob) { oa = i; ob = j; }
      bt.update("rutinas", a.id, { orden: ob }).then(function () {
        return bt.update("rutinas", b.id, { orden: oa });
      }).then(function () { ctx.refresh(); })
        .catch(function (e) { U().status(st(), String((e && e.message) || e), "error"); });
    }
    box.querySelectorAll("[data-it-up]").forEach(function (b) {
      b.addEventListener("click", function () { mover(b.getAttribute("data-it-up"), -1); });
    });
    box.querySelectorAll("[data-it-down]").forEach(function (b) {
      b.addEventListener("click", function () { mover(b.getAttribute("data-it-down"), 1); });
    });

    box.querySelectorAll("[data-it-desc]").forEach(function (b) {
      b.addEventListener("click", function () {
        var it = items.filter(function (x) { return String(x.id) === b.getAttribute("data-it-desc"); })[0];
        if (!it) return;
        var v = window.prompt("Descanso para este ítem (segundos):", it.descanso_seg || ctx.cfg.descanso);
        if (v == null) return;
        bt.update("rutinas", it.id, { descanso_seg: L().parseDescanso(v, ctx.cfg.descanso) })
          .then(function () { ctx.refresh(); })
          .catch(function (e) { U().status(st(), String((e && e.message) || e), "error"); });
      });
    });
  }

  window.ViewConfig = { render: render };
})();
