/* Satwika's Universe, "The Eyepiece"
   One scroll = one camera. A fixed 3D starfield, seven plates opened by an iris,
   a photo gallery, then the letter. Content lives in content.js. */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ss = (v) => v * v * (3 - 2 * v);
const mk = (h) => { const d = document.createElement("div"); d.innerHTML = h.trim(); return d.firstChild; };
const W = CONTENT.worlds, ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];
const LEN = [2.4, 2.4, 2.4, 2.4, 2.4, 5.4, 2.6];            // viewport-heights of scroll per plate
const PAL = [[243,215,138],[255,138,122],[244,168,207],[158,195,255],[255,192,138],[185,166,255],[243,215,138]];
const audio = $("#audio"), root0 = document.documentElement; audio.src = CONTENT.musicSrc;
let H = innerHeight, HERO = H, starts = [], total = 0, GAP = 560;

/* ---------- audio ---------- */
/* Music starts on open. If the browser blocks unmuted autoplay (most phones do), a small "Tap to open" screen
   appears; the tap starts the song and it keeps looping. No mute or stop control by design. */
const gate = $("#gate");
function openGate() { gate.hidden = false; root0.classList.add("gated"); }
function closeGate() { gate.hidden = true; root0.classList.remove("gated"); }
function playMusic() { return audio.paused ? audio.play().then(closeGate).catch(() => {}) : Promise.resolve(); }
{ const evs = ["pointerup", "click", "touchend", "keydown"];
  const kick = (e) => { if (!audio.paused) return; audio.play().then(() => { closeGate(); evs.forEach((n) => removeEventListener(n, kick, true)); }).catch(() => {}); };
  evs.forEach((n) => addEventListener(n, kick, true));
  audio.volume = 1;
  audio.play().then(() => { closeGate(); evs.forEach((n) => removeEventListener(n, kick, true)); }).catch(() => openGate());
  audio.addEventListener("pause", () => { if (!document.hidden && !audio.ended) setTimeout(() => { if (audio.paused && !document.hidden) audio.play().catch(() => {}); }, 250); });
  document.addEventListener("visibilitychange", () => { if (!document.hidden && audio.paused) audio.play().catch(() => {}); }); }
function blip(f) { if (audio.paused) return; try { const c = blip.c || (blip.c = new AudioContext()), o = c.createOscillator(), g = c.createGain(), t = c.currentTime; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 1.5, t + .09); g.gain.setValueAtTime(.04, t); g.gain.exponentialRampToValueAtTime(.001, t + .16); o.connect(g).connect(c.destination); o.start(); o.stop(t + .17); } catch {} }

/* ---------- hero type ---------- */
{ let n = 0;
  $$("[data-split]").forEach((l) => { const t = l.textContent; l.setAttribute("aria-label", t); l.textContent = "";
    const w = document.createElement("span"); w.className = "w"; w.setAttribute("aria-hidden", "true");
    [...t].forEach((c) => { const s = document.createElement("span"); s.className = "ch"; s.style.setProperty("--n", n++); s.textContent = c; w.append(s); }); l.append(w); }); }

/* ---------- eyepiece reticle ---------- */
{ const g = [`<circle cx="500" cy="500" r="470"/>`, `<circle cx="500" cy="500" r="440" stroke-dasharray="1 7" opacity=".6"/>`];
  for (let a = 0; a < 360; a += 3) { const big = a % 15 === 0, r1 = 470, r2 = big ? 452 : 462, c = Math.cos(a * Math.PI / 180), s = Math.sin(a * Math.PI / 180);
    g.push(`<line x1="${500 + c * r1}" y1="${500 + s * r1}" x2="${500 + c * r2}" y2="${500 + s * r2}" opacity="${big ? 1 : .5}"/>`); }
  $("#eyepiece").innerHTML = `<g id="ring" style="transform-origin:500px 500px">${g.join("")}</g>`; }

