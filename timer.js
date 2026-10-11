/* Gym — countdown con timestamp (robusto a pestaña dormida).
 * Reloj inyectable para tests. Tick/done los conecta la vista. */
(function () {
  "use strict";

  function Countdown(o) {
    o = o || {};
    this._now = o.nowFn || Date.now;
    this._onTick = o.onTick || function () {};
    this._onDone = o.onDone || function () {};
    this._target = 0;
    this._total = 0;
    this._fired = true;
  }

  Countdown.prototype.start = function (seconds) {
    var s = Math.max(0, Math.round(seconds || 0));
    this._total = s;
    this._target = this._now() + s * 1000;
    this._fired = s === 0;
    if (s === 0) this._onDone();
    return this;
  };

  /** Llamar periódicamente (y al volver a la pestaña): recalcula y dispara. */
  Countdown.prototype.poll = function () {
    if (this._fired || !this._target) return this.remaining();
    var r = this.remaining();
    this._onTick(r);
    if (r <= 0) { this._fired = true; this._onDone(); }
    return r;
  };

  Countdown.prototype.remaining = function () {
    if (!this._target) return 0;
    return Math.max(0, Math.ceil((this._target - this._now()) / 1000));
  };

  Countdown.prototype.total = function () { return this._total; };
  Countdown.prototype.active = function () { return !!this._target && !this._fired; };

  Countdown.prototype.stop = function () {
    this._target = 0;
    this._total = 0;
    this._fired = true;
    return this;
  };

  if (typeof module !== "undefined" && module.exports) module.exports = { Countdown: Countdown };
  else if (typeof window !== "undefined") window.GymTimer = { Countdown: Countdown };
})();
