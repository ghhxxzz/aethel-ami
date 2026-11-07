/* ===== Introdução: estrela 3D girando e vindo em direção à câmera ===== */
(function () {
  var intro = document.getElementById("intro");
  var cv = document.getElementById("introCanvas");
  var ctx = cv.getContext("2d");
  var flash = document.getElementById("flash");
  var title = document.getElementById("introTitle");
  var STAR_MS = 3000, FLASH_MS = 3500, TITLE_MS = 4800, END_MS = 5500; // ajuste aqui a duração
  var raf = 0, running = false, W = 0, H = 0;
  var V = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,.38],[0,0,-.38]];
  var F = [];
  [0,1].forEach(function (a) { [2,3].forEach(function (b) { [4,5].forEach(function (c) { F.push([a,b,c]); }); }); });
  var dust = [];
  for (var i = 0; i < 110; i++) dust.push({ x: Math.random()*2-1, y: Math.random()*2-1, r: Math.random()*1.3+.3 });

  function fit() {
    var d = window.devicePixelRatio || 1;
    W = cv.width = innerWidth * d; H = cv.height = innerHeight * d;
  }
  var ease = function (t) { return t * t * t; };

  function draw(ms) {
    var t = Math.min(ms / STAR_MS, 1), e = ease(t);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#030208"; ctx.fillRect(0, 0, W, H);
    var cx = W / 2, cy = H / 2, base = Math.min(W, H);
    ctx.fillStyle = "#cdbcf0";
    dust.forEach(function (p) {
      var k = 1 + e * 2.2;
      ctx.globalAlpha = .25 + .5 * (1 - e);
      ctx.beginPath(); ctx.arc(cx + p.x * base * .7 * k, cy + p.y * base * .7 * k, p.r * (W / 1400 + .6), 0, 7); ctx.fill();
    });
    ctx.globalAlpha = 1;
    var S = base * (.012 + e * .62);
    var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, S * 2.4);
    g.addColorStop(0, "rgba(199,125,255," + (.15 + .55 * t) + ")"); g.addColorStop(1, "rgba(157,78,221,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    var ay = .6 + t * 9, ax = .45, sy = Math.sin(ay), cyy = Math.cos(ay), sx = Math.sin(ax), cxx = Math.cos(ax);
    var P = V.map(function (v) {
      var x = v[0]*cyy + v[2]*sy, z = -v[0]*sy + v[2]*cyy, y = v[1];
      var y2 = y*cxx - z*sx, z2 = y*sx + z*cxx;
      return { x: x, y: y2, z: z2 };
    });
    var faces = F.map(function (f) {
      var a = P[f[0]], b = P[f[1]], c = P[f[2]];
      var ux = b.x-a.x, uy = b.y-a.y, uz = b.z-a.z, wx = c.x-a.x, wy = c.y-a.y, wz = c.z-a.z;
      var nx = uy*wz-uz*wy, ny = uz*wx-ux*wz, nz = ux*wy-uy*wx, l = Math.hypot(nx,ny,nz)||1;
      var mx = a.x+b.x+c.x, my = a.y+b.y+c.y, mz = a.z+b.z+c.z;
      if (nx*mx + ny*my + nz*mz < 0) { nx=-nx; ny=-ny; nz=-nz; }
      var d = Math.max(0, (nx*.3 - ny*.5 + nz*.8) / l);
      return { f: f, z: (a.z+b.z+c.z)/3, d: d };
    }).sort(function (p, q) { return p.z - q.z; });
    faces.forEach(function (o) {
      ctx.beginPath();
      o.f.forEach(function (i, n) {
        var p = P[i], k = 1 + p.z * .18;
        var X = cx + p.x * S * k, Y = cy - p.y * S * k;
        n ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
      });
      ctx.closePath();
      ctx.fillStyle = "hsl(272,78%," + (22 + 50 * o.d) + "%)"; ctx.fill();
      ctx.strokeStyle = "rgba(240,220,255,.35)"; ctx.lineWidth = 1; ctx.stroke();
    });
    var fl = ms < FLASH_MS - 700 ? 0 : Math.min((ms - (FLASH_MS - 700)) / 700, 1);
    if (ms > FLASH_MS) fl = Math.max(0, 1 - (ms - FLASH_MS) / 900);
    flash.style.opacity = fl;
    title.style.opacity = ms < FLASH_MS ? 0 : Math.min((ms - FLASH_MS) / 900, 1);
    if (ms > TITLE_MS) title.style.opacity = Math.max(0, 1 - (ms - TITLE_MS) / 700);
    if (ms > STAR_MS + 300 && ms < FLASH_MS) { ctx.fillStyle = "#030208"; }
  }

  function stop() {
    cancelAnimationFrame(raf); running = false;
    intro.classList.add("out"); intro.setAttribute("aria-hidden", "true");
    try { sessionStorage.setItem("aethelIntro", "1"); } catch (e) {}
  }
  function play() {
    if (running) return;
    running = true; fit(); intro.classList.remove("out"); intro.setAttribute("aria-hidden", "false");
    var t0 = performance.now();
    (function loop(now) {
      var ms = now - t0;
      if (ms >= END_MS) return stop();
      // depois do flash a estrela some: só título sobre fundo escuro
      if (ms > FLASH_MS) { ctx.fillStyle = "#030208"; ctx.fillRect(0, 0, W, H); flash.style.opacity = Math.max(0, 1 - (ms - FLASH_MS) / 900); title.style.opacity = ms < TITLE_MS ? Math.min((ms - FLASH_MS) / 900, 1) : Math.max(0, 1 - (ms - TITLE_MS) / 700); }
      else draw(ms);
      raf = requestAnimationFrame(loop);
    })(t0);
  }
  addEventListener("resize", function () { if (running) fit(); });
  document.getElementById("skip").addEventListener("click", stop);
  document.getElementById("replay").addEventListener("click", play);
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches, seen = false;
  try { seen = sessionStorage.getItem("aethelIntro") === "1"; } catch (e) {}
  if (reduce || seen) { intro.classList.add("out"); } else { play(); }
})();