/* ---------- build plates ---------- */
const plateEls = [], plateRoot = $("#plates");
W.forEach((w, i) => {
  const lines = w.title.split("<br>").map((l) => `<span class="ln"><span>${l}</span></span>`).join("");
  const p = mk(`<section class="plate" data-i="${i}" aria-labelledby="t${i}">
    <div class="copy"><p class="tag">${ROMAN[i]} / VII &nbsp;${w.kicker}</p><h2 id="t${i}" aria-label="${w.title.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()}">${lines}</h2>
    <p class="desc">${w.description}</p><p class="hint" aria-live="polite"></p></div><div class="play" data-w="${i}"></div></section>`);
  plateRoot.append(p); plateEls.push(p); p.inert = true;
  [kodi, over, pandu, chat, navvu, moons, star][i]($(".play", p), $(".hint", p), p);
  $(".hint", p).textContent = w.hint;
});
const nav = $("#platesNav");
W.forEach((w, i) => { const b = mk(`<button aria-label="${ROMAN[i]}. ${w.name}"><span>${w.name}</span></button>`); b.onclick = () => goPlate(i); nav.append(b); });
function goPlate(i) { scrollTo({ top: HERO + starts[i] + LEN[i] * H * .42, behavior: RM ? "auto" : "smooth" }); }
$("#enter").onclick = () => { playMusic(); goPlate(0); };
$("#home").onclick = $("#again").onclick = () => scrollTo({ top: 0, behavior: RM ? "auto" : "smooth" });

/* letter */
const lps = CONTENT.letter.map((t) => { const p = document.createElement("p"); p.innerHTML = t; $("#letterText").append(p); return p; });

/* ---------- starfield ---------- */
const sky = $("#sky"), cx = sky.getContext("2d"), ZD = 3200;
let SW, SH, DPR = 1;
const stars = Array.from({ length: matchMedia("(max-width:820px)").matches ? 800 : 1700 }, () => ({ x: (Math.random() * 2 - 1) * 2800, y: (Math.random() * 2 - 1) * 2800, z: Math.random() * ZD, t: Math.random() < .3, s: Math.random() * .9 + .35 }));
let acc = [...PAL[0]], mx = 0, my = 0, smx = 0, smy = 0;
function drawSky(cam, v) {
  cx.clearRect(0, 0, SW, SH);
  const f = SH * .95, ox = SW / 2 + smx * 46 * DPR, oy = SH / 2 + smy * 30 * DPR, streak = RM ? 0 : 2.4;
  const ac = `rgb(${acc[0] | 0},${acc[1] | 0},${acc[2] | 0})`;
  for (const s of stars) {
    const z = ((s.z - cam) % ZD + ZD) % ZD; if (z < 24) continue;
    const k = f / z, px = ox + s.x * k, py = oy + s.y * k;
    if (px < -60 || px > SW + 60 || py < -60 || py > SH + 60) continue;
    const a = clamp(1.25 - z / ZD) * (.5 + s.s * .55), size = clamp(s.s * k * 1.7, .5, 2.8) * DPR;
    cx.globalAlpha = a; cx.fillStyle = cx.strokeStyle = s.t ? ac : "#efe7d6";
    const z2 = z + Math.abs(v) * streak, k2 = f / z2;
    if (z2 - z > 14) { cx.lineWidth = size; cx.beginPath(); cx.moveTo(ox + s.x * k2, oy + s.y * k2); cx.lineTo(px, py); cx.stroke(); }
    else cx.fillRect(px - size / 2, py - size / 2, size, size);
  }
  cx.globalAlpha = 1;
}
function resize() {
  const sm = innerWidth < 820; LEN[5] = sm ? 7.6 : 5.4; GAP = sm ? 920 : 560;
  H = innerHeight; HERO = $("#hero").offsetHeight; DPR = Math.min(devicePixelRatio || 1, 2);
  SW = sky.width = innerWidth * DPR; SH = sky.height = H * DPR;
  let a = 0; starts = LEN.map((l) => { const s = a; a += l * H; return s; }); total = a; $("#journey").style.height = total + "px";
}
addEventListener("resize", resize); resize();
addEventListener("pointermove", (e) => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; });

