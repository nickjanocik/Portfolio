/* ------------------------------------------------------------------
   The scroll score.

   One scrubbed master timeline carries the sky from dawn at the hero to
   dusk at the sign-off — the page is a single continuous shot, and the
   light changes as you move through it. Everything else hangs off
   per-section triggers: masked SplitText headlines, photographs that
   develop as they enter, and a gentle parallax between frames.
------------------------------------------------------------------ */

/* The site's easing personality, registered once so tweens can name it. */
CustomEase.create("reel", "0.16, 1, 0.3, 1");

const filmGrade = getComputedStyle(document.documentElement)
  .getPropertyValue("--film-grade")
  .trim();

export function initScroll() {
  const immersive = document.documentElement.classList.contains("webgl");

  skyTimeline();
  headlines();

  /* In the 3D world the depth layer owns opacity on every block (js/immerse.js)
     and the photo cards are visually hidden because their pictures are now
     prints in the scene. Running these would be a second writer on the same
     property and a pile of tweens on things nobody can see. */
  if (!immersive) {
    reveals();
    developPrints();
    parallax();
  }

  // Late-loading photos change the document height; keep triggers honest.
  addEventListener("load", () => ScrollTrigger.refresh());
}

/* ---------- Time of day ----------
   The four gradient stops, the warm leak's position/strength, and the rail
   bead are all custom properties, so one scrubbed timeline moves the whole
   sky at once. Shifts are deliberately small — this is faded film, not a
   sunset wallpaper. */
function skyTimeline() {
  const root = document.documentElement;

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: document.body,
      start: "top top",
      end: "bottom bottom",
      scrub: 1.1,
    },
  });

  /* Morning at the top of the sky, golden hour below it. The blue end is
     teal rather than the old flat cornflower — cooler and greener reads as
     early light, and it leaves the warm stops underneath completely alone,
     which is where the hour actually lives. The scrub overwrites :root the
     moment it runs, so these have to move with the variables or the teal
     lasts exactly one frame. */
  tl.to(root, {
    "--sky-top": "#64a0b0",
    "--sky-mid": "#b2a9a8",
    "--sky-haze": "#eda872",
    "--sky-warm": "#fad5a0",
    "--leak-x": "72%",
    "--leak-y": "30%",
    "--leak-alpha": 0.7,
    ease: "none",
  })
    // the sun drops and the warmth climbs the sky
    .to(root, {
      "--sky-top": "#5b96a8",
      "--sky-mid": "#bfa199",
      "--sky-haze": "#f0995e",
      "--sky-warm": "#fbc98d",
      "--leak-x": "62%",
      "--leak-y": "38%",
      "--leak-alpha": 0.78,
      "--leak-hue": "255, 132, 66",
      ease: "none",
    })
    // last light
    .to(root, {
      "--sky-top": "#53899c",
      "--sky-mid": "#bb9390",
      "--sky-haze": "#ea8552",
      "--sky-warm": "#f7b979",
      "--leak-x": "52%",
      "--leak-y": "46%",
      "--leak-alpha": 0.84,
      "--leak-hue": "252, 116, 58",
      ease: "none",
    });

  // The gutter rail bead rides the same progress.
  gsap.to(root, {
    "--rail-progress": 1,
    ease: "none",
    scrollTrigger: { trigger: document.body, start: "top top", end: "bottom bottom", scrub: 0.4 },
  });
}

/* ---------- Headlines ----------
   SplitText per line, each line clipped, chars riding up from behind the
   mask. Waits on the webfont: splitting before Fraunces lands would measure
   the fallback's line breaks and leave words orphaned mid-mask. */
function headlines() {
  document.fonts.ready.then(() => {
    const targets = [document.querySelector(".hero h1"), ...document.querySelectorAll("h2")];

    for (const el of targets) {
      if (!el) continue;
      const split = new SplitText(el, { type: "lines,chars", linesClass: "reel-line" });

      gsap.from(split.chars, {
        yPercent: 118,
        rotate: 2.5,
        duration: 1.1,
        ease: "reel",
        stagger: { each: 0.018, from: "start" },
        scrollTrigger: { trigger: el, start: "top 88%", once: true },
      });
    }

    // Re-measuring on resize would need a revert()/re-split; the reveal is
    // one-shot and already complete by then, so leave the split lines in place.
    ScrollTrigger.refresh();
  });
}

/* ---------- Section reveals ---------- */
function reveals() {
  for (const el of document.querySelectorAll("[data-reveal]")) {
    gsap.to(el, {
      opacity: 1,
      duration: 0.9,
      ease: "reel",
      scrollTrigger: { trigger: el, start: "top 88%", once: true },
    });

    // The copy column drifts up a beat behind its own section.
    const copy = el.querySelector(".story-copy");
    if (copy) {
      gsap.from(copy.children, {
        y: 26,
        opacity: 0,
        duration: 0.95,
        ease: "reel",
        stagger: 0.075,
        scrollTrigger: { trigger: el, start: "top 82%", once: true },
      });
    }
  }
}

/* ---------- Developing prints ----------
   Each frame wipes open from the bottom while its grade resolves out of an
   over-exposed blank into the final film look. */
function developPrints() {
  for (const card of document.querySelectorAll(".photo-card")) {
    const picture = card.querySelector("picture");
    const img = card.querySelector("img");
    if (!picture || !img) continue;

    const tl = gsap.timeline({
      scrollTrigger: { trigger: card, start: "top 90%", once: true },
    });

    tl.to(picture, { clipPath: "inset(0 0 0% 0)", duration: 1.0, ease: "reel" }).to(
      img,
      { filter: filmGrade, duration: 1.5, ease: "power2.out" },
      0.12
    );
  }
}

/* ---------- Parallax ----------
   Frames drift at slightly different rates inside their sheet. `.photo-card`
   is deliberately excluded from the kite's wind field, so nothing else is
   writing transforms here. */
function parallax() {
  for (const sheet of document.querySelectorAll(".photo-cluster")) {
    const cards = [...sheet.querySelectorAll(".photo-card")];
    cards.forEach((card, i) => {
      // alternate direction by column so the sheet breathes rather than slides
      const dir = i % 2 === 0 ? 1 : -1;
      gsap.fromTo(
        card,
        { y: 10 * dir },
        {
          y: -10 * dir,
          ease: "none",
          scrollTrigger: { trigger: sheet, start: "top bottom", end: "bottom top", scrub: 0.8 },
        }
      );
    });
  }
}
