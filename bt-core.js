/*!
 * bt-core.js — cliente común del backend "bds".
 *
 * Una página sólo necesita este archivo + `config.js` (con SCRIPT_URL).
 * Se encarga del ACCESO (contraseña una vez por dispositivo) y de las llamadas
 * al motor. La clave del dispositivo se guarda en localStorage y, como todas
 * las apps viven bajo el mismo origen (joacomedel.github.io), se comparte: la
 * contraseña se pide una sola vez por dispositivo.
 *
 * Uso:
 *   bt.init({ onReady: function (res) { ... }, onLocked: function () { ... } });
 *   bt.query('pesos', { limite: 100 }).then(...)
 *   bt.append('pesos', { peso: 64.5, comentario: 'post ayuno' })
 *   bt.update('pesos', id, { comentario: '...' })
 *   bt.remove('pesos', id)
 *   bt.domains()
 *   bt.logout()
 */
(function () {
  "use strict";

  var cfg = window.BT_CONFIG || {};
  var LS_KEY = "bt_device";
  var opts = {};
  var device = "";
  var gateMode = "login";
  var ready = false;
  var booted = false;

  try { device = localStorage.getItem(LS_KEY) || ""; } catch (e) { device = ""; }

  /* ───────────────── Llamadas al motor ───────────────── */

  function raw(payload) {
    if (!cfg.SCRIPT_URL) {
      return Promise.reject(new Error("Falta SCRIPT_URL en config.js"));
    }
    return fetch(cfg.SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    }).then(function (r) { return r.json(); });
  }

  function withDevice(payload) {
    payload.device = payload.device || device;
    return raw(payload);
  }

  var api = {
    status: function () { return raw({ action: "status" }); },
    domains: function () { return withDevice({ action: "domains" }); },
    query: function (dominio, o) {
      return withDevice(Object.assign({ action: "query", dominio: dominio }, o || {}));
    },
    append: function (dominio, datos) {
      return withDevice({ action: "append", dominio: dominio, datos: datos || {} });
    },
    update: function (dominio, id, datos) {
      return withDevice({ action: "update", dominio: dominio, id: id, datos: datos || {} });
    },
    remove: function (dominio, id) {
      return withDevice({ action: "delete", dominio: dominio, id: id });
    },
    sync: function () { return withDevice({ action: "sync" }); },
    createDomain: function (dominio, o) {
      return withDevice(Object.assign({ action: "createDomain", dominio: dominio }, o || {}));
    },
    logoutAll: function (password) { return raw({ action: "logoutAll", password: password }); },
    changePassword: function (password, newPassword) {
      return raw({ action: "changePassword", password: password, newPassword: newPassword });
    }
  };

  /* ───────────────── Dispositivo ───────────────── */

  function remember(t) { device = t; try { localStorage.setItem(LS_KEY, t); } catch (e) {} }
  function forget() { device = ""; try { localStorage.removeItem(LS_KEY); } catch (e) {} }
  function currentDevice() { return device; }

  /* ───────────────── Acceso (gate) ───────────────── */

  var CSS = [
    ".bt-gate{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;padding:24px;",
    "background:var(--bt-bg,#f4f5f3);font-family:var(--bt-font,'Hanken Grotesk',system-ui,-apple-system,'Segoe UI',sans-serif);color:var(--bt-ink,#14161b)}",
    ".bt-gate[hidden]{display:none}",
    ".bt-card{width:100%;max-width:380px;background:var(--bt-panel,#fff);border:1px solid var(--bt-line,#e4e7e1);",
    "border-radius:14px;box-shadow:0 1px 2px rgba(20,22,27,.05);padding:28px 26px}",
    ".bt-brand{display:flex;align-items:center;gap:10px;margin-bottom:22px}",
    ".bt-mark{width:20px;height:20px;border-radius:6px;background:var(--bt-accent,#2b49e0);position:relative}",
    ".bt-mark::after{content:'';position:absolute;inset:5px 4px;background:linear-gradient(to top right,transparent 46%,#fff 46%,#fff 54%,transparent 54%)}",
    ".bt-brand-name{font-weight:700;letter-spacing:-.02em;font-size:1.15rem}",
    ".bt-title{margin:0 0 4px;font-size:1.35rem;font-weight:600;letter-spacing:-.01em}",
    ".bt-sub{margin:0 0 18px;color:var(--bt-ink2,#4a505a);font-size:.92rem}",
    ".bt-field{display:grid;gap:6px;margin-bottom:12px}",
    ".bt-field label{font-size:.82rem;color:var(--bt-ink2,#4a505a);font-weight:500}",
    ".bt-field label span{color:var(--bt-muted,#8b9199);font-weight:400}",
    ".bt-input{width:100%;padding:11px 13px;font:inherit;font-size:1rem;color:inherit;background:var(--bt-bg,#f4f5f3);",
    "border:1px solid var(--bt-line,#e4e7e1);border-radius:10px}",
    ".bt-input:focus{outline:none;border-color:var(--bt-accent,#2b49e0);background:var(--bt-panel,#fff);box-shadow:0 0 0 3px var(--bt-tint,#e9ecfb)}",
    ".bt-save{margin-top:6px;width:100%;padding:12px 16px;font:inherit;font-weight:600;color:#fff;background:var(--bt-accent,#2b49e0);",
    "border:none;border-radius:10px;cursor:pointer}",
    ".bt-save:hover{background:#2039c4}.bt-save:disabled{opacity:.55;cursor:default}",
    ".bt-status{margin:10px 0 0;min-height:1.1em;font-size:.85rem;color:var(--bt-ink2,#4a505a)}",
    ".bt-status.bt-error{color:var(--bt-danger,#c0362c)}.bt-status.bt-ok{color:var(--bt-ok,#1f7a4d)}",
    ".bt-link{display:block;margin:16px auto 0;font:inherit;font-size:.8rem;color:var(--bt-muted,#8b9199);",
    "background:none;border:none;cursor:pointer;text-decoration:underline}"
  ].join("");

  function injectCss() {
    if (document.getElementById("bt-core-style")) return;
    var st = document.createElement("style");
    st.id = "bt-core-style";
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  function buildGate() {
    if (document.getElementById("bt-gate")) return;
    var brand = (opts.brand || "bds");
    var wrap = document.createElement("div");
    wrap.className = "bt-gate";
    wrap.id = "bt-gate";
    wrap.setAttribute("role", "dialog");
    wrap.setAttribute("aria-modal", "true");
    wrap.innerHTML =
      '<div class="bt-card">' +
        '<div class="bt-brand"><span class="bt-mark" aria-hidden="true"></span><span class="bt-brand-name">' +
          esc(brand) + "</span></div>" +
        '<h1 class="bt-title" id="bt-title">Entrar</h1>' +
        '<p class="bt-sub" id="bt-sub"></p>' +
        '<form id="bt-form" novalidate>' +
          '<div class="bt-field"><label for="bt-pass">Contraseña</label>' +
            '<input class="bt-input" id="bt-pass" type="password" autocomplete="current-password" /></div>' +
          '<div class="bt-field" id="bt-name-field"><label for="bt-name">Nombre de este dispositivo <span>opcional</span></label>' +
            '<input class="bt-input" id="bt-name" type="text" maxlength="20" placeholder="celu" autocomplete="off" /></div>' +
          '<button class="bt-save" id="bt-btn" type="submit">Entrar</button>' +
          '<p class="bt-status" id="bt-status" role="status" aria-live="polite"></p>' +
        "</form>" +
        '<button class="bt-link" id="bt-reset" type="button" hidden>Cerrar sesión en todos los dispositivos</button>' +
      "</div>";
    document.body.appendChild(wrap);
    document.getElementById("bt-form").addEventListener("submit", onGateSubmit);
    document.getElementById("bt-reset").addEventListener("click", onResetAll);
  }

  function showGate() { var g = document.getElementById("bt-gate"); if (g) g.hidden = false; }
  function hideGate() { var g = document.getElementById("bt-gate"); if (g) g.hidden = true; }

  function setMode(mode) {
    gateMode = mode;
    var isSet = mode === "setpass";
    document.getElementById("bt-title").textContent = isSet ? "Creá tu contraseña" : "Entrar";
    document.getElementById("bt-sub").textContent = isSet
      ? "Primera vez. Elegí una contraseña: la vas a usar para autorizar cada dispositivo nuevo (después queda recordado)."
      : "Ingresá la contraseña para ver tus datos.";
    document.getElementById("bt-btn").textContent = isSet ? "Crear y entrar" : "Entrar";
    document.getElementById("bt-pass").setAttribute("autocomplete", isSet ? "new-password" : "current-password");
    document.getElementById("bt-name-field").hidden = isSet;
    document.getElementById("bt-reset").hidden = isSet;
    document.getElementById("bt-pass").value = "";
    setStatus("");
  }

  function setStatus(msg, kind) {
    var el = document.getElementById("bt-status");
    if (!el) return;
    el.textContent = msg || "";
    el.className = "bt-status" + (kind === "error" ? " bt-error" : kind === "ok" ? " bt-ok" : "");
  }

  function onGateSubmit(ev) {
    ev.preventDefault();
    var pass = document.getElementById("bt-pass").value;
    if (!pass) { setStatus("Escribí la contraseña.", "error"); return; }
    var payload;
    if (gateMode === "setpass") {
      if (pass.length < 6) { setStatus("Mínimo 6 caracteres.", "error"); return; }
      payload = { action: "setPassword", password: pass };
    } else {
      payload = { action: "login", password: pass, name: document.getElementById("bt-name").value.trim() };
    }
    var btn = document.getElementById("bt-btn");
    btn.disabled = true;
    setStatus("Verificando…", "");
    raw(payload).then(function (res) {
      if (res && res.ok && res.device) {
        remember(res.device);
        hideGate();
        return becomeReady();
      }
      setStatus((res && res.error) || "No se pudo. Probá de nuevo.", "error");
    }).catch(function () {
      setStatus("No pude conectar. Reintentá.", "error");
    }).then(function () { btn.disabled = false; });
  }

  function onResetAll() {
    var pass = window.prompt("Contraseña para cerrar sesión en TODOS los dispositivos:");
    if (!pass) return;
    setStatus("Cerrando todas…", "");
    api.logoutAll(pass).then(function (res) {
      if (res && res.ok) { forget(); setStatus("Listo: cerraste sesión en todos los dispositivos.", "ok"); }
      else setStatus((res && res.error) || "No se pudo.", "error");
    }).catch(function () { setStatus("No pude conectar.", "error"); });
  }

  /* ───────────────── Arranque ───────────────── */

  function openGate() {
    ready = false;
    if (opts.onLocked) { try { opts.onLocked(); } catch (e) {} }
    injectCss();
    buildGate();
    showGate();
    setMode("login");
    document.getElementById("bt-btn").hidden = true;
    setStatus("Conectando…", "");
    api.status().then(function (st) {
      document.getElementById("bt-btn").hidden = false;
      if (!st || !st.ok) { setStatus("No pude conectar.", "error"); return; }
      setMode(st.configured ? "login" : "setpass");
    }).catch(function () {
      document.getElementById("bt-btn").hidden = false;
      setStatus("No pude conectar.", "error");
    });
  }

  function becomeReady(dominos) {
    ready = true;
    var p = dominos ? Promise.resolve({ ok: true, dominios: dominos }) : api.domains();
    return p.then(function (res) {
      var doms = (res && res.dominios) || [];
      if (opts.onReady) opts.onReady({ dominios: doms });
      return res;
    });
  }

  function boot() {
    if (booted) return Promise.resolve();
    booted = true;
    if (!device) return Promise.resolve(openGate());
    return api.domains().then(function (res) {
      if (res && res.ok) { hideGate(); return becomeReady(res.dominios); }
      if (res && res.error === "dispositivo no autorizado") { forget(); return openGate(); }
      return openGate();
    }).catch(function () { return openGate(); });
  }

  /* ───────────────── Público ───────────────── */

  function init(o) {
    opts = o || {};
    injectCss();
    buildGate();
    return boot();
  }

  function logout() {
    var d = device;
    forget();
    var p = d ? raw({ action: "logout", device: d }).catch(function () {}) : Promise.resolve();
    return p.then(function () { openGate(); });
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  window.bt = {
    init: init,
    ready: function () { return ready; },
    device: currentDevice,
    domains: api.domains,
    query: api.query,
    append: api.append,
    update: api.update,
    remove: api.remove,
    sync: api.sync,
    createDomain: api.createDomain,
    status: api.status,
    logout: logout,
    logoutAll: api.logoutAll,
    changePassword: api.changePassword,
    _reset: function () { forget(); booted = false; return boot(); }
  };
})();
