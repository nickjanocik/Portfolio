/* ------------------------------------------------------------------
   The sky corridor.

   CSS `perspective` projects flat rectangles through a pinhole. It has
   no lights, no materials, no atmosphere and no occlusion, which is why
   DOM layers flying at the camera read as sliding paper rather than as
   travel. This is the real thing: a WebGL scene with depth, haze and
   warm light, and a camera that dollies forward as you scroll.

   Architecture follows the reference: the 3D is the WORLD, and all the
   type stays flat DOM on top of it — crisp, selectable, accessible. The
   photographs move into the scene as lit prints; their DOM originals
   stay in the document, visually hidden but still announced, so screen
   readers and no-WebGL visitors lose nothing.

   Everything here is progressive enhancement. If WebGL is missing or
   reduced motion is on, none of it boots and the page is "The Reel".
------------------------------------------------------------------ */

import * as THREE from "../vendor/three.module.min.js";
import { photos } from "../data/story.js";

/* World scale: how many world units one page pixel is worth. Sets how fast
   the corridor streams past for a given scroll speed. */
const UNITS_PER_PX = 0.062;
/* How far ahead of the camera a row's prints sit when that row is centred on
   screen — i.e. the distance you read them at. */
const FOCUS = 42;
/* Distance at which things have fully dissolved into haze. */
const HAZE = 132;

const FOV = 50;

/* The sky is drawn into an offscreen buffer at half the linear resolution and
   then blown up over the canvas, which is a quarter of the fragment work.

   The measurement that forced this: at DPR 1 the page held 120fps flat, and
   at Retina DPR it dropped 17% of frames under a steady scroll. Ablation put
   all of it on the cloud field — `?nocloud` was clean at both. That signature
   (fine at one resolution, broken at four times the pixels, main thread idle
   throughout) is fill rate, and nothing else.

   Halving costs nothing visible because the layer is entirely soft gradients.
   The photographs are NOT in this pass — they stay at full resolution, which
   is the whole point of separating the two. */
const BG_SCALE = 0.5;

/* The camera contract, shared with js/immerse.js so the DOM and the WebGL
   world are projected identically. */
export const CAMERA = { UNITS_PER_PX, FOCUS, HAZE, FOV };

/* How far in front of the camera something sitting at `docCentreY` is, given
   the current scroll. Exactly the expression the render loop uses. */
export function distanceAt(docCentreY, scroll, vh) {
  return FOCUS - (scroll + vh / 2 - docCentreY) * UNITS_PER_PX;
}

export function supportsWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/* ---------- Procedural cloud textures ----------

   Stacked radial gradients cannot look like cumulus. A sum of smooth blobs
   has a smooth silhouette, and a real cloud's silhouette is fractal —
   cauliflower lobes repeating down to the limit of what the eye resolves.
   The old four-lobe puffs read as fog precisely because they had no edge.

   So these are grown from value noise instead:

     · fBm over a domain-warped coordinate field gives the billowing,
       self-similar edge and the wisps that trail off it;
     · an elliptical body mask with a flattened base gives the domed-top,
       cut-off-bottom shape of a fair-weather cumulus;
     · and the shading is cheap self-shadowing — sample the density again a
       short way TOWARD the sun. If there's a lot of cloud in that direction
       this point is buried and goes violet; if there's little, it's on the
       sunlit face and goes warm white.

   That last step is the one that sells it. A cloud lit by a flat vertical
   ramp reads as a sticker; a cloud whose own lobes shade each other reads
   as volume. */

/* Seeded value noise — deterministic, so the sky is the same on every load
   rather than reshuffling itself between visits. */
