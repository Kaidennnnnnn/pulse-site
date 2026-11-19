/* Pulse quiz: questions from the free lessons, with instant explanations and a score that remembers your best. */
(function () {
  "use strict";
  var root = document.getElementById("pq"); if (!root || !window.PULSE_QUIZ) return;
  var Q = window.PULSE_QUIZ, $ = function (s) { return root.querySelector(s); };
  var state = { list: [], i: 0, score: 0, missed: [], answered: false, level: "all", count: 5 };
  var best = 0; try { best = +localStorage.getItem("pulse-quiz-best") || 0; } catch (e) {}
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function show(id) { ["setup", "play", "done"].forEach(function (k) { $("#quiz-" + k).hidden = k !== id; }); }
  function pick(group, attr, val, btn) { Array.prototype.forEach.call(group.children, function (b) { b.setAttribute("aria-pressed", b === btn ? "true" : "false"); }); state[attr] = val; }
  Array.prototype.forEach.call($("#quiz-level").children, function (b) { b.addEventListener("click", function () { pick($("#quiz-level"), "level", b.getAttribute("data-v"), b); updateCount(); }); });
  Array.prototype.forEach.call($("#quiz-count").children, function (b) { b.addEventListener("click", function () { pick($("#quiz-count"), "count", b.getAttribute("data-v"), b); }); });
  function pool() { return Q.filter(function (q) { return state.level === "all" || String(q.level) === state.level; }); }
  function updateCount() { var n = pool().length; $("#quiz-pool").textContent = n + " questions in this set"; }
  function start() {
    var p = shuffle(pool()), n = state.count === "all" ? p.length : Math.min(+state.count, p.length);
    state.list = p.slice(0, n).map(function (q) { var order = shuffle(q.options.map(function (_, k) { return k; })); return { q: q, order: order }; });
    state.i = 0; state.score = 0; state.missed = []; show("play"); render();
  }
  function render() {
    var item = state.list[state.i], q = item.q; state.answered = false;
    $("#quiz-prog").style.width = (state.i / state.list.length * 100) + "%"; $("#quiz-step").textContent = "Question " + (state.i + 1) + " of " + state.list.length;
    $("#quiz-q").textContent = q.q; $("#quiz-why").hidden = true; $("#quiz-next").hidden = true;
    var box = $("#quiz-opts"); box.innerHTML = "";
    item.order.forEach(function (orig, k) {
      var b = document.createElement("button"); b.type = "button"; b.className = "pq-opt"; b.innerHTML = "<kbd>" + (k + 1) + "</kbd><span></span>"; b.lastChild.textContent = q.options[orig];
      b.addEventListener("click", function () { answer(k, orig === q.answer); }); box.appendChild(b);
    });
  }
  function answer(k, ok) {
    if (state.answered) return; state.answered = true; var item = state.list[state.i], q = item.q, btns = root.querySelectorAll(".pq-opt");
    Array.prototype.forEach.call(btns, function (b, idx) { b.disabled = true; if (item.order[idx] === q.answer) b.classList.add("right"); });
    if (ok) state.score++; else { btns[k].classList.add("wrong"); state.missed.push(q); }
    var why = $("#quiz-why"); why.hidden = false; why.className = "pq-why " + (ok ? "ok" : "no");
    why.innerHTML = "<b></b><p></p><a></a>"; why.firstChild.textContent = ok ? "Correct." : "Not quite."; why.children[1].textContent = q.why;
    var a = why.lastChild; a.href = "academy.html#course-" + q.level; a.textContent = "From lesson " + q.lesson + ": " + q.title + " →";
    var nx = $("#quiz-next"); nx.hidden = false; nx.textContent = state.i + 1 >= state.list.length ? "See my result" : "Next question"; nx.focus();
  }
  function next() { if (state.i + 1 >= state.list.length) return finish(); state.i++; render(); }
  function finish() {
    show("done"); var n = state.list.length, pct = Math.round(state.score / n * 100);
    $("#quiz-prog").style.width = "100%"; $("#quiz-score").textContent = state.score + " / " + n; $("#quiz-pct").textContent = pct + "%";
    $("#quiz-verdict").textContent = pct >= 90 ? "Outstanding. You already think like a trader." : pct >= 70 ? "Solid. A few gaps to close." : pct >= 50 ? "A fair start. The explanations are where you learn." : "Everyone starts somewhere. Work through the lessons below, then try again.";
    var newBest = pct > best && n >= 5; if (newBest) { best = pct; try { localStorage.setItem("pulse-quiz-best", String(pct)); } catch (e) {} }
    $("#quiz-best").textContent = best ? "Your best: " + best + "%" + (newBest ? " (new!)" : "") : "";
    var list = $("#quiz-review"); list.innerHTML = ""; var seen = {};
    state.missed.forEach(function (q) { if (seen[q.lesson]) return; seen[q.lesson] = 1; var li = document.createElement("li"), a = document.createElement("a"); a.href = "academy.html#course-" + q.level; a.textContent = "Lesson " + q.lesson + ": " + q.title; li.appendChild(a); list.appendChild(li); });
    $("#quiz-review-wrap").hidden = !state.missed.length;
  }
  $("#quiz-start").addEventListener("click", start); $("#quiz-next").addEventListener("click", next);
  $("#quiz-again").addEventListener("click", function () { show("setup"); });
  if (window.PulseShare) { var row = $("#quiz-done .x-actions"); PulseShare.attach(row, "pulse-quiz-score.png", function () { var n = state.list.length, pct = Math.round(state.score / n * 100); return { kicker: "Pulse trading quiz", big: pct + "%", sub: state.score + " of " + n + " correct. " + $("#quiz-verdict").textContent, positive: pct >= 50 }; }, "I took the Pulse trading quiz: " + location.href.split("#")[0]); }
  $("#quiz-share").addEventListener("click", function () { var t = "I scored " + $("#quiz-pct").textContent + " on the Pulse trading quiz. Try it: " + location.href.split("#")[0]; (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { $("#quiz-share").textContent = "Copied"; setTimeout(function () { $("#quiz-share").textContent = "Copy my score"; }, 1500); }, function () { window.prompt("Copy this", t); }); });
  document.addEventListener("keydown", function (e) {
    if ($("#quiz-play").hidden) return;
    if (/^[1-9]$/.test(e.key) && !state.answered) { var b = root.querySelectorAll(".pq-opt")[+e.key - 1]; if (b) b.click(); }
    else if (e.key === "Enter" && state.answered && !$("#quiz-next").hidden) { e.preventDefault(); next(); }
  });
  updateCount(); if (best) $("#quiz-best-setup").textContent = "Your best so far: " + best + "%"; show("setup");
})();