/* ---------- the loop ---------- */
let cur = scrollY, cam = 0, camV = 0, curPlate = -1;
const root = document.documentElement, hero = $("#hero"), tunnelPlate = plateEls[5], moonEls = $$(".moon", tunnelPlate), ring = $("#ring");
const MX = [-26,24,-12,28,-30,10,-22,26,-8,22,-28,14], MY = [-12,8,14,-14,6,-8,12,-4,-16,10,0,-10];
const hit = (a, b, m = 2) => a.left < b.right + m && b.left < a.right + m && a.top < b.bottom + m && b.top < a.bottom + m;
function frame(now) {
  const prev = cur; cur += (scrollY - cur) * (RM ? 1 : .085); if (Math.abs(scrollY - cur) < .1) cur = scrollY;
  const pc = cam; cam = cur * 1.5 + (RM ? 0 : now * .045); camV += ((cam - pc) - camV) * .2;
  smx += (mx - smx) * .05; smy += (my - smy) * .05;
  ring.style.transform = `rotate(${cur * .012}deg)`;
  const hp = clamp(cur / (HERO * .7)); hero.style.opacity = 1 - hp; hero.style.visibility = hp >= 1 ? "hidden" : "visible"; hero.style.transform = `translateY(${(scrollY - cur) * 0 - hp * 30}px)`;
  let best = -1, bv = 0;
  plateEls.forEach((p, i) => {
    const u = (cur - HERO - starts[i]) / (LEN[i] * H), e = ss(clamp((u + .1) / .2)), x = ss(clamp((u - .9) / .2)), vis = e > 0 && x < 1;
    if (!vis) { if (p._v) { p._v = false; p.style.visibility = "hidden"; p.classList.remove("live"); p.inert = true; } return; }
    p._v = true; p.style.visibility = "visible";
    p.style.clipPath = e < 1 ? `circle(${(e * 145).toFixed(2)}% at 50% 52%)` : "none";
    p.style.opacity = 1 - x; p.style.transform = x > 0 ? `scale(${1 + x * .16})` : "none";
    p.style.setProperty("--e", e.toFixed(4)); p.style.setProperty("--u", clamp(u).toFixed(4));
    const live = u > .12 && u < .88; if (live !== p.classList.contains("live")) { p.classList.toggle("live", live); p.inert = !live; }
    if (e * (1 - x) > bv) { bv = e * (1 - x); best = i; }
  });
  if (best !== curPlate) {
    curPlate = best; $$("button", nav).forEach((b, i) => b.classList.toggle("cur", i === best)); nav.classList.toggle("on", best > -1);
    if (best > -1) { const c = PAL[best]; root.style.setProperty("--acc", `rgb(${c})`); }
  }
  if (curPlate > -1) { const t = PAL[curPlate]; for (let k = 0; k < 3; k++) acc[k] += (t[k] - acc[k]) * .04; }
  if (tunnelPlate._v) {
    const u = clamp(((cur - HERO - starts[5]) / (LEN[5] * H) - .04) / .88), c = u * ((moonEls.length - 1) * GAP + 3500), vw = innerWidth / 100, vh = H / 100, it = [];
    moonEls.forEach((m, i) => {
      const z = c - i * GAP - 2700, o = clamp((z + 2700) / 800) * clamp((640 - z) / 280);
      m.style.opacity = o.toFixed(3); m.style.pointerEvents = o > .55 ? "auto" : "none"; m.style.visibility = o > 0 ? "visible" : "hidden";
      m.style.transform = `translate3d(${MX[i] * vw * (innerWidth < 820 ? .55 : 1)}px,${MY[i] * vh}px,${z}px)`;
      if (o > .02) it.push({ m, z, o });
    });
    /* A caption shows only when it is fully on screen and clear of every nearer photo and caption, so captions never overlap. */
    it.sort((p, q) => q.z - p.z); const taken = [], on = new Set(), minW = innerWidth < 820 ? 96 : 118, bar = $("#mcap"), barB = bar.getBoundingClientRect().bottom + 8;
    $$(".tag,.ln>span,.desc,.hint", tunnelPlate).forEach((e) => { const rg = document.createRange(); rg.selectNodeContents(e); for (const q of rg.getClientRects()) if (q.width > 2) taken.push(q); });
    for (const t of it) { const ir = $("img", t.m).getBoundingClientRect(), er = $("em", t.m).getBoundingClientRect();
      let ok = t.o > .3 && ir.width > minW && er.left > 4 && er.right < innerWidth - 4 && er.top > barB && er.bottom < H - 4;
      if (ok) for (const r of taken) if (hit(er, r)) { ok = false; break; }
      if (ok) on.add(t.m); taken.push(ir); if (ok) taken.push(er); }
    moonEls.forEach((m) => m.classList.toggle("cap", on.has(m)));
    /* The front-most photo always has its caption on screen: under the photo when there is room, otherwise in the caption line at the top. */
    const front = it.find((t) => t.o > .5), txt = front && !on.has(front.m) ? $("em", front.m).textContent : "";
    if (bar.textContent !== txt) bar.textContent = txt; bar.classList.toggle("show", !!txt);
  }
  drawSky(cam, camV);
  const lt = $("#letter").getBoundingClientRect();
  if (lt.top < H && lt.bottom > 0) lps.forEach((p) => { const r = p.getBoundingClientRect(), m = r.top + r.height / 2; p.classList.toggle("lit", m > H * .22 && m < H * .72); });
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* lens cursor */
if (matchMedia("(hover:hover) and (pointer:fine)").matches && !RM) {
  const L = document.createElement("div"); L.className = "lens"; document.body.append(L, ""); document.body.classList.add("has-lens");
  let lx = 0, ly = 0, tx = 0, ty = 0;
  addEventListener("pointermove", (e) => { tx = e.clientX; ty = e.clientY; L.classList.add("on"); L.classList.toggle("big", !!e.target.closest("button,a,.moon")); });
  (function lp() { lx += (tx - lx) * .22; ly += (ty - ly) * .22; L.style.transform = `translate(${lx}px,${ly}px)`; requestAnimationFrame(lp); })();
}

/* ---------- world interactions ---------- */
function kodi(p, hint) {
  const lines = ["Kodipilla ani anta, saradaga, just for fun.", "Why Kodipilla? Cheptha… but it's a long story.", "She's not offended. Probably. 😄", "Kodipilla mode: on.", "Ala ala… okay, okay, that's enough."];
  let taps = 0, hatched = false;
  const b = mk(`<button class="kodi" data-d="40" aria-label="Tap the egg"><svg viewBox="0 0 200 220" aria-hidden="true"><defs><radialGradient id="eg" cx=".35" cy=".3"><stop offset="0" stop-color="#fff6e6"/><stop offset="1" stop-color="#c9b2d8"/></radialGradient><radialGradient id="ch" cx=".35" cy=".3"><stop offset="0" stop-color="#fff2c9"/><stop offset="1" stop-color="#e8b86d"/></radialGradient></defs><g class="egg"><ellipse cx="100" cy="120" rx="58" ry="76" fill="url(#eg)"/><path class="crack" d="M52 112l18 12 14-14 16 14 16-14 18 12 14-10" fill="none" stroke="#3a2f55" stroke-width="3"/></g><g class="chick"><circle cx="100" cy="120" r="64" fill="url(#ch)"/><circle cx="78" cy="108" r="6" fill="#241a38"/><circle cx="122" cy="108" r="6" fill="#241a38"/><circle cx="80" cy="106" r="2" fill="#fff"/><circle cx="124" cy="106" r="2" fill="#fff"/><path d="M90 126l10 12 10-12z" fill="#e58aa8"/><path d="M96 58c-4-14 6-22 12-26-2 10 4 14 2 26" fill="#e8b86d"/><ellipse cx="66" cy="128" rx="9" ry="6" fill="#f0a9c0" opacity=".55"/><ellipse cx="134" cy="128" rx="9" ry="6" fill="#f0a9c0" opacity=".55"/></g></svg></button>`);
  const say = mk(`<p class="bubble" role="status"></p>`);
  b.onclick = () => { taps++; blip(520 + taps * 60); b.classList.remove("wob"); void b.offsetWidth; b.classList.add("wob");
    if (!hatched) { if (taps < 3) { say.textContent = ["Crack… 🥚", "Something's moving…"][taps - 1]; b.dataset.c = taps; } else { hatched = true; b.classList.add("hatched"); say.textContent = "Hi. I'm Kodipilla. 🐣"; hint.textContent = "tap me again"; } }
    else say.textContent = lines[(taps - 4) % lines.length]; };
  p.append(b, say);
}
function over(p) {
  const steps = ["Okay, so let me explain why that's not exactly true…", "First there's the background. Then the context. Then the context of the context.", "Ala ala… one detail leads to another, and suddenly it's a ten-minute story.", "Basically: I just want you to get every detail. That's all.", "(Wait. …Is this overexplaining?)", "Yes. See? I'm doing it again. 😂"];
  const first = '<p class="you">“Nuvvu anni overexplain chestavu.”</p>'; let n = 0;
  const box = mk(`<div class="chat" aria-live="polite">${first}</div>`), btn = mk(`<button class="text-btn"><span>Let me explain</span><b>↗</b></button>`), cnt = mk(`<small class="count">explanations: 0</small>`);
  btn.onclick = () => { blip(400 + n * 40);
    if (n < steps.length) { const q = document.createElement("p"); q.className = "me"; q.textContent = steps[n++]; box.append(q); box.scrollTop = 1e5; cnt.textContent = "explanations: " + n; if (n === steps.length) btn.firstChild.textContent = "Explain the explanation"; }
    else { n = 0; box.innerHTML = first; btn.firstChild.textContent = "Let me explain"; cnt.textContent = "explanations: 0"; } };
  p.append(box, btn, cnt);
}
function pandu(p, hint, plate) {
  const c = mk(`<canvas class="cv" role="img" aria-label="Stars that spell the name Pandu when you move over them"></canvas>`); p.append(c);
  const x = c.getContext("2d"); let pts = [], mxp = -999, myp = -999, done = false, dpr = 1;
  function size() { dpr = Math.min(devicePixelRatio || 1, 2); const r = p.getBoundingClientRect(); if (!r.width) return; c.width = r.width * dpr; c.height = r.height * dpr;
    const o = document.createElement("canvas"); o.width = c.width; o.height = c.height; const g = o.getContext("2d"); let fs = c.width / 2.4; const f = () => `italic 300 ${fs}px Fraunces,serif`;
    g.font = f(); while (g.measureText("Pandu").width > c.width * .82) { fs *= .96; g.font = f(); } g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("Pandu", c.width / 2, c.height * .33);
    const d = g.getImageData(0, 0, o.width, o.height).data, s = Math.round((innerWidth < 820 ? 6 : 8) * dpr); pts = [];
    for (let y = 0; y < o.height; y += s) for (let xx = 0; xx < o.width; xx += s) if (d[(y * o.width + xx) * 4 + 3] > 128) pts.push({ x: xx + (Math.random() - .5) * 3, y: y + (Math.random() - .5) * 3, l: 0, r: Math.random() * 1.2 + .8 }); }
  document.fonts.ready.then(size); new ResizeObserver(size).observe(p);
  const mv = (e) => { const r = c.getBoundingClientRect(); mxp = (e.clientX - r.left) * dpr; myp = (e.clientY - r.top) * dpr; };
  c.addEventListener("pointermove", mv); c.addEventListener("pointerdown", mv); c.addEventListener("pointerleave", () => { mxp = myp = -999; });
  (function loop() { requestAnimationFrame(loop); if (!plate._v) return; x.clearRect(0, 0, c.width, c.height); let lit = 0; const R = 80 * dpr;
    for (const q of pts) { const d = Math.hypot(q.x - mxp, q.y - myp); if (d < R) q.l = Math.min(1, q.l + .2); else q.l = Math.max(q.l > .5 ? .5 : q.l, q.l - .002); if (q.l > .45) lit++;
      x.globalAlpha = .34 + q.l * .66; x.fillStyle = "#f4c6da"; if (q.l > .3) { x.shadowBlur = q.l * 14 * dpr; x.shadowColor = "#f4a8cf"; } else x.shadowBlur = 0;
      x.beginPath(); x.arc(q.x, q.y, q.r * dpr * (1 + q.l), 0, 7); x.fill(); }
    x.globalAlpha = 1; if (!done && pts.length && lit / pts.length > .7) { done = true; hint.textContent = "There you are. ✦"; } })();
}
function chat(p, hint) {
  const topics = ["movies", "random thoughts", "food plans", "places to see", "something silly", "music", "dreams", "that one joke", "ala ala…"], pos = [[12,24],[34,12],[58,24],[80,14],[22,58],[48,46],[74,54],[36,80],[66,78]];
  const svg = mk(`<svg class="links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"></svg>`); p.append(svg);
  let last = null, n = 0;
  topics.forEach((t, k) => { const b = mk(`<button class="star-node" aria-label="Star: ${t}"><i></i><span>${t}</span></button>`); b.style.left = pos[k][0] + "%"; b.style.top = pos[k][1] + "%"; b.dataset.d = 14 + k * 9;
    b.onclick = () => { if (b.classList.contains("on")) return; blip(300 + k * 50); b.classList.add("on");
      if (last) { const l = document.createElementNS("http://www.w3.org/2000/svg", "line"); l.setAttribute("x1", last[0]); l.setAttribute("y1", last[1]); l.setAttribute("x2", pos[k][0]); l.setAttribute("y2", pos[k][1]); svg.append(l); }
      last = pos[k]; if (++n === topics.length) hint.textContent = "One conversation. A hundred topics. ✦"; }; p.append(b); });
}
function navvu(p, hint) {
  const w = ["hehe", "haha", "navvu", "hihi", "😂", "✦"]; let n = 0;
  const z = mk(`<button class="pad" aria-label="Tap to collect smiles"><small class="count">smiles collected: 0</small></button>`);
  z.onclick = (e) => { const r = z.getBoundingClientRect(), s = document.createElement("span"); s.className = "pop"; s.textContent = w[Math.floor(Math.random() * w.length)];
    s.style.left = (e.clientX ? e.clientX - r.left : r.width / 2) + "px"; s.style.top = (e.clientY ? e.clientY - r.top : r.height / 2) + "px"; s.style.setProperty("--dx", Math.random() * 90 - 45 + "px");
    z.append(s); setTimeout(() => s.remove(), 1600); blip(600 + Math.random() * 300); $(".count", z).textContent = "smiles collected: " + ++n; if (n === 12) hint.textContent = "That's plenty for today. (Keep going.)"; };
  p.append(z);
}
function moons(p) {
  const t = mk(`<div class="tunnel" role="list" aria-label="Photo memories"></div>`);
  CONTENT.photos.forEach((ph, i) => { const b = mk(`<button class="moon" role="listitem" aria-label="${ph.alt}"><img loading="lazy" decoding="async" alt=""><em></em></button>`), im = $("img", b);
    im.src = encodeURI(ph.src); im.alt = ph.alt; $("em", b).textContent = ph.caption; b.onclick = () => openMem(i); t.append(b); });
  const bar = mk(`<p class="mcap" id="mcap" aria-live="polite"></p>`); p.append(t, bar);
}
function star(p, hint) {
  const b = mk(`<button class="wish" aria-label="Press and hold to make a wish"><svg viewBox="0 0 100 100" aria-hidden="true"><circle class="ring" cx="50" cy="50" r="46" pathLength="100"/><path d="M50 14l9 24 26 2-20 16 7 25-22-14-22 14 7-25-20-16 26-2z"/></svg></button>`), ring = $(".ring", b), msg = mk(`<p class="wish-msg" role="status"></p>`);
  let t0 = 0, raf, fired = false;
  const tick = (t) => { const v = Math.min(1, (t - t0) / 1600); ring.style.strokeDashoffset = 100 - v * 100; if (v >= 1) fire(); else raf = requestAnimationFrame(tick); };
  const down = () => { if (fired) return; t0 = performance.now(); raf = requestAnimationFrame(tick); }, up = () => { cancelAnimationFrame(raf); if (!fired) ring.style.strokeDashoffset = 100; };
  function fire() { fired = true; blip(880); b.classList.add("burst"); msg.textContent = "Wish made. Happy Birthday, Satwika ✦"; hint.textContent = "";
    for (let k = 0; k < (RM ? 0 : 24); k++) { const s = document.createElement("i"); s.className = "spark"; s.style.setProperty("--a", k * 15 + "deg"); s.style.setProperty("--d", 70 + Math.random() * 110 + "px"); b.append(s); }
    const go = mk(`<button class="text-btn wish-go"><span>Read the letter</span><b>↗</b></button>`); go.onclick = () => scrollTo({ top: $("#letter").offsetTop, behavior: RM ? "auto" : "smooth" }); p.append(go); }
  b.addEventListener("pointerdown", down); ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => b.addEventListener(ev, up));
  b.addEventListener("keydown", (e) => { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); down(); } }); b.addEventListener("keyup", (e) => { if (e.key === " " || e.key === "Enter") up(); });
  p.append(b, msg);
}

