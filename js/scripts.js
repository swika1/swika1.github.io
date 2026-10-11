(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var desktopMQ = window.matchMedia("(min-width: 960px)");

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* ---------- Top bar, progress bar ---------- */
  var topbar = document.getElementById("topbar");
  var progress = document.getElementById("progress");
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var y = window.scrollY;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      if (progress) progress.style.transform = "scaleX(" + (max > 0 ? clamp(y / max, 0, 1) : 0) + ")";
      if (topbar) topbar.classList.toggle("scrolled", y > 8);
      portraitScroll();
      ticking = false;
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- Active section in top links and dock ---------- */
  var links = Array.prototype.slice.call(document.querySelectorAll(".toplinks a, .dock a"));
  var sections = ["about", "experience", "research", "projects", "skills", "contact"]
    .map(function (id) { return document.getElementById(id); })
    .filter(Boolean);
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var id = e.target.id;
        links.forEach(function (a) { a.classList.toggle("active", a.getAttribute("href") === "#" + id); });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach(function (s) { io.observe(s); });
    var hero = document.getElementById("home");
    if (hero) {
      new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) links.forEach(function (a) { a.classList.remove("active"); });
      }, { rootMargin: "-45% 0px -50% 0px" }).observe(hero);
    }
  }

  /* ---------- Experience: all open on desktop, accordion on phones ---------- */
  var jobs = Array.prototype.slice.call(document.querySelectorAll(".job"));
  function syncJobs() {
    if (desktopMQ.matches) jobs.forEach(function (d) { d.open = true; });
  }
  jobs.forEach(function (d) {
    d.querySelector("summary").addEventListener("click", function (e) {
      if (desktopMQ.matches) e.preventDefault();
    });
  });
  syncJobs();
  if (desktopMQ.addEventListener) desktopMQ.addEventListener("change", syncJobs);

  /* ---------- Copy email ---------- */
  var toast = document.getElementById("toast");
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(showToast.t);
    showToast.t = setTimeout(function () { toast.classList.remove("show"); }, 2200);
  }
  document.querySelectorAll("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var value = btn.getAttribute("data-copy");
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(value).then(function () { showToast("Email address copied"); }, function () { showToast(value); });
      } else {
        showToast(value);
      }
    });
  });

  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Projects carousel ---------- */
  var track = document.getElementById("track");
  var dotsEl = document.getElementById("dots");
  if (track && dotsEl) {
    var cards = Array.prototype.slice.call(track.children);
    cards.forEach(function () { dotsEl.appendChild(document.createElement("i")); });
    var dots = Array.prototype.slice.call(dotsEl.children);
    var updateDots = function () {
      var left = track.scrollLeft;
      var best = 0, bestD = Infinity;
      var base = cards[0].offsetLeft;
      cards.forEach(function (c, i) {
        var d = Math.abs(c.offsetLeft - base - left);
        if (d < bestD) { bestD = d; best = i; }
      });
      if (left + track.clientWidth >= track.scrollWidth - 4) best = cards.length - 1;
      dots.forEach(function (d, i) { d.classList.toggle("on", i === best); });
    };
    track.addEventListener("scroll", function () { requestAnimationFrame(updateDots); }, { passive: true });
    updateDots();
    document.querySelectorAll(".tn").forEach(function (b) {
      b.addEventListener("click", function () {
        var step = cards[0].getBoundingClientRect().width + 12;
        track.scrollBy({ left: step * Number(b.getAttribute("data-dir")), behavior: reduceMotion ? "auto" : "smooth" });
      });
    });
  }

  /* ---------- Hero portrait: RGB channel separation ---------- */
  var portrait = document.getElementById("portrait");
  var stage = portrait && portrait.querySelector(".portrait-stage");
  var img = document.getElementById("portraitImg");
  var canvas = document.getElementById("rgbCanvas");
  var ctx = canvas && canvas.getContext("2d");
  var layers = null;          // [R, G, B] offscreen canvases
  var cur = { x: 0, y: 0 };   // current offset
  var tgt = { x: 0, y: 0 };   // target offset
  var scrollSplit = 0;
  var dragging = false, dragX0 = 0, dragBase = 0;
  var hoverOn = false;
  var raf = 0;

  function buildLayers() {
    if (!ctx || !img.naturalWidth) return false;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.round(stage.clientWidth * dpr), h = Math.round(stage.clientHeight * dpr);
    if (!w || !h) return false;
    canvas.width = w; canvas.height = h;
    // object-fit: cover, object-position: 50% 0
    var s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    var dw = img.naturalWidth * s, dh = img.naturalHeight * s;
    var dx = (w - dw) / 2, dy = 0;
    var tmp = document.createElement("canvas");
    tmp.width = w; tmp.height = h;
    var t = tmp.getContext("2d");
    t.drawImage(img, dx, dy, dw, dh);
    var src;
    try { src = t.getImageData(0, 0, w, h); } catch (err) { return false; }
    layers = [0, 1, 2].map(function (ch) {
      var out = t.createImageData(w, h);
      var a = src.data, o = out.data;
      for (var i = 0; i < a.length; i += 4) {
        o[i + ch] = a[i + ch];
        o[i + 3] = a[i + 3];
      }
      var c = document.createElement("canvas");
      c.width = w; c.height = h;
      c.getContext("2d").putImageData(out, 0, 0);
      return c;
    });
    return true;
  }

  function draw() {
    if (!layers) return;
    var dpr = canvas.width / stage.clientWidth;
    var x = cur.x * dpr, y = cur.y * dpr;
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = "lighter";
    ctx.drawImage(layers[0], -x, -y * 0.6);
    ctx.drawImage(layers[1], 0, y);
    ctx.drawImage(layers[2], x, -y * 0.6);
    portrait.classList.toggle("split", Math.abs(cur.x) > 7 || Math.abs(cur.y) > 7);
  }

  function loop() {
    var goalX = tgt.x + (dragging ? 0 : scrollSplit);
    var goalY = tgt.y;
    var k = dragging ? 0.35 : 0.1;
    cur.x += (goalX - cur.x) * k;
    cur.y += (goalY - cur.y) * k;
    draw();
    if (Math.abs(goalX - cur.x) > 0.05 || Math.abs(goalY - cur.y) > 0.05 || dragging) {
      raf = requestAnimationFrame(loop);
    } else {
      cur.x = goalX; cur.y = goalY; draw(); raf = 0;
    }
  }
  function kick() { if (layers && !raf) raf = requestAnimationFrame(loop); }

  function portraitScroll() {
    if (!layers || !stage) return;
    var r = stage.getBoundingClientRect();
    var p = clamp(-r.top / (r.height * 0.9), 0, 1);
    scrollSplit = reduceMotion ? 0 : p * Math.min(70, r.width * 0.12);
    kick();
  }

  function initPortrait() {
    if (!portrait || !img || !ctx) return;
    if (!buildLayers()) return;   // keeps the plain photo
    portrait.classList.add("live");
    if (!reduceMotion) { cur.x = Math.min(110, stage.clientWidth * 0.2); cur.y = 18; }
    draw();
    setTimeout(kick, 250);

    stage.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      dragging = true; dragX0 = e.clientX; dragBase = tgt.x;
      stage.style.cursor = "grabbing";
      kick();
    });
    window.addEventListener("pointermove", function (e) {
      if (dragging) {
        var lim = stage.clientWidth * 0.3;
        tgt.x = clamp(dragBase + (e.clientX - dragX0) * 0.7, -lim, lim);
        kick();
      } else if (e.pointerType === "mouse" && hoverOn) {
        var r = stage.getBoundingClientRect();
        tgt.x = ((e.clientX - r.left) / r.width - 0.5) * 2 * 22;
        tgt.y = ((e.clientY - r.top) / r.height - 0.5) * 2 * 10;
        kick();
      }
    }, { passive: true });
    function release() {
      if (!dragging) return;
      dragging = false; tgt.x = 0; tgt.y = 0;
      stage.style.cursor = "";
      kick();
    }
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    stage.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") hoverOn = true; });
    stage.addEventListener("pointerleave", function (e) {
      if (e.pointerType === "mouse") { hoverOn = false; if (!dragging) { tgt.x = 0; tgt.y = 0; kick(); } }
    });

    var rw = 0;
    window.addEventListener("resize", function () {
      clearTimeout(rw);
      rw = setTimeout(function () { if (buildLayers()) { draw(); portraitScroll(); } }, 150);
    });
  }

  function whenImage(cb) {
    if (!img) return;
    if (img.complete && img.naturalWidth) { cb(); return; }
    img.addEventListener("load", cb, { once: true });
  }

  /* ---------- Research: layered manuscript explorer ---------- */
  var page = document.getElementById("pageCanvas");
  var label = document.getElementById("explorerLabel");
  var state = { ink: true, bleed: true, stain: true, age: true };
  var pageLayers = null;

  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var recto = [
    "Montréal, le 14 octobre 1851",
    "Mon cher ami,",
    "je vous écris ces quelques lignes pour vous",
    "donner des nouvelles de notre voyage. La mer",
    "fut longue, mais le pays est beau et l'hiver",
    "approche déjà. Les archives de la ville sont",
    "riches en manuscrits que je compte étudier",
    "avec soin cet automne. Votre dévoué,"
  ];
  var verso = [
    "Monsieur le Directeur,",
    "j'ai l'honneur de vous adresser la liste des",
    "registres reçus ce mois-ci, dont plusieurs",
    "ont souffert de l'humidité et du temps.",
    "Je vous prie de bien vouloir en prendre",
    "connaissance à votre retour en ville,",
    "et d'agréer mes salutations distinguées."
  ];

  function blank(W, H) {
    var c = document.createElement("canvas");
    c.width = W; c.height = H;
    var g = c.getContext("2d");
    g.fillStyle = "#fff"; g.fillRect(0, 0, W, H);
    return { c: c, g: g };
  }

  function buildPage() {
    var W = page.width, H = page.height;
    var R = rng(7);
    var font = '"Pinyon Script", "Snell Roundhand", "Segoe Script", cursive';

    // Paper base (always present)
    var base = blank(W, H);
    var img0 = base.g.getImageData(0, 0, W, H), d0 = img0.data;
    for (var i = 0; i < d0.length; i += 4) {
      var n = (R() - 0.5) * 10;
      d0[i] = 247 + n; d0[i + 1] = 244 + n; d0[i + 2] = 236 + n;
    }
    base.g.putImageData(img0, 0, 0);
    // laid lines
    base.g.globalAlpha = 0.05; base.g.strokeStyle = "#7a6a50";
    for (var x = 18; x < W; x += 26) { base.g.beginPath(); base.g.moveTo(x, 0); base.g.lineTo(x, H); base.g.stroke(); }
    base.g.globalAlpha = 1;

    // Yellowing: warm tint, stronger toward the edges
    var age = blank(W, H);
    age.g.fillStyle = "#EBD9AE"; age.g.fillRect(0, 0, W, H);
    var vg = age.g.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, W * 0.72);
    vg.addColorStop(0, "rgba(255,255,255,0)");
    vg.addColorStop(1, "rgba(150,105,45,0.55)");
    age.g.fillStyle = vg; age.g.fillRect(0, 0, W, H);
    // foxing spots
    for (var f = 0; f < 70; f++) {
      var fx = R() * W, fy = R() * H, fr = 1 + R() * 5;
      age.g.fillStyle = "rgba(150,90,40," + (0.15 + R() * 0.35) + ")";
      age.g.beginPath(); age.g.arc(fx, fy, fr, 0, Math.PI * 2); age.g.fill();
    }

    // Stains: water marks with darker tide lines
    var stain = blank(W, H);
    [[0.78, 0.3, 150], [0.2, 0.82, 120], [0.55, 0.95, 90]].forEach(function (s) {
      var cx = s[0] * W, cy = s[1] * H, r = s[2];
      stain.g.save();
      stain.g.beginPath();
      for (var a = 0; a <= Math.PI * 2 + 0.01; a += 0.15) {
        var rr = r * (0.85 + 0.25 * Math.sin(a * 3 + s[2]) * 0.6 + R() * 0.08);
        var px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr * 0.8;
        if (a === 0) stain.g.moveTo(px, py); else stain.g.lineTo(px, py);
      }
      stain.g.closePath();
      var sg = stain.g.createRadialGradient(cx, cy, 0, cx, cy, r);
      sg.addColorStop(0, "rgba(190,145,80,0.18)");
      sg.addColorStop(0.85, "rgba(175,125,60,0.32)");
      sg.addColorStop(1, "rgba(130,85,35,0.55)");
      stain.g.fillStyle = sg; stain.g.fill();
      stain.g.lineWidth = 3; stain.g.strokeStyle = "rgba(120,75,30,0.35)"; stain.g.stroke();
      stain.g.restore();
    });

    // Bleed-through: the back page's writing, mirrored and diffused
    var bleed = blank(W, H);
    bleed.g.save();
    bleed.g.translate(W, 0); bleed.g.scale(-1, 1);
    bleed.g.filter = "blur(1.4px)";
    bleed.g.fillStyle = "rgba(130,92,60,0.55)";
    bleed.g.font = "40px " + font;
    verso.forEach(function (line, k) { bleed.g.fillText(line, 64, 118 + k * 66); });
    bleed.g.restore();

    // Ink: iron-gall writing, slightly uneven
    var ink = blank(W, H);
    ink.g.font = "42px " + font;
    recto.forEach(function (line, k) {
      ink.g.fillStyle = "rgba(48,28,16," + (0.95 - k * 0.05 + R() * 0.04) + ")";
      if (k === 0) {
        ink.g.textAlign = "right";
        ink.g.fillText(line, W - 56, 76);
        ink.g.textAlign = "left";
      } else {
        ink.g.fillText(line, 70, 96 + k * 66);
      }
    });

    pageLayers = { base: base.c, age: age.c, stain: stain.c, bleed: bleed.c, ink: ink.c };
  }

  function drawPage() {
    if (!pageLayers) return;
    var g = page.getContext("2d");
    g.globalCompositeOperation = "source-over";
    g.drawImage(pageLayers.base, 0, 0);
    g.globalCompositeOperation = "multiply";
    ["age", "stain", "bleed", "ink"].forEach(function (k) { if (state[k]) g.drawImage(pageLayers[k], 0, 0); });
    g.globalCompositeOperation = "source-over";

    var on = Object.keys(state).filter(function (k) { return state[k]; });
    var text;
    if (on.length === 4) text = "The scan: every layer mixed";
    else if (on.length === 1 && state.ink) text = "Ink alone: what we want to recover";
    else if (on.length === 0) text = "Clean paper: nothing left to separate";
    else if (!state.ink) text = "Damage without the writing";
    else text = on.length + " of 4 layers shown";
    if (label) label.textContent = text;
  }

  function initExplorer() {
    if (!page) return;
    var build = function () { buildPage(); drawPage(); };
    build();
    if (document.fonts && document.fonts.load) {
      document.fonts.load('42px "Pinyon Script"').then(build, function () {});
    }
    document.querySelectorAll(".lt").forEach(function (b) {
      b.addEventListener("click", function () {
        var k = b.getAttribute("data-layer");
        state[k] = !state[k];
        b.setAttribute("aria-pressed", String(state[k]));
        drawPage();
      });
    });
  }

  /* ---------- Start ---------- */
  function start() {
    initExplorer();
    whenImage(initPortrait);
    onScroll();
    requestAnimationFrame(function () { root.classList.add("loaded"); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
