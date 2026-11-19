/* Seeded practice markets, shared by the simulator and the daily puzzle. The same seed always gives the same chart. */
(function () {
  "use strict";
  function rng(seed) {
    var a = seed >>> 0;
    return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function gauss(r) { var u = 0, v = 0; while (u === 0) u = r(); while (v === 0) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

  var SCENARIOS = {
    up:    { label: "Uptrend",  note: "Steady buying with pullbacks. Trend-following works, chasing highs hurts." },
    range: { label: "Range",    note: "Price bounces between a floor and a ceiling. Breakouts fail, fades work." },
    crash: { label: "Crash",    note: "A calm climb, then a sharp fall. Stops earn their keep." },
    wild:  { label: "Volatile", note: "Big swings both ways. Smaller size, wider stops." }
  };

  function makeMarket(kind, seed, total) {
    var r = rng(seed), bars = [], p = 100, i, ret, o, c, h, l, v;
    for (i = 0; i < total; i++) {
      var drift = 0, vol = 0.012;
      if (kind === "up") { drift = 0.0011; vol = 0.011; }
      if (kind === "range") { drift = -0.07 * (p - 100) / 100; vol = 0.010; }
      if (kind === "crash") { if (i < total * 0.47) { drift = 0.0006; vol = 0.009; } else if (i < total * 0.625) { drift = -0.0085; vol = 0.022; } else { drift = 0.0003; vol = 0.015; } }
      if (kind === "wild") { drift = 0.0001; vol = 0.024; }
      ret = drift + vol * gauss(r);
      o = p * (1 + 0.0025 * gauss(r));
      c = o * (1 + ret);
      h = Math.max(o, c) * (1 + Math.abs(gauss(r)) * vol * 0.55);
      l = Math.min(o, c) * (1 - Math.abs(gauss(r)) * vol * 0.55);
      v = Math.round(1e6 * (0.7 + r() * 0.6 + Math.abs(ret) / vol * 0.45));
      bars.push({ o: o, h: h, l: l, c: c, v: v });
      p = c;
    }
    return bars;
  }
  function sma(bars, n, upto) { if (upto + 1 < n) return null; var s = 0, k; for (k = upto - n + 1; k <= upto; k++) s += bars[k].c; return s / n; }
  function atr(bars, n, upto) {
    if (upto < n) return null; var s = 0, k, pc, tr;
    for (k = upto - n + 1; k <= upto; k++) { pc = bars[k - 1].c; tr = Math.max(bars[k].h - bars[k].l, Math.abs(bars[k].h - pc), Math.abs(bars[k].l - pc)); s += tr; }
    return s / n;
  }
  function boll(bars, n, upto) {
    var m = sma(bars, n, upto); if (m === null) return null; var s = 0, k;
    for (k = upto - n + 1; k <= upto; k++) s += Math.pow(bars[k].c - m, 2);
    var sd = Math.sqrt(s / n); return { mid: m, up: m + 2 * sd, lo: m - 2 * sd };
  }
  window.PulseMarket = { rng: rng, gauss: gauss, makeMarket: makeMarket, sma: sma, atr: atr, boll: boll, SCENARIOS: SCENARIOS };
})();
