/* Methodology and accuracy explorers. The numbers mirror the app's signal engine and paper trading engine. */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  function val(id) { return +document.getElementById(id).value; }
  function gbp(n) { return "£" + n.toLocaleString("en-GB", { minimumFractionDigits: n < 10 ? 2 : 0, maximumFractionDigits: n < 10 ? 2 : 0 }); }
  function bindRanges(root, fn) {
    Array.prototype.forEach.call(root.querySelectorAll("input[type=range]"), function (r) {
      var out = root.querySelector("[data-out='" + r.id + "']"), pre = r.getAttribute("data-prefix") || "", suf = r.getAttribute("data-suffix") || "";
      var upd = function () { if (out) out.textContent = pre + (+r.value).toLocaleString("en-GB") + suf; }; r.addEventListener("input", function () { upd(); fn(); }); upd();
    });
    Array.prototype.forEach.call(root.querySelectorAll("select"), function (s) { s.addEventListener("change", fn); });
  }

  /* weights */
  var wRoot = $("[data-lab=weights]");
  if (wRoot) {
    var NAMES = { trend: "Trend", momentum: "Momentum", fundamentals: "Fundamentals", volume: "Volume and flow", levels: "Key levels", news: "News", context: "Market context" };
    var weights = function (regime, crypto) {
      var w = { trend: .25, momentum: .20, volume: .10, levels: .10, fundamentals: .15, news: .10, context: .10 };
      if (regime === "bull") { w.trend = .30; w.momentum = .23; w.levels = .07; }
      if (regime === "bear") { w.trend = .28; w.levels = .08; w.context = .14; }
      if (regime === "range") { w.trend = .15; w.levels = .22; w.momentum = .18; }
      if (regime === "vol") { w.levels = .14; w.context = .14; }
      if (crypto) { w.fundamentals = 0; w.momentum += .08; w.volume += .07; }
      return w;
    };
    var drawW = function () {
      var w = weights($("#mw-regime").value, $("#mw-kind").value === "crypto"), sum = 0, k, box = $("#mw-bars"); for (k in w) sum += w[k];
      box.innerHTML = ""; Object.keys(w).sort(function (a, b) { return w[b] - w[a]; }).forEach(function (key) {
        var pct = w[key] / sum * 100, row = document.createElement("div"); row.className = "x-bar";
        row.innerHTML = "<span></span><i><b></b></i><em></em>"; row.children[0].textContent = NAMES[key]; row.children[1].firstChild.style.width = pct + "%"; row.children[2].textContent = pct.toFixed(0) + "%"; box.appendChild(row);
      });
    };
    bindRanges(wRoot, drawW); drawW();
  }

  /* confidence */
  var cRoot = $("[data-lab=confidence]");
  if (cRoot) {
    var rating = function (s) { return s >= 60 ? "Strong Buy" : s >= 20 ? "Buy" : s > -20 ? "Hold" : s > -60 ? "Sell" : "Strong Sell"; };
    var run = function () {
      var score = val("mc-score"), agree = val("mc-agree") / 100, tf = $("#mc-tf").value, vol = $("#mc-vol").value === "1", earn = +$("#mc-earn").value, cal = val("mc-cal") / 100, steps = [], c;
      c = 35; steps.push("Start at 35");
      c += 50 * agree; steps.push("Add 50 x " + Math.round(agree * 100) + "% agreeing = +" + (50 * agree).toFixed(1));
      var sz = Math.min(Math.abs(score) / 4, 15); c += sz; steps.push("Add a size bonus of |score| / 4, at most 15 = +" + sz.toFixed(1));
      if (tf === "agree") { c += 10; steps.push("All three timeframe views agree: +10"); }
      if (tf === "mixed") { if (c > 60) steps.push("Timeframes disagree: capped at 60"); c = Math.min(c, 60); }
      if (vol) { c -= 10; steps.push("High-volatility regime: -10"); }
      if (earn) { c -= earn; steps.push("Earnings inside the horizon: -" + earn); }
      if (cal !== 1) { c *= cal; steps.push("Track-record calibration x " + cal.toFixed(2)); }
      c = Math.max(5, Math.min(95, c)); steps.push("Keep between 5 and 95");
      $("#mc-rating").textContent = rating(score); $("#mc-conf").textContent = Math.round(c) + " / 100"; $("#mc-meter").style.width = c + "%";
      var ol = $("#mc-steps"); ol.innerHTML = ""; steps.forEach(function (t) { var li = document.createElement("li"); li.textContent = t; ol.appendChild(li); });
    };
    bindRanges(cRoot, run); run();
  }

  /* round-trip cost */
  var aRoot = $("[data-lab=cost]");
  if (aRoot) {
    var cost = function () {
      var half = +$("#ac-class").value, market = $("#ac-order").value === "market", value = val("ac-value"), range = val("ac-range") / 100, size = val("ac-size") / 100;
      var slip = market ? range * 0.02 + Math.min(0.002, size * 0.1) : 0, adj = half + slip, one = value * adj, total = one * 2;
      $("#ac-open").textContent = gbp(one); $("#ac-close").textContent = gbp(one); $("#ac-total").textContent = gbp(total); $("#ac-share").textContent = (adj * 200).toFixed(2) + "%";
      $("#ac-msg").textContent = market ? "Each side pays half the spread (" + (half * 100).toFixed(3) + "%) plus " + (slip * 100).toFixed(3) + "% of slippage. Slippage grows on wide-range days and large orders." : "A limit order pays only half the spread on each side and no slippage, but it may never fill.";
    };
    bindRanges(aRoot, cost); cost();
  }
})();
