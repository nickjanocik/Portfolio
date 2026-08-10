# Motion contract

Rules every prototype branch (`proto/gsap`, `proto/motion`, `proto/anime`,
`proto/react-spring`) must satisfy. Each branch rebuilds the motion layer from
scratch with a different library, so none of this is inherited automatically —
check it every time.

## 1. Who owns `transform`

`script.js` on `main` writes `el.style.transform` at 60fps to every `[data-fx]`
element and every `a, button, .bubble, .nav-say-hi` (wind repel + magnet
attraction). Any library animating `transform` on those same elements is
silently clobbered every frame.

If a branch keeps a hand-rolled rAF loop that offsets DOM elements, that loop
must write the **independent `translate` property**, never `transform`:

```js
el.style.translate = `${x}px ${y}px`;   // composes with transform
el.style.transform = `translate(...)`;  // fights the library — don't
```

`translate` / `rotate` / `scale` are separate CSS properties that compose with
`transform` (applied first, outermost). This leaves `transform` entirely free
for GSAP / Motion / Anime / React Spring.

Where a branch hands the pointer FX wholly to its library, the library becomes
the sole owner and no split is needed — but say so in the branch's own notes.

## 2. Reduced motion

`main` gates the whole engine at the bottom of `script.js`:

```js
if (!motionQuery.matches && !coarseQuery.matches) initKite();
```

and again in CSS (`@media (prefers-reduced-motion: reduce)`): transitions
collapse to `0.001ms`, `#fx` is hidden, `scroll-behavior` drops to `auto`, and
`[data-reveal]` is forced visible.

Every branch must end in the same place: **all content readable, nothing hidden,
no pointer FX, no scroll hijacking.** Scroll-linked libraries need explicit care
here — a ScrollTrigger scrub or a Lenis/ScrollSmoother instance must not
initialise at all under reduced motion, or content pinned mid-timeline will
never reach its final state.

Verify: DevTools → Rendering → *Emulate `prefers-reduced-motion: reduce`*.

## 3. Coarse pointer

`@media (hover: none), (pointer: coarse)` hides `#fx`, and the JS gate above
skips the engine entirely. Touch devices must pay **zero** rAF cost — no idle
loop, no `getBoundingClientRect` sweeps, no offscreen canvases.

Verify: DevTools device toolbar. Confirm no animation frames are being
scheduled, and that the native cursor is intact.

## 4. Progressive enhancement

`index.html` sets `.js` on `<html>` inline in `<head>`, and every reveal rule is
scoped under it:

```css
.js [data-reveal] { opacity: 0; ... }
```

Content must never be hidden by a rule that JS is responsible for undoing.
If a branch introduces new reveal targets, they get the same `.js` scoping.

Verify: disable JavaScript. The whole page must still read top to bottom.

## 5. Accessibility floor

- `aria-label` on the nav and on every `.tag-list` link group.
- Alt text on all 17 photos (see `data/story.js`).
- Visible focus on the nav pill, all bubbles, and the mailto button. `main`
  currently uses `:focus-visible` colour swaps and has **no `:active` states at
  all** — branches are free to add them, not to remove focus styling.
- Nothing focus-trapped behind the `#fx` canvas or an SVG overlay; the FX layer
  is `pointer-events: none` and `aria-hidden` and must stay that way.

## 6. Shared constants

Two values used to be duplicated between CSS and JS. They are now single-sourced
in `:root` and read by `script.js` through `getComputedStyle`:

| Token | Meaning |
|---|---|
| `--film-grade` | The faded film `filter`. Baked into particle bitmaps so scattered tiles match the untouched photo. |
| `--print` | Cream paper. Also painted as the blank back of a tumbling page. |

Retune them in `styles.css` only. Don't reintroduce a literal in JS.

## 7. Images

Photos are `<picture>` with AVIF + JPEG at 480/960/1440 (never upscaled past the
original), plus `width`/`height` for CLS. Sources are in `assets/opt/`;
originals stay in `assets/` untouched.

Two consequences for motion code:

- `.photo-card img` still matches — `<picture>` wraps the `<img>`, it doesn't
  replace it. Selectors keep working.
- `img.naturalWidth` is now the **chosen variant's** width, not the original's.
  Anything sampling pixels (the particle system's offscreen bake) must read
  `naturalWidth`/`naturalHeight` at use time rather than assuming a size.

## Per-branch checklist

| Check | How |
|---|---|
| Reduced motion | Emulate `prefers-reduced-motion: reduce`; page fully readable, no FX |
| Coarse pointer | Device toolbar; no rAF loop, native cursor |
| No-JS | Disable JS; nothing hidden |
| Keyboard | Tab through nav → 6 bubbles → mailto; focus visible throughout |
| 60fps | Performance panel, hero → footer; no long tasks, no layout thrash |
| CLS | Lighthouse |
| Transform ownership | Inspect a `[data-fx]` element mid-animation; library's `transform` not overwritten |
