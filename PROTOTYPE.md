# proto/sky — "Sky Corridor", golden hour

**Branched from `proto/gsap` ("The Reel"), which is untouched.**
GSAP 3.15 for the page motion + **three.js r185** for the world.
Vendored ESM, no build step, no runtime CDN.

## Why this exists

`proto/approach` tried to get depth from CSS `perspective`. That was the wrong
tool and it looked it. CSS perspective projects flat DOM rectangles through a
pinhole — there are no lights, no materials, no atmosphere and no occlusion, so
layers flying at the camera read as sliding paper rather than travel.

austinwerner.io (the reference) renders a real 3D scene into a `webgl2` canvas
and dollies a camera through it. Checked: **zero** elements on that page use CSS
`perspective`. This branch does the same thing, in your palette.

## The architecture

Copied from the reference, and it's the right call:

- **The 3D is the world.** Haze, light, the prints, a kite.
- **All type stays flat DOM on top.** Crisp, selectable, translatable,
  screen-reader-native. Nothing is rendered as a texture that should be text.
- **The canvas is transparent**, so the existing CSS film sky is still the
  backdrop and the dawn→dusk scrub still runs underneath.
- **Photographs move into the scene** as lit prints in cream mats. Their DOM
  originals stay in the document, visually hidden but still announced, so
  screen readers get every alt string.

Everything is progressive enhancement. No WebGL, no JS, or reduced motion →
none of it boots, `.webgl` is never set, and the page is **exactly "The Reel"**,
photo clusters and all.

## Golden hour

The whole flight is now late light. `:root` carries a muted blue up top,
mauve through the middle where the light turns, apricot and gold at the
horizon; the scrub in `js/scroll.js` moves *within* the hour rather than
dawn→dusk, so it never leaves it.

In the scene: a low warm key light from off to one side near the horizon, a
cool violet fill from the shaded side, and a visible sun — an additive disc
parked at a fixed offset ahead of the camera so it stays on the horizon however
far you fly.

The clouds are built rather than drawn. A single radial gradient reads as fog
because it has no silhouette; each puff here is 7–11 overlapping lobes for a
lumpy edge, then lit with a vertical ramp — sunlit warm along the crown turning
to cool violet underneath. Four variants are generated so 330 billboards don't
read as one shape repeated.

## Everything flies through

Type and pictures now travel on the same curve: in from the haze, held at the
reading plane while you read, then past the camera and gone.

That was only safe once `main { overflow: clip }` was in place. A projected box
still counts toward its scroll container's overflow, so text flying toward the
camera at 8x scale physically grows the document — the page height was swinging
between 6,788px and 8,824px as you scrolled, which moves the scrollbar and every
position computed from it. `clip` throws that overflow away without turning
`<main>` into a scroll container the way `hidden` would. Height is now constant
at every scroll position.

The plateau is what keeps it readable: while the eye line is anywhere inside a
block, that block sits at natural size and full opacity. Outside it, the
identical curve the photographs get.

## Everything is in the world now

The type is projected through **exactly the same camera** as the scene
(`js/immerse.js`), not merely laid on top of it. A CSS element at `translateZ(z)`
under `perspective: P` scales by `P / (P − z)`; a WebGL object at distance `d`
scales by `f / d`. Setting `P = viewportHeight / (2·tan(fov/2))` makes the CSS
pinhole the same pinhole as the camera, so

```
z = P · (1 − d / FOCUS)
```

lands a paragraph exactly where a print at that distance would sit. One space,
two renderers.

Text stays real DOM throughout — selectable, translatable, screen-reader-native.
It arrives out of the haze, holds at natural size while you read it, and
dissolves. Deliberately it does **not** fly past the camera: that is unreadable,
and a projected box still counts toward scrollable overflow, so a paragraph
scaled 4× inflates the page height by a thousand pixels as you scroll and moves
every position underneath you.

## What sells the motion

Not the prints — the **clouds**. 240 tinted billboards recycled through a
window around the camera, near ones sweeping past fast and far ones barely
moving. That volumetric field at many depths is the forward-motion cue; the
prints are just the content hanging in it.

They're blue-grey and cream rather than white, because pure white is invisible
against a bright daylight sky. The reference gets away with white by being
black.

## Tuning

Top of `js/sky.js`:

```js
UNITS_PER_PX = 0.062  // world units per page pixel — corridor speed
FOCUS        = 42     // distance you read a row's prints at
HAZE         = 132    // distance at which everything has dissolved
CLOUDS       = 240
```

Debug switches, handy when retuning:

```
?nocloud   drop the cloud field
?nokite    drop the 3D kite
?debug     expose window.__sky = { scene, camera, prints, clouds, renderer }
```

## Bugs worth recording

**Prints hung on the same side as the copy.** Under `.webgl` the story row
collapses to a single column, so a *normal* row's copy sits left and a
*reversed* row's is pushed right — the opposite of the two-column layout the
`reversed` flag was named for. The side test was inverted.

**Untextured planes are white rectangles.** A `MeshLambertMaterial` with no map
yet is a lit white quad hanging in the sky. Prints now stay hidden until their
texture actually decodes, with a JPEG fallback if AVIF fails.

**A hard-edged rectangle at 8% opacity is still a rectangle.** Distant prints
were fading linearly and reading as grey boxes floating in the sky rather than
dissolving. Real aerial perspective loses the *shape*, not just the contrast, so
the fade is squared and culled below 2% — the tail of the curve has to collapse
fast. This one took a while to find: it wasn't the clouds, the kite, or the DOM.

**All the copy vanished, and the DOM insisted it was visible.** Every
`.story-copy` reported `opacity: 1` with an identity transform at the right
screen position — but its parent `.story-row` was at `opacity: 0`. The row is
`[data-reveal]`, whose `.js` from-state is `opacity: 0`, and the tween that used
to animate it to 1 had been switched off because the depth layer owns opacity
now. The override needed `.js.immersive` rather than `.immersive`: at equal
specificity the older rule further down the file was winning on source order.

**The reading plateau has to be the block's own height.** Measuring a fixed band
around each block's *centre* meant copy columns — routinely taller than the
viewport — were only ever at natural size for one exact scroll position, and
faded for the rest. While the eye line is anywhere inside the block, it now sits
at the reading plane.

**Alternating sides cannot work in a corridor.** Rows swapped which side held
the pictures, so a row's departing prints always landed on exactly the side the
next row's copy arrived on — they overlapped across every handover. Pushing them
wider or deeper only shrank the collision. Prints are now always left and copy
always right, which also reads better: the copy holds one position for the whole
flight instead of jumping side to side.

## Cost

| | |
|---|---|
| three.js (module + core, minified) | 751KB raw, **183KB gzipped** |
| vs. GSAP on `proto/gsap` | 134KB raw |
| Build step | still none |
| Fallback if WebGL absent | full, and identical to The Reel |

## Verified

Reduced motion, coarse pointer and no-JS all leave the page fully readable —
17/17 photos visible in every fallback, 5,089 characters of text with
JavaScript disabled. Console clean.

## Run it

```bash
npm run dev     # python3 -m http.server 5173
```