/* ===== Prévia de temas ===== */
(function () {
  var mock = document.getElementById("mock");
  var btns = document.querySelectorAll(".pick button");
  btns.forEach(function (b) {
    b.addEventListener("click", function () {
      mock.setAttribute("data-theme", b.dataset.t);
      btns.forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
    });
  });
})();

/* ===== Botão de download: busca a versão mais recente nas Releases do GitHub ===== */
(function () {
  var a = document.getElementById("dl"), info = document.getElementById("dlInfo"), meta = document.getElementById("dlMeta");
  var repo = window.AETHEL_REPO || "";
  function off(msg) {
    a.classList.add("off"); a.removeAttribute("href"); a.setAttribute("aria-disabled", "true");
    a.textContent = "Instalador ainda não publicado"; info.textContent = msg;
  }
  function on(href) {
    a.classList.remove("off"); a.setAttribute("href", href); a.removeAttribute("aria-disabled"); a.textContent = "Baixar para Windows";
  }
  function size(b) { return b >= 1048576 ? (b / 1048576).toFixed(1).replace(".", ",") + " MB" : Math.max(1, Math.round(b / 1024)) + " KB"; }
  if (!repo || repo.indexOf("SEU-USUARIO") === 0) { off("O repositório de downloads ainda não foi configurado (arquivo site/config.js)."); return; }

  info.textContent = "Verificando a versão mais recente...";
  fetch("https://api.github.com/repos/" + repo + "/releases/latest", { headers: { Accept: "application/vnd.github+json" } })
    .then(function (r) {
      if (r.status === 404) throw { kind: "none" };
      if (!r.ok) throw { kind: "api" };
      return r.json();
    })
    .then(function (rel) {
      var asset = (rel.assets || []).filter(function (x) { return /\.exe$/i.test(x.name); })[0];
      if (!asset) throw { kind: "none" };
      on(asset.browser_download_url);
      var d = rel.published_at ? new Date(rel.published_at).toLocaleDateString("pt-BR") : "";
      info.textContent = "Versão " + rel.tag_name + " · " + size(asset.size) + (d ? " · publicada em " + d : "");
      meta.textContent = "Windows 10/11 (64 bits) · arquivo " + asset.name;
    })
    .catch(function (e) {
      if (e && e.kind === "none") { off("Ainda não há uma versão publicada para download."); return; }
      // A API do GitHub pode recusar (limite de pedidos) ou estar fora: manda para a página oficial de versões.
      on("https://github.com/" + repo + "/releases/latest");
      a.textContent = "Baixar (página de versões)";
      info.textContent = "Não consegui consultar a versão agora; o botão abre a página de versões no GitHub.";
    });
})();