function makeNoise(seed) {
  let s = seed >>> 0;
  const rnd = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  const base = new Uint8Array(256);
  for (let i = 0; i < 256; i++) base[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = (rnd() * (i + 1)) | 0;
    const t = base[i]; base[i] = base[j]; base[j] = t;
  }
  const p = new Uint8Array(512);
  for (let i = 0; i < 512; i++) p[i] = base[i & 255];

  const fade = (t) => t * t * (3 - 2 * t);
  return function noise(x, y) {
    const fx = Math.floor(x), fy = Math.floor(y);
    const xi = fx & 255, yi = fy & 255, xj = (fx + 1) & 255;
    const u = fade(x - fx), v = fade(y - fy);
    const a = p[(p[xi] + yi) & 511], b = p[(p[xj] + yi) & 511];
    const c = p[(p[xi] + yi + 1) & 511], d = p[(p[xj] + yi + 1) & 511];
    return ((a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v) / 255;
  };
}

/* `billow` folds each octave around its midpoint — |2n-1| — instead of using
   it straight. Plain fBm is smoke: it drifts and shears. Folded fBm is
   cauliflower, because the fold puts a crease wherever the noise crosses zero
   and the octaves stack those creases into rounded lobes. That is the
   difference between something that looks like fog and something that looks
   like convection, and it costs one Math.abs. */
function fbm(noise, x, y, octaves, billow = false) {
  let sum = 0, amp = 0.5, freq = 1, norm = 0;
  for (let i = 0; i < octaves; i++) {
    const n = noise(x * freq, y * freq);
    sum += amp * (billow ? Math.abs(n * 2 - 1) : n);
    norm += amp;
    amp *= 0.5;
    freq *= 2.03; // off an exact octave, so the lobes never line up into a grid
  }
  return sum / norm;
}

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
function smooth01(x, lo, hi) {
  const t = clamp01((x - lo) / (hi - lo));
  return t * t * (3 - 2 * t);
}
const mix = (a, b, t) => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

/* Colour ramp through a cloud's tonal range, darkest first. */
function rampAt(stops, t) {
  const n = stops.length - 1;
  const f = clamp01(t) * n;
  const k = Math.min(n - 1, Math.floor(f));
  return mix(stops[k], stops[k + 1], f - k);
}

/* Turn a density field into a lit RGBA texture.

   The light model is Beer-Lambert absorption: march four taps from each pixel
   TOWARD the sun, total up the density in the way, and attenuate by it. A
   single tap with a linear falloff — the first thing I tried — saturates
   almost everywhere inside the cloud and gives a bright crescent wrapped
   around a flat dead mass, which reads as a sticker of a cloud rather than a
   cloud. Marching a short ray and taking exp() of it produces the smooth
   interior gradient that reads as volume, and never quite reaches black,
   which matters: a real cloud's shadow side is still lit by the whole sky. */
function paint(dens, S, { stops, lift, rimGain = 1, absorb = 9, ambient = 0.22, sky = 0.34, reach = 0.3 }) {
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d");
  const img = g.createImageData(S, S);
  const px = img.data;

  /* Toward the key light: up and to the left, matching the DirectionalLight.
     The march has to be LONG — a fifth of the tile at least. A short one
     never accumulates enough density to darken anything but the immediate
     underside of a lobe, which is why the first version came out uniformly
     lit with a dirty edge. */
  const LX = -S * reach * 0.62;
  const LY = -S * reach;
  const TAPS = 6;
  const at = (x, y) => {
    const xi = x < 0 ? 0 : x > S - 1 ? S - 1 : x | 0;
    const yi = y < 0 ? 0 : y > S - 1 ? S - 1 : y | 0;
    return dens[yi * S + xi];
  };

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const idx = y * S + x;
      const o = idx * 4;
      const a = Math.min(1, dens[idx] * lift);
      if (a <= 0.004) { px[o + 3] = 0; continue; }

      let occl = 0;
      for (let k = 1; k <= TAPS; k++) occl += at(x + (LX * k) / TAPS, y + (LY * k) / TAPS);
      let light = Math.exp((-occl / TAPS) * absorb) * (1 - ambient) + ambient;
      // Skylight from straight overhead, so the tops stay open even where the
      // low sun is blocked. Squared: it falls away fast below the crown.
      const up = 1 - y / S;
      light = clamp01(light + up * up * sky);

      const col = rampAt(stops, light);

      /* Silver lining: thin cloud that is also strongly lit is being shone
         THROUGH rather than at, so it blows out warmer than the body. */
      const rim = clamp01((1 - a) * light * 1.6) * rimGain;
      px[o]     = Math.min(255, col[0] + rim * 30);
      px[o + 1] = Math.min(255, col[1] + rim * 23);
      px[o + 2] = Math.min(255, col[2] + rim * 12);
      px[o + 3] = Math.round(a * 255);
    }
  }
  g.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* Golden hour, darkest to brightest. Weighted toward the bright end on
   purpose: lit by a low sun, a cumulus is mostly luminous, with shadow only
   in its undercut — not a half-and-half split. */
const GOLDEN_STOPS = [
  [128, 118, 152], // deep shadow, violet
  [186, 168, 184],
  [243, 206, 180],
  [255, 240, 217], // sunlit face
  [255, 250, 238],
];

/* Tunables live in the signature so the shape can be swept without editing
   the generator — see the tuning page in the scratchpad harness. */
