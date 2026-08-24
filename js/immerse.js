/* ------------------------------------------------------------------
   Bringing the type into the world.

   The photographs live in WebGL; the copy has to stay real DOM to be
   readable, selectable and announced. So instead of rendering text into
   the scene, this projects the DOM through *exactly the same camera* the
   scene uses — same field of view, same focus distance, same haze — so
   both are describing one space rather than two stacked layers.

   That equivalence is the whole trick:

     a CSS element at translateZ(z) under `perspective: P` scales by
       P / (P - z)
     a WebGL object at distance d from a camera of focal length f scales by
       f / d

   Setting P = viewportHeight / (2·tan(fov/2)) makes the CSS pinhole the
   same pinhole as the camera. Then a block that should read as sitting
   `d` away just needs

     z = P · (1 − d / FOCUS)

   and it lands where a print at the same distance would.

   This is why the earlier CSS-perspective attempt looked wrong and this
   doesn't: not because CSS was the wrong maths, but because there was no
   world around it. Lighting, haze and things streaming past are what make
   depth legible; the projection was never the problem.
------------------------------------------------------------------ */

import { CAMERA } from "./sky.js";

/* Grace beyond a block's own box before it starts travelling, as a fraction of
   the viewport. The plateau itself is the block's HEIGHT — see the frame loop. */
const GRACE = 0.16;

/* Closest a block gets before it is culled. It is well inside the point where
   the fade has already taken it to zero, and exists only to stop the
   projection dividing by nothing.

   Text CAN fly past the camera now: `main { overflow: clip }` stops a
   projected paragraph from inflating the document, which was the real reason
   it used to be held back. */
const NEAREST = 6;

const SELECTOR = ".hero, .story-copy, .contact-section";

export function initImmerse() {
  const main = document.querySelector("main");
  if (!main) return;

  const blocks = [...document.querySelectorAll(SELECTOR)].map((el) => ({ el, top: 0, height: 0 }));
  if (!blocks.length) return;

  /* Measure from an untransformed state. Reading a rect while the element is
     already pushed 900px down the corridor gives you the projected box, not
     the layout box — that mistake is what made the first depth attempt place
     everything in the wrong part of the page. */
  function measure() {
    for (const b of blocks) {
      b.el.style.transform = "";
      const r = b.el.getBoundingClientRect();
      b.top = r.top + window.scrollY;
      b.height = r.height;
    }
  }

  function setPerspective() {
    // The CSS pinhole, matched to the WebGL camera's field of view.
    const p = window.innerHeight / (2 * Math.tan((CAMERA.FOV * Math.PI) / 360));
    main.style.perspective = `${p.toFixed(1)}px`;
    return p;
  }

  let perspective = setPerspective();

  function onResize() {
    perspective = setPerspective();
    measure();
  }

  measure();
  addEventListener("resize", onResize, { passive: true });
  addEventListener("load", onResize);

  let raf = 0;
  function frame() {
    raf = requestAnimationFrame(frame);
    const scroll = window.scrollY;
    const vh = window.innerHeight;

    /* perspective-origin resolves against <main>'s own box, and <main> is as
       tall as the page — so a fixed 50% pins the vanishing point to the middle
       of the DOCUMENT. It has to track the middle of the SCREEN or the whole
       space visibly skews as you scroll. */
    main.style.perspectiveOrigin = `50% ${(scroll + vh / 2 - main.offsetTop).toFixed(1)}px`;

    const soft = vh * GRACE;
    const eye = scroll + vh / 2; // the eye line, in document coordinates

    for (const b of blocks) {
      /* The plateau is the block's own box, not a fixed band around its
         centre. These copy columns are routinely taller than the viewport, so
         measuring centre-to-centre meant a paragraph was only ever at the
         reading plane for one exact scroll position — and spent the rest of
         its time faded out. While the eye line is anywhere inside the block,
         it sits at natural size and full opacity. */
      const gap =
        eye < b.top ? eye - b.top : eye > b.top + b.height ? eye - (b.top + b.height) : 0;
      const eased = Math.sign(gap) * Math.max(0, Math.abs(gap) - soft);
      // World units past the reading plane. Negative = still out ahead of us.
      const travel = eased * CAMERA.UNITS_PER_PX;

      /* Same law as the prints, in both directions: in from the haze, held at
         the reading plane, then past the camera and gone. The plateau above is
         what keeps it readable — outside it, this is the identical curve the
         photographs get, so type and pictures travel together. */
      const d = Math.max(NEAREST, CAMERA.FOCUS - travel);
      const far = 1 - smoothstep(d, CAMERA.HAZE * 0.45, CAMERA.HAZE * 0.85);
      const near = smoothstep(d, NEAREST + 2, NEAREST + 18);
      // Squared for the same reason as the prints: a block of text at 8%
      // opacity is still a legible grey slab, not something lost in haze.
      const o = (far * near) ** 2;

      const z = perspective * (1 - d / CAMERA.FOCUS);
      b.el.style.transform = `translateZ(${z.toFixed(1)}px)`;
      b.el.style.opacity = o.toFixed(3);
      /* Once it is invisible, take it out of hit-testing AND out of painting.
         A block sweeping past the camera covers the whole viewport at 8x
         scale; left visible it would both swallow every click and cost a
         full-screen composite for nothing. */
      const gone = o < 0.012;
      b.el.style.visibility = gone ? "hidden" : "";
      b.el.style.pointerEvents = o < 0.15 ? "none" : "";
    }
  }

  raf = requestAnimationFrame(frame);
  document.documentElement.classList.add("immersive");

  return () => {
    cancelAnimationFrame(raf);
    removeEventListener("resize", onResize);
  };
}

function smoothstep(x, min, max) {
  const t = Math.min(1, Math.max(0, (x - min) / (max - min)));
  return t * t * (3 - 2 * t);
}
