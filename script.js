/* ------------------------------------------------------------------
   Nick Janocik — portfolio interaction engine
   A little paper kite follows the pointer, streaming a flowing ribbon.
   As it passes, nearby elements lean on the "wind"; links pull toward it.
------------------------------------------------------------------ */

const yearEl = document.querySelector("#year");
if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const coarseQuery = window.matchMedia("(hover: none), (pointer: coarse)");

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
   Paper kite cursor — only on fine-pointer, motion-allowed devices.
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

  // Kite orientation + size.
  let angle = 0;
  let scale = 1;

  // Ribbon tail (follow-the-leader chain).
  const SEG = 18;
  const SEGLEN = 9;
  const tail = [];
  for (let i = 0; i < SEG; i++) tail.push({ x: smooth.x, y: smooth.y });

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

  // Elements that respond to the kite (wind) + magnetic links.
  const fxEls = Array.from(document.querySelectorAll("[data-fx]"));
  const magnetEls = Array.from(document.querySelectorAll(interactiveSel));

  let rects = new Map();
  let rectsDirty = true;
  const markDirty = () => (rectsDirty = true);
  function refreshRects() {
    rects = new Map();
    const vh = window.innerHeight;
    [...fxEls, ...magnetEls].forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      rects.set(el, { cx: r.left + r.width / 2, cy: r.top + r.height / 2 });
    });
    rectsDirty = false;
  }
  window.addEventListener("scroll", markDirty, { passive: true });
  window.addEventListener("resize", markDirty);

  const state = new WeakMap();
  function getState(el) {
    let s = state.get(el);
    if (!s) {
      s = { x: 0, y: 0, lift: 0 };
      state.set(el, s);
    }
    return s;
  }

  const REPEL_RADIUS = 200;
  const MAGNET_RADIUS = 110;

  // --- Drawing helpers ---
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
    const g = ctx.createLinearGradient(
      pts[0].x,
      pts[0].y,
      pts[n - 1].x,
      pts[n - 1].y
    );
    g.addColorStop(0, "rgba(239, 106, 77, 0.92)");
    g.addColorStop(1, "rgba(239, 106, 77, 0.04)");
    ctx.fillStyle = g;
    ctx.fill();
  }

  function drawKite(kx, ky, ang, sc) {
    ctx.save();
    ctx.translate(kx, ky);
    ctx.rotate(ang);
    ctx.scale(sc, sc);

    const nose = { x: 0, y: -16 };
    const lft = { x: -13, y: -3 };
    const rgt = { x: 13, y: -3 };
    const btm = { x: 0, y: 22 };

    // Paper body with soft shadow.
    ctx.shadowColor = "rgba(30, 40, 55, 0.22)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 5;
    ctx.beginPath();
    ctx.moveTo(nose.x, nose.y);
    ctx.lineTo(rgt.x, rgt.y);
    ctx.lineTo(btm.x, btm.y);
    ctx.lineTo(lft.x, lft.y);
    ctx.closePath();
    const pg = ctx.createLinearGradient(-13, -16, 13, 22);
    pg.addColorStop(0, "#fdfaf2");
    pg.addColorStop(1, "#efe7d3");
    ctx.fillStyle = pg;
    ctx.fill();

    // Clear shadow for the detail lines.
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Subtle blue-tinted panel (right half) for paper dimension.
    ctx.beginPath();
    ctx.moveTo(nose.x, nose.y);
    ctx.lineTo(rgt.x, rgt.y);
    ctx.lineTo(btm.x, btm.y);
    ctx.closePath();
    ctx.fillStyle = "rgba(47, 126, 201, 0.12)";
    ctx.fill();

    // Outline.
    ctx.lineJoin = "round";
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = "rgba(38, 44, 56, 0.85)";
    ctx.beginPath();
    ctx.moveTo(nose.x, nose.y);
    ctx.lineTo(rgt.x, rgt.y);
    ctx.lineTo(btm.x, btm.y);
    ctx.lineTo(lft.x, lft.y);
    ctx.closePath();
    ctx.stroke();

    // Spars.
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(38, 44, 56, 0.4)";
    ctx.beginPath();
    ctx.moveTo(nose.x, nose.y);
    ctx.lineTo(btm.x, btm.y);
    ctx.moveTo(lft.x, lft.y);
    ctx.lineTo(rgt.x, rgt.y);
    ctx.stroke();

    ctx.restore();
  }

  function frame(now) {
    smooth.x = lerp(smooth.x, raw.x, 0.2);
    smooth.y = lerp(smooth.y, raw.y, 0.2);
    const vx = smooth.x - prev.x;
    const vy = smooth.y - prev.y;
    const speed = Math.hypot(vx, vy);
    prev.x = smooth.x;
    prev.y = smooth.y;

    // Kite points where it's heading; sways gently when idle.
    const targetAngle =
      speed > 0.6 ? Math.atan2(vx, -vy) : Math.sin(now * 0.0016) * 0.14;
    angle = lerpAngle(angle, targetAngle, 0.16);
    scale = lerp(scale, hovering ? 1.3 : 1, 0.2);

    // Tail anchor = kite's bottom point in world space.
    const L = 22 * scale;
    const ax = smooth.x - L * Math.sin(angle);
    const ay = smooth.y + L * Math.cos(angle);

    // Follow-the-leader chain: streams behind motion, droops + flutters when idle.
    tail[0].x = ax;
    tail[0].y = ay;
    for (let i = 1; i < SEG; i++) {
      const p = tail[i];
      const lead = tail[i - 1];
      p.y += 0.9; // gravity → hangs
      p.x += Math.sin(now * 0.006 + i * 0.6) * 0.8 + vx * 0.05; // flutter + wind
      let dx = p.x - lead.x;
      let dy = p.y - lead.y;
      const dist = Math.hypot(dx, dy) || 1;
      const r = SEGLEN / dist;
      p.x = lead.x + dx * r;
      p.y = lead.y + dy * r;
    }

    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    if (visible && hasMoved) {
      drawRibbon(tail);
      drawKite(smooth.x, smooth.y, angle, scale);
    }

    // Element interactions.
    if (rectsDirty) refreshRects();
    const active = visible && hasMoved;

    fxEls.forEach((el) => {
      const r = rects.get(el);
      const s = getState(el);
      let tx = 0;
      let ty = 0;
      let lift = 0;
      const isPhoto = el.classList.contains("photo-card");
      if (r && active) {
        const dx = r.cx - smooth.x;
        const dy = r.cy - smooth.y;
        const dist = Math.hypot(dx, dy);
        if (dist < REPEL_RADIUS) {
          const force = (1 - dist / REPEL_RADIUS) ** 2;
          const push = isPhoto ? 14 : 24;
          const len = dist || 1;
          tx = (dx / len) * force * push;
          ty = (dy / len) * force * push;
          if (isPhoto) lift = clamp(1 - dist / REPEL_RADIUS, 0, 1);
        }
      }
      s.x = lerp(s.x, tx, 0.12);
      s.y = lerp(s.y, ty, 0.12);
      if (isPhoto) {
        s.lift = lerp(s.lift, lift, 0.1);
        el.style.setProperty("--lift", s.lift.toFixed(3));
        el.style.transform = `translate(${s.x.toFixed(2)}px, ${s.y.toFixed(
          2
        )}px) scale(${(1 + s.lift * 0.04).toFixed(4)})`;
      } else {
        el.style.transform = `translate(${s.x.toFixed(2)}px, ${s.y.toFixed(2)}px)`;
      }
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

  requestAnimationFrame(frame);
}

/* ------------------------------------------------------------------
   Boot.
------------------------------------------------------------------ */
initReveal();

if (!motionQuery.matches && !coarseQuery.matches) {
  initKite();
}