export function cumulusTexture(seed, S = 192, opt = {}) {
  const {
    cut = 0.17,       // noise level the density must clear at the core
    /* Climbs steeply. A shallow rise lets the noise clear the bar in isolated
       spots well away from the body, and those become detached specks
       orbiting the cloud — debris, not wisps. Steep keeps it one mass. */
    edge = 0.8,
    contrast = 1.7,   // steepens the noise, so lobes read as lobes
    freq = 4.2,       // lobe scale: lower is fewer, larger cauliflower heads
    warp = 0.8,       // domain distortion; past ~1.5 it shears into smoke
    /* Folded noise was the obvious choice for cauliflower and turned out to
       be wrong: the fold decorrelates neighbouring samples, so thresholding
       it shatters the cloud into confetti instead of lobing it. Straight fBm
       under a domain warp holds together and lobes anyway. */
    billow = false,
    lift = 4.6,       // density -> alpha
    absorb = 9,       // Beer-Lambert coefficient along the light march
    ambient = 0.22,   // skylight floor; a cloud's shadow is never black
    sky = 0.34,       // extra light from straight overhead
    reach = 0.3,      // how far the light march travels, as a fraction of S
  } = opt;
  const noise = makeNoise(seed);
  const dens = new Float32Array(S * S);

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const u = x / S, v = y / S;
      /* Warp the sample coordinates with a second, coarser noise. Straight
         fBm is evenly lumpy; warping it is what curdles the lumps into
         lobes that bulge and overhang like real convection. */
      const wx = fbm(noise, u * 3.1 + 7.3, v * 3.1 + 2.9, 3) - 0.5;
      const wy = fbm(noise, u * 3.1 + 19.7, v * 3.1 + 13.1, 3) - 0.5;
      const raw = fbm(noise, u * freq + wx * warp, v * freq + wy * warp, 5, billow);
      const f = clamp01((raw - 0.5) * contrast + 0.5);

      const dx = (u - 0.5) / 0.48;
      const dy = (v - 0.54) / 0.4;
      let r = Math.hypot(dx, dy);
      // Cumulus condense at one altitude, so they share a flat base.
      if (v > 0.72) r += (v - 0.72) * 3.4;
      const body = 1 - smooth01(r, 0.3, 1.02);

      /* Threshold the noise rather than multiplying by the mask. Multiplying
         makes the ellipse the silhouette and the noise mere shading, which is
         how the first attempt came out perfectly oval. Raising the cutoff
         toward the edges instead puts the boundary wherever the fractal
         happens to clear it — lobed on the way in, wispy on the way out. */
      /* Hard border guard. Whatever the noise does, the density has to reach
         zero before the tile does — a billboard that clips at its own edge
         shows a straight cut in the sky, which no amount of good silhouette
         survives. */
      const border = Math.min(u, 1 - u, v, 1 - v);
      dens[i(x, y, S)] =
        Math.max(0, f - (cut + (1 - body) * edge)) * smooth01(border, 0.015, 0.09);
    }
  }
  return paint(dens, S, { stops: GOLDEN_STOPS, lift, absorb, ambient, sky, reach });
}

/* The high, wind-sheared layer. Stretched along one axis and much thinner,
   so it reads as veil rather than as a flattened cumulus. */
export function veilTexture(seed, S = 192) {
  const noise = makeNoise(seed);
  const dens = new Float32Array(S * S);

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const u = x / S, v = y / S;
      const shear = fbm(noise, u * 2.2, v * 2.2, 3) * 2.4;
      const f = fbm(noise, u * 3.4, v * 11 + shear, 4);
      /* Same border guard as the cumulus, and it matters more here: veils are
         the largest quads in the field, so a straight cut at one of their
         edges draws a hard horizontal line right across the sky. */
      const border = Math.min(u, 1 - u, v, 1 - v);
      const body =
        (1 - smooth01(Math.abs(v - 0.5) / 0.5, 0.1, 1)) *
        (1 - smooth01(Math.abs(u - 0.5) / 0.5, 0.05, 1)) *
        smooth01(border, 0.01, 0.1);
      dens[i(x, y, S)] = Math.max(0, (f - 0.42) * 2.6 * body);
    }
  }
  return paint(dens, S, {
    stops: [[178, 166, 192], [214, 194, 198], [246, 214, 188], [255, 240, 214], [255, 250, 236]],
    lift: 1.5, rimGain: 1.7, absorb: 2.2, ambient: 0.35,
  });
}

const i = (x, y, S) => y * S + x;

