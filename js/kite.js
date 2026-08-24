/* ------------------------------------------------------------------
   The kite, as SVG.

   On main this was a canvas engine doing its own lerps, its own
   follow-the-leader ribbon and its own per-frame jitter maths. Here GSAP
   owns all of it: quickTo for the pointer chase, a stepped seed tween on
   an feTurbulence displacement for the hand-drawn line boil, DrawSVG to
   ink the kite in the first time you move, and quickTo again for the
   wind and magnet fields on the page itself.

   GSAP is the sole owner of `transform` on every element it touches, so
   nothing here needs the translate/transform split.
------------------------------------------------------------------ */

const TRAIL = 20; // ribbon control points
const SEGLEN = 9;
const REPEL_RADIUS = 200;
const REPEL_MAX = 24;
const MAGNET_RADIUS = 110;
const MAGNET_PULL = 0.4;

export function initKite() {
  const svg = document.querySelector("#fx");
  const kite = document.querySelector("#kite");
  const ribbon = document.querySelector("#ribbon");
  const grad = document.querySelector("#ribbon-grad");
  const noise = document.querySelector("#boil-noise");
  if (!svg || !kite || !ribbon) return;

  const pointer = { x: innerWidth / 2, y: innerHeight / 2 };
  const trail = Array.from({ length: TRAIL }, () => ({ x: pointer.x, y: pointer.y }));
  let moved = false;
  let hovering = false;

  /* ---------- Pointer chase ----------
     quickTo is GSAP's high-frequency setter: it reuses one tween per
     property instead of allocating a new one on every pointermove. */
  const toX = gsap.quickTo(kite, "x", { duration: 0.42, ease: "power3" });
  const toY = gsap.quickTo(kite, "y", { duration: 0.42, ease: "power3" });
  const toRot = gsap.quickTo(kite, "rotation", { duration: 0.5, ease: "power2" });

  /* `scale` is a shorthand for scaleX/scaleY, so it can't be quickTo'd. It also
     doesn't need to be — the swell only changes when the pointer crosses into
     or out of a link, so a discrete tween on that edge is both correct and
     cheaper than a per-frame setter. */
  const setHover = (on) =>
    gsap.to(kite, { scale: on ? 1.3 : 1, duration: 0.35, ease: "power2.out", overwrite: "auto" });

  const state = { x: pointer.x, y: pointer.y, prevX: pointer.x, prevY: pointer.y };

  /* ---------- Line boil ----------
     Stepping the turbulence seed re-renders the displacement a handful of
     times a second, which reads as a hand-inked outline redrawn frame by
     frame — the same trick the original canvas did with a hashed jitter. */
  if (noise) {
    gsap.to(noise, {
      attr: { seed: 40 },
      duration: 4,
      ease: "steps(36)",
      repeat: -1,
    });
  }

  /* ---------- Wind + magnet fields ---------- */
  const windEls = [...document.querySelectorAll("[data-fx]:not(.photo-card)")];
  const magnetEls = [...document.querySelectorAll("a, button, .bubble, .nav-say-hi")];

  const setters = new Map();
  const fieldSetter = (el, duration) => {
    if (!setters.has(el)) {
      setters.set(el, {
        x: gsap.quickTo(el, "x", { duration, ease: "power2" }),
        y: gsap.quickTo(el, "y", { duration, ease: "power2" }),
      });
    }
    return setters.get(el);
  };

  // Cache geometry; recompute only when the layout can actually have changed.
  let rects = new Map();
  let rectsDirty = true;
  const markDirty = () => (rectsDirty = true);
  const refreshRects = () => {
    rects = new Map();
    for (const el of [...windEls, ...magnetEls]) {
      const r = el.getBoundingClientRect();
      rects.set(el, { cx: r.left + r.width / 2, cy: r.top + r.height / 2 });
    }
    rectsDirty = false;
  };
  addEventListener("scroll", markDirty, { passive: true });
  addEventListener("resize", markDirty, { passive: true });

  /* ---------- Input ---------- */
  addEventListener(
    "pointermove",
    (e) => {
      if (e.pointerType === "touch") return;
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      if (!moved) {
        moved = true;
        document.documentElement.classList.add("custom-cursor");
        state.x = state.prevX = pointer.x;
        state.y = state.prevY = pointer.y;
        trail.forEach((p, i) => ((p.x = pointer.x), (p.y = pointer.y + i * SEGLEN)));
        revealKite();
      }
    },
    { passive: true }
  );

  document.addEventListener("mouseleave", () => gsap.to(svg, { opacity: 0, duration: 0.3 }));
  document.addEventListener("mouseenter", () => {
    if (moved) gsap.to(svg, { opacity: 1, duration: 0.3 });
  });

  const interactive = "a, button, .bubble, .nav-say-hi";
  document.addEventListener("pointerover", (e) => {
    if (!e.target.closest?.(interactive) || hovering) return;
    hovering = true;
    setHover(true);
  });
  document.addEventListener("pointerout", (e) => {
    if (!e.target.closest?.(interactive) || !hovering) return;
    hovering = false;
    setHover(false);
  });

  /* ---------- First appearance ----------
     DrawSVG inks the kite's outline on, then the sails fade up behind it. */
  function revealKite() {
    const edge = kite.querySelector(".kite-edge");
    const spar = kite.querySelector(".kite-spar");
    const sails = kite.querySelectorAll(".kite-sail");

    gsap.set(svg, { opacity: 1 });
    gsap
      .timeline()
      .fromTo(sails, { opacity: 0 }, { opacity: 1, duration: 0.5, stagger: 0.05 }, 0.18)
      .fromTo(
        [edge, spar],
        { drawSVG: "0%" },
        { drawSVG: "100%", duration: 0.55, ease: "power2.out" },
        0
      )
      .fromTo(ribbon, { opacity: 0 }, { opacity: 1, duration: 0.6 }, 0.3);
  }

  /* ---------- Frame ---------- */
  gsap.ticker.add(() => {
    // Kite follows the pointer; quickTo does the easing.
    toX(pointer.x);
    toY(pointer.y);

    const cur = { x: gsap.getProperty(kite, "x"), y: gsap.getProperty(kite, "y") };
    const vx = cur.x - state.prevX;
    const vy = cur.y - state.prevY;
    state.prevX = cur.x;
    state.prevY = cur.y;
    const speed = Math.hypot(vx, vy);

    // Nose into the direction of travel; idle-bob when essentially still.
    const target =
      speed > 0.6
        ? (Math.atan2(vx, -vy) * 180) / Math.PI
        : Math.sin(performance.now() * 0.0016) * 8;
    toRot(target);

    // Ribbon: follow-the-leader from the kite's tail point.
    const rad = (target * Math.PI) / 180;
    trail[0].x = cur.x - 22 * Math.sin(rad);
    trail[0].y = cur.y + 22 * Math.cos(rad);
    const now = performance.now();
    for (let i = 1; i < TRAIL; i++) {
      const p = trail[i];
      const lead = trail[i - 1];
      p.y += 0.9;
      p.x += Math.sin(now * 0.006 + i * 0.6) * 0.8 + vx * 0.05;
      const dx = p.x - lead.x;
      const dy = p.y - lead.y;
      const d = Math.hypot(dx, dy) || 1;
      const r = SEGLEN / d;
      p.x = lead.x + dx * r;
      p.y = lead.y + dy * r;
    }

    // Quadratic through the trail keeps the ribbon smooth instead of kinked.
    let d = `M ${trail[0].x.toFixed(1)} ${trail[0].y.toFixed(1)}`;
    for (let i = 1; i < TRAIL - 1; i++) {
      const mx = (trail[i].x + trail[i + 1].x) / 2;
      const my = (trail[i].y + trail[i + 1].y) / 2;
      d += ` Q ${trail[i].x.toFixed(1)} ${trail[i].y.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
    }
    ribbon.setAttribute("d", d);
    if (grad) {
      grad.setAttribute("x1", trail[0].x);
      grad.setAttribute("y1", trail[0].y);
      grad.setAttribute("x2", trail[TRAIL - 1].x);
      grad.setAttribute("y2", trail[TRAIL - 1].y);
    }

    if (!moved) return;
    if (rectsDirty) refreshRects();

    // Copy leans away from the kite...
    for (const el of windEls) {
      const r = rects.get(el);
      if (!r) continue;
      const dx = r.cx - cur.x;
      const dy = r.cy - cur.y;
      const dist = Math.hypot(dx, dy);
      const set = fieldSetter(el, 0.6);
      if (dist < REPEL_RADIUS) {
        const force = (1 - dist / REPEL_RADIUS) ** 2;
        const len = dist || 1;
        set.x((dx / len) * force * REPEL_MAX);
        set.y((dy / len) * force * REPEL_MAX);
      } else {
        set.x(0);
        set.y(0);
      }
    }

    // ...links lean toward it.
    for (const el of magnetEls) {
      const r = rects.get(el);
      if (!r) continue;
      const dx = cur.x - r.cx;
      const dy = cur.y - r.cy;
      const dist = Math.hypot(dx, dy);
      const set = fieldSetter(el, 0.4);
      if (dist < MAGNET_RADIUS) {
        const force = 1 - dist / MAGNET_RADIUS;
        set.x(dx * force * MAGNET_PULL);
        set.y(dy * force * MAGNET_PULL);
      } else {
        set.x(0);
        set.y(0);
      }
    }
  });
}
