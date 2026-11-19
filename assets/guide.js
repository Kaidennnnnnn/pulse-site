/* Guide pages: tap an answer to check it. */
(function () {
  "use strict";
  Array.prototype.forEach.call(document.querySelectorAll(".g-q"), function (q) {
    var right = +q.getAttribute("data-answer"), opts = q.querySelectorAll(".g-opt"), why = q.querySelector(".g-why");
    Array.prototype.forEach.call(opts, function (b, i) {
      b.addEventListener("click", function () {
        if (q.getAttribute("data-done")) return; q.setAttribute("data-done", "1");
        Array.prototype.forEach.call(opts, function (x, k) { x.disabled = true; if (k === right) x.classList.add("right"); });
        if (i !== right) b.classList.add("wrong");
        why.hidden = false;
      });
    });
  });
})();