export function initSky() {
  const canvas = document.querySelector("#sky");
  if (!canvas || !supportsWebGL()) return null;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true, // the CSS film sky stays the backdrop and shows through
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  /* Two scenes, two passes. `bg` is the sun and the cloud field, rendered
     small; `scene` is the prints and the kite, rendered sharp on top.

     They never needed to interleave in depth: the clouds already ran with
     depthWrite off at renderOrder -1, so a print always painted over a cloud
     whatever their distances. Splitting the passes makes that explicit and
     buys the resolution drop for free. */
  const bg = new THREE.Scene();
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 600);

  /* Golden hour: warm light from low and to one side, cool violet bounce from
     below. The prints pick up a warm edge on the sun side and go cool in
     shadow, which is what makes them sit in the same air as the clouds. */
  scene.add(new THREE.HemisphereLight(0xffd9a8, 0x8f86a8, 1.55));
  const key = new THREE.DirectionalLight(0xffb877, 2.1);
  key.position.set(-9, 2.5, 5); // low, off to the left, near the horizon
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xbcd0ee, 0.5);
  rim.position.set(7, -3, -4); // cool fill from the shaded side
  scene.add(rim);

  /* The sun stays OUT of the offscreen buffer and draws straight to the
     canvas. Two reasons, both learned the hard way:

     · it is additive, and additive light does not survive a premultiplied
       composite — baked into the buffer it stopped adding to the sky and
       started replacing it, turning a glow into an opaque disc;
     · it is the smoothest gradient on the page, so it is the one thing that
       visibly banded when resolved at half resolution.

     It costs one full-screen additive quad, against the cloud field's many. */
  const sun = buildSun();
  scene.add(sun);

  const clouds = new URLSearchParams(location.search).has("nocloud") ? [] : buildClouds(bg);
  const prints = buildPrints(scene);
  const kite = new URLSearchParams(location.search).has('nokite') ? null : buildKite(scene);

  /* The offscreen sky buffer, and the quad that stamps it back over the
     canvas. Blending is CustomBlending with a One / OneMinusSrcAlpha pair
     because the buffer accumulated onto transparent black — its colour is
     already multiplied by its own alpha, and a normal blend would multiply
     by it a second time and darken the whole sky. */
  const rt = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false, stencilBuffer: false });
  rt.texture.minFilter = rt.texture.magFilter = THREE.LinearFilter;
  rt.texture.generateMipmaps = false;

  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quadScene = new THREE.Scene();
  quadScene.add(
    new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.MeshBasicMaterial({
        map: rt.texture,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        blending: THREE.CustomBlending,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.OneMinusSrcAlphaFactor,
        blendSrcAlpha: THREE.OneFactor,
        blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
      })
    )
  );
  renderer.autoClear = false;

  /* ---------- Sizing ---------- */
  let vh = innerHeight;
  let docH = 1;
  function resize() {
    vh = innerHeight;
    docH = Math.max(1, document.documentElement.scrollHeight);
    camera.aspect = innerWidth / vh;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, vh, false);
    const pr = renderer.getPixelRatio();
    rt.setSize(
      Math.max(1, Math.round(innerWidth * pr * BG_SCALE)),
      Math.max(1, Math.round(vh * pr * BG_SCALE))
    );
    layoutPrints(prints);
  }

  /* ---------- Frame ---------- */
  let raf = 0;
  const t0 = performance.now();

  function frame() {
    raf = requestAnimationFrame(frame);
    const t = (performance.now() - t0) / 1000;

    // The dolly. Camera rides the scroll position, one page pixel at a time.
    camera.position.z = -((scrollY + vh / 2) * UNITS_PER_PX) + FOCUS;
    // A touch of drift so the flight never feels rail-straight.
    camera.position.x = Math.sin(t * 0.12) * 0.9;
    camera.position.y = Math.cos(t * 0.09) * 0.6;
    camera.lookAt(camera.position.x * 0.4, camera.position.y * 0.4, camera.position.z - 40);

    sun.position.set(camera.position.x - 46, camera.position.y - 10, camera.position.z - 190);
    sun.quaternion.copy(camera.quaternion);

    fade(prints, camera);
    driftClouds(clouds, camera, t);
    if (kite) flyKite(kite, camera, t);

    // Sky small and offscreen, then stamped down, then the sharp layer on top.
    renderer.setRenderTarget(rt);
    renderer.setClearColor(0x000000, 0);
    renderer.clear(true, false, false);
    renderer.render(bg, camera);

    renderer.setRenderTarget(null);
    renderer.clear(true, true, true);
    renderer.render(quadScene, quadCam);
    renderer.render(scene, camera);
  }

  addEventListener("resize", resize, { passive: true });
  resize();

  /* Re-measure once the page has finished becoming itself. The first layout
     happens before the webfonts land, and Fraunces is nothing like the
     fallback metrics — every row shifts when it swaps, so prints placed from
     that first reading sit at the wrong point in the flight. Cheap to redo
     and it only happens twice. */
  addEventListener("load", resize);
  document.fonts?.ready.then(resize);
  raf = requestAnimationFrame(frame);

  if (new URLSearchParams(location.search).has("debug")) {
    window.__sky = { scene, bg, camera, prints, clouds, renderer, rt };
  }

  document.documentElement.classList.add("webgl");
  return () => {
    cancelAnimationFrame(raf);
    removeEventListener("resize", resize);
    rt.dispose();
    renderer.dispose();
  };
}

