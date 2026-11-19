/* Pulse website behaviour. Plain JavaScript, no dependencies. Every feature checks that its markup exists. */
(function () {
  "use strict";

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  function readJSON(id) {
    var el = document.getElementById(id);
    if (!el) return null;
    try { return JSON.parse(el.textContent); } catch (e) { return null; }
  }

  function money(v, sym, dp) {
    if (!isFinite(v)) return "–";
    var d = dp === undefined ? 2 : dp;
    var s = Math.abs(v).toLocaleString("en-GB", { minimumFractionDigits: d, maximumFractionDigits: d });
    return (v < 0 ? "−" : "") + (sym || "£") + s;
  }
  function num(id) {
    var el = document.getElementById(id);
    if (!el) return NaN;
    var v = parseFloat(String(el.value).replace(",", "."));
    return isFinite(v) ? v : NaN;
  }
  function setText(id, text) { var el = document.getElementById(id); if (el) el.textContent = text; }

  /* ---------- Theme: follows the system until the visitor picks one ---------- */
  var root = document.documentElement;
  var themeBtn = $(".theme-btn");
  var theme = function () { return root.getAttribute("data-theme") || (window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"); };
  var paintTheme = function () { var t = theme(); themeBtn.setAttribute("data-mode", t); themeBtn.setAttribute("aria-label", t === "dark" ? "Switch to the light theme" : "Switch to the dark theme"); };
  if (themeBtn) {
    themeBtn.hidden = false;
    paintTheme();
    themeBtn.addEventListener("click", function () {
      var next = theme() === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("pulse-theme", next); } catch (e) { /* private mode: the choice lasts for this visit */ }
      paintTheme();
      redrawCanvases();
    });
  }
  /* The Lab, the simulator and the puzzle draw on canvas with the page's colours, so they redraw when the theme changes. */
  function redrawCanvases() { try { window.dispatchEvent(new Event("resize")); } catch (e) { /* old browser: they redraw on the next interaction */ } }
  if (window.matchMedia) {
    var mq = matchMedia("(prefers-color-scheme: dark)");
    var onSystem = function () { if (!root.getAttribute("data-theme")) { if (themeBtn) paintTheme(); redrawCanvases(); } };
    if (mq.addEventListener) mq.addEventListener("change", onSystem); else if (mq.addListener) mq.addListener(onSystem);
  }

  /* ---------- Mobile menu ---------- */
  var header = $(".site-header");
  var menuBtn = $(".menu-btn");
  if (header && menuBtn) {
    menuBtn.addEventListener("click", function () {
      var open = header.classList.toggle("open");
      menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
      menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });
    $$(".mobile-menu a").forEach(function (a) {
      a.addEventListener("click", function () { header.classList.remove("open"); menuBtn.setAttribute("aria-expanded", "false"); });
    });
  }

  /* ---------- Signal explorer ---------- */
  var signals = readJSON("signal-data");
  var explorer = document.getElementById("signal-explorer");
  if (signals && explorer) {
    var ring = $(".ring", explorer);
    var circ = ring ? parseFloat(ring.getAttribute("data-circ")) : 0;
    var factorHTML = function (f) {
      var name = f[0], v = f[1], why = f[2], bar, score;
      if (v === null) {
        bar = '<i style="left:0;width:100%;background:var(--raised)"></i>';
        score = '<span class="factor-score" style="color:var(--fg-3)">n/a</span>';
      } else if (v >= 0) {
        bar = '<i style="left:50%;width:' + (v / 2) + '%;background:var(--gain)"></i>';
        score = '<span class="factor-score" style="color:var(--gain)">+' + v + "</span>";
      } else {
        bar = '<i style="left:' + (50 + v / 2) + "%;width:" + (-v / 2) + '%;background:var(--loss)"></i>';
        score = '<span class="factor-score" style="color:var(--loss)">−' + (-v) + "</span>";
      }
      var wrap = document.createElement("div");
      wrap.className = "factor";
      wrap.innerHTML = '<span class="factor-name"></span><span class="factor-bar" aria-hidden="true">' + bar + "</span>" + score + '<span class="factor-why"></span>';
      wrap.querySelector(".factor-name").textContent = name;
      wrap.querySelector(".factor-why").textContent = why;
      return wrap;
    };
    var tabs = $$("[role=tab]", explorer);
    var show = function (key) {
      var s = signals[key];
      if (!s) return;
      tabs.forEach(function (b) { var on = b.getAttribute("data-asset") === key; b.setAttribute("aria-selected", on ? "true" : "false"); b.tabIndex = on ? 0 : -1; });
      $('[data-k="symbol"]', explorer).textContent = key;
      $('[data-k="meta"]', explorer).textContent = s.name + " · " + s.venue;
      $('[data-k="confidence"]', explorer).textContent = s.confidence + "%";
      $('[data-k="label"]', explorer).textContent = s.label;
      var rating = $('[data-k="rating"]', explorer);
      rating.className = "rating " + s.rating;
      if (ring) ring.style.strokeDashoffset = String(circ * (1 - s.confidence / 100));
      var fac = $('[data-k="factors"]', explorer);
      fac.innerHTML = "";
      s.factors.forEach(function (f) { fac.appendChild(factorHTML(f)); });
      var plan = $('[data-k="plan"]', explorer);
      plan.innerHTML = "";
      s.plan.forEach(function (p) {
        var cell = document.createElement("div");
        cell.className = "plan-cell";
        cell.innerHTML = "<span></span><b></b>";
        cell.querySelector("span").textContent = p[0];
        var b = cell.querySelector("b");
        b.textContent = p[1];
        if (p[2] === "loss") b.style.color = "var(--loss)";
        if (p[2] === "gain") b.style.color = "var(--gain)";
        plan.appendChild(cell);
      });
      $('[data-k="rr"]', explorer).textContent = s.rr;
      var why = $('[data-k="why"]', explorer);
      why.innerHTML = "";
      s.why.forEach(function (w) { var li = document.createElement("li"); li.textContent = w; why.appendChild(li); });
      $('[data-k="flip"]', explorer).textContent = s.flip;
      var chart = $('[data-k="chart"]', explorer);
      if (chart && s.chart) chart.innerHTML = s.chart;
    };
    var visibleTabs = function () { return tabs.filter(function (t) { return !t.hidden; }); };
    tabs.forEach(function (b) {
      b.addEventListener("click", function () { show(b.getAttribute("data-asset")); });
      b.addEventListener("keydown", function (e) {
        var step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
        if (!step) return;
        e.preventDefault();
        var list = visibleTabs(), at = list.indexOf(b);
        var next = list[(at + step + list.length) % list.length];
        next.focus();
        show(next.getAttribute("data-asset"));
      });
    });
    /* The rating filter hides rows; if the open row is hidden, the first row left takes its place. */
    var filters = $$("[data-f]", explorer);
    filters.forEach(function (f) {
      f.addEventListener("click", function () {
        var want = f.getAttribute("data-f"), first = null, lost = false;
        filters.forEach(function (x) { x.setAttribute("aria-pressed", x === f ? "true" : "false"); });
        tabs.forEach(function (t) {
          var ok = want === "all" || t.getAttribute("data-rating") === want;
          t.hidden = !ok;
          if (ok && !first) first = t;
          if (!ok && t.getAttribute("aria-selected") === "true") lost = true;
        });
        if (lost && first) show(first.getAttribute("data-asset"));
      });
    });
  }

  /* ---------- Quiz ---------- */
  var questions = readJSON("quiz-data");
  var quiz = document.getElementById("quiz");
  if (questions && questions.length && quiz) {
    var order = questions.map(function (_, i) { return i; });
    for (var i = order.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = order[i]; order[i] = order[j]; order[j] = t; }
    var pos = 0, right = 0, answered = 0;
    var qEl = $('[data-q="q"]', quiz), optsEl = $('[data-q="opts"]', quiz), whyEl = $('[data-q="why"]', quiz);
    var lessonEl = $('[data-q="lesson"]', quiz), scoreEl = $('[data-q="score"]', quiz), nextBtn = $('[data-q="next"]', quiz);
    var letters = ["A", "B", "C", "D", "E"];
    var render = function () {
      var q = questions[order[pos % order.length]];
      lessonEl.textContent = "Lesson " + q.lesson + " · " + q.title;
      qEl.textContent = q.q;
      whyEl.hidden = true;
      optsEl.innerHTML = "";
      q.options.forEach(function (o, k) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "quiz-opt";
        b.innerHTML = '<span class="key"></span><span></span>';
        b.firstChild.textContent = letters[k];
        b.lastChild.textContent = o;
        b.addEventListener("click", function () {
          var ok = k === q.answer;
          answered += 1;
          if (ok) right += 1;
          $$(".quiz-opt", optsEl).forEach(function (x, idx) {
            x.disabled = true;
            if (idx === q.answer) x.classList.add("right");
          });
          if (!ok) b.classList.add("wrong");
          whyEl.innerHTML = "<b></b> <span></span>";
          whyEl.firstChild.textContent = ok ? "Correct." : "Not quite.";
          whyEl.lastChild.textContent = q.why;
          whyEl.hidden = false;
          scoreEl.textContent = right + " of " + answered + " right so far";
          nextBtn.focus({ preventScroll: true });
        });
        optsEl.appendChild(b);
      });
    };
    nextBtn.addEventListener("click", function () { pos += 1; render(); });
    render();
  }

  /* ---------- Search filters (Academy, Glossary) ---------- */
  function wireSearch(inputId, countId, itemSel, groupSel, noun) {
    var input = document.getElementById(inputId);
    if (!input) return;
    var items = $$(itemSel);
    var groups = groupSel ? $$(groupSel) : [];
    var count = document.getElementById(countId);
    var initialOpen = groups.map(function (g) { return g.open; });
    var run = function () {
      var q = input.value.trim().toLowerCase();
      var terms = q.split(/\s+/).filter(Boolean);
      var shown = 0;
      items.forEach(function (it) {
        var hay = it.getAttribute("data-search") || "";
        var ok = terms.every(function (t) { return hay.indexOf(t) !== -1; });
        it.hidden = !ok;
        if (ok) shown += 1;
      });
      groups.forEach(function (g, gi) {
        var any = $$(itemSel, g).some(function (it) { return !it.hidden; });
        g.hidden = !any;
        if (g.tagName === "DETAILS") g.open = terms.length ? any : initialOpen[gi];
      });
      if (count) count.textContent = terms.length ? shown + " of " + items.length + " " + noun : items.length + " " + noun;
    };
    input.addEventListener("input", run);
  }
  wireSearch("lesson-search", "lesson-count", ".lesson", ".course", "lessons");
  wireSearch("gloss-search", "gloss-count", ".gloss div", ".gloss-group", "terms");

  /* ---------- Pricing toggle ---------- */
  var billing = document.getElementById("billing");
  var proCard = document.getElementById("pro-card");
  if (billing && proCard) {
    var buttons = $$("button", billing);
    var choose = function (plan) {
      buttons.forEach(function (b) {
        var on = b.getAttribute("data-plan") === plan;
        b.setAttribute("aria-checked", on ? "true" : "false");
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });
      $('[data-role="price"]', proCard).textContent = proCard.getAttribute("data-" + plan + "-price");
      $('[data-role="unit"]', proCard).textContent = proCard.getAttribute("data-" + plan + "-unit");
      $('[data-role="sub"]', proCard).textContent = proCard.getAttribute("data-" + plan + "-sub");
      var badge = $('[data-role="badge"]', proCard);
      if (badge) badge.hidden = plan !== "yearly";
    };
    buttons.forEach(function (b) { b.addEventListener("click", function () { choose(b.getAttribute("data-plan")); }); });
  }

  /* ---------- Calculators ---------- */
  function onInputs(container, fn) {
    if (!container) return;
    $$("input", container).forEach(function (el) { el.addEventListener("input", fn); });
    fn();
  }

  onInputs($('[data-calc="size"]'), function () {
    var acct = num("ps-account"), riskPct = num("ps-risk"), entry = num("ps-entry"), stop = num("ps-stop"), target = num("ps-target");
    var warn = document.getElementById("ps-warn");
    var perUnit = Math.abs(entry - stop);
    var problems = [];
    if (!(acct > 0) || !(riskPct > 0) || !(entry > 0) || !(stop > 0)) problems.push("Enter an account size, risk, entry and stop above zero.");
    else if (perUnit === 0) problems.push("The stop can't equal the entry price. Put it where the trade idea is proved wrong.");
    if (problems.length) {
      setText("ps-units", "–"); setText("ps-cash-risk", "–"); setText("ps-value", "–"); setText("ps-share", "–"); setText("ps-rr", "–"); setText("ps-dir", "–");
      warn.textContent = problems[0]; warn.hidden = false; return;
    }
    var cashRisk = acct * riskPct / 100;
    var units = Math.floor(cashRisk / perUnit);
    var value = units * entry;
    var long = stop < entry;
    setText("ps-units", units.toLocaleString("en-GB"));
    setText("ps-cash-risk", money(units * perUnit));
    setText("ps-value", money(value));
    setText("ps-share", (value / acct * 100).toFixed(1) + "%");
    setText("ps-dir", long ? "Long (stop below entry)" : "Short (stop above entry)");
    if (target > 0 && (long ? target > entry : target < entry)) {
      setText("ps-rr", (Math.abs(target - entry) / perUnit).toFixed(1) + " : 1");
    } else {
      setText("ps-rr", "–");
    }
    var msgs = [];
    if (riskPct > 2) msgs.push("Risking more than 2% a trade means a normal losing streak can cut your account deeply.");
    if (value > acct) msgs.push("This position is bigger than your account, so it would need margin.");
    else if (value / acct > 0.25) msgs.push("This is over 25% of your account in one position. Consider a cap.");
    if (units === 0) msgs.push("The stop is too far away for this risk. Widen your risk or tighten the stop.");
    warn.textContent = msgs.join(" ");
    warn.hidden = msgs.length === 0;
  });

  onInputs($('[data-calc="edge"]'), function () {
    var rr = num("ed-rr"), win = num("ed-win") / 100, risk = num("ed-risk");
    if (!(rr > 0) || !(win >= 0 && win <= 1)) { setText("ed-be", "–"); setText("ed-exp", "–"); setText("ed-cash", "–"); setText("ed-100", "–"); setText("ed-note", "Enter a reward to risk above zero and a win rate from 0 to 100%."); return; }
    var be = 1 / (1 + rr);
    var exp = win * rr - (1 - win);
    setText("ed-be", (be * 100).toFixed(1) + "%");
    setText("ed-exp", (exp >= 0 ? "+" : "−") + Math.abs(exp).toFixed(2) + "R");
    setText("ed-cash", risk > 0 ? money(exp * risk) : "–");
    setText("ed-100", risk > 0 ? money(exp * risk * 100) : "–");
    var w = (win * 100).toFixed(0) + "%";
    setText("ed-note", exp > 0 ? "A " + w + " win rate is above the " + (be * 100).toFixed(1) + "% you need, so this edge is positive." :
      exp < 0 ? "A " + w + " win rate is below the " + (be * 100).toFixed(1) + "% you need, so this loses money over time." :
      "This exactly breaks even before costs, so fees would make it lose.");
  });

  onInputs($('[data-calc="recovery"]'), function () {
    var loss = num("rc-loss") / 100, ret = num("rc-return") / 100;
    if (!(loss > 0 && loss < 1)) { setText("rc-gain", "–"); setText("rc-years", "–"); return; }
    var need = 1 / (1 - loss) - 1;
    setText("rc-gain", (need * 100).toFixed(1) + "%");
    setText("rc-years", ret > 0 ? (Math.log(1 + need) / Math.log(1 + ret)).toFixed(1) : "–");
  });

  onInputs($('[data-calc="compound"]'), function () {
    var start = num("cp-start") || 0, month = num("cp-month") || 0, rate = num("cp-rate") / 100, years = Math.round(num("cp-years"));
    if (!(years > 0) || !isFinite(rate)) { setText("cp-total", "–"); return; }
    years = Math.min(years, 60);
    var r = Math.pow(1 + rate, 1 / 12) - 1;
    var v = start, invested = start, pts = [start], inv = [start];
    for (var m = 1; m <= years * 12; m++) {
      v = v * (1 + r) + month;
      invested += month;
      if (m % 12 === 0) { pts.push(v); inv.push(invested); }
    }
    setText("cp-total", money(v, "£", 0));
    setText("cp-in", money(invested, "£", 0));
    setText("cp-growth", money(v - invested, "£", 0));
    var svg = document.getElementById("cp-chart");
    if (svg) {
      var W = 320, H = 120, max = Math.max.apply(null, pts.concat(inv)) || 1;
      var X = function (i) { return 6 + i * (W - 12) / Math.max(1, pts.length - 1); };
      var Y = function (val) { return H - 8 - val / max * (H - 18); };
      var line = function (arr) { return arr.map(function (val, i) { return (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(val).toFixed(1); }).join(" "); };
      svg.innerHTML =
        '<path d="' + line(pts) + " L" + X(pts.length - 1).toFixed(1) + " " + (H - 8) + " L6 " + (H - 8) + ' Z" fill="var(--gain-soft)"/>' +
        '<path d="' + line(inv) + '" fill="none" stroke="var(--fg-3)" stroke-width="1.5" stroke-dasharray="4 4"/>' +
        '<path d="' + line(pts) + '" fill="none" stroke="var(--gain)" stroke-width="2.2" stroke-linejoin="round"/>' +
        '<text x="8" y="14" font-size="10" fill="var(--fg-2)" font-family="var(--mono)">Value</text>' +
        '<text x="' + (W - 8) + '" y="' + (H - 12) + '" font-size="10" fill="var(--fg-3)" text-anchor="end" font-family="var(--mono)">' + years + " yrs</text>";
    }
  });

  /* ---------- Copy buttons ---------- */
  $$("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var src = $(btn.getAttribute("data-copy"));
      if (!src) return;
      var text = src.textContent.trim();
      var done = function (msg) { var old = btn.textContent; btn.textContent = msg; setTimeout(function () { btn.textContent = old; }, 1600); };
      var select = function () {
        var range = document.createRange(); range.selectNodeContents(src);
        var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
        done("Selected. Press copy");
      };
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () { done("Copied"); }, select);
        } else { select(); }
      } catch (e) { select(); }
    });
  });

  /* ---------- Launch-news form (only present when an endpoint is configured) ---------- */
  $$("form.waitlist").forEach(function (form) {
    var msg = $(".waitlist-msg", form);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var input = $("input[type=email]", form);
      var email = input.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { msg.textContent = "Enter an email address like name@example.com."; input.focus(); return; }
      var btn = $("button", form);
      btn.disabled = true;
      msg.textContent = "Sending…";
      fetch(form.getAttribute("data-endpoint"), {
        method: "POST", headers: { "Accept": "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ email: email })
      }).then(function (r) {
        if (!r.ok) throw new Error("status " + r.status);
        msg.textContent = "You're on the list. We'll email you when Pulse launches.";
        form.reset();
      }).catch(function () {
        msg.textContent = "That didn't go through. Check your connection and try again.";
      }).then(function () { btn.disabled = false; });
    });
  });
})();

/* A link to a folded section (index.html#markets) opens it and scrolls to it. */
(function () {
  function openFromHash() {
    var id = decodeURIComponent((location.hash || "").slice(1)), el = id && document.getElementById(id);
    if (el && el.tagName === "DETAILS") { el.open = true; el.scrollIntoView(); }
  }
  openFromHash();
  window.addEventListener("hashchange", openFromHash);
})();

