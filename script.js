/* ------------------------------------------------------------------
   Nick Janocik — portfolio interaction engine
   A kid-drawn paper kite follows the pointer, streaming a ribbon and
   stirring the air. Photos scatter into floating particles when the
   kite passes through them; text leans on the wind.
------------------------------------------------------------------ */

const yearEl = document.querySelector("#year");
if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const coarseQuery = window.matchMedia("(hover: none), (pointer: coarse)");

const GRADE = "saturate(0.9) contrast(0.95) brightness(1.04) sepia(0.06)";

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

function lerpAngle(a, b, t) {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

/* ------------------------------------------------------------------
   Scroll reveal — always on (CSS makes it instant under reduced motion).
------------------------------------------------------------------ */
function initReveal() {
  const items = Array.from(document.querySelectorAll("[data-reveal]"));
  if (!items.length) return;

  if (!("IntersectionObserver" in window) || motionQuery.matches) {
    items.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const siblings = Array.from(el.parentElement.children).filter((c) =>
          c.hasAttribute("data-reveal")
        );
        const index = Math.max(0, siblings.indexOf(el));
        el.style.setProperty("--reveal-delay", `${Math.min(index, 4) * 90}ms`);
        el.classList.add("is-visible");
        obs.unobserve(el);
      });
    },
    { rootMargin: "0px 0px -12% 0px", threshold: 0.12 }
  );

  items.forEach((el) => observer.observe(el));
}