/* ---------- Clouds ----------
   The sensation of travel comes from these, not from the prints: a field at
   many depths, near ones sweeping past fast and far ones barely moving.

   Three layers rather than one uniform scatter, because a real sky is not
   uniform — a high sheared veil, a cumulus deck around eye level, and small
   torn fragments close in that streak past and give the speed its scale.

   Far fewer of them than before (130 against 330) and they still read as a
   denser sky, because each one now has a silhouette. Count was the wrong
   lever: 330 featureless puffs is 330 full-screen transparent quads to blend
   and still no clouds. */
const CLOUD_BUDGET = matchMedia("(max-width: 860px)").matches ? 72 : 170;

/* Each layer keeps to its own depth band, and that is the important part.

   With one shared band the big high veils eventually drifted right up to the
   camera, where a 200-unit quad at 15 units out covers the entire viewport
   in flat haze — it stopped reading as a cloud and started reading as fog
   over the copy. A cloud's apparent size has to stay in proportion to what it
   is: veils always far, cumulus at conversational distance, and only the
   small torn fragments allowed to come close enough to sweep past.

     near — closest this layer ever gets, in world units
     span — depth of its band; a puff leaving the front is recycled to the back */
const LAYERS = [
  { share: 0.14, size: [120, 230], x: 112, y: 54, aspect: 0.24, alpha: [0.10, 0.20], near: 95, span: 210 },
  { share: 0.52, size: [16, 58],   x: 66,  y: 32, aspect: 0.68, alpha: [0.55, 0.95], near: 20, span: 210 },
  { share: 0.34, size: [5, 18],    x: 30,  y: 16, aspect: 0.72, alpha: [0.30, 0.62], near: 3,  span: 130 },
];

function buildClouds(scene) {
  const cumulus = [0, 1, 2, 3].map((n) => cumulusTexture(1013 + n * 7717));
  const veil = [0, 1].map((n) => veilTexture(4409 + n * 3301));

  const group = new THREE.Group();
  const items = [];

  LAYERS.forEach((L, layer) => {
    const texes = layer === 0 ? veil : cumulus;
    const n = Math.round(CLOUD_BUDGET * L.share);

    for (let k = 0; k < n; k++) {
      const mat = new THREE.MeshBasicMaterial({
        map: texes[k % texes.length],
        transparent: true,
        depthWrite: false,
        depthTest: false, // nothing in this pass occludes anything else
        opacity: 0,
      });
      const size = L.size[0] + Math.random() * (L.size[1] - L.size[0]);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size * L.aspect), mat);

      /* Bias the deck below the eye line — you fly along the tops of a
         cumulus layer, not through the middle of one. Sum of two uniforms so
         the mass clusters rather than scattering evenly. */
      const y = (Math.random() + Math.random() - 1) * L.y - 4;
      m.position.set((Math.random() - 0.5) * 2 * L.x, y, -(L.near + Math.random() * L.span));
      // Mirror and roll a little so four textures never read as four shapes.
      if (Math.random() < 0.5) m.scale.x = -1;
      m.rotation.z = (Math.random() - 0.5) * 0.22;

      items.push({
        mesh: m,
        near: L.near,
        span: L.span,
        baseOpacity: L.alpha[0] + Math.random() * (L.alpha[1] - L.alpha[0]),
        drift: 0.4 + Math.random(),
      });
      group.add(m);
    }
  });

  scene.add(group);
  return items;
}