/* ---------- lightbox ---------- */
let mi = 0, lastFocus = null; const lb = $("#lightbox");
function openMem(i) { mi = (i + CONTENT.photos.length) % CONTENT.photos.length; const ph = CONTENT.photos[mi]; if (lb.hidden) lastFocus = document.activeElement;
  $("#lbImg").src = encodeURI(ph.src); $("#lbImg").alt = ph.alt; $("#lbCap").textContent = `${ph.caption}  ·  ${mi + 1}/${CONTENT.photos.length}`; lb.hidden = false; document.body.style.overflow = "hidden"; $("#lbClose").focus(); }
function closeMem() { lb.hidden = true; document.body.style.overflow = ""; lastFocus?.focus(); }
$("#lbClose").onclick = closeMem; $("#lbPrev").onclick = (e) => { e.stopPropagation(); openMem(mi - 1); }; $("#lbNext").onclick = (e) => { e.stopPropagation(); openMem(mi + 1); };
lb.onclick = (e) => { if (e.target === lb || e.target.id === "lbImg") closeMem(); };
addEventListener("keydown", (e) => { if (lb.hidden) return;
  if (e.key === "Escape") closeMem(); else if (e.key === "ArrowRight") openMem(mi + 1); else if (e.key === "ArrowLeft") openMem(mi - 1);
  else if (e.key === "Tab") { e.preventDefault(); const f = [$("#lbClose"), $("#lbPrev"), $("#lbNext")], k = f.indexOf(document.activeElement); f[(k + (e.shiftKey ? 2 : 1)) % 3].focus(); } });
let sx = 0; lb.addEventListener("pointerdown", (e) => sx = e.clientX); lb.addEventListener("pointerup", (e) => { const d = e.clientX - sx; if (Math.abs(d) > 50) openMem(mi + (d < 0 ? 1 : -1)); });
