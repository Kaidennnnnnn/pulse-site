/* Pulse Lab: three interactive tools drawn on canvas. No libraries. */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function css(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim() || "#888"; }
  function fmt(n, d) { return n.toLocaleString("en-GB", { minimumFractionDigits: d || 0, maximumFractionDigits: d == null ? 0 : d }); }
  function gbp(n) { var a = Math.abs(n), s = a >= 1e6 ? (a / 1e6).toFixed(2) + "m" : fmt(a, a < 100 ? 2 : 0); return (n < 0 ? "-£" : "£") + s; }
  function rng(seed) { var a = seed >>> 0; return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  /* ---------- tiny chart helper ---------- */
  function Chart(canvas, opts) {
    var self = { c: canvas, ctx: canvas.getContext("2d"), pad: { l: 58, r: 14, t: 14, b: 28 }, w: 0, h: 0, hover: null, draw: null, xfmt: String, yfmt: String };
    Object.assign(self, opts || {});
    self.fit = function () {
      var d = Math.min(window.devicePixelRatio || 1, 2), w = canvas.parentElement.clientWidth, h = Math.max(240, Math.min(380, Math.round(w * 0.5)));
      self.w = w; self.h = h; canvas.width = w * d; canvas.height = h * d; canvas.style.width = w + "px"; canvas.style.height = h + "px"; self.ctx.setTransform(d, 0, 0, d, 0, 0);
    };
    self.sx = function (x) { return self.pad.l + (x - self.x0) / (self.x1 - self.x0) * (self.w - self.pad.l - self.pad.r); };
    self.sy = function (y) { return self.pad.t + (1 - (y - self.y0) / (self.y1 - self.y0)) * (self.h - self.pad.t - self.pad.b); };
    self.ix = function (px) { return self.x0 + (px - self.pad.l) / (self.w - self.pad.l - self.pad.r) * (self.x1 - self.x0); };
    self.axes = function (xticks, yticks) {
      var c = self.ctx, i, v; c.font = "11px " + css("--mono"); c.lineWidth = 1;
      for (i = 0; i <= yticks; i++) { v = self.y0 + (self.y1 - self.y0) * i / yticks; var y = Math.round(self.sy(v)) + 0.5; c.strokeStyle = css("--line"); c.beginPath(); c.moveTo(self.pad.l, y); c.lineTo(self.w - self.pad.r, y); c.stroke(); c.fillStyle = css("--fg-3"); c.textAlign = "right"; c.fillText(self.yfmt(v), self.pad.l - 8, y + 4); }
      c.textAlign = "center"; for (i = 0; i <= xticks; i++) { v = self.x0 + (self.x1 - self.x0) * i / xticks; c.fillStyle = css("--fg-3"); c.fillText(self.xfmt(v), self.sx(v), self.h - 8); }
    };
    self.line = function (pts, color, width, dash) { var c = self.ctx; c.beginPath(); pts.forEach(function (p, k) { var x = self.sx(p[0]), y = self.sy(p[1]); k ? c.lineTo(x, y) : c.moveTo(x, y); }); c.strokeStyle = color; c.lineWidth = width || 2; c.setLineDash(dash || []); c.stroke(); c.setLineDash([]); };
    self.area = function (top, bottom, color) { var c = self.ctx; c.beginPath(); top.forEach(function (p, k) { var x = self.sx(p[0]), y = self.sy(p[1]); k ? c.lineTo(x, y) : c.moveTo(x, y); }); for (var k = bottom.length - 1; k >= 0; k--) c.lineTo(self.sx(bottom[k][0]), self.sy(bottom[k][1])); c.closePath(); c.fillStyle = color; c.fill(); };
    self.hline = function (y, color, dash, label) { var c = self.ctx, yy = Math.round(self.sy(y)) + 0.5; c.strokeStyle = color; c.setLineDash(dash || []); c.beginPath(); c.moveTo(self.pad.l, yy); c.lineTo(self.w - self.pad.r, yy); c.stroke(); c.setLineDash([]); if (label) { c.fillStyle = color; c.textAlign = "left"; c.font = "11px " + css("--mono"); c.fillText(label, self.pad.l + 6, yy - 5); } };
    self.vline = function (x, color, dash) { var c = self.ctx, xx = Math.round(self.sx(x)) + 0.5; c.strokeStyle = color; c.setLineDash(dash || []); c.beginPath(); c.moveTo(xx, self.pad.t); c.lineTo(xx, self.h - self.pad.b); c.stroke(); c.setLineDash([]); };
    canvas.addEventListener("pointermove", function (e) { var r = canvas.getBoundingClientRect(); self.hover = { x: e.clientX - r.left, y: e.clientY - r.top }; self.draw && self.draw(); });
    canvas.addEventListener("pointerleave", function () { self.hover = null; self.draw && self.draw(); });
    window.addEventListener("resize", function () { self.fit(); self.draw && self.draw(); });
    self.fit(); return self;
  }
  function bindOutputs(root, onchange) {
    $$("input[type=range]", root).forEach(function (r) {
      var out = $("[data-out='" + r.id + "']", root), suf = r.getAttribute("data-suffix") || "", pre = r.getAttribute("data-prefix") || "";
      var upd = function () { if (out) out.textContent = pre + (+r.value).toLocaleString("en-GB") + suf; };
      r.addEventListener("input", function () { upd(); onchange(); }); upd();
    });
    $$("select", root).forEach(function (s) { s.addEventListener("change", onchange); });
  }
  function val(id) { return +document.getElementById(id).value; }

  /* ---------- 1. Risk of ruin ---------- */
  (function () {
    var root = $("[data-lab=ruin]"); if (!root) return;
    var chart = Chart($("canvas", root), { yfmt: function (v) { return "£" + fmt(v / 1000, 1) + "k"; }, xfmt: function (v) { return Math.round(v); } }), seed = 11, result = null;
    function run() {
      var wr = val("rr-win") / 100, win = val("rr-avgwin"), risk = val("rr-risk") / 100, n = val("rr-trades"), ruinPct = val("rr-ruin") / 100, paths = 400, start = 10000, r = rng(seed), P = [], ruined = 0, finals = [], dds = [];
      for (var p = 0; p < paths; p++) {
        var eq = start, peak = start, dd = 0, hit = false, path = [start];
        for (var t = 0; t < n; t++) { eq += eq * risk * (r() < wr ? win : -1); if (eq > peak) peak = eq; dd = Math.max(dd, (peak - eq) / peak); if (!hit && eq <= start * (1 - ruinPct)) hit = true; path.push(eq); }
        P.push(path); finals.push(eq); dds.push(dd); if (hit) ruined++;
      }
      var sorted = finals.slice().sort(function (a, b) { return a - b; }), q = function (a, f) { return a[Math.min(a.length - 1, Math.floor(f * a.length))]; };
      var bands = []; for (var k = 0; k <= n; k++) { var col = P.map(function (x) { return x[k]; }).sort(function (a, b) { return a - b; }); bands.push([k, q(col, 0.1), q(col, 0.5), q(col, 0.9)]); }
      result = { P: P, bands: bands, ruin: ruined / paths, med: q(sorted, 0.5), lo: q(sorted, 0.1), hi: q(sorted, 0.9), dd: q(dds.slice().sort(function (a, b) { return a - b; }), 0.5), exp: wr * win - (1 - wr), n: n, ruinPct: ruinPct, start: start };
      show();
    }
    function show() {
      var R = result; if (!R) return;
      $("#rr-o-ruin").textContent = (R.ruin * 100).toFixed(R.ruin < 0.1 ? 1 : 0) + "%";
      $("#rr-o-ruin").className = R.ruin > 0.25 ? "neg" : R.ruin > 0.05 ? "warn" : "pos";
      $("#rr-o-med").textContent = gbp(R.med); $("#rr-o-range").textContent = gbp(R.lo) + " to " + gbp(R.hi);
      $("#rr-o-dd").textContent = (R.dd * 100).toFixed(0) + "%";
      var e = $("#rr-o-exp"); e.textContent = (R.exp >= 0 ? "+" : "") + R.exp.toFixed(2) + "R"; e.className = R.exp >= 0 ? "pos" : "neg";
      $("#rr-msg").textContent = R.exp <= 0 ? "This system loses money on average. No amount of position sizing fixes a negative edge: improve the win rate or the size of winners first." : R.ruin > 0.1 ? "A positive edge, but this risk per trade makes a deep drawdown likely. Smaller risk keeps you in the game long enough for the edge to show." : "A positive edge with survivable risk. Notice how wide the cloud still is: even good systems have long bad stretches.";
      chart.x0 = 0; chart.x1 = R.n; var lo = Infinity, hi = -Infinity; R.bands.forEach(function (b) { lo = Math.min(lo, b[1]); hi = Math.max(hi, b[3]); });
      chart.y0 = Math.max(0, lo * 0.9); chart.y1 = hi * 1.08; chart.draw = draw; draw();
    }
    function draw() {
      var R = result; if (!R) return; var c = chart.ctx; c.clearRect(0, 0, chart.w, chart.h); chart.axes(5, 5);
      var line = css("--accent"); R.P.slice(0, 60).forEach(function (p) { chart.line(p.map(function (v, k) { return [k, Math.min(v, chart.y1)]; }), "rgba(124,140,255,.13)", 1); });
      chart.area(R.bands.map(function (b) { return [b[0], Math.min(b[3], chart.y1)]; }), R.bands.map(function (b) { return [b[0], b[1]]; }), "rgba(124,140,255,.16)");
      chart.line(R.bands.map(function (b) { return [b[0], b[2]]; }), line, 2.5);
      chart.hline(R.start * (1 - R.ruinPct), css("--loss"), [6, 4], "ruin level"); chart.hline(R.start, css("--fg-3"), [2, 4]);
      if (chart.hover) { var k = Math.max(0, Math.min(R.n, Math.round(chart.ix(chart.hover.x)))), b = R.bands[k]; chart.vline(k, css("--fg-3"), [3, 3]);
        c.fillStyle = css("--surface"); c.strokeStyle = css("--line-strong"); var bx = Math.min(chart.w - 190, chart.sx(k) + 10); c.fillRect(bx, 18, 176, 62); c.strokeRect(bx + 0.5, 18.5, 176, 62); c.fillStyle = css("--fg"); c.textAlign = "left"; c.font = "12px " + css("--mono");
        c.fillText("After " + k + " trades", bx + 8, 36); c.fillStyle = css("--gain"); c.fillText("Good (90th): " + gbp(b[3]), bx + 8, 52); c.fillStyle = css("--accent"); c.fillText("Typical:     " + gbp(b[2]), bx + 8, 66); c.fillStyle = css("--loss"); c.fillText("Bad (10th):  " + gbp(b[1]), bx + 8, 80); }
    }
    bindOutputs(root, run); $("[data-rerun]", root).addEventListener("click", function () { seed = Math.floor(Math.random() * 1e9) + 1; run(); }); run();
  })();

  /* ---------- 2. Compounding ---------- */
  (function () {
    var root = $("[data-lab=compound]"); if (!root) return;
    var chart = Chart($("canvas", root), { yfmt: function (v) { return v >= 1e6 ? "£" + (v / 1e6).toFixed(1) + "m" : "£" + fmt(v / 1000) + "k"; }, xfmt: function (v) { return Math.round(v) + "y"; } }), D = null;
    function run() {
      var start = val("cp-start"), mo = val("cp-month"), rate = val("cp-rate") / 100, years = val("cp-years"), bal = start, contrib = start, pts = [[0, start, start]];
      for (var m = 1; m <= years * 12; m++) { bal = bal * (1 + rate / 12) + mo; contrib += mo; if (m % 12 === 0) pts.push([m / 12, bal, contrib]); }
      D = { pts: pts, years: years, final: bal, contrib: contrib, growth: bal - contrib };
      $("#cp-o-final").textContent = gbp(D.final); $("#cp-o-contrib").textContent = gbp(D.contrib); $("#cp-o-growth").textContent = gbp(D.growth);
      $("#cp-o-share").textContent = Math.round(D.growth / D.final * 100) + "%";
      $("#cp-msg").textContent = D.growth > D.contrib ? "More than half of the final pot is growth, not savings. The curve bends upward because returns earn returns." : "Early on, what you save matters more than what it earns. Time and patience move the balance toward growth.";
      chart.x0 = 0; chart.x1 = years; chart.y0 = 0; chart.y1 = D.final * 1.06; chart.draw = draw; draw();
    }
    function draw() {
      if (!D) return; var c = chart.ctx; c.clearRect(0, 0, chart.w, chart.h); chart.axes(Math.min(D.years, 8), 5);
      var zero = D.pts.map(function (p) { return [p[0], 0]; });
      chart.area(D.pts.map(function (p) { return [p[0], p[2]]; }), zero, "rgba(124,140,255,.30)");
      chart.area(D.pts.map(function (p) { return [p[0], p[1]]; }), D.pts.map(function (p) { return [p[0], p[2]]; }), "rgba(43,217,160,.30)");
      chart.line(D.pts.map(function (p) { return [p[0], p[1]]; }), css("--gain"), 2.5); chart.line(D.pts.map(function (p) { return [p[0], p[2]]; }), css("--accent"), 2);
      if (chart.hover) { var y = Math.max(0, Math.min(D.years, Math.round(chart.ix(chart.hover.x)))), p = D.pts[y]; chart.vline(y, css("--fg-3"), [3, 3]);
        var bx = Math.min(chart.w - 200, chart.sx(y) + 10); c.fillStyle = css("--surface"); c.strokeStyle = css("--line-strong"); c.fillRect(bx, 18, 186, 62); c.strokeRect(bx + 0.5, 18.5, 186, 62); c.textAlign = "left"; c.font = "12px " + css("--mono");
        c.fillStyle = css("--fg"); c.fillText("Year " + y, bx + 8, 36); c.fillStyle = css("--gain"); c.fillText("Balance:  " + gbp(p[1]), bx + 8, 52); c.fillStyle = css("--accent"); c.fillText("Paid in:  " + gbp(p[2]), bx + 8, 66); c.fillStyle = css("--fg-2"); c.fillText("Growth:   " + gbp(p[1] - p[2]), bx + 8, 80); }
    }
    bindOutputs(root, run); run();
  })();

  /* ---------- 3. Options payoff ---------- */
  (function () {
    var root = $("[data-lab=options]"); if (!root) return;
    var chart = Chart($("canvas", root), { yfmt: function (v) { return (v < 0 ? "-£" : "£") + fmt(Math.abs(v * 100)); }, xfmt: function (v) { return fmt(v, 0); } });
    function cdf(x) { var t = 1 / (1 + 0.2316419 * Math.abs(x)), d = 0.3989423 * Math.exp(-x * x / 2), p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return x > 0 ? 1 - p : p; }
    function bs(type, S, K, T, r, v) { if (T <= 0) return type === "c" ? Math.max(0, S - K) : Math.max(0, K - S); var d1 = (Math.log(S / K) + (r + v * v / 2) * T) / (v * Math.sqrt(T)), d2 = d1 - v * Math.sqrt(T); return type === "c" ? S * cdf(d1) - K * Math.exp(-r * T) * cdf(d2) : K * Math.exp(-r * T) * cdf(-d2) - S * cdf(-d1); }
    var STRATS = {
      longcall: { name: "Long call", note: "Pay a premium for the right to buy. Loss is limited to the premium; profit is unlimited above the break-even.", legs: function (S, w) { return [["c", S, 1]]; } },
      longput: { name: "Long put", note: "Pay a premium for the right to sell. A bet on a fall, with a loss limited to the premium.", legs: function (S, w) { return [["p", S, 1]]; } },
      coveredcall: { name: "Covered call", note: "Own the shares and sell a call above. You collect premium but give up the gains above the strike.", legs: function (S, w) { return [["s", 0, 1], ["c", S + w, -1]]; } },
      bullspread: { name: "Bull call spread", note: "Buy one call, sell a higher one. Cheaper than a long call, with both profit and loss capped.", legs: function (S, w) { return [["c", S, 1], ["c", S + w, -1]]; } },
      bearspread: { name: "Bear put spread", note: "Buy one put, sell a lower one. A cheaper, capped way to bet on a fall.", legs: function (S, w) { return [["p", S, 1], ["p", S - w, -1]]; } },
      straddle: { name: "Long straddle", note: "Buy a call and a put at the same strike. You win on a big move either way and lose if price stays still.", legs: function (S, w) { return [["c", S, 1], ["p", S, 1]]; } },
      condor: { name: "Iron condor", note: "Sell a call spread and a put spread. You collect premium and win if price stays in the middle.", legs: function (S, w) { return [["p", S - 2 * w, 1], ["p", S - w, -1], ["c", S + w, -1], ["c", S + 2 * w, 1]]; } }
    };
    function payoff(legs, ST, prem) { var tot = 0; legs.forEach(function (l) { var v = l[0] === "s" ? ST : l[0] === "c" ? Math.max(0, ST - l[1]) : Math.max(0, l[1] - ST); tot += l[2] * v; }); return (tot - prem) * 100 / 100; }
    var D = null;
    function run() {
      var key = $("#op-strat").value, S = val("op-spot"), w = val("op-width"), iv = val("op-iv") / 100, days = val("op-days"), T = days / 365, r = 0.04, st = STRATS[key], legs = st.legs(S, w);
      var prem = 0; legs.forEach(function (l) { prem += l[2] * (l[0] === "s" ? S : bs(l[0], S, l[1], T, r, iv)); });
      var lo = S * 0.6, hi = S * 1.4, n = 160, exp = [], now = [], i, x, mx = -Infinity, mn = Infinity;
      for (i = 0; i <= n; i++) { x = lo + (hi - lo) * i / n; exp.push([x, payoff(legs, x, prem)]); var v = 0; legs.forEach(function (l) { v += l[2] * (l[0] === "s" ? x : bs(l[0], x, l[1], Math.max(T * 0.5, 1e-6), r, iv)); }); now.push([x, v - prem]); }
      exp.forEach(function (p) { mx = Math.max(mx, p[1]); mn = Math.min(mn, p[1]); });
      var be = []; for (i = 1; i < exp.length; i++) if ((exp[i - 1][1] <= 0 && exp[i][1] > 0) || (exp[i - 1][1] >= 0 && exp[i][1] < 0)) { var a = exp[i - 1], b = exp[i]; be.push(a[0] + (b[0] - a[0]) * (0 - a[1]) / (b[1] - a[1])); }
      var edgeUp = exp[exp.length - 1][1] - exp[exp.length - 2][1] > 0.01, edgeDn = exp[1][1] - exp[0][1] < -0.01;
      D = { exp: exp, now: now, S: S, prem: prem, be: be, max: mx, min: mn, unlimUp: edgeUp, unlimDown: edgeDn && key !== "longput", name: st.name, note: st.note, lo: lo, hi: hi };
      $("#op-w-wrap").hidden = !(key !== "longcall" && key !== "longput" && key !== "straddle");
      $("#op-o-cost").textContent = (prem >= 0 ? "Pay " : "Receive ") + gbp(Math.abs(prem) * 100) + " per contract";
      $("#op-o-max").textContent = D.unlimUp ? "Unlimited" : gbp(D.max * 100);
      $("#op-o-loss").textContent = key === "coveredcall" ? gbp(-prem * 100) + " if the shares go to zero" : gbp(D.min * 100);
      $("#op-o-be").textContent = be.length ? be.map(function (b) { return fmt(b, 2); }).join("  and  ") : "None in range";
      $("#op-msg").textContent = st.note;
      chart.x0 = lo; chart.x1 = hi; var span = Math.max(Math.abs(mx), Math.abs(mn), 1); chart.y0 = Math.min(mn, -span * 0.15) * 1.1; chart.y1 = Math.max(mx, span * 0.15) * 1.1; chart.draw = draw; draw();
    }
    function draw() {
      if (!D) return; var c = chart.ctx; c.clearRect(0, 0, chart.w, chart.h); chart.axes(6, 6);
      var zero = D.exp.map(function (p) { return [p[0], 0]; }), gain = D.exp.map(function (p) { return [p[0], Math.max(0, p[1])]; }), loss = D.exp.map(function (p) { return [p[0], Math.min(0, p[1])]; });
      chart.area(gain, zero, "rgba(43,217,160,.22)"); chart.area(loss, zero, "rgba(255,92,122,.22)");
      chart.hline(0, css("--fg-3"), [2, 3]); chart.vline(D.S, css("--accent"), [4, 4]);
      chart.line(D.now, css("--accent"), 1.8, [5, 4]); chart.line(D.exp, css("--fg"), 2.6);
      c.fillStyle = css("--accent"); c.font = "11px " + css("--mono"); c.textAlign = "center"; c.fillText("price now", chart.sx(D.S), chart.pad.t + 10);
      D.be.forEach(function (b) { c.fillStyle = css("--fg"); c.beginPath(); c.arc(chart.sx(b), chart.sy(0), 4, 0, 6.3); c.fill(); });
      if (chart.hover) { var x = Math.max(D.lo, Math.min(D.hi, chart.ix(chart.hover.x))), idx = Math.round((x - D.lo) / (D.hi - D.lo) * (D.exp.length - 1)), e = D.exp[idx], nw = D.now[idx]; chart.vline(e[0], css("--fg-3"), [3, 3]);
        var bx = Math.min(chart.w - 220, chart.sx(e[0]) + 10); c.fillStyle = css("--surface"); c.strokeStyle = css("--line-strong"); c.fillRect(bx, 18, 206, 62); c.strokeRect(bx + 0.5, 18.5, 206, 62); c.textAlign = "left"; c.font = "12px " + css("--mono");
        c.fillStyle = css("--fg"); c.fillText("Price at expiry " + fmt(e[0], 2), bx + 8, 36); c.fillStyle = e[1] >= 0 ? css("--gain") : css("--loss"); c.fillText("At expiry: " + gbp(e[1] * 100), bx + 8, 52); c.fillStyle = css("--accent"); c.fillText("Halfway:   " + gbp(nw[1] * 100), bx + 8, 66); c.fillStyle = css("--fg-3"); c.fillText("per contract of 100", bx + 8, 80); }
    }
    bindOutputs(root, run); run();
  })();
})();
