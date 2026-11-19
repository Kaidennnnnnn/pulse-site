/* Classroom challenge link generator. */
(function () {
  "use strict";
  var kind = document.getElementById("cl-kind"); if (!kind) return;
  var seed = document.getElementById("cl-seed"), link = document.getElementById("cl-link"), open = document.getElementById("cl-open");
  function url() { var s = parseInt(seed.value, 10); if (!(s > 0)) s = 2026; return location.href.split(/[?#]/)[0].replace(/[^/]*$/, "") + "try.html?m=" + kind.value + "&s=" + s; }
  function upd() { var u = url(); link.textContent = u; open.href = u; }
  kind.addEventListener("change", upd); seed.addEventListener("input", upd);
  document.getElementById("cl-random").addEventListener("click", function () { seed.value = Math.floor(Math.random() * 90000) + 10000; upd(); });
  var b = document.getElementById("cl-copy"); b.addEventListener("click", function () { (navigator.clipboard ? navigator.clipboard.writeText(url()) : Promise.reject()).then(function () { b.textContent = "Copied"; setTimeout(function () { b.textContent = "Copy link"; }, 1500); }, function () { window.prompt("Copy this link", url()); }); });
  upd();
})();