function driftClouds(items, camera, t) {
  for (const c of items) {
    const p = c.mesh.position;
    // Distance ahead of the camera. Falls as the camera advances down -z.
    let d = camera.position.z - p.z;
    if (d < c.near) p.z -= c.span;             // passed us — send it to the back
    else if (d > c.near + c.span) p.z += c.span;
    d = camera.position.z - p.z;

    p.x += Math.sin(t * 0.05 * c.drift + p.z) * 0.004;
    /* Billboarding used to be a per-cloud lookAt — a matrix build and a
       decompose each, every frame. Every cloud faces the same way, so it is
       one quaternion copied out rather than 170 lookAts computed. */
    c.mesh.quaternion.copy(camera.quaternion);

    // In from the back of the band, out again at the front of it.
    const near = THREE.MathUtils.smoothstep(d, c.near, c.near + 14);
    const far = 1 - THREE.MathUtils.smoothstep(d, c.near + c.span * 0.6, c.near + c.span);
    c.mesh.material.opacity = c.baseOpacity * near * far;
  }
}

/* ---------- Prints ----------
   One lit plane per photograph, in a cream mat, hung in the corridor on the
   opposite side from that row's text column. Positions come from the DOM: each
   .story-row is still in the document (its copy is real text), so its offset
   is the truth about where in the flight its pictures belong. */
function makePrint(scene, loader, name, height) {
  const meta = photos[name];
  if (!meta) return null;

  // AVIF at the widest generated size that isn't overkill for a plane.
  const w = meta.widths.includes(960) ? 960 : meta.widths.at(-1);
  const wUnits = height * (meta.w / meta.h);

  const group = new THREE.Group();

  // The mat: a slightly larger cream plane behind the image.
  const mat = new THREE.Mesh(
    new THREE.PlaneGeometry(wUnits + 0.9, height + 0.9),
    new THREE.MeshLambertMaterial({ color: 0xfbf7ef, transparent: true })
  );
  mat.position.z = -0.02;
  group.add(mat);

  const faceMat = new THREE.MeshLambertMaterial({ transparent: true });
  group.add(new THREE.Mesh(new THREE.PlaneGeometry(wUnits, height), faceMat));

  /* A plane with no map yet is a white rectangle, and a lit white rectangle
     hanging in the sky is very obviously a bug. Hold the print back until its
     texture is actually decoded, with a JPEG fallback if AVIF won't. */
  const record = { loaded: false, group, materials: [mat.material, faceMat] };
  const apply = (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    faceMat.map = tex;
    faceMat.needsUpdate = true;
    record.loaded = true;
  };
  loader.load(`assets/opt/${name}-${w}.avif`, apply, undefined, () => {
    loader.load(`assets/opt/${name}-${w}.jpg`, apply);
  });

  group.rotation.z = (Math.random() - 0.5) * 0.06;
  scene.add(group);
  return record;
}

function nameFromCard(card) {
  const img = card.querySelector("img");
  return img?.getAttribute("src")?.match(/opt\/([^/]+)-\d+\.jpg$/)?.[1] ?? null;
}

function buildPrints(scene) {
  const loader = new THREE.TextureLoader();
  const out = [];

  for (const row of document.querySelectorAll(".story-row")) {
    const cards = [...row.querySelectorAll(".photo-card")];
    cards.forEach((card, i) => {
      const name = nameFromCard(card);
      const rec = name && makePrint(scene, loader, name, 12);
      if (!rec) return;
      Object.assign(rec, { anchor: row, index: i, count: cards.length, hero: false });
      out.push(rec);
    });
  }

  /* The sign-off portrait. It is not inside a .story-row, so the loop above
     never saw it and it simply disappeared when the photos moved into the
     scene. It gets its own treatment: bigger, centred in the corridor rather
     than off to one side, and met head-on at the end of the flight. */
  const signOff = document.querySelector(".bottom-photo");
  const signName = signOff && nameFromCard(signOff);
  if (signName) {
    const rec = makePrint(scene, loader, signName, 19);
    if (rec) {
      Object.assign(rec, { anchor: signOff, index: 0, count: 1, hero: true });
      rec.group.rotation.z = 0;
      out.push(rec);
    }
  }

  return out;
}

/* Place each print in the corridor from its anchor's position in the document.

   How far a row may fan out along the corridor is measured, not guessed. The
   old fixed 58 units had to be conservative enough for the tightest gap on the
   page, which left the roomy rows — the two six-photo grids near the end —
   bunched with their pictures nearly on top of each other. Now each row asks
   how much corridor it actually has before its neighbour begins and spends
   most of it, so a row with room uses it and a row without still can't collide. */
