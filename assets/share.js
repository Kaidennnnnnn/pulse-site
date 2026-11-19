/* Shareable result cards drawn on a canvas: download as an image, or hand to the phone's share sheet. */
(function () {
  "use strict";
  function css(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
  function wrap(ctx, text, maxW) { var words = text.split(" "), lines = [], cur = ""; words.forEach(function (w) { var t = cur ? cur + " " + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }); if (cur) lines.push(cur); return lines; }

  /* opts: { kicker, big, sub, positive, footer } -> canvas 1080 x 1080 */
  function card(opts) {
    var c = document.createElement("canvas"), W = 1080, H = 1080; c.width = W; c.height = H; var x = c.getContext("2d"), font = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
    var g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, "#0A0E14"); g.addColorStop(1, "#1B2440"); x.fillStyle = g; x.fillRect(0, 0, W, H);
    var glow = x.createRadialGradient(W * 0.85, H * 0.12, 0, W * 0.85, H * 0.12, W * 0.7); glow.addColorStop(0, "rgba(124,140,255,.38)"); glow.addColorStop(1, "rgba(124,140,255,0)"); x.fillStyle = glow; x.fillRect(0, 0, W, H);
    // brand mark
    x.fillStyle = "rgba(10,14,20,.9)"; x.beginPath(); x.roundRect ? x.roundRect(80, 80, 96, 96, 24) : x.rect(80, 80, 96, 96); x.fill();
    x.strokeStyle = "#7C8CFF"; x.lineWidth = 7; x.lineCap = "round"; x.lineJoin = "round"; x.beginPath(); x.moveTo(94, 130); x.lineTo(114, 130); x.lineTo(122, 106); x.lineTo(136, 152); x.lineTo(146, 116); x.lineTo(152, 128); x.lineTo(164, 128); x.stroke();
    x.fillStyle = "#F2F5F9"; x.font = "800 52px " + font; x.textBaseline = "alphabetic"; x.fillText((window.PULSE_ADS && window.PULSE_ADS.brand) || "Pulse", 200, 144);
    x.fillStyle = "#A6B0C0"; x.font = "600 34px " + font; x.fillText(opts.kicker || "", 80, 330);
    x.fillStyle = opts.positive === false ? "#FF5C7A" : "#2BD9A0"; x.font = "800 220px " + font; x.fillText(opts.big, 80, 560);
    x.fillStyle = "#F2F5F9"; x.font = "700 52px " + font; wrap(x, opts.sub || "", W - 160).slice(0, 3).forEach(function (l, i) { x.fillText(l, 80, 660 + i * 66); });
    x.fillStyle = "rgba(255,255,255,.12)"; x.fillRect(80, H - 170, W - 160, 2);
    x.fillStyle = "#8B96A8"; x.font = "500 30px " + font; x.fillText(opts.footer || "Practice with fake money. Not financial advice.", 80, H - 110);
    return c;
  }
  function blob(canvas) { return new Promise(function (res) { canvas.toBlob(res, "image/png"); }); }
  function save(canvas, name) { blob(canvas).then(function (b) { var a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); a.remove(); }); }
  function share(canvas, name, text) {
    return blob(canvas).then(function (b) {
      var file = new File([b], name, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) return navigator.share({ files: [file], text: text }).catch(function () {});
      save(canvas, name);
    });
  }
  /* Adds a "Download image" button under `host` that draws the card with `getOpts()` on click. */
  function attach(host, name, getOpts, text) {
    var b = document.createElement("button"); b.type = "button"; b.className = "btn btn-ghost"; b.textContent = navigator.canShare ? "Share as image" : "Download image";
    b.addEventListener("click", function () { share(card(getOpts()), name, text || ""); }); host.appendChild(b); return b;
  }
  window.PulseShare = { card: card, save: save, share: share, attach: attach };
})();
