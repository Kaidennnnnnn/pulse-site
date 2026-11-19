/* Pulse ad creatives: drawn as SVG so they stay sharp at any size, with ready-to-paste embeds and a rotating on-site promo slot. */
(function () {
  "use strict";
  var CFG = window.PULSE_ADS || { brand: "Pulse", lessons: 645, courses: 70, url: "pricing.html", tagline: "Learn to trade" };
  var FONT = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

  var MESSAGES = [
    { id: "why",   head: "Know why before you buy.", sub: "Signals that explain themselves, " + CFG.lessons + " lessons and a paper account.", cta: "Get " + CFG.brand, short: "Know why before you buy." },
    { id: "free",  head: "Trade £10,000 of pretend money.", sub: "Real prices. Real rules. Zero risk.", cta: "Try it free", short: "Practise with £10,000 of pretend money." },
    { id: "learn", head: "Learn to trade, level by level.", sub: CFG.courses + " courses from your first share to quant systems.", cta: "Start learning", short: "Learn to trade, level by level." },
    { id: "ai",    head: "An analyst that shows its work.", sub: "Every signal comes with reasons, risks and a track record.", cta: "See how", short: "An analyst that shows its work." },
    { id: "habit", head: "Fix the habits that cost you money.", sub: "A journal that spots FOMO, revenge trades and early exits.", cta: "Meet your coach", short: "Fix the habits that cost you money." }
  ];
  var THEMES = {
    dark:   { bg1: "#0A0E14", bg2: "#151C2A", glow: "#7C8CFF", fg: "#F2F5F9", fg2: "#A6B0C0", accent: "#7C8CFF", accentInk: "#0A0E14", up: "#2BD9A0", grid: "rgba(255,255,255,.05)" },
    indigo: { bg1: "#3340C9", bg2: "#6A78FF", glow: "#B6BEFF", fg: "#FFFFFF", fg2: "#E2E5FF", accent: "#FFFFFF", accentInk: "#2430A8", up: "#7CF2CA", grid: "rgba(255,255,255,.10)" },
    light:  { bg1: "#F5F6F9", bg2: "#E4E8F3", glow: "#7C8CFF", fg: "#0B0F17", fg2: "#485263", accent: "#4F5FE8", accentInk: "#FFFFFF", up: "#0A855C", grid: "rgba(11,15,23,.06)" }
  };
  var SIZES = [
    { id: "300x250", w: 300, h: 250, name: "Medium rectangle", use: "The most common web banner" },
    { id: "728x90", w: 728, h: 90, name: "Leaderboard", use: "Top or bottom of a page" },
    { id: "320x100", w: 320, h: 100, name: "Large mobile banner", use: "Mobile sites and apps" },
    { id: "320x50", w: 320, h: 50, name: "Mobile banner", use: "Mobile sticky footers" },
    { id: "336x280", w: 336, h: 280, name: "Large rectangle", use: "Inside articles" },
    { id: "160x600", w: 160, h: 600, name: "Wide skyscraper", use: "Page sidebars" },
    { id: "300x600", w: 300, h: 600, name: "Half page", use: "Premium sidebars" },
    { id: "970x250", w: 970, h: 250, name: "Billboard", use: "Large page headers" },
    { id: "1200x628", w: 1200, h: 628, name: "Social link card", use: "Facebook, LinkedIn, X" },
    { id: "1080x1080", w: 1080, h: 1080, name: "Square post", use: "Instagram and Facebook feed" },
    { id: "1080x1920", w: 1080, h: 1920, name: "Story", use: "Instagram, TikTok, Reels" }
  ];

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function wrap(text, size, maxW, weight) { var f = weight === 800 ? 0.56 : 0.5, words = text.split(" "), lines = [], cur = ""; words.forEach(function (w) { var t = cur ? cur + " " + w : w; if (t.length * size * f > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }); if (cur) lines.push(cur); return lines; }
  function text(lines, x, y, size, color, weight, lh, anchor) { return lines.map(function (l, i) { return '<text x="' + x + '" y="' + (y + i * size * (lh || 1.12)) + '" font-size="' + size + '" font-weight="' + (weight || 700) + '" fill="' + color + '"' + (anchor ? ' text-anchor="' + anchor + '"' : "") + '>' + esc(l) + '</text>'; }).join(""); }
  function mark(x, y, s, T) { var k = s / 64; return '<g transform="translate(' + x + " " + y + ") scale(" + k + ')"><rect width="64" height="64" rx="16" fill="' + (T === THEMES.light ? "#0A0E14" : "rgba(10,14,20,.85)") + '"/><path d="M8 34h12l5-14 8 28 6-22 4 8h13" fill="none" stroke="' + (T === THEMES.light ? "#7C8CFF" : T.accent) + '" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="52" cy="14" r="4" fill="' + T.up + '"/></g>'; }
  function chartPath(w, h, seed, up) { var n = 26, pts = [], v = h * 0.62, i, r = seed * 9301 + 49297; for (i = 0; i < n; i++) { r = (r * 9301 + 49297) % 233280; v += ((up ? 0.42 : 0.5) - r / 233280) * h * 0.12; v = Math.max(h * 0.12, Math.min(h * 0.9, v)); pts.push([i / (n - 1) * w, v]); } return pts; }
  function chart(x, y, w, h, T, seed, u) {
    var pts = chartPath(w, h, seed, true), d = pts.map(function (p, i) { return (i ? "L" : "M") + (x + p[0]).toFixed(1) + " " + (y + p[1]).toFixed(1); }).join(" "), last = pts[pts.length - 1];
    return '<path d="' + d + ' L' + (x + w) + " " + (y + h) + " L" + x + " " + (y + h) + ' Z" fill="url(#' + u + 'fill)"/><path d="' + d + '" fill="none" stroke="' + T.up + '" stroke-width="' + Math.max(2, w / 120) + '" stroke-linejoin="round" stroke-linecap="round"/><circle cx="' + (x + last[0]) + '" cy="' + (y + last[1]) + '" r="' + Math.max(4, w / 60) + '" fill="' + T.up + '"/>';
  }
  function button(x, y, w, h, label, T, size) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + h / 2 + '" fill="' + T.accent + '"/><text x="' + (x + w / 2) + '" y="' + (y + h / 2 + size * 0.35) + '" font-size="' + size + '" font-weight="800" text-anchor="middle" fill="' + T.accentInk + '">' + esc(label) + '</text>'; }

  var UID = 0;
  function creative(sz, msg, themeName) {
    var u = "pa" + (++UID) + "-";
    var T = THEMES[themeName] || THEMES.dark, W = sz.w, H = sz.h, ratio = W / H, body = "", seed = (msg.id.length * 7 + W) % 97 + 3;
    var defs = '<defs><linearGradient id="' + u + 'bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + T.bg1 + '"/><stop offset="1" stop-color="' + T.bg2 + '"/></linearGradient><radialGradient id="' + u + 'glow" cx=".85" cy=".15" r=".7"><stop offset="0" stop-color="' + T.glow + '" stop-opacity=".38"/><stop offset="1" stop-color="' + T.glow + '" stop-opacity="0"/></radialGradient><linearGradient id="' + u + 'fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + T.up + '" stop-opacity=".30"/><stop offset="1" stop-color="' + T.up + '" stop-opacity="0"/></linearGradient><pattern id="' + u + 'grid" width="' + Math.max(18, Math.round(Math.min(W, H) / 10)) + '" height="' + Math.max(18, Math.round(Math.min(W, H) / 10)) + '" patternUnits="userSpaceOnUse"><path d="M0 0H' + Math.max(18, Math.round(Math.min(W, H) / 10)) + 'M0 0V' + Math.max(18, Math.round(Math.min(W, H) / 10)) + '" stroke="' + T.grid + '" fill="none"/></pattern></defs>';
    var back = '<rect width="' + W + '" height="' + H + '" fill="url(#' + u + 'bg)"/><rect width="' + W + '" height="' + H + '" fill="url(#' + u + 'grid)"/><rect width="' + W + '" height="' + H + '" fill="url(#' + u + 'glow)"/>';
    var pad = Math.round(Math.min(W, H) * 0.07), t1, hs, ss, bh, bw;
    if (ratio >= 5 && H <= 100) {              // leaderboard / mobile banners: one row
      var ms = H * 0.52, hsz = H <= 60 ? 15 : H <= 90 ? 22 : 17, bwid = H <= 60 ? 84 : 132, bhgt = H <= 60 ? 30 : H * 0.46;
      body += mark(pad, (H - ms) / 2, ms, T);
      if (W >= 600) { body += text([msg.head], pad + ms + 18, H / 2 - 2, hsz, T.fg, 800); body += text([msg.sub.length > 62 ? msg.sub.slice(0, 59) + "..." : msg.sub], pad + ms + 18, H / 2 + hsz * 0.95, 13, T.fg2, 500); }
      else { t1 = wrap(msg.short, hsz, W - ms - bwid - pad * 3 - 10, 800).slice(0, 2); body += text(t1, pad + ms + 10, H / 2 - (t1.length - 1) * hsz * 0.45 + hsz * 0.35, hsz, T.fg, 800, 1.05); }
      body += button(W - pad - bwid, (H - bhgt) / 2, bwid, bhgt, W >= 600 ? msg.cta : msg.cta.split(" ")[0] === "Get" ? "Get it" : msg.cta.length > 12 ? "Try it" : msg.cta, T, H <= 60 ? 13 : 15);
    } else if (ratio > 2.2) {                   // billboard
      hs = Math.round(H * 0.17); t1 = wrap(msg.head, hs, W * 0.46, 800);
      body += mark(pad, pad, H * 0.17, T) + text([CFG.brand], pad + H * 0.17 + 12, pad + H * 0.12, H * 0.08, T.fg, 800);
      body += text(t1, pad, H * 0.5, hs, T.fg, 800, 1.08) + text(wrap(msg.sub, 17, W * 0.46, 500), pad, H * 0.5 + t1.length * hs * 1.08 + 4, 17, T.fg2, 500);
      body += button(pad, H - pad - 40, 150, 40, msg.cta, T, 16) + chart(W * 0.56, H * 0.12, W * 0.4, H * 0.76, T, seed, u);
    } else if (H > W * 1.7) {                   // skyscrapers and stories
      var story = W >= 800, hs2 = story ? 96 : W >= 280 ? 30 : 22, mark2 = story ? 120 : W >= 280 ? 52 : 40, tw = W - pad * 2;
      t1 = wrap(msg.head, hs2, tw, 800);
      body += mark(pad, pad + (story ? 90 : 0), mark2, T) + text([CFG.brand], pad + mark2 + 14, pad + (story ? 90 : 0) + mark2 * 0.66, mark2 * 0.5, T.fg, 800);
      var ty = pad * 2 + mark2 + (story ? 150 : 40) + hs2; body += text(t1, pad, ty, hs2, T.fg, 800, 1.06);
      var sy = ty + t1.length * hs2 * 1.06 + (story ? 30 : 8), ssz = story ? 38 : 14; ss = wrap(msg.sub, ssz, tw, 500); body += text(ss, pad, sy, ssz, T.fg2, 500, 1.3);
      var chy = sy + ss.length * ssz * 1.3 + (story ? 40 : 18), chh = H - chy - (story ? 340 : 100) - pad; body += chart(pad, chy, tw, Math.max(60, chh), T, seed, u);
      bh = story ? 110 : 40; bw = story ? 520 : Math.min(tw, 150); body += button(pad, H - pad - bh - (story ? 140 : 0), bw, bh, msg.cta, T, story ? 44 : 15);
    } else if (W >= 1000 && ratio <= 1.4) {     // large squares: proportional layout
      var hq = Math.round(H * 0.088), mq = Math.round(H * 0.08), wq = wrap(msg.head, hq, W - pad * 2, 800), sq = Math.round(H * 0.034), sw = wrap(msg.sub, sq, W - pad * 2, 500);
      body += mark(pad, pad, mq, T) + text([CFG.brand], pad + mq + 16, pad + mq * 0.68, mq * 0.5, T.fg, 800);
      var yq = H * 0.25; body += text(wq, pad, yq, hq, T.fg, 800, 1.08);
      var ysub = yq + (wq.length - 1) * hq * 1.08 + sq * 2; body += text(sw, pad, ysub, sq, T.fg2, 500, 1.3);
      var chTop = Math.max(ysub + sw.length * sq * 1.3 + 30, H * 0.5), btnH = Math.round(H * 0.085), btnW = Math.round(H * 0.3);
      body += chart(pad, chTop, W - pad * 2, H - chTop - btnH - pad * 2, T, seed, u) + button(pad, H - pad - btnH, btnW, btnH, msg.cta, T, Math.round(H * 0.034));
    } else {                                    // rectangles, social cards
      var big = W >= 1000, hs3 = big ? Math.round(H * (ratio > 1.4 ? 0.14 : 0.105)) : W >= 330 ? 25 : 24, tw3 = ratio > 1.4 ? W * 0.5 : W - pad * 2, mk = big ? 96 : 34;
      t1 = wrap(msg.head, hs3, tw3, 800);
      body += mark(pad, pad, mk, T) + text([CFG.brand], pad + mk + 12, pad + mk * 0.66, mk * 0.5, T.fg, 800);
      var y1 = pad * 2 + mk + hs3 * 0.6 + (big ? 20 : 0); body += text(t1, pad, y1, hs3, T.fg, 800, 1.08);
      var ssz3 = big ? Math.round(hs3 * 0.38) : 13.5, ss3 = wrap(msg.sub, ssz3, tw3, 500), y2 = y1 + t1.length * hs3 * 1.08 + (big ? 14 : 4);
      body += text(ss3, pad, y2, ssz3, T.fg2, 500, 1.3);
      bh = big ? 76 : 34; bw = big ? 280 : 124;
      if (ratio > 1.4) body += chart(W * 0.55, H * 0.2, W * 0.4, H * 0.6, T, seed, u); else body += chart(pad, y2 + ss3.length * ssz3 * 1.3 + 12, W - pad * 2, Math.max(40, H - (y2 + ss3.length * ssz3 * 1.3 + 12) - bh - pad * 2), T, seed, u);
      body += button(pad, H - pad - bh, bw, bh, msg.cta, T, big ? 30 : 14);
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + " " + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="' + esc(CFG.brand + ": " + msg.head) + '" font-family="' + FONT + '">' + defs + back + body + "</svg>";
  }
  window.PulseAds = { creative: creative, MESSAGES: MESSAGES, THEMES: THEMES, SIZES: SIZES };

  /* ---------- the ads page ---------- */
  var gallery = document.getElementById("ad-gallery");
  if (gallery) {
    var state = { msg: 0, theme: "dark" };
    var url = CFG.url, picker = document.getElementById("ad-msgs"), themes = document.getElementById("ad-themes");
    function dl(name, href) { var a = document.createElement("a"); a.href = href; a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
    function svgBlobUrl(svg) { return URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" })); }
    function png(svg, sz, name) {
      var img = new Image(), u = svgBlobUrl(svg); img.onload = function () { var s = sz.w >= 1000 ? 1 : 2, c = document.createElement("canvas"); c.width = sz.w * s; c.height = sz.h * s; var x = c.getContext("2d"); x.drawImage(img, 0, 0, c.width, c.height); c.toBlob(function (b) { dl(name, URL.createObjectURL(b)); URL.revokeObjectURL(u); }); }; img.src = u;
    }
    function render() {
      gallery.innerHTML = "";
      SIZES.forEach(function (sz) {
        var svg = creative(sz, MESSAGES[state.msg], state.theme), card = document.createElement("figure"), file = "pulse-ad-" + MESSAGES[state.msg].id + "-" + state.theme + "-" + sz.id;
        card.className = "ad-card"; card.setAttribute("data-size", sz.id);
        var stage = document.createElement("div"); stage.className = "ad-stage"; stage.innerHTML = svg; stage.firstChild.style.maxWidth = Math.min(sz.w, 560) + "px"; stage.firstChild.style.width = "100%"; stage.firstChild.style.height = "auto";
        var cap = document.createElement("figcaption"); cap.innerHTML = "<b>" + sz.name + "</b><span>" + sz.id.replace("x", " × ") + " · " + sz.use + "</span>";
        var row = document.createElement("div"); row.className = "x-actions";
        [["Copy HTML", function (b) { var code = '<a href="' + url + '" target="_blank" rel="noopener" style="display:inline-block;line-height:0">' + svg.replace(/ width="\d+" height="\d+"/, ' width="' + sz.w + '" height="' + sz.h + '"') + "</a>"; (navigator.clipboard ? navigator.clipboard.writeText(code) : Promise.reject()).then(function () { b.textContent = "Copied"; setTimeout(function () { b.textContent = "Copy HTML"; }, 1400); }, function () { window.prompt("Copy this HTML", code); }); }],
          ["PNG", function () { png(svg, sz, file + ".png"); }], ["SVG", function () { dl(file + ".svg", svgBlobUrl(svg)); }]].forEach(function (a) { var b = document.createElement("button"); b.type = "button"; b.className = "x-chip"; b.textContent = a[0]; b.addEventListener("click", function () { a[1](b); }); row.appendChild(b); });
        card.appendChild(stage); card.appendChild(cap); card.appendChild(row); gallery.appendChild(card);
      });
    }
    MESSAGES.forEach(function (m, i) { var b = document.createElement("button"); b.type = "button"; b.className = "x-chip"; b.setAttribute("aria-pressed", i === 0 ? "true" : "false"); b.textContent = m.short; b.addEventListener("click", function () { state.msg = i; Array.prototype.forEach.call(picker.children, function (c, k) { c.setAttribute("aria-pressed", k === i ? "true" : "false"); }); render(); }); picker.appendChild(b); });
    Array.prototype.forEach.call(themes.querySelectorAll("button"), function (b) { b.addEventListener("click", function () { state.theme = b.getAttribute("data-theme"); Array.prototype.forEach.call(themes.querySelectorAll("button"), function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); }); render(); }); });
    render();
  }

  /* ---------- the rotating on-site promo slot ---------- */
  var slots = document.querySelectorAll("[data-promo]");
  var off = false; try { off = localStorage.getItem("pulse-promo-off") === "1"; } catch (e) {}
  Array.prototype.forEach.call(slots, function (slot) {
    if (off && slot.getAttribute("data-promo") !== "always") { slot.hidden = true; return; }
    var i = Math.floor(Math.random() * MESSAGES.length), theme = slot.getAttribute("data-theme") || "dark", timer = null, link = document.createElement("a"), close = document.createElement("button");
    link.className = "promo-link"; link.href = CFG.url; link.setAttribute("rel", "noopener"); close.type = "button"; close.className = "promo-close"; close.setAttribute("aria-label", "Hide promotions"); close.textContent = "×";
    function size() { return slot.clientWidth >= 700 ? SIZES[1] : SIZES[2]; }
    function paint() { link.innerHTML = creative(size(), MESSAGES[i], theme); var s = link.firstChild; s.style.width = "100%"; s.style.height = "auto"; s.style.display = "block"; }
    function next() { i = (i + 1) % MESSAGES.length; link.classList.add("swap"); setTimeout(function () { paint(); link.classList.remove("swap"); }, 220); }
    slot.appendChild(link); slot.appendChild(close); slot.insertAdjacentHTML("beforeend", '<span class="promo-tag">From ' + CFG.brand + "</span>"); paint();
    timer = setInterval(next, 7000); slot.addEventListener("mouseenter", function () { clearInterval(timer); }); slot.addEventListener("mouseleave", function () { timer = setInterval(next, 7000); });
    close.addEventListener("click", function () { slot.hidden = true; try { localStorage.setItem("pulse-promo-off", "1"); } catch (e) {} });
    window.addEventListener("resize", paint);
  });
})();
