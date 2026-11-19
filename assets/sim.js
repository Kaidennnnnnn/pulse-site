/* Pulse paper-trading simulator. A seeded market, the same rules as the app: half-spread on every fill, stops that gap, risk-based sizing. */
(function () {
  "use strict";
  var root = document.getElementById("sim");
  if (!root) return;

  var $ = function (s, r) { return (r || root).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || root).querySelectorAll(s)); };
  var HALF_SPREAD = 0.0002, START_CASH = 10000, VISIBLE = 90, TOTAL = 320, START_AT = 100;

  /* ---------- seeded market (shared with the puzzle) ---------- */
  var PM = window.PulseMarket, SCENARIOS = PM.SCENARIOS, sma = PM.sma, atr = PM.atr, boll = PM.boll;
  function makeMarket(kind, seed) { return PM.makeMarket(kind, seed, TOTAL); }

  /* ---------- state ---------- */
  var S = {
    kind: "up", seed: 1, bars: [], i: START_AT, cash: START_CASH, pos: null, trades: [], equity: [],
    dir: "long", setting: "stop", risk: 1, stop: null, target: null, touched: false,
    overlays: { sma20: true, sma50: false, boll: false }, timer: null, speed: 600, hover: null, drag: null, ended: false
  };

  function fmt(n, d) { return n.toLocaleString("en-GB", { minimumFractionDigits: d == null ? 2 : d, maximumFractionDigits: d == null ? 2 : d }); }
  function gbp(n) { return (n < 0 ? "-£" : "£") + fmt(Math.abs(n)); }
  function sgn(n) { return (n >= 0 ? "+" : "-") + "£" + fmt(Math.abs(n)); }
  function price() { return S.bars[S.i].c; }
  function say(msg) { var el = $("#sim-live"); if (el) el.textContent = msg; }

  function entryPrice(dir) { return price() * (dir === "long" ? 1 + HALF_SPREAD : 1 - HALF_SPREAD); }
  function exitPrice(dir, raw) { return raw * (dir === "long" ? 1 - HALF_SPREAD : 1 + HALF_SPREAD); }

  function openPnl() {
    if (!S.pos) return 0;
    var p = S.pos, px = exitPrice(p.dir, price());
    return (px - p.entry) * p.qty * (p.dir === "long" ? 1 : -1);
  }
  function equityNow() { return S.cash + (S.pos ? S.pos.collateral + openPnl() : 0); }

  /* ---------- planning (stop, target, size) ---------- */
  function defaults() {
    var a = atr(S.bars, 14, S.i) || price() * 0.02, e = entryPrice(S.dir), long = S.dir === "long";
    if (!S.touched) { S.stop = round(long ? e - 1.5 * a : e + 1.5 * a); S.target = round(long ? e + 3 * a : e - 3 * a); }
  }
  function round(x) { return Math.round(x * 100) / 100; }
  function plan() {
    var e = entryPrice(S.dir), long = S.dir === "long", ok = true, msg = "";
    var dist = long ? e - S.stop : S.stop - e;
    if (!(dist > 0)) { ok = false; msg = long ? "A long stop belongs below the price." : "A short stop belongs above the price."; }
    var tdist = long ? S.target - e : e - S.target;
    if (!(tdist > 0)) { ok = false; msg = long ? "A long target belongs above the price." : "A short target belongs below the price."; }
    var riskCash = equityNow() * S.risk / 100, qty = ok ? Math.floor(riskCash / dist) : 0, capped = false;
    if (ok && qty * e > S.cash) { qty = Math.floor(S.cash / e); capped = true; }
    if (ok && qty < 1) { ok = false; msg = "Too small to size: widen your risk or move the stop closer."; }
    return { entry: e, dist: dist, tdist: tdist, qty: qty, value: qty * e, riskCash: qty * dist, rr: ok ? tdist / dist : 0, ok: ok, msg: msg, capped: capped };
  }
  function checks(p) {
    var out = [], a = atr(S.bars, 14, S.i), long = S.dir === "long", m50 = sma(S.bars, 50, S.i), m50b = sma(S.bars, 50, S.i - 5);
    out.push({ ok: S.risk <= 2, text: S.risk <= 2 ? "Risk " + S.risk + "% is inside the 1 to 2% guideline" : "Risk " + S.risk + "% is above the 1 to 2% guideline" });
    out.push({ ok: p.rr >= 1.95, text: p.rr >= 1.95 ? "Reward to risk " + p.rr.toFixed(1) + ":1 pays for losers" : "Reward to risk " + p.rr.toFixed(1) + ":1 needs a high win rate" });
    if (a) out.push({ ok: p.dist >= 1.5 * a, text: p.dist >= 1.5 * a ? "Stop sits outside normal noise (" + (p.dist / a).toFixed(1) + " ATR)" : "Stop is inside normal noise (" + (p.dist / a).toFixed(1) + " ATR)" });
    if (m50 && m50b) { var up = m50 > m50b; out.push({ ok: up === long, text: (up === long) ? "With the 50-day trend" : "Against the 50-day trend" }); }
    return out;
  }

  /* ---------- trading ---------- */
  function openTrade() {
    if (S.pos || S.ended) return;
    var p = plan(); if (!p.ok) { say(p.msg); return; }
    var cost = p.qty * p.entry;
    S.cash -= cost;
    S.pos = { dir: S.dir, qty: p.qty, entry: p.entry, stop: S.stop, target: S.target, at: S.i, collateral: cost, risk: p.riskCash, rr: p.rr, checks: checks(p) };
    say((S.dir === "long" ? "Bought " : "Shorted ") + p.qty + " at " + fmt(p.entry) + ". Stop " + fmt(S.stop) + ", target " + fmt(S.target) + ".");
    S.touched = false; refresh();
  }
  function closeTrade(rawPrice, reason) {
    var p = S.pos; if (!p) return;
    var px = exitPrice(p.dir, rawPrice), pnl = (px - p.entry) * p.qty * (p.dir === "long" ? 1 : -1);
    S.cash += p.collateral + pnl;
    var rr = p.risk > 0 ? pnl / p.risk : 0;
    S.trades.push({ dir: p.dir, entry: p.entry, exit: px, qty: p.qty, pnl: pnl, r: rr, reason: reason, bars: S.i - p.at, at: p.at, exitAt: S.i, review: review(p, pnl, rr, reason) });
    say("Closed: " + reason + ". " + sgn(pnl) + " (" + (rr >= 0 ? "+" : "") + rr.toFixed(2) + "R).");
    S.pos = null; S.touched = false; defaults(); refresh();
  }
  function review(p, pnl, r, reason) {
    var notes = [], good = p.checks.filter(function (c) { return c.ok; }).length;
    notes.push(good + " of " + p.checks.length + " pre-trade checks were green.");
    if (reason === "Stop hit") notes.push(pnl < 0 ? "The stop did its job: a planned loss of about 1R is the cost of doing business." : "The stop had moved to protect profit.");
    if (reason === "Target hit") notes.push("You waited for the plan. That patience is the edge.");
    if (reason === "Manual") notes.push(pnl > 0 && r < 1 ? "A manual exit took less than 1R. Winners that never get room cannot pay for losers." : "A manual exit overrode the plan. Was the idea proven wrong, or did you feel something?");
    if (reason === "End of data") notes.push("Never leave a trade without a plan to exit.");
    return notes.join(" ");
  }
  function step() {
    if (S.ended) return;
    if (S.i >= TOTAL - 1) { finish(); return; }
    S.i += 1;
    var c = S.bars[S.i], p = S.pos;
    if (p) {
      var long = p.dir === "long", hitStop = long ? c.l <= p.stop : c.h >= p.stop, hitTarget = long ? c.h >= p.target : c.l <= p.target;
      if (hitStop) closeTrade(long ? Math.min(c.o, p.stop) : Math.max(c.o, p.stop), "Stop hit");
      else if (hitTarget) closeTrade(long ? Math.max(c.o, p.target) : Math.min(c.o, p.target), "Target hit");
    }
    if (!S.pos) defaults();
    S.equity.push(equityNow());
    refresh();
    if (S.i >= TOTAL - 1) finish();
  }
  function finish() {
    if (S.ended) return; stop();
    if (S.pos) closeTrade(price(), "End of data");
    S.ended = true; refresh(); showSummary();
  }

  /* ---------- challenge links ---------- */
  var params = new URLSearchParams(location.search), challengeBeat = params.has("b") ? parseInt(params.get("b"), 10) / 10 : null;
  function challengeLink(withResult) {
    var u = location.href.split(/[?#]/)[0] + "?m=" + S.kind + "&s=" + S.seed;
    if (withResult) u += "&b=" + Math.round((equityNow() - START_CASH) / START_CASH * 1000);
    return u;
  }
  function copy(text, btn, done) {
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(function () { var old = btn.textContent; btn.textContent = done; setTimeout(function () { btn.textContent = old; }, 1600); }, function () { window.prompt("Copy this link", text); });
  }

  /* ---------- timers and controls ---------- */
  function play() { if (S.timer || S.ended) return; S.timer = setInterval(step, S.speed); $("#sim-play").textContent = "Pause"; $("#sim-play").setAttribute("aria-pressed", "true"); }
  function stop() { if (S.timer) clearInterval(S.timer); S.timer = null; var b = $("#sim-play"); if (b) { b.textContent = "Play"; b.setAttribute("aria-pressed", "false"); } }
  function newMarket(kind, seed) {
    stop(); S.kind = kind || S.kind; S.seed = seed || (Math.floor(Math.random() * 1e9) + 1);
    S.bars = makeMarket(S.kind, S.seed); S.i = START_AT; S.cash = START_CASH; S.pos = null; S.trades = []; S.equity = [START_CASH]; S.ended = false; S.touched = false;
    $("#sim-summary").hidden = true; defaults(); refresh();
    $("#sim-note").textContent = SCENARIOS[S.kind].note;
    $$("[data-scn]").forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-scn") === S.kind ? "true" : "false"); });
  }

  /* ---------- drawing ---------- */
  var canvas = $("#sim-canvas"), ctx = canvas.getContext("2d"), eq = $("#sim-eq"), ectx = eq.getContext("2d");
  var geo = { w: 0, h: 0, pad: { l: 8, r: 62, t: 14, b: 26 }, vol: 0.16 };
  function css(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#888"; }
  function fit(c, wrapW, wrapH) { var d = Math.min(window.devicePixelRatio || 1, 2); c.width = wrapW * d; c.height = wrapH * d; c.style.width = wrapW + "px"; c.style.height = wrapH + "px"; c.getContext("2d").setTransform(d, 0, 0, d, 0, 0); }
  function resize() {
    var w = canvas.parentElement.clientWidth, h = Math.max(300, Math.min(520, Math.round(w * 0.58)));
    geo.w = w; geo.h = h; fit(canvas, w, h);
    var ew = eq.parentElement.clientWidth; fit(eq, ew, 64);
    draw();
  }
  function view() {
    var from = Math.max(0, S.i - VISIBLE + 1), to = S.i, lo = Infinity, hi = -Infinity, k, b, e;
    for (k = from; k <= to; k++) { b = S.bars[k]; lo = Math.min(lo, b.l); hi = Math.max(hi, b.h); }
    [S.stop, S.target].forEach(function (x) { if (x != null && (S.pos || true)) { lo = Math.min(lo, x); hi = Math.max(hi, x); } });
    if (S.pos) { lo = Math.min(lo, S.pos.stop, S.pos.entry); hi = Math.max(hi, S.pos.target, S.pos.entry); }
    var padv = (hi - lo) * 0.06; return { from: from, to: to, lo: lo - padv, hi: hi + padv };
  }
  function X(k, v) { var pw = geo.w - geo.pad.l - geo.pad.r, n = VISIBLE; return geo.pad.l + (k - v.from + 0.5) / n * pw; }
  function Y(p, v) { var ph = (geo.h - geo.pad.t - geo.pad.b) * (1 - geo.vol); return geo.pad.t + (1 - (p - v.lo) / (v.hi - v.lo)) * ph; }
  function invY(y, v) { var ph = (geo.h - geo.pad.t - geo.pad.b) * (1 - geo.vol); return v.lo + (1 - (y - geo.pad.t) / ph) * (v.hi - v.lo); }

  function draw() {
    var v = view(), W = geo.w, H = geo.h, up = css("--gain"), dn = css("--loss"), fg2 = css("--fg-2"), fg3 = css("--fg-3"), line = css("--line"), acc = css("--accent");
    ctx.clearRect(0, 0, W, H); ctx.font = "11px " + css("--mono");
    // grid and axis
    var steps = 5, k, y, pv;
    ctx.strokeStyle = line; ctx.fillStyle = fg3; ctx.lineWidth = 1; ctx.textAlign = "left";
    for (k = 0; k <= steps; k++) { pv = v.lo + (v.hi - v.lo) * k / steps; y = Math.round(Y(pv, v)) + 0.5; ctx.beginPath(); ctx.moveTo(geo.pad.l, y); ctx.lineTo(W - geo.pad.r, y); ctx.stroke(); ctx.fillText(fmt(pv), W - geo.pad.r + 6, y + 4); }
    // risk zones
    var ep = S.pos ? S.pos.entry : entryPrice(S.dir), sp = S.pos ? S.pos.stop : S.stop, tp = S.pos ? S.pos.target : S.target;
    if (sp != null && tp != null) {
      ctx.fillStyle = dn + "22"; ctx.fillRect(geo.pad.l, Math.min(Y(ep, v), Y(sp, v)), W - geo.pad.l - geo.pad.r, Math.abs(Y(sp, v) - Y(ep, v)));
      ctx.fillStyle = up + "22"; ctx.fillRect(geo.pad.l, Math.min(Y(ep, v), Y(tp, v)), W - geo.pad.l - geo.pad.r, Math.abs(Y(tp, v) - Y(ep, v)));
    }
    // volume
    var vmax = 0, b; for (k = v.from; k <= v.to; k++) vmax = Math.max(vmax, S.bars[k].v);
    var vb = geo.h - geo.pad.b, vh = (geo.h - geo.pad.t - geo.pad.b) * geo.vol * 0.9, bw = (W - geo.pad.l - geo.pad.r) / VISIBLE;
    for (k = v.from; k <= v.to; k++) { b = S.bars[k]; ctx.fillStyle = (b.c >= b.o ? up : dn) + "55"; var hh = b.v / vmax * vh; ctx.fillRect(X(k, v) - bw * 0.32, vb - hh, bw * 0.64, hh); }
    // overlays
    function lineOf(fn, color) { ctx.beginPath(); var started = false, val; for (var j = v.from; j <= v.to; j++) { val = fn(j); if (val == null) continue; var xx = X(j, v), yy = Y(val, v); if (!started) { ctx.moveTo(xx, yy); started = true; } else ctx.lineTo(xx, yy); } ctx.strokeStyle = color; ctx.lineWidth = 1.6; ctx.stroke(); }
    if (S.overlays.sma20) lineOf(function (j) { return sma(S.bars, 20, j); }, acc);
    if (S.overlays.sma50) lineOf(function (j) { return sma(S.bars, 50, j); }, css("--caution"));
    if (S.overlays.boll) { ctx.setLineDash([4, 4]); lineOf(function (j) { var q = boll(S.bars, 20, j); return q && q.up; }, fg3); lineOf(function (j) { var q = boll(S.bars, 20, j); return q && q.lo; }, fg3); ctx.setLineDash([]); }
    // candles
    for (k = v.from; k <= v.to; k++) {
      b = S.bars[k]; var col = b.c >= b.o ? up : dn, x = X(k, v);
      ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(Math.round(x) + 0.5, Y(b.h, v)); ctx.lineTo(Math.round(x) + 0.5, Y(b.l, v)); ctx.stroke();
      var top = Y(Math.max(b.o, b.c), v), bot = Y(Math.min(b.o, b.c), v); ctx.fillRect(x - bw * 0.32, top, bw * 0.64, Math.max(1.5, bot - top));
    }
    // trade markers
    S.trades.forEach(function (t) {
      [[t.at, t.entry, t.dir === "long" ? "▲" : "▼"], [t.exitAt, t.exit, "●"]].forEach(function (m) {
        if (m[0] < v.from || m[0] > v.to) return; ctx.fillStyle = t.pnl >= 0 ? up : dn; ctx.font = "12px " + css("--mono"); ctx.textAlign = "center"; ctx.fillText(m[2], X(m[0], v), Y(m[1], v) + 4); });
    });
    if (S.pos && S.pos.at >= v.from) { ctx.fillStyle = acc; ctx.font = "12px " + css("--mono"); ctx.textAlign = "center"; ctx.fillText(S.pos.dir === "long" ? "▲" : "▼", X(S.pos.at, v), Y(S.pos.entry, v) + 4); }
    // lines
    function hline(p, label, color, dash) {
      var yy = Math.round(Y(p, v)) + 0.5; ctx.setLineDash(dash || []); ctx.strokeStyle = color; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(geo.pad.l, yy); ctx.lineTo(W - geo.pad.r, yy); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = color; ctx.fillRect(W - geo.pad.r, yy - 9, geo.pad.r - 2, 18); ctx.fillStyle = "#fff"; ctx.font = "11px " + css("--mono"); ctx.textAlign = "left"; ctx.fillText(label, W - geo.pad.r + 4, yy + 4);
    }
    if (S.pos) { hline(S.pos.entry, "ENTRY", fg2, [2, 3]); hline(S.pos.stop, "STOP", dn); hline(S.pos.target, "TARGET", up); }
    else if (!S.ended) { if (S.stop != null) hline(S.stop, "STOP", dn, [6, 4]); if (S.target != null) hline(S.target, "TARGET", up, [6, 4]); }
    // last price
    var lp = price(), ly = Math.round(Y(lp, v)) + 0.5; ctx.strokeStyle = fg3; ctx.setLineDash([1, 3]); ctx.beginPath(); ctx.moveTo(geo.pad.l, ly); ctx.lineTo(W - geo.pad.r, ly); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = css("--fg"); ctx.fillRect(W - geo.pad.r, ly - 9, geo.pad.r - 2, 18); ctx.fillStyle = css("--bg"); ctx.textAlign = "left"; ctx.fillText(fmt(lp), W - geo.pad.r + 4, ly + 4);
    // crosshair
    if (S.hover && !S.drag) {
      var hp = invY(S.hover.y, v); ctx.strokeStyle = fg3; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(geo.pad.l, S.hover.y); ctx.lineTo(W - geo.pad.r, S.hover.y); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = acc; ctx.fillRect(W - geo.pad.r, S.hover.y - 9, geo.pad.r - 2, 18); ctx.fillStyle = "#fff"; ctx.fillText(fmt(hp), W - geo.pad.r + 4, S.hover.y + 4);
    }
    ctx.fillStyle = fg3; ctx.textAlign = "left"; ctx.font = "11px " + css("--mono"); ctx.fillText("Day " + (S.i + 1) + " of " + TOTAL, geo.pad.l + 4, H - 8);
    drawEq();
  }
  function drawEq() {
    var w = eq.parentElement.clientWidth, h = 64, data = S.equity.length > 1 ? S.equity : [START_CASH, START_CASH]; ectx.clearRect(0, 0, w, h);
    var lo = Math.min.apply(null, data.concat([START_CASH])), hi = Math.max.apply(null, data.concat([START_CASH])); if (hi === lo) { hi += 1; lo -= 1; }
    var base = h - 6 - (START_CASH - lo) / (hi - lo) * (h - 12); ectx.strokeStyle = css("--line-strong"); ectx.setLineDash([3, 3]); ectx.beginPath(); ectx.moveTo(0, base); ectx.lineTo(w, base); ectx.stroke(); ectx.setLineDash([]);
    ectx.beginPath(); data.forEach(function (d, k) { var x = k / (data.length - 1) * (w - 2) + 1, y = h - 6 - (d - lo) / (hi - lo) * (h - 12); if (k) ectx.lineTo(x, y); else ectx.moveTo(x, y); });
    ectx.strokeStyle = data[data.length - 1] >= START_CASH ? css("--gain") : css("--loss"); ectx.lineWidth = 2; ectx.stroke();
  }

  /* ---------- panels ---------- */
  function refresh() {
    var p = plan(), pos = S.pos, eqv = equityNow(), pn = openPnl();
    $("#sim-equity").textContent = gbp(eqv);
    var tot = eqv - START_CASH, tt = $("#sim-total"); tt.textContent = sgn(tot) + " (" + (tot / START_CASH * 100).toFixed(1) + "%)"; tt.className = tot >= 0 ? "pos" : "neg";
    $("#sim-cash").textContent = gbp(S.cash);
    $("#sim-day").textContent = (S.i + 1) + " / " + TOTAL;
    $("#sim-price").textContent = fmt(price());
    // ticket
    $$("[data-dir]").forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-dir") === S.dir ? "true" : "false"); });
    $$("[data-set]").forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-set") === S.setting ? "true" : "false"); });
    $("#sim-risk-val").textContent = S.risk.toFixed(2).replace(/\.?0+$/, "") + "%";
    if (document.activeElement !== $("#sim-stop")) $("#sim-stop").value = S.stop != null ? S.stop.toFixed(2) : "";
    if (document.activeElement !== $("#sim-target")) $("#sim-target").value = S.target != null ? S.target.toFixed(2) : "";
    $("#sim-ticket").hidden = !!pos || S.ended; $("#sim-position").hidden = !pos;
    if (!pos) {
      $("#sim-size").textContent = p.ok ? p.qty + " units" : "-";
      $("#sim-value").textContent = p.ok ? gbp(p.value) : "-";
      $("#sim-riskcash").textContent = p.ok ? gbp(p.riskCash) : "-";
      $("#sim-rr").textContent = p.ok ? p.rr.toFixed(1) + " : 1" : "-";
      var warn = $("#sim-warn"); warn.hidden = p.ok && !p.capped; warn.textContent = p.ok ? (p.capped ? "Size capped by your cash. The app's cash accounts do the same." : "") : p.msg;
      var list = $("#sim-checks"); list.innerHTML = ""; if (p.ok) checks(p).forEach(function (c) { var li = document.createElement("li"); li.className = c.ok ? "ok" : "no"; li.textContent = c.text; list.appendChild(li); });
      $("#sim-go").textContent = (S.dir === "long" ? "Buy " : "Short ") + (p.ok ? p.qty : "") + " at " + fmt(p.entry);
      $("#sim-go").disabled = !p.ok;
    } else {
      var rNow = pos.risk > 0 ? pn / pos.risk : 0;
      $("#sim-pos-title").textContent = (pos.dir === "long" ? "Long " : "Short ") + pos.qty + " @ " + fmt(pos.entry);
      var pp = $("#sim-pos-pnl"); pp.textContent = sgn(pn) + "  (" + (rNow >= 0 ? "+" : "") + rNow.toFixed(2) + "R)"; pp.className = pn >= 0 ? "pos" : "neg";
      $("#sim-pos-lines").textContent = "Stop " + fmt(pos.stop) + "  ·  Target " + fmt(pos.target) + "  ·  Held " + (S.i - pos.at) + " days";
    }
    // stats and log
    var n = S.trades.length, wins = S.trades.filter(function (t) { return t.pnl > 0; }).length, sr = S.trades.reduce(function (a, t) { return a + t.r; }, 0);
    $("#sim-stat-n").textContent = n; $("#sim-stat-win").textContent = n ? Math.round(wins / n * 100) + "%" : "-"; $("#sim-stat-r").textContent = n ? (sr / n >= 0 ? "+" : "") + (sr / n).toFixed(2) + "R" : "-";
    var peak = START_CASH, dd = 0; S.equity.forEach(function (e) { peak = Math.max(peak, e); dd = Math.max(dd, (peak - e) / peak); }); $("#sim-stat-dd").textContent = (dd * 100).toFixed(1) + "%";
    var log = $("#sim-log"); log.innerHTML = "";
    if (!n) { var li0 = document.createElement("li"); li0.className = "empty"; li0.textContent = "Your closed trades and the coach's review appear here."; log.appendChild(li0); }
    S.trades.slice().reverse().forEach(function (t) {
      var li = document.createElement("li"), head = document.createElement("div"), body = document.createElement("p");
      head.className = "log-head"; head.innerHTML = "<b>" + (t.dir === "long" ? "Long" : "Short") + " " + t.qty + "</b><span class=\"" + (t.pnl >= 0 ? "pos" : "neg") + "\">" + sgn(t.pnl) + " · " + (t.r >= 0 ? "+" : "") + t.r.toFixed(2) + "R</span>";
      body.textContent = t.reason + ". " + t.review; li.appendChild(head); li.appendChild(body); log.appendChild(li);
    });
    $("#sim-next").disabled = S.ended; $("#sim-skip").disabled = S.ended;
    draw();
  }
  function showSummary() {
    var n = S.trades.length, wins = S.trades.filter(function (t) { return t.pnl > 0; }).length, tot = equityNow() - START_CASH, box = $("#sim-summary");
    var avg = n ? S.trades.reduce(function (a, t) { return a + t.r; }, 0) / n : 0;
    var verdict = n === 0 ? "You never traded. Waiting is a position too, but you learn by taking planned risks." : tot > 0 && avg > 0 ? "A positive result with an average of " + avg.toFixed(2) + "R per trade. Do it again on a different market to see if the process holds." : "A losing run can still be a good process. Check how many trades followed the pre-trade checks.";
    box.innerHTML = "<h3>Run complete</h3><p class=\"big " + (tot >= 0 ? "pos" : "neg") + "\">" + sgn(tot) + " (" + (tot / START_CASH * 100).toFixed(1) + "%)</p><p>" + n + " trades, " + (n ? Math.round(wins / n * 100) : 0) + "% winners, " + avg.toFixed(2) + "R average. " + verdict + "</p><div class=\"x-actions\"><button class=\"btn btn-primary\" type=\"button\" id=\"sim-again\">Try another market</button><a class=\"btn btn-ghost\" href=\"academy.html#course-6\">Learn risk management</a></div>";
    box.hidden = false; $("#sim-again").addEventListener("click", function () { newMarket(S.kind); });
    var pctNow = tot / START_CASH * 100;
    if (challengeBeat !== null && isFinite(challengeBeat)) {
      var diff = pctNow - challengeBeat, line = document.createElement("p"); line.className = "big " + (diff >= 0 ? "pos" : "neg");
      line.style.fontSize = "22px"; line.textContent = diff >= 0 ? "You beat the challenge of " + (challengeBeat >= 0 ? "+" : "") + challengeBeat.toFixed(1) + "% by " + diff.toFixed(1) + " points." : "The challenge was " + (challengeBeat >= 0 ? "+" : "") + challengeBeat.toFixed(1) + "%. You were " + Math.abs(diff).toFixed(1) + " points short."; box.insertBefore(line, box.children[2]);
    }
    var row = box.querySelector(".x-actions"), ch = document.createElement("button"); ch.type = "button"; ch.className = "btn btn-ghost"; ch.textContent = "Challenge a friend"; ch.addEventListener("click", function () { copy(challengeLink(true), ch, "Link copied"); }); row.appendChild(ch);
    if (window.PulseShare) PulseShare.attach(row, "pulse-simulator-result.png", function () { return { kicker: SCENARIOS[S.kind].label + " market, " + n + " trades", big: (pctNow >= 0 ? "+" : "") + pctNow.toFixed(1) + "%", sub: n ? Math.round(wins / n * 100) + "% winners, " + avg.toFixed(2) + "R average per trade" : "I kept my powder dry.", positive: pctNow >= 0 }; }, "My result in the Pulse paper trading simulator: " + challengeLink(true));
  }

  /* ---------- events ---------- */
  function wire() {
    $$("[data-scn]").forEach(function (b) { b.addEventListener("click", function () { newMarket(b.getAttribute("data-scn")); }); });
    $("#sim-new").addEventListener("click", function () { newMarket(S.kind); });
    $("#sim-next").addEventListener("click", function () { stop(); step(); });
    $("#sim-skip").addEventListener("click", function () { stop(); for (var k = 0; k < 5 && !S.ended; k++) step(); });
    $("#sim-play").addEventListener("click", function () { S.timer ? stop() : play(); });
    $("#sim-speed").addEventListener("change", function (e) { S.speed = +e.target.value; if (S.timer) { stop(); play(); } });
    $$("[data-over]").forEach(function (b) { b.addEventListener("click", function () { var k = b.getAttribute("data-over"); S.overlays[k] = !S.overlays[k]; b.setAttribute("aria-pressed", S.overlays[k] ? "true" : "false"); draw(); }); });
    $$("[data-dir]").forEach(function (b) { b.addEventListener("click", function () { S.dir = b.getAttribute("data-dir"); S.touched = false; defaults(); refresh(); }); });
    $$("[data-set]").forEach(function (b) { b.addEventListener("click", function () { S.setting = b.getAttribute("data-set"); refresh(); }); });
    $("#sim-risk").addEventListener("input", function (e) { S.risk = +e.target.value; refresh(); });
    $("#sim-stop").addEventListener("input", function (e) { var x = parseFloat(e.target.value); if (x > 0) { S.stop = x; S.touched = true; refresh(); } });
    $("#sim-target").addEventListener("input", function (e) { var x = parseFloat(e.target.value); if (x > 0) { S.target = x; S.touched = true; refresh(); } });
    $("#sim-challenge").addEventListener("click", function () { copy(challengeLink(S.ended), this, "Link copied"); });
    $("#sim-go").addEventListener("click", openTrade);
    $("#sim-close").addEventListener("click", function () { closeTrade(price(), "Manual"); });
    $("#sim-be").addEventListener("click", function () { if (S.pos) { S.pos.stop = S.pos.entry; say("Stop moved to breakeven."); refresh(); } });
    window.addEventListener("resize", resize);
    document.addEventListener("keydown", function (e) {
      if (e.target && /input|select|textarea/i.test(e.target.tagName)) return;
      if (e.code === "Space") { e.preventDefault(); stop(); step(); }
      if (e.key === "p" || e.key === "P") { S.timer ? stop() : play(); }
      if (e.key === "n" || e.key === "N") newMarket(S.kind);
    });
    // chart pointer: crosshair, click to set stop/target, drag the lines
    function pt(e) { var r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    function near(y, p, v) { return p != null && Math.abs(Y(p, v) - y) < 8; }
    canvas.addEventListener("pointermove", function (e) {
      var q = pt(e), v = view(); S.hover = q;
      if (S.drag) { var price2 = round(invY(q.y, v)); if (S.drag === "stop") { if (S.pos) S.pos.stop = price2; else { S.stop = price2; S.touched = true; } } else { if (S.pos) S.pos.target = price2; else { S.target = price2; S.touched = true; } } refresh(); return; }
      var sp = S.pos ? S.pos.stop : S.stop, tp = S.pos ? S.pos.target : S.target;
      canvas.style.cursor = (near(q.y, sp, v) || near(q.y, tp, v)) ? "ns-resize" : "crosshair"; draw();
    });
    canvas.addEventListener("pointerleave", function () { S.hover = null; draw(); });
    canvas.addEventListener("pointerdown", function (e) {
      var q = pt(e), v = view(), sp = S.pos ? S.pos.stop : S.stop, tp = S.pos ? S.pos.target : S.target;
      if (near(q.y, sp, v)) { S.drag = "stop"; canvas.setPointerCapture(e.pointerId); return; }
      if (near(q.y, tp, v)) { S.drag = "target"; canvas.setPointerCapture(e.pointerId); return; }
      if (!S.pos && !S.ended) { var px = round(invY(q.y, v)); if (S.setting === "stop") S.stop = px; else S.target = px; S.touched = true; refresh(); }
    });
    canvas.addEventListener("pointerup", function () { S.drag = null; });
  }

  var startKind = params.get("m"), startSeed = parseInt(params.get("s"), 10);
  if (!SCENARIOS[startKind]) startKind = "up";
  wire(); newMarket(startKind, startSeed > 0 ? startSeed : 7); resize();
  if (challengeBeat !== null && isFinite(challengeBeat)) {
    var banner = $("#sim-banner"); banner.hidden = false;
    banner.textContent = "A friend scored " + (challengeBeat >= 0 ? "+" : "") + challengeBeat.toFixed(1) + "% on this exact market. Can you beat it? Play it through to the end.";
  }
})();