function layoutPrints(prints) {
  const centreOf = anchorCentre;

  const anchors = [...new Set(prints.map((p) => p.anchor))];
  const centre = new Map(anchors.map((a) => [a, centreOf(a)]));
  const order = anchors.slice().sort((a, b) => centre.get(a) - centre.get(b));

  /* Distance to the nearer neighbour, in world units. The sign-off print is
     in this list too, so the last row can't fan forward into it. */
  const room = new Map();
  order.forEach((a, n) => {
    const c = centre.get(a);
    const before = n > 0 ? c - centre.get(order[n - 1]) : Infinity;
    const after = n < order.length - 1 ? centre.get(order[n + 1]) - c : Infinity;
    room.set(a, Math.min(before, after) * UNITS_PER_PX);
  });

  for (const p of prints) {
    const baseZ = -(centre.get(p.anchor) * UNITS_PER_PX);

    if (p.hero) continue; // placed last, once the rows are down — see below

    /* Prints always left, copy always right — no alternating.

       Alternating is structurally broken in a corridor: rows swap sides, so a
       row's departing prints always land on exactly the side the NEXT row's
       copy arrives on, and they overlap across every handover. Pushing them
       wider or deeper only shrinks the collision, it never removes it.

       Fixing the sides also reads better: the copy stays in one place for the
       whole flight instead of jumping left-right-left as you scroll. */
    const side = -1;
    const t = p.count > 1 ? p.index / (p.count - 1) - 0.5 : 0; // -0.5 .. 0.5
    const alt = p.index % 2 ? 1 : -1;

    /* Two neighbouring rows each reach half their spread toward each other,
       so a spread of 0.8x the gap leaves a fifth of it clear between them.
       Capped so a very long page doesn't string four photos across a
       kilometre of corridor. */
    const gap = room.get(p.anchor);
    const zSpread = Math.min(p.count > 2 ? 200 : 110, (isFinite(gap) ? gap : 90) * 0.8);
    // Longer rows also open up sideways, so they aren't a single vertical file.
    const ySpread = p.count > 2 ? 13 : 16;

    p.group.position.set(
      /* Wide enough to stay clear of the copy column at the reading plane.
         The fan spreads OUTWARD only — abs(t), not t. Signed, half a long
         row's prints drift toward the centre line and cross the text on
         their way past, which is exactly where they must not be. */
      side * (18 + alt * 6 + (p.count > 2 ? Math.abs(t) * 10 : 0)),
      t * ySpread + alt * 1.5,
      baseZ + (t - 0.1) * zSpread
    );
    // Angled slightly toward the corridor's centre line, as if hung.
    p.group.rotation.y = -side * 0.28;
  }

  placeSignOff(prints);
}

/* The sign-off portrait, placed against the last photograph you actually pass
   rather than against its own anchor in the document.

   Anchoring it was not enough. Its position was correct in the sense of being
   after the grid — but a print starts emerging from the haze around 112 units
   out, so at 38 units of separation it was already half-visible in the centre
   of the frame while the last grid photograph was still sweeping past on the
   left. Two subjects on screen, and the one that is meant to be the ending
   arrives as background to the one before it.

   So the clearance is guaranteed here instead of hoped for: whatever the fan
   ends up spanning, the portrait sits at least HERO_CLEAR behind the deepest
   print, and it gets its own much shorter fade (HERO_FADE) so it condenses
   out of empty sky rather than hanging there through the whole approach. */
const HERO_CLEAR = 76;
export const HERO_FADE = [44, 74];

function placeSignOff(prints) {
  const hero = prints.find((p) => p.hero);
  if (!hero) return;

  const rest = prints.filter((p) => !p.hero);
  const anchorZ = -(anchorCentre(hero.anchor) * UNITS_PER_PX);
  // Furthest along the flight is the most negative z — the camera travels -z.
  const deepest = rest.length ? Math.min(...rest.map((p) => p.group.position.z)) : anchorZ;

  const z = Math.max(
    anchorZ - 30,                                 // never so far it meets the card
    Math.min(anchorZ + 20, deepest - HERO_CLEAR)  // never nearer than the clearance
  );
  hero.group.position.set(0, 2.5, z);
  hero.group.rotation.y = 0;
}

function anchorCentre(el) {
  const r = el.getBoundingClientRect();
  return r.top + scrollY + r.height / 2;
}

/* Dissolve into the haze rather than into a fog colour — the backdrop is the
   CSS sky gradient showing through a transparent canvas, so fading to
   transparent is the only thing that blends against it correctly. */