/* ------------------------------------------------------------------
   Kite + air + photo particles — fine-pointer, motion-allowed only.
------------------------------------------------------------------ */
function initKite() {
  const canvas = document.querySelector("#fx");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  // Pointer state.
  const raw = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const smooth = { x: raw.x, y: raw.y };
  const prev = { x: raw.x, y: raw.y };
  let hasMoved = false;
  let visible = false;
  let hovering = false;

  // Kite orientation + size + hand-drawn "line boil".
  let angle = 0;
  let scale = 1;
  let boil = 0;

  // Acceleration-driven "light gust" (brightness flare).
  let prevSpeed = 0;
  let accelSmooth = 0;
  let flash = 0;

  // Ribbon tail (follow-the-leader chain).
  const SEG = 18;
  const SEGLEN = 9;
  const tail = [];
  for (let i = 0; i < SEG; i++) tail.push({ x: smooth.x, y: smooth.y });

  // Air gusts that puff off the kite as it moves.
  const gusts = [];
  let lastGust = 0;

  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener("resize", resize);

  window.addEventListener(
    "pointermove",
    (e) => {
      if (e.pointerType === "touch") return;
      raw.x = e.clientX;
      raw.y = e.clientY;
      if (!hasMoved) {
        hasMoved = true;
        document.documentElement.classList.add("custom-cursor");
        smooth.x = prev.x = raw.x;
        smooth.y = prev.y = raw.y;
        for (let i = 0; i < SEG; i++) {
          tail[i].x = raw.x;
          tail[i].y = raw.y + i * SEGLEN;
        }
      }
      visible = true;
    },
    { passive: true }
  );

  document.addEventListener("mouseleave", () => (visible = false));
  document.addEventListener("mouseenter", () => {
    if (hasMoved) visible = true;
  });

  const interactiveSel = "a, button, .bubble, .nav-say-hi";
  document.addEventListener("pointerover", (e) => {
    if (e.target.closest && e.target.closest(interactiveSel)) hovering = true;
  });
  document.addEventListener("pointerout", (e) => {
    if (e.target.closest && e.target.closest(interactiveSel)) hovering = false;
  });

  // Text/notes lean on the wind; links pull toward the kite.
  const windEls = Array.from(document.querySelectorAll("[data-fx]:not(.photo-card)"));
  const magnetEls = Array.from(document.querySelectorAll(interactiveSel));

  // Photos that scatter into particles.
  const photos = Array.from(document.querySelectorAll(".photo-card img")).map(
    (img) => ({
      img,
      card: img.closest(".photo-card"),
      tiles: [],
      live: [], // only the displaced tiles get per-frame work
      off: null,
      canvas: null, // in-flow canvas inside the card (scrolls with the page)
      cctx: null,
      margin: 0,
      cols: 0,
      rows: 0,
      tw: 0,
      th: 0,
      srcX: 0,
      srcY: 0,
      srcW: 0,
      srcH: 0,
      built: false,
      builtW: 0,
      builtH: 0,
      active: false,
      near: true,
      rx: 0,
      ry: 0,
      rw: 0,
      rh: 0,
    })
  );

  let rects = new Map();
  let rectsDirty = true;
  const markDirty = () => (rectsDirty = true);
  function refreshRects() {
    rects = new Map();
    const vh = window.innerHeight;
    [...windEls, ...magnetEls].forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      rects.set(el, { cx: r.left + r.width / 2, cy: r.top + r.height / 2 });
    });
    photos.forEach((p) => {
      const r = p.img.getBoundingClientRect();
      p.rx = r.left;
      p.ry = r.top;
      p.rw = r.width;
      p.rh = r.height;
      p.near = !(r.bottom < -300 || r.top > vh + 300);
    });
    rectsDirty = false;
  }
  window.addEventListener("scroll", markDirty, { passive: true });
  window.addEventListener("resize", markDirty);

  const state = new WeakMap();
  function getState(el) {
    let s = state.get(el);
    if (!s) {
      s = { x: 0, y: 0 };
      state.set(el, s);
    }
    return s;
  }

  const REPEL_RADIUS = 200;
  const MAGNET_RADIUS = 110;

  /* ---------- Particle helpers ---------- */
  function ensureTiles(p) {
    const img = p.img;
    if (!img.complete || !img.naturalWidth || p.rw < 4) return false;
    if (p.built && Math.abs(p.rw - p.builtW) < 2 && Math.abs(p.rh - p.builtH) < 2) {
      return true;
    }
    if (!p.off) {
      const off = document.createElement("canvas");
      off.width = img.naturalWidth;
      off.height = img.naturalHeight;
      const octx = off.getContext("2d");
      octx.filter = GRADE; // bake the film grade once to match the CSS look
      octx.drawImage(img, 0, 0);
      p.off = off;
    }
    // In-flow canvas inside the card; a margin lets pages flutter past the edge.
    if (!p.canvas) {
      const c = document.createElement("canvas");
      c.className = "shred";
      p.card.appendChild(c);
      p.canvas = c;
      p.cctx = c.getContext("2d");
    }
    // Canvas exactly covers the image; the card clips it so pages stay in bounds.
    const MARGIN = 0;
    // 1× is enough here — this canvas is only visible while pages are in motion.
    const cdpr = 1;
    const cw = p.rw + MARGIN * 2;
    const ch = p.rh + MARGIN * 2;
    p.margin = MARGIN;
    p.canvas.width = Math.round(cw * cdpr);
    p.canvas.height = Math.round(ch * cdpr);
    p.canvas.style.width = `${cw}px`;
    p.canvas.style.height = `${ch}px`;
    p.canvas.style.left = `${-MARGIN}px`;
    p.canvas.style.top = `${-MARGIN}px`;
    p.cctx.setTransform(cdpr, 0, 0, cdpr, 0, 0);

    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    // Match object-fit: cover — center-crop the source to the card's aspect so
    // the particles reconstruct exactly what's displayed (no aspect shift).
    const coverScale = Math.max(p.rw / nw, p.rh / nh);
    const srcW = p.rw / coverScale;
    const srcH = p.rh / coverScale;
    const srcX = (nw - srcW) / 2;
    const srcY = (nh - srcH) / 2;

    // Page-sized tiles (bounded so huge images stay performant).
    const TS = 6;
    let cols = Math.round(p.rw / TS);
    let rows = Math.round(p.rh / TS);
    const MAX_TILES = 9000;
    if (cols * rows > MAX_TILES) {
      const k = Math.sqrt(MAX_TILES / (cols * rows));
      cols = Math.round(cols * k);
      rows = Math.round(rows * k);
    }
    cols = clamp(cols, 24, 200);
    rows = clamp(rows, 18, 200);
    const tw = p.rw / cols;
    const th = p.rh / rows;
    const stw = srcW / cols;
    const sth = srcH / rows;
    p.cols = cols;
    p.rows = rows;
    p.tw = tw;
    p.th = th;
    p.srcX = srcX;
    p.srcY = srcY;
    p.srcW = srcW;
    p.srcH = srcH;
    p.tiles = [];
    p.live.length = 0;
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        p.tiles.push({
          ox: i * tw,
          oy: j * th,
          w: tw + 0.6,
          h: th + 0.6,
          sx: srcX + i * stw,
          sy: srcY + j * sth,
          sw: stw,
          sh: sth,
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          rot: 0, // spin
          rotV: 0,
          ph: 0, // page-turn phase
          phV: 0,
          seed: Math.random() * 6.28,
          liveFlag: false,
        });
      }
    }
    p.built = true;
    p.builtW = p.rw;
    p.builtH = p.rh;
    return true;
  }

  function deactivate(p) {
    p.active = false;
    p.card.classList.remove("is-dispersing");
    for (const t of p.live) {
      t.x = t.y = t.vx = t.vy = 0;
      t.liveFlag = false;
    }
    p.live.length = 0;
  }

  function updatePhotos(cx, cy, speed, now, active) {
    const R = 70;
    photos.forEach((p) => {
      if (!p.near) {
        if (p.active) deactivate(p);
        return;
      }
      const M = 24;
      const inside =
        active &&
        cx > p.rx - M &&
        cx < p.rx + p.rw + M &&
        cy > p.ry - M &&
        cy < p.ry + p.rh + M;

      if (inside && !p.active && ensureTiles(p)) p.active = true;
      if (!p.active) return;

      // Kick only the tiles in the cursor's grid neighborhood, and mark them live.
      if (inside) {
        const span = R / Math.min(p.tw, p.th) + 1;
        const ci = (cx - p.rx) / p.tw;
        const cj = (cy - p.ry) / p.th;
        const i0 = Math.max(0, Math.floor(ci - span));
        const i1 = Math.min(p.cols - 1, Math.ceil(ci + span));
        const j0 = Math.max(0, Math.floor(cj - span));
        const j1 = Math.min(p.rows - 1, Math.ceil(cj + span));
        const kick = 2.4 + speed * 0.5;
        for (let j = j0; j <= j1; j++) {
          for (let i = i0; i <= i1; i++) {
            const t = p.tiles[j * p.cols + i];
            const dx = p.rx + t.ox + p.tw * 0.5 + t.x - cx;
            const dy = p.ry + t.oy + p.th * 0.5 + t.y - cy;
            const d = Math.hypot(dx, dy);
            if (d < R) {
              const f = 1 - d / R;
              const inv = 1 / (d || 1);
              t.vx += dx * inv * f * kick + (Math.random() - 0.5) * f * 2.4;
              t.vy += dy * inv * f * kick - f * 1.6 + (Math.random() - 0.5) * f * 2.4;
              if (!t.liveFlag && p.live.length < 1200) {
                t.liveFlag = true;
                t.rot = 0;
                t.rotV = (Math.random() - 0.5) * 0.45;
                t.ph = Math.random() * 6.28;
                t.phV = 0.12 + Math.random() * 0.22;
                p.live.push(t);
              }
            }
          }
        }
      }

      // Integrate only the displaced (live) tiles; retire them once settled.
      const live = p.live;
      for (let k = live.length - 1; k >= 0; k--) {
        const t = live[k];
        t.vx += -t.x * 0.02; // spring home
        t.vy += -t.y * 0.02;
        const disp = Math.hypot(t.x, t.y);
        if (disp > 1) {
          t.vx += Math.sin(now * 0.004 + t.seed) * 0.06; // float in the air
          t.vy += Math.cos(now * 0.0045 + t.seed * 1.7) * 0.05;
        }
        t.vx *= 0.86;
        t.vy *= 0.86;
        t.x += t.vx;
        t.y += t.vy;
        t.rot += t.rotV; // tumble + flutter, damping as it settles
        t.rotV *= 0.95;
        t.ph += t.phV;
        t.phV *= 0.97;
        if (disp < 0.4 && Math.abs(t.vx) + Math.abs(t.vy) < 0.4) {
          t.x = t.y = t.vx = t.vy = 0;
          t.liveFlag = false;
          live.splice(k, 1);
        }
      }

      if (!inside && live.length === 0) deactivate(p);
      else p.card.classList.add("is-dispersing");
    });
  }

  // Each active photo draws onto its own in-flow canvas (scrolls with the page).
  function drawPhotoCanvases() {
    photos.forEach((p) => {
      if (!p.active || !p.off || !p.cctx) return;
      const c = p.cctx;
      const off = p.off;
      const m = p.margin;
      c.clearRect(0, 0, p.rw + m * 2, p.rh + m * 2);
      // Whole photo in one draw (matches the hidden DOM image exactly).
      c.drawImage(off, p.srcX, p.srcY, p.srcW, p.srcH, m, m, p.rw, p.rh);
      const live = p.live;
      // Punch holes where displaced pages left...
      for (let k = 0; k < live.length; k++) {
        const t = live[k];
        c.clearRect(m + t.ox, m + t.oy, p.tw, p.th);
      }
      // ...then draw each page tumbling through the air, flipping front (image)
      // to back (paper) as it turns.
      for (let k = 0; k < live.length; k++) {
        const t = live[k];
        const disp = Math.hypot(t.x, t.y);
        const amt = clamp(disp / 14, 0, 1); // flutter scales in with displacement
        if (amt < 0.02) {
          // Essentially home — cheap straight draw, no transform.
          c.drawImage(off, t.sx, t.sy, t.sw, t.sh, m + t.ox + t.x, m + t.oy + t.y, t.w, t.h);
          continue;
        }
        const sX = 1 - amt + amt * Math.cos(t.ph);
        c.save();
        c.translate(m + t.ox + p.tw * 0.5 + t.x, m + t.oy + p.th * 0.5 + t.y);
        c.rotate(t.rot * amt);
        c.scale(sX, 1);
        if (sX >= 0) {
          c.drawImage(off, t.sx, t.sy, t.sw, t.sh, -t.w * 0.5, -t.h * 0.5, t.w, t.h);
        } else {
          c.fillStyle = "#fbf7ef"; // back of the page
          c.fillRect(-t.w * 0.5, -t.h * 0.5, t.w, t.h);
        }
        c.restore();
      }
    });
  }

  /* ---------- Air gusts ---------- */
  function updateGusts(vx, vy, speed, now) {
    if (speed > 1.4 && now - lastGust > 26 && gusts.length < 64) {
      lastGust = now;
      const ang = Math.atan2(vy, vx);
      const count = speed > 7 ? 2 : 1;
      for (let k = 0; k < count; k++) {
        const life = 38 + Math.random() * 26;
        gusts.push({
          x: smooth.x + (Math.random() - 0.5) * 46,
          y: smooth.y + (Math.random() - 0.5) * 46,
          vx: -vx * 0.28 + (Math.random() - 0.5) * 1.8,
          vy: -vy * 0.28 + (Math.random() - 0.5) * 1.8,
          rot: ang + (Math.random() - 0.5) * 0.9,
          size: 6 + Math.random() * 9,
          life,
          maxLife: life,
        });
      }
    }
    for (let i = gusts.length - 1; i >= 0; i--) {
      const g = gusts[i];
      g.x += g.vx;
      g.y += g.vy;
      g.vx *= 0.95;
      g.vy *= 0.95;
      g.life -= 1;
      if (g.life <= 0) gusts.splice(i, 1);
    }
  }

  function drawGusts() {
    ctx.lineCap = "round";
    for (const g of gusts) {
      const a = clamp(g.life / g.maxLife, 0, 1);
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.rotate(g.rot);
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.45 * a})`;
      ctx.lineWidth = 1.6 * a + 0.4;
      ctx.beginPath();
      ctx.moveTo(-g.size, 0);
      ctx.quadraticCurveTo(0, -g.size * 0.7, g.size, 0);
      ctx.stroke();
      ctx.restore();
    }
  }

  /* ---------- Kid-drawn kite ---------- */
  const KITE = {
    base: "#f7efe0",
    red: "#e3564b",
    yellow: "#f2c14e",
    dark: "rgba(40, 44, 56, 0.9)",
  };

  function jr(seed) {
    const s = Math.sin(seed * 91.7 + boil * 13.13) * 43758.5453;
    return s - Math.floor(s) - 0.5;
  }

  function roughPath(pts, jit, closed) {
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const x = pts[i].x + jr(i * 2.1 + pts[i].x) * jit;
      const y = pts[i].y + jr(i * 3.7 + pts[i].y) * jit;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    if (closed) ctx.closePath();
  }

  function fillTri(a, b, c, color) {
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.95;
    roughPath([a, b, c], 0.9, true);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawKite(kx, ky, ang, sc) {
    ctx.save();
    ctx.translate(kx, ky);
    ctx.rotate(ang);
    ctx.scale(sc, sc);

    const nose = { x: 0, y: -18 };
    const lft = { x: -15, y: -2 };
    const rgt = { x: 14, y: -1 };
    const btm = { x: 1, y: 24 };
    const ctr = { x: 0, y: -1.5 };

    // Paper base + soft shadow.
    ctx.shadowColor = "rgba(30, 40, 55, 0.22)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 5;
    ctx.fillStyle = KITE.base;
    roughPath([nose, rgt, btm, lft], 0.6, true);
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Crayon-colored quadrants (checkered, hand-cut edges).
    fillTri(nose, ctr, lft, KITE.yellow);
    fillTri(nose, ctr, rgt, KITE.red);
    fillTri(btm, ctr, lft, KITE.red);
    fillTri(btm, ctr, rgt, KITE.yellow);

    // Wobbly marker outline (two passes for a hand-drawn look).
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.strokeStyle = KITE.dark;
    ctx.lineWidth = 2.4;
    roughPath([nose, rgt, btm, lft], 1.1, true);
    ctx.stroke();
    ctx.lineWidth = 1;
    roughPath([nose, rgt, btm, lft], 1.7, true);
    ctx.stroke();

    // Wobbly spars.
    ctx.lineWidth = 1.3;
    roughPath([nose, btm], 1, false);
    ctx.stroke();
    roughPath([lft, rgt], 1, false);
    ctx.stroke();

    ctx.restore();
  }

  /* ---------- Main loop ---------- */
  function frame(now) {
    smooth.x = lerp(smooth.x, raw.x, 0.2);
    smooth.y = lerp(smooth.y, raw.y, 0.2);
    const vx = smooth.x - prev.x;
    const vy = smooth.y - prev.y;
    const speed = Math.hypot(vx, vy);
    prev.x = smooth.x;
    prev.y = smooth.y;
    boil = Math.floor(now / 110);

    // A soft baseline glow is always present; acceleration makes it brighter.
    // Smooth the (spiky) acceleration, then ease the glow toward its target so
    // it swells and fades gently instead of bursting.
    const accel = speed - prevSpeed;
    prevSpeed = speed;
    accelSmooth = lerp(accelSmooth, Math.max(accel, 0), 0.2);
    const flashTarget = 0.22 + clamp(accelSmooth * 0.14, 0, 0.55);
    flash = lerp(flash, flashTarget, 0.15);

    const targetAngle =
      speed > 0.6 ? Math.atan2(vx, -vy) : Math.sin(now * 0.0016) * 0.14;
    angle = lerpAngle(angle, targetAngle, 0.16);
    scale = lerp(scale, hovering ? 1.3 : 1, 0.2);

    // Ribbon tail anchor = kite's bottom point.
    const L = 22 * scale;
    const ax = smooth.x - L * Math.sin(angle);
    const ay = smooth.y + L * Math.cos(angle);
    tail[0].x = ax;
    tail[0].y = ay;
    for (let i = 1; i < SEG; i++) {
      const p = tail[i];
      const lead = tail[i - 1];
      p.y += 0.9;
      p.x += Math.sin(now * 0.006 + i * 0.6) * 0.8 + vx * 0.05;
      let dx = p.x - lead.x;
      let dy = p.y - lead.y;
      const dist = Math.hypot(dx, dy) || 1;
      const r = SEGLEN / dist;
      p.x = lead.x + dx * r;
      p.y = lead.y + dy * r;
    }

    const active = visible && hasMoved;
    if (rectsDirty) refreshRects();
    updateGusts(vx, vy, speed, now);
    updatePhotos(smooth.x, smooth.y, speed, now, active);
    drawPhotoCanvases();

    // Draw kite, ribbon, gusts, and light on the shared (fixed) canvas.
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    if (active) {
      if (flash > 0.01) {
        const R = 90 + flash * 140;
        ctx.globalCompositeOperation = "lighter";
        const lg = ctx.createRadialGradient(
          smooth.x,
          smooth.y,
          0,
          smooth.x,
          smooth.y,
          R
        );
        lg.addColorStop(0, `rgba(255, 248, 232, ${0.5 * flash})`);
        lg.addColorStop(1, "rgba(255, 248, 232, 0)");
        ctx.fillStyle = lg;
        ctx.beginPath();
        ctx.arc(smooth.x, smooth.y, R, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = "source-over";
      }
      drawGusts();
      drawRibbon(tail);
      drawKite(smooth.x, smooth.y, angle, scale);
    }

    // DOM wind + magnet (writes after reads/draws).
    windEls.forEach((el) => {
      const r = rects.get(el);
      const s = getState(el);
      let tx = 0;
      let ty = 0;
      if (r && active) {
        const dx = r.cx - smooth.x;
        const dy = r.cy - smooth.y;
        const dist = Math.hypot(dx, dy);
        if (dist < REPEL_RADIUS) {
          const force = (1 - dist / REPEL_RADIUS) ** 2;
          const len = dist || 1;
          tx = (dx / len) * force * 24;
          ty = (dy / len) * force * 24;
        }
      }
      s.x = lerp(s.x, tx, 0.12);
      s.y = lerp(s.y, ty, 0.12);
      el.style.transform = `translate(${s.x.toFixed(2)}px, ${s.y.toFixed(2)}px)`;
    });

    magnetEls.forEach((el) => {
      const r = rects.get(el);
      const s = getState(el);
      let tx = 0;
      let ty = 0;
      if (r && active) {
        const dx = smooth.x - r.cx;
        const dy = smooth.y - r.cy;
        const dist = Math.hypot(dx, dy);
        if (dist < MAGNET_RADIUS) {
          const force = 1 - dist / MAGNET_RADIUS;
          tx = dx * force * 0.4;
          ty = dy * force * 0.4;
        }
      }
      s.x = lerp(s.x, tx, 0.16);
      s.y = lerp(s.y, ty, 0.16);
      el.style.transform = `translate(${s.x.toFixed(2)}px, ${s.y.toFixed(2)}px)`;
    });

    requestAnimationFrame(frame);
  }

  /* ---------- Ribbon ---------- */
  function drawRibbon(pts) {
    const n = pts.length;
    if (n < 3) return;
    const maxW = 13;
    const left = [];
    const right = [];
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)];
      const b = pts[Math.min(n - 1, i + 1)];
      let tx = b.x - a.x;
      let ty = b.y - a.y;
      const tl = Math.hypot(tx, ty) || 1;
      tx /= tl;
      ty /= tl;
      const px = -ty;
      const py = tx;
      const w = (maxW * (1 - i / (n - 1))) / 2 + 0.5;
      left.push({ x: pts[i].x + px * w, y: pts[i].y + py * w });
      right.push({ x: pts[i].x - px * w, y: pts[i].y - py * w });
    }
    ctx.beginPath();
    ctx.moveTo(left[0].x, left[0].y);
    for (let i = 1; i < n; i++) ctx.lineTo(left[i].x, left[i].y);
    for (let i = n - 1; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
    ctx.closePath();
    const g = ctx.createLinearGradient(pts[0].x, pts[0].y, pts[n - 1].x, pts[n - 1].y);
    g.addColorStop(0, "rgba(239, 106, 77, 0.92)");
    g.addColorStop(1, "rgba(239, 106, 77, 0.04)");
    ctx.fillStyle = g;
    ctx.fill();
  }

  requestAnimationFrame(frame);
}

/* ------------------------------------------------------------------
   Boot.
------------------------------------------------------------------ */
initReveal();

if (!motionQuery.matches && !coarseQuery.matches) {
  initKite();
}
