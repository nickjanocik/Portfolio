# proto/gsap — "The Reel"

**Library:** GSAP 3.15 + ScrollTrigger, SplitText, DrawSVGPlugin, CustomEase
(vendored UMD in `vendor/`, ~140KB, no build step, no CDN at runtime).

## The idea

The page is a strip of film and you are scrolling through a single continuous
shot. The sky isn't a static gradient any more — it's a **time of day** that
runs from dawn at the hero, through golden hour at the community section, to
dusk at the sign-off. Photographs are frames on a **contact sheet** with
punched sprockets, edge printing and frame numbers. A sprocket **rail** runs
the left gutter carrying a progress bead.

Chosen for GSAP because the whole direction is continuous scroll-linked state,
which is ScrollTrigger's home turf.

## What the library is actually doing

| Effect | Mechanism | Where |
|---|---|---|
| Sky runs dawn → dusk | One scrubbed timeline over 7 custom properties on `:root` | `js/scroll.js` `skyTimeline()` |
| Gutter progress bead | `--rail-progress` 0→1 on the same scrub | `js/scroll.js` |
| Headlines rise from a mask | `SplitText` lines+chars, lines clipped, chars `yPercent` | `js/scroll.js` `headlines()` |
| Photos "develop" | `clip-path` wipe + `filter` resolving from blown-out to the film grade | `js/scroll.js` `developPrints()` |
| Frames drift | Per-card scrubbed `y`, alternating by column | `js/scroll.js` `parallax()` |
| Kite chases pointer | `gsap.quickTo` — one reused tween per property | `js/kite.js` |
| Kite inks itself on | `DrawSVG` on the outline + spar, sails fading in behind | `js/kite.js` `revealKite()` |
| Hand-drawn line boil | Stepped `seed` tween on an `feTurbulence` displacement filter | `js/kite.js` |
| Wind + magnet fields | `quickTo` on `x`/`y` per element | `js/kite.js` |

## Notable decisions

**The kite moved from canvas to SVG.** On `main` it was ~700 lines of canvas
doing its own lerps, its own follow-the-leader ribbon and a hashed per-frame
jitter for the hand-drawn wobble. Here the wobble is an `feTurbulence`
displacement whose seed GSAP steps through — the same noise primitive the page
already uses for its film grain — and GSAP owns every transform.

**MotionPathPlugin was dropped.** The plan called for flying the kite along a
motion path, but `quickTo` is the right tool for pointer-follow: it reuses one
tween per property instead of allocating on every `pointermove`. Shipping 22KB
of unused plugin would have been worse than not using it.

**GSAP owns `transform` outright**, so the `translate`/`transform` split in
`MOTION-CONTRACT.md` isn't needed on this branch — there's no competing rAF
loop writing DOM offsets.

**Fraunces' full axis set is now loaded** (`opsz`, `wght`, `SOFT`, `WONK`). The
hero runs at `opsz 144` for fine hairlines and high contrast, headings at 96,
the pull-quote at 48, small serif at 12. On `main` the axis was requested and
never used.

## Reduced motion

Nothing initialises — not even ScrollTrigger. A scrub left un-scrubbed strands
content mid-timeline, so the CSS `prefers-reduced-motion` block states every
end-state outright: sections revealed, frames un-clipped, film grade resolved,
`#fx` and the rail hidden.

Verified: reduced motion, coarse pointer and no-JS all leave the page fully
readable, 17/17 photos visible, 5k+ characters of text.

## Run it

```bash
npm run dev     # python3 -m http.server 5173
```