function fade(prints, camera) {
  for (const p of prints) {
    const d = camera.position.z - p.group.position.z;
    const near = THREE.MathUtils.smoothstep(d, 1, 14);
    const [f0, f1] = p.hero ? HERO_FADE : [HAZE * 0.45, HAZE * 0.85];
    const far = 1 - THREE.MathUtils.smoothstep(d, f0, f1);
    /* Squared, because a print is a hard-edged rectangle and a hard-edged
       rectangle at 8% opacity is still very obviously a rectangle — it reads
       as a grey box floating in the sky rather than as something lost in
       haze. Real aerial perspective loses the shape, not just the contrast,
       so the tail of the curve has to collapse fast. */
    /* Fourth power for the sign-off, second for the rest.

       The row prints resolve while they are still small and off to one side,
       so a squared curve hides the rectangle well enough. The portrait
       resolves dead centre at close to reading size, where a cream mat at a
       quarter opacity is unmistakably a translucent box hanging in the sky.
       Raising the power compresses the whole ghost phase into a couple of
       hundred pixels of scroll, so it condenses out of the air instead of
       hovering there half-formed for the length of the approach. */
    const o = (near * far) ** (p.hero ? 4 : 2);
    p.group.visible = p.loaded && o > (p.hero ? 0.03 : 0.02);
    for (const m of p.materials) m.opacity = o;
  }
}

/* ---------- The sun ----------
   Not a light — the light is the DirectionalLight above. This is the glow you
   actually see, a big additive disc riding a fixed offset ahead of the camera
   so it stays on the horizon however far you fly. */
function buildSun() {
  const s = 256;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grd.addColorStop(0, "rgba(255, 236, 198, 0.95)");
  grd.addColorStop(0.16, "rgba(255, 198, 128, 0.6)");
  grd.addColorStop(0.45, "rgba(255, 156, 88, 0.2)");
  grd.addColorStop(1, "rgba(255, 140, 80, 0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, s, s);

  /* Break the banding. A 256px gradient stretched across a third of the
     screen resolves its 8-bit steps as visible rings; a little per-pixel
     noise scatters the step boundary below the threshold where the eye
     joins it into a contour. */
  const img = g.getImageData(0, 0, s, s);
  const px = img.data;
  for (let n = 0; n < px.length; n += 4) {
    const j = (Math.random() - 0.5) * 5;
    px[n] += j; px[n + 1] += j; px[n + 2] += j;
    px[n + 3] = Math.max(0, Math.min(255, px[n + 3] + j));
  }
  g.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;

  const sun = new THREE.Mesh(
    new THREE.PlaneGeometry(118, 118),
    new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.5,
    })
  );
  sun.name = "sun";
  sun.renderOrder = -2; // behind the prints, which share this pass now
  return sun;
}

/* ---------- A kite out there ----------
   Not the cursor — that stays SVG and stays yours. This one is a real object
   in the world, riding a slow path down the corridor ahead of you, so the sky
   has something living in it. */
function buildKite(scene) {
  const group = new THREE.Group();
  const mats = [];

  // Four sails in the crayon checker, same as the cursor kite's quadrants.
  const quad = (pts, colour) => {
    const g = new THREE.BufferGeometry().setFromPoints(pts.map((p) => new THREE.Vector3(p[0], p[1], 0)));
    g.setIndex([0, 1, 2]);
    g.computeVertexNormals();
    const m = new THREE.MeshLambertMaterial({ color: colour, side: THREE.DoubleSide, transparent: true });
    mats.push(m);
    group.add(new THREE.Mesh(g, m));
  };
  quad([[0, 1.3], [0.85, 0], [0, 0.4]], 0xf2c14e);
  quad([[0, 1.3], [-0.85, 0], [0, 0.4]], 0xe3564b);
  quad([[0, 0.4], [0.85, 0], [0, -1.3]], 0xe3564b);
  quad([[0, 0.4], [-0.85, 0], [0, -1.3]], 0xf2c14e);

  // A coral tail, tapering away below it.
  const tail = new THREE.Mesh(
    new THREE.PlaneGeometry(0.16, 3.4),
    new THREE.MeshBasicMaterial({ color: 0xef6a4d, transparent: true, side: THREE.DoubleSide })
  );
  tail.position.y = -2.9;
  mats.push(tail.material);
  group.add(tail);

  group.scale.setScalar(1.9);
  scene.add(group);
  group.userData.mats = mats;
  return group;
}

function flyKite(kite, camera, t) {
  const ahead = 70 + Math.sin(t * 0.16) * 26;
  kite.position.set(
    Math.sin(t * 0.22) * 17,
    5 + Math.cos(t * 0.18) * 5,
    camera.position.z - ahead
  );
  kite.rotation.z = Math.sin(t * 0.5) * 0.4;
  kite.rotation.y = Math.sin(t * 0.22) * 0.6;
  const far = 1 - THREE.MathUtils.smoothstep(ahead, HAZE * 0.6, HAZE);
  for (const m of kite.userData.mats) m.opacity = 0.9 * far;
}
