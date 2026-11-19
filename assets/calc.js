/* Calculator pages. Each page declares data-xcalc="name"; outputs are elements with data-o="key". */
(function () {
  "use strict";
  var root = document.querySelector("[data-xcalc]"); if (!root) return;
  var kind = root.getAttribute("data-xcalc");
  function num(id) { var v = parseFloat(String(document.getElementById(id).value).replace(/,/g, "")); return isFinite(v) ? v : NaN; }
  function sel(id) { return document.getElementById(id).value; }
  function money(n, d) { if (!isFinite(n)) return "-"; return (n < 0 ? "-£" : "£") + Math.abs(n).toLocaleString("en-GB", { minimumFractionDigits: d == null ? 2 : d, maximumFractionDigits: d == null ? 2 : d }); }
  function pct(n, d) { return isFinite(n) ? n.toFixed(d == null ? 1 : d) + "%" : "-"; }
  function set(key, text, cls) { var el = root.querySelector("[data-o='" + key + "']"); if (!el) return; el.textContent = text; if (cls !== undefined) { el.className = (el.className.replace(/\b(pos|neg|warn)\b/g, "") + " " + cls).trim(); } }
  function warn(msg) { var w = root.querySelector("[data-o=warn]"); if (!w) return; w.hidden = !msg; w.textContent = msg || ""; }

  var CALC = {
    size: function () {
      var a = num("account"), r = num("risk"), e = num("entry"), s = num("stop"), t = num("target"), dist = Math.abs(e - s), units = Math.floor(a * (r / 100) / dist);
      if (!(a > 0 && r > 0 && e > 0 && s > 0) || e === s) { ["units", "cash", "value", "share", "rr", "dir"].forEach(function (k) { set(k, "-"); }); warn("Enter an entry and a different stop price."); return; }
      var long = e > s, value = units * e, rr = isFinite(t) && t !== e ? Math.abs(t - e) / dist : NaN;
      set("units", units.toLocaleString("en-GB") + " units"); set("cash", money(units * dist)); set("value", money(value)); set("share", pct(value / a * 100)); set("rr", isFinite(rr) ? rr.toFixed(1) + " : 1" : "-"); set("dir", long ? "Long" : "Short");
      var msgs = []; if (isFinite(t) && ((long && t < e) || (!long && t > e))) msgs.push("Your target is on the wrong side of the entry for a " + (long ? "long" : "short") + " trade.");
      if (value > a) msgs.push("The position is bigger than your account, so it needs margin or leverage. Lower the risk or skip the trade.");
      if (isFinite(rr) && rr < 1.5) msgs.push("Reward to risk under 1.5 needs a high win rate to pay.");
      if (r > 2) msgs.push("Risking more than 2% on one trade makes a losing streak very costly.");
      warn(msgs.join(" "));
    },
    rr: function () {
      var e = num("entry"), s = num("stop"), t = num("target"), w = num("winrate") / 100, risk = Math.abs(e - s), reward = Math.abs(t - e), ratio = reward / risk;
      if (!(risk > 0 && reward > 0)) { ["ratio", "breakeven", "expect", "rpu", "wpu", "verdict"].forEach(function (k) { set(k, "-"); }); warn("Entry, stop and target must all differ."); return; }
      var be = 1 / (1 + ratio), ex = w * ratio - (1 - w);
      set("ratio", ratio.toFixed(2) + " : 1"); set("breakeven", pct(be * 100, 0)); set("expect", (ex >= 0 ? "+" : "") + ex.toFixed(2) + "R", ex >= 0 ? "pos" : "neg"); set("rpu", money(risk)); set("wpu", money(reward));
      set("verdict", ex > 0 ? "At a " + Math.round(w * 100) + "% win rate this plan has a positive edge." : "At a " + Math.round(w * 100) + "% win rate this plan loses money over time. You need " + Math.round(be * 100) + "% or better.", ex > 0 ? "pos" : "neg");
      var long = e > s, bad = (long && (t < e || s > e)) || (!long && (t > e)); warn((long && t < e) || (!long && t > e) ? "The target is on the wrong side of the entry for the direction implied by your stop." : "");
    },
    pip: function () {
      var pair = sel("pair"), units = num("lots"), rate = num("rate"), pips = num("pips"), jpy = /JPY$/.test(pair), size = jpy ? 0.01 : 0.0001, quote = pair.slice(3);
      var val = size * units * rate;
      set("pipval", isFinite(val) ? money(val, val < 1 ? 4 : 2) : "-"); set("move", isFinite(val * pips) ? money(val * pips) : "-"); set("size", size.toString()); set("quote", quote);
    },
    margin: function () {
      var v = num("value"), lev = num("lev"), a = num("account"), mv = num("move") / 100;
      if (!(v > 0 && lev >= 1)) { ["margin", "loss", "lossacct", "wipe", "verdict"].forEach(function (k) { set(k, "-"); }); return; }
      var m = v / lev, loss = v * mv, wipe = 100 / lev;
      set("margin", money(m)); set("loss", money(-loss), "neg"); set("lossacct", isFinite(a) && a > 0 ? pct(loss / a * 100) : "-"); set("wipe", pct(wipe));
      set("verdict", loss >= m ? "A " + (mv * 100).toFixed(1) + "% move uses up all of the margin." : "That move uses " + pct(loss / m * 100, 0) + " of the margin. A move of " + wipe.toFixed(1) + "% would use it all.", loss >= m ? "neg" : "");
      warn(isFinite(a) && m > a ? "The margin needed is more than your account." : "");
    },
    pnl: function () {
      var dir = sel("dir") === "long" ? 1 : -1, e = num("entry"), x = num("exit"), q = num("qty"), f = num("fees") || 0, s = num("stop");
      if (!(e > 0 && x > 0 && q > 0)) { ["pnl", "pct", "rmult", "gross", "costshare"].forEach(function (k) { set(k, "-"); }); return; }
      var gross = (x - e) * q * dir, net = gross - f, risk = isFinite(s) && s !== e ? Math.abs(e - s) * q : NaN;
      set("pnl", (net >= 0 ? "+" : "") + money(net), net >= 0 ? "pos" : "neg"); set("pct", pct(net / (e * q) * 100, 2)); set("rmult", isFinite(risk) ? (net / risk >= 0 ? "+" : "") + (net / risk).toFixed(2) + "R" : "-"); set("gross", money(gross)); set("costshare", gross > 0 ? pct(f / gross * 100, 0) : "-");
      warn(isFinite(s) && ((dir === 1 && s >= e) || (dir === -1 && s <= e)) ? "A stop for this direction belongs on the other side of the entry." : "");
    }
  };
  var run = CALC[kind]; if (!run) return;
  root.addEventListener("input", run); root.addEventListener("change", run); run();
})();
