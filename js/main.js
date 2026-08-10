/* ------------------------------------------------------------------
   Nick Janocik — portfolio, "The Reel"

   Boot + capability gating. GSAP and its plugins are vendored UMD builds
   loaded as classic scripts before this module, so they're already on the
   window by the time this parses.

   See MOTION-CONTRACT.md for the rules this branch has to satisfy.
------------------------------------------------------------------ */

import { initScroll } from "./scroll.js";
import { initKite } from "./kite.js";

const yearEl = document.querySelector("#year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const coarsePointer = matchMedia("(hover: none), (pointer: coarse)");

gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin, CustomEase);

if (reducedMotion.matches) {
  /* Nothing initialises. The CSS reduced-motion block already states every
     end-state outright — revealed sections, un-clipped frames, resolved film
     grade — so the page is complete without a single tween running. Booting
     ScrollTrigger here would be worse than useless: a scrub left un-scrubbed
     strands content mid-timeline. */
} else {
  initScroll();

  // The kite is a pointer affordance; touch devices pay nothing for it.
  if (!coarsePointer.matches) initKite();
}
