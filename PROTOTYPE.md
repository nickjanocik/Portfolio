# proto/sky — "Sky Corridor"

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

## Three bugs worth recording

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
