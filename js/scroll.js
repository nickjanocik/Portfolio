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
  skyTimeline();
  headlines();
  reveals();
  developPrints();
  parallax();

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

  // morning: the light opens up and cools
  tl.to(root, {
    "--sky-top": "#a9c8de",
    "--sky-mid": "#c6dae6",
    "--sky-haze": "#dfe2d6",
    "--sky-warm": "#f2ecdd",
    "--leak-x": "88%",
    "--leak-y": "-8%",
    "--leak-alpha": 0.3,
    ease: "none",
  })
    // golden hour: the leak swings down and warms
    .to(root, {
      "--sky-top": "#b4c4d2",
      "--sky-mid": "#d8cec2",
      "--sky-haze": "#ecdac0",
      "--sky-warm": "#f6e4ca",
      "--leak-x": "72%",
      "--leak-y": "8%",
      "--leak-alpha": 0.6,
      "--leak-hue": "255, 158, 96",
      ease: "none",
    })
    // dusk
    .to(root, {
      "--sky-top": "#94a6bf",
      "--sky-mid": "#c3b5bd",
      "--sky-haze": "#e4c4ae",
      "--sky-warm": "#efd7bf",
      "--leak-x": "56%",
      "--leak-y": "20%",
      "--leak-alpha": 0.68,
      "--leak-hue": "247, 130, 84",
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
