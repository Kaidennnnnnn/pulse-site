/* The homepage tour: arrow keys and clicks switch screens, and it advances on its own until someone takes over. */
(function () {
  "use strict";
  var root = document.querySelector("[data-tour]"); if (!root) return;
  var tabs = Array.prototype.slice.call(root.querySelectorAll("[role=tab]")), panels = tabs.map(function (t) { return document.getElementById(t.getAttribute("aria-controls")); }), cur = 0, timer = null, userTook = false;
  function show(i, focus) {
    cur = (i + tabs.length) % tabs.length;
    tabs.forEach(function (t, k) { var on = k === cur; t.setAttribute("aria-selected", on ? "true" : "false"); t.tabIndex = on ? 0 : -1; panels[k].hidden = !on; });
    if (focus) tabs[cur].focus();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { userTook = true; stop(); show(i); });
    t.addEventListener("keydown", function (e) {
      var d = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
      if (d) { e.preventDefault(); userTook = true; stop(); show(cur + d, true); }
    });
  });
  function stop() { if (timer) clearInterval(timer); timer = null; }
  function start() { if (timer || userTook || (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches)) return; timer = setInterval(function () { show(cur + 1); }, 5500); }
  root.addEventListener("mouseenter", stop); root.addEventListener("mouseleave", start); root.addEventListener("focusin", stop);
  if ("IntersectionObserver" in window) { new IntersectionObserver(function (es) { es.forEach(function (e) { e.isIntersecting ? start() : stop(); }); }, { threshold: 0.4 }).observe(root); } else start();
})();
