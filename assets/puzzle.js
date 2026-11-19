/* Daily chart puzzle: everyone gets the same seeded chart each day. Will it close higher or lower ten days on? */
(function () {
  "use strict";
  var root = document.getElementById("puzzle"); if (!root || !window.PulseMarket) return;
  var $ = function (s) { return root.querySelector(s); }, PM = window.PulseMarket;
  var SHOW = 110, HORIZON = 10, TOTAL = SHOW + HORIZON, VISIBLE = 70;
  var dayNo = Math.floor((Date.now() - Date.UTC(2026, 0, 1)) / 864e5) + 1;
  var seed = dayNo * 7919 + 13, kinds = ["up", "range", "crash", "wild", "up", "range"], kind = kinds[PM.rng(seed)() * kinds.length | 0];
  var bars = PM.makeMarket(kind, seed, TOTAL), shown = SHOW, result = null, anim = null;
  var LESSONS = {
    up:    ["An uptrend can keep going, but every pullback feels like the end.", "Trend following: buy dips toward a rising average, with a stop under the last low."],
    range: ["In a range, price keeps returning to the middle. Extremes tend to fade.", "Mean reversion works here and breakouts often fail. Check the trend before you fade it."],
    crash: ["Crashes arrive after calm. A sharp fall can run further than looks reasonable.", "This is why stops matter, and why gaps can carry price straight through them."],
    wild:  ["With big swings both ways, the direction is close to a coin flip.", "Volatile markets reward small size and wide stops, not confident predictions."]
  };
  function load(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  var stats = load("pulse-puzzle-stats") || { played: 0, correct: 0, streak: 0, best: 0, last: 0 };
  result = load("pulse-puzzle-" + dayNo);

  var canvas = $("#pz-canvas"), ctx = canvas.getContext("2d");
  function css(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim() || "#888"; }
  function fit() { var d = Math.min(window.devicePixelRatio || 1, 2), w = canvas.parentElement.clientWidth, h = Math.max(260, Math.min(420, Math.round(w * 0.5))); canvas.width = w * d; canvas.height = h * d; canvas.style.width = w + "px"; canvas.style.height = h + "px"; ctx.setTransform(d, 0, 0, d, 0, 0); return [w, h]; }
  function draw() {
    var dim = fit(), W = dim[0], H = dim[1], from = Math.max(0, shown - VISIBLE), lo = Infinity, hi = -Infinity, k, b, pad = { l: 10, r: 56, t: 14, b: 14 };
    for (k = from; k < shown; k++) { lo = Math.min(lo, bars[k].l); hi = Math.max(hi, bars[k].h); }
    var span = hi - lo, rows = SHOW - from + HORIZON; lo -= span * 0.08; hi += span * 0.08;
    var X = function (i) { return pad.l + (i - from + 0.5) / (VISIBLE + HORIZON) * (W - pad.l - pad.r); }, Y = function (p) { return pad.t + (1 - (p - lo) / (hi - lo)) * (H - pad.t - pad.b); }, bw = (W - pad.l - pad.r) / (VISIBLE + HORIZON);
    ctx.clearRect(0, 0, W, H); ctx.font = "11px " + css("--mono");
    for (k = 0; k <= 4; k++) { var pv = lo + (hi - lo) * k / 4, y = Math.round(Y(pv)) + 0.5; ctx.strokeStyle = css("--line"); ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke(); ctx.fillStyle = css("--fg-3"); ctx.fillText(pv.toFixed(1), W - pad.r + 6, y + 4); }
    // the unknown future, shaded
    ctx.fillStyle = css("--accent") + "14"; ctx.fillRect(X(SHOW - 1) + bw / 2, pad.t, W - pad.r - X(SHOW - 1) - bw / 2, H - pad.t - pad.b);
    ctx.beginPath(); var started = false; for (k = from; k < shown; k++) { var m = PM.sma(bars, 20, k); if (m === null) continue; if (!started) { ctx.moveTo(X(k), Y(m)); started = true; } else ctx.lineTo(X(k), Y(m)); } ctx.strokeStyle = css("--accent"); ctx.lineWidth = 1.5; ctx.stroke();
    for (k = from; k < shown; k++) {
      b = bars[k]; var col = b.c >= b.o ? css("--gain") : css("--loss"), x = X(k); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(Math.round(x) + 0.5, Y(b.h)); ctx.lineTo(Math.round(x) + 0.5, Y(b.l)); ctx.stroke();
      var t = Y(Math.max(b.o, b.c)), bo = Y(Math.min(b.o, b.c)); ctx.fillRect(x - bw * 0.32, t, bw * 0.64, Math.max(1.5, bo - t));
    }
    var base = bars[SHOW - 1].c, by = Math.round(Y(base)) + 0.5; ctx.setLineDash([4, 4]); ctx.strokeStyle = css("--fg-3"); ctx.beginPath(); ctx.moveTo(pad.l, by); ctx.lineTo(W - pad.r, by); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = css("--fg"); ctx.textAlign = "left"; ctx.fillText("today " + base.toFixed(2), pad.l + 4, by - 6);
    if (shown === SHOW) { ctx.fillStyle = css("--fg-3"); ctx.textAlign = "center"; ctx.fillText("next 10 days", X(SHOW + 4), H / 2); ctx.textAlign = "left"; }
  }

  function render() {
    $("#pz-no").textContent = "Puzzle #" + dayNo;
    $("#pz-streak").textContent = stats.streak; $("#pz-played").textContent = stats.played; $("#pz-rate").textContent = stats.played ? Math.round(stats.correct / stats.played * 100) + "%" : "-"; $("#pz-best").textContent = stats.best;
    $("#pz-pick").hidden = !!result; $("#pz-result").hidden = !result;
    if (result) { shown = TOTAL; showResult(); }
    draw();
  }
  function showResult() {
    var base = bars[SHOW - 1].c, end = bars[TOTAL - 1].c, up = end > base, chg = (end - base) / base * 100;
    $("#pz-verdict").textContent = result.correct ? "You called it." : "Not this time.";
    $("#pz-verdict").className = result.correct ? "pos" : "neg";
    $("#pz-detail").textContent = "Ten days later the close was " + end.toFixed(2) + ", " + (up ? "up " : "down ") + Math.abs(chg).toFixed(1) + "% from " + base.toFixed(2) + ". You said " + result.pick + ".";
    $("#pz-kind").textContent = PM.SCENARIOS[kind].label + " market";
    $("#pz-lesson").textContent = LESSONS[kind][0] + " " + LESSONS[kind][1];
    var share = $("#pz-share"); share.innerHTML = "";
    var copy = document.createElement("button"); copy.type = "button"; copy.className = "btn btn-primary"; copy.textContent = "Copy my result";
    var text = "Pulse chart puzzle #" + dayNo + ": " + (result.correct ? "correct" : "missed") + ", streak " + stats.streak + ". " + location.href.split(/[?#]/)[0];
    copy.addEventListener("click", function () { (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(function () { copy.textContent = "Copied"; setTimeout(function () { copy.textContent = "Copy my result"; }, 1500); }, function () { window.prompt("Copy this", text); }); });
    share.appendChild(copy);
    if (window.PulseShare) PulseShare.attach(share, "pulse-puzzle-" + dayNo + ".png", function () { return { kicker: "Chart puzzle #" + dayNo, big: result.correct ? "Correct" : "Missed", sub: stats.streak + "-day streak. " + stats.correct + " of " + stats.played + " right so far.", positive: result.correct }; }, text);
    var h = Math.max(0, 24 - new Date().getUTCHours()); $("#pz-next").textContent = "Next puzzle in about " + h + " hour" + (h === 1 ? "" : "s") + ".";
  }
  function answer(pick) {
    var up = bars[TOTAL - 1].c > bars[SHOW - 1].c, correct = (pick === "higher") === up;
    result = { pick: pick, correct: correct }; save("pulse-puzzle-" + dayNo, result);
    stats.played += 1; if (correct) { stats.correct += 1; stats.streak = stats.last === dayNo - 1 ? stats.streak + 1 : 1; } else stats.streak = 0;
    stats.best = Math.max(stats.best, stats.streak); stats.last = dayNo; save("pulse-puzzle-stats", stats);
    $("#pz-pick").hidden = true; shown = SHOW; var step = function () { shown += 1; draw(); if (shown < TOTAL) anim = setTimeout(step, 220); else { $("#pz-result").hidden = false; render(); } }; step();
  }
  $("#pz-up").addEventListener("click", function () { answer("higher"); });
  $("#pz-down").addEventListener("click", function () { answer("lower"); });
  window.addEventListener("resize", draw); render();
})();
