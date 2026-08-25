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

/* Morning, darkest to brightest. Weighted toward the bright end on purpose:
   a cumulus is mostly luminous, with shadow only in its undercut, not a
   half-and-half split.

   The shadows are BLUE here, not violet. What fills the shaded side of a
   cloud is the open sky above it, so at golden hour that fill is a low red
   sun's violet and in the morning it is plain blue daylight. Getting that
   wrong is what makes a repainted sky still read as evening. */
const MORNING_STOPS = [
  [118, 130, 158], // deep shadow, blue skylight
  [168, 178, 196],
  [228, 224, 220],
  [255, 248, 235], // sunlit face, pale gold
  [255, 253, 247],
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
  return paint(dens, S, { stops: MORNING_STOPS, lift, absorb, ambient, sky, reach });
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
    stops: [[172, 184, 202], [206, 212, 216], [238, 234, 226], [255, 248, 234], [255, 253, 246]],
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
     small; `scene` is the prints and the birds, rendered sharp on top.

     They never needed to interleave in depth: the clouds already ran with
     depthWrite off at renderOrder -1, so a print always painted over a cloud
     whatever their distances. Splitting the passes makes that explicit and
     buys the resolution drop for free. */
  const bg = new THREE.Scene();
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 600);

  /* Morning: the sun is up and climbing, not going down. That is mostly a
     matter of HEIGHT and of how much orange is in it — an hour after sunrise
     the light is pale gold rather than amber, and the shadows it leaves are
     blue from open sky rather than violet from a low red sun.

     The direction matters more than it looks. The cloud textures bake their
     self-shadowing with the light coming from up and to the LEFT, so the key
     light and the sun disc have to agree with that or the clouds are lit from
     somewhere the sky says the sun is not. The old sun sat BELOW the horizon
     line on the left while the clouds were lit from above — a mismatch that
     was easy to miss under all the amber. */
  scene.add(new THREE.HemisphereLight(0xffeacb, 0x93a2b8, 1.5));
  const key = new THREE.DirectionalLight(0xffe0b4, 2);
  key.position.set(-9, 6.5, 5); // up and to the left, matching the clouds
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xa9c9ea, 0.55);
  rim.position.set(7, -3, -4); // cool skylight from the shaded side
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
  const birds = new URLSearchParams(location.search).has("nobird") ? [] : buildBirds(scene);

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

    // Up and to the left: risen, climbing, and where the clouds say it is.
    sun.position.set(camera.position.x - 40, camera.position.y + 15, camera.position.z - 185);
    sun.quaternion.copy(camera.quaternion);

    fade(prints, camera);
    driftClouds(clouds, camera, t);
    flyBirds(birds, camera, t);

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
    window.__sky = { scene, bg, camera, prints, clouds, renderer, rt, HERO_FADE };
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
  const record = {
    loaded: false, group, materials: [mat.material, faceMat],
    // Mat-inclusive footprint, in world units — the fit check below needs it.
    width: wUnits + 0.9, height: height + 0.9,
  };
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
/* How much of the world is actually visible across the frame at the reading
   plane. Vertical field of view is fixed, so this rides entirely on aspect
   ratio: 31 units across on a laptop, 9.6 on a phone held upright.

   That collapse is what broke the corridor on mobile. The lateral offsets
   were fixed in world units — prints at 13 to 29 units off centre — which is
   comfortably inside a desktop frame and completely outside a phone's. The
   photographs were flying past off screen, every one of them. */
/* Below this half-width the desktop scheme stops working and the phone
   scheme takes over. 19 world units is about a 4:3 tablet; a laptop is 31 and
   a phone held upright is 9. */
const NARROW_HALF_W = 19;
/* On a phone the copy runs the full width of the screen, so there is no clear
   side to put a photograph in — only a clear EDGE. These place it there: the
   print is sized to a fraction of the frame and pushed out until its inner
   edge clears the middle, which leaves it cropped by the bezel and reading as
   something passing rather than something in the way. */
const NARROW_PRINT_W = 0.8; // print width, as a fraction of the half-width
const NARROW_INNER = 0.5;   // inner edge, ditto — how much middle stays clear

function visibleHalfWidth() {
  return Math.tan((FOV * Math.PI) / 360) * FOCUS * (innerWidth / innerHeight);
}

function layoutPrints(prints) {
  const centreOf = anchorCentre;
  const halfW = visibleHalfWidth();
  /* Squared, so the corridor closes up FASTER than the frame does. A linear
     scale still left prints hugging the edges on a phone; what a narrow
     screen wants is the photographs more or less centred, flying at you
     rather than past you. The copy is full width there anyway, so there is no
     clear side left to keep them out of. */
  const lateral = Math.min(1, (halfW / 31) ** 2);
  const margin = halfW * 0.96;
  const narrow = halfW < NARROW_HALF_W;

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

    p.fade = null; // reassigned below for the two prints that need their own
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
    /* Which beat of the zigzag this print sits on. Index 0 is the one you
       meet LAST — the fan runs back to front, so the first photograph in the
       row is the deepest along the corridor — and it used to land on the down
       beat, leaving every row ending low just before the sign-off arrives
       centre-frame. Inverting the phase ends each row high instead.

       Raising only that one print was not an option: its neighbour sits ~6
       units above it and a print is 12 tall, so lifting it into the gap would
       have put the two on top of each other. Flipping the whole phase keeps
       the 15-unit spacing that guarantees they never overlap. */
    const alt = p.index % 2 ? -1 : 1;

    /* Two neighbouring rows each reach half their spread toward each other,
       so a spread of 0.8x the gap leaves a fifth of it clear between them.
       Capped so a very long page doesn't string four photos across a
       kilometre of corridor. */
    const gap = room.get(p.anchor);
    const zSpread = Math.min(p.count > 2 ? 200 : 110, (isFinite(gap) ? gap : 90) * 0.8);
    // Longer rows also open up sideways, so they aren't a single vertical file.
    const ySpread = p.count > 2 ? 13 : 16;

    let x, fit;
    if (narrow) {
      /* Phones got the worst of the old scheme. Collapsing the lateral offset
         with the frame put every photograph in the middle of the screen at
         nearly full width — and since the copy is full width too, that is a
         print sitting square behind three paragraphs of body text. Measured
         over the whole flight it was a third of the average print's area on
         top of the words, and fifteen of fifty-two samples more than half
         covered.

         So on a narrow frame the print is sized to the frame instead of the
         world, and pushed out until its inner edge clears the middle. It ends
         up cropped by the edge of the screen, which is right: at this width a
         photograph either passes you or blocks you, and passing is better. */
      fit = Math.min(1, (halfW * NARROW_PRINT_W) / p.width);
      x = side * (halfW * NARROW_INNER + (p.width * fit) / 2);
    } else {
      /* Wide enough to stay clear of the copy column at the reading plane.
         The fan spreads OUTWARD only — abs(t), not t. Signed, half a long
         row's prints drift toward the centre line and cross the text on
         their way past, which is exactly where they must not be. */
      x = side * (18 + alt * 6 + (p.count > 2 ? Math.abs(t) * 10 : 0)) * lateral;

      /* Backstop: whatever the offset works out to, the print has to be
         wholly inside the frame at reading distance. Shrinking the offset and
         the print by the same factor keeps it centred where it was and brings
         the far edge exactly to the margin. */
      fit = Math.min(1, margin / (Math.abs(x) + p.width / 2));
      x *= fit;
    }
    p.group.scale.setScalar(fit);

    p.group.position.set(
      x,
      /* Zigzag, not a ramp. A print is 12 units tall, and spreading a row
         evenly across ySpread left consecutive ones about 5 units apart —
         so whenever two were in frame together the nearer one sat across the
         far one's face. Alternating by STEP puts 2xSTEP between neighbours,
         which is more than a print is tall, so no two can overlap however
         the corridor is spaced. The ramp survives as a small drift on top,
         to keep the row from reading as a mechanical zipper. */
      /* The drift is applied ALONG the step, never against it. Written as a
         separate `t * ySpread` term it happened to reinforce the step while
         the phase ran one way and cancel it when the phase flipped — which
         quietly cut the two-photo rows from 20.6 units of separation to 9.4,
         under a print's own 12-unit height. Folding it inside `alt` means the
         guarantee holds whichever beat a row starts on. */
      alt * (Y_STEP + Math.abs(t) * ySpread * 0.35),
      baseZ + (t - 0.1) * zSpread
    );
    // Angled slightly toward the corridor's centre line, as if hung.
    p.group.rotation.y = -side * 0.28;
  }

  faceFirstPrintRight(prints, lateral, margin, narrow);
  placeSignOff(prints);
}

/* Half the vertical gap between consecutive prints in a row. Prints are 12
   units tall, so anything at or above 6 guarantees neighbours clear each
   other outright rather than merely mostly. */
const Y_STEP = 7.5;

/* The very first photograph of the flight hangs on the RIGHT.

   Everything else is on the left because that is where the story copy is not
   — but the hero is the one block on the page whose text sits on the LEFT, and
   the first print arrives while "Howdy." is still on screen. So the one print
   whose neighbour is the hero gets mirrored, and the rule "prints go opposite
   the words" is actually kept rather than broken.

   Found by position rather than by index: which print you meet first depends
   on the fan's ordering within its row, and that has changed twice already. */
function faceFirstPrintRight(prints, lateral, margin, narrow) {
  const rows = prints.filter((p) => !p.hero);
  if (!rows.length) return;
  // Largest z is nearest the top of the document — the first one you fly at.
  const first = rows.reduce((a, b) => (a.group.position.z > b.group.position.z ? a : b));
  /* Mirrored AND pushed to the outer of the two lateral offsets. Which offset
     a print gets rides on the same parity as the zigzag, so flipping the
     zigzag phase silently moved this one from the outer lane to the inner one
     and it started clipping the hero's callout. Pinning it outward makes the
     clearance independent of the phase. */
  /* Scaled by the same viewport factor as everything else, and re-fitted
     afterwards. A flat 24 here was an absolute world offset applied AFTER the
     fit check, which quietly undid it — this was the one print still hanging
     off the edge of the frame at every size, desktop included. */
  const priorFit = first.group.scale.x || 1;
  /* On a narrow frame the row placement above has already put this print hard
     against an edge at the right size; all this needs to do is mirror it to
     the other one. Re-deriving an offset here would undo that and drag it back
     toward the middle. */
  const outward = narrow
    ? Math.abs(first.group.position.x) / priorFit
    : Math.max(Math.abs(first.group.position.x) / priorFit, 24 * lateral);
  const fit = narrow ? priorFit : Math.min(1, margin / (outward + first.width / 2));
  first.group.position.x = outward * fit;
  first.group.scale.setScalar(fit);
  first.group.rotation.y *= -1;
  /* Lifted above the eye line rather than below it. Safe to override the
     zigzag here because the next print in that row is 110 units further down
     the corridor — far beyond the haze when this one is at reading distance —
     so the two can never share the frame and cannot collide. */
  first.group.position.y = Math.abs(first.group.position.y) + 3;

  /* And it holds off until you have actually scrolled. At rest it was sitting
     86 units out at a quarter opacity — present enough to be the first thing
     you notice, before a word has been read.

     Moving it deeper is the obvious fix and the wrong one: it would need to
     go back about 26 units to clear the haze at rest, which lands it right on
     top of the first row's copy, and that copy is on the same side. So it
     keeps its position and gets a shorter fade instead.

     Measured against the viewport rather than hard-coded, because where the
     camera sits at scroll zero depends on the window height — a tall window
     starts the flight closer in, and a fixed threshold that hid this print on
     a laptop would leave it showing on a big display. */
  const camAtRest = FOCUS - (innerHeight / 2) * UNITS_PER_PX;
  const restingDistance = camAtRest - first.group.position.z;
  first.fade = [FOCUS, Math.max(FOCUS + 16, restingDistance - 14)];
}

/* The sign-off portrait, placed against the last photograph you actually pass
   rather than against its own anchor in the document.

   The ending has to be a solo shot, and that is two constraints, not one.
   Mapped onto scroll position, the sequence used to run:

     10325  last grid photograph finally fades out
      9286  ...but the portrait had already started resolving, 1039px earlier
     10312  portrait at reading size
     10380  contact card enters the viewport, 68px later

   So the portrait shared the frame with the photograph before it AND got
   covered by the card after it. Pushing it deeper fixes the first and makes
   the second worse, which is exactly what happened on the first attempt.

   Both ends are held here: HERO_CLEAR guarantees the gap behind it whatever
   the fan spans, HERO_FADE keeps it out of sight until that gap is spent
   (a print is otherwise faintly present from 112 units out), and the card's
   own margin in the CSS buys the beat afterwards. */
const HERO_CLEAR = 78;
export const HERO_FADE = [42, 76];

function placeSignOff(prints) {
  const hero = prints.find((p) => p.hero);
  if (!hero) return;

  const rest = prints.filter((p) => !p.hero);
  const anchorZ = -(anchorCentre(hero.anchor) * UNITS_PER_PX);
  // Furthest along the flight is the most negative z — the camera travels -z.
  const deepest = rest.length ? Math.min(...rest.map((p) => p.group.position.z)) : anchorZ;

  const z = Math.max(
    anchorZ - 34,                                 // never so deep it meets the card
    Math.min(anchorZ + 20, deepest - HERO_CLEAR)  // never nearer than the clearance
  );
  /* The sign-off is the widest print on the page — 28 units across against a
     phone's 19 of visible frame — so centring it is not enough on its own. */
  const fit = Math.min(1, (visibleHalfWidth() * 1.86) / hero.width);
  hero.group.scale.setScalar(fit);
  hero.group.position.set(0, 2.5, z);
  hero.group.rotation.y = 0;
  hero.fade = HERO_FADE;
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
    /* Most prints resolve over the full 73 units of haze. Two carry their own
       shorter window instead — the sign-off, so it doesn't hang half-formed
       through its whole approach, and the very first print, so it isn't
       already in the frame before you have scrolled. Same squared curve in
       every case, just a shorter run-up; steepening the CURVE instead makes a
       print pop into existence, which is worse than either problem. */
    const [f0, f1] = p.fade ?? [HAZE * 0.45, HAZE * 0.85];
    const far = 1 - THREE.MathUtils.smoothstep(d, f0, f1);
    /* Squared, because a print is a hard-edged rectangle and a hard-edged
       rectangle at 8% opacity is still very obviously a rectangle — it reads
       as a grey box floating in the sky rather than as something lost in
       haze. Real aerial perspective loses the shape, not just the contrast,
       so the tail of the curve has to collapse fast. */
    const o = (near * far) ** 2;
    p.group.visible = p.loaded && o > 0.02;
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
  /* Morning sun: a small hot near-white core with a pale gold bloom. The
     amber, wide-cored version read as late afternoon however high you hung it
     — colour says the hour at least as loudly as position does. */
  grd.addColorStop(0, "rgba(255, 252, 241, 0.98)");
  grd.addColorStop(0.12, "rgba(255, 240, 200, 0.58)");
  grd.addColorStop(0.4, "rgba(255, 219, 172, 0.19)");
  grd.addColorStop(1, "rgba(255, 212, 168, 0)");
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
    new THREE.PlaneGeometry(104, 104),
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

/* ---------- Birds ----------
   What the sky was missing was not decoration but LIFE — something with its
   own intention crossing a space you are otherwise alone in. A kite reads as
   an object being carried; birds read as company.

   Built rather than drawn, because a flapping silhouette is three triangles
   and a sine wave, and a sprite sheet would need frames, a loader and a
   texture per pose. Each bird is two swept wings hinged at a body, rotating
   about the fore-aft axis, and the whole group is billboarded — so whatever
   angle you fly past at, you always see the classic cartoon "M". */
const BIRDS = matchMedia("(max-width: 860px)").matches ? 10 : 22;

/* One swept wing, in the XY plane, root at the origin and tip out along +X.
   Two triangles rather than one: the trailing edge scoops, which is the whole
   difference between a bird and a paper dart. */
function wingGeometry() {
  const g = new THREE.BufferGeometry();
  const v = new Float32Array([
    0, 0.04, 0,      0.58, 0.2, 0,     0.44, -0.05, 0,
    0.44, -0.05, 0,  0.58, 0.2, 0,     1, 0.1, 0,
  ]);
  g.setAttribute("position", new THREE.BufferAttribute(v, 3));
  return g;
}

function buildBirds(scene) {
  const wing = wingGeometry();
  const body = new THREE.CircleGeometry(0.085, 8);
  const birds = [];

  for (let i = 0; i < BIRDS; i++) {
    const group = new THREE.Group();
    /* Unlit on purpose. A bird against a bright sky is a silhouette — giving
       it a lit material would make it a small grey aeroplane. */
    const mat = new THREE.MeshBasicMaterial({
      color: 0x3f4658,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      opacity: 0,
    });

    const right = new THREE.Mesh(wing, mat);
    const left = new THREE.Mesh(wing, mat);
    left.scale.x = -1;
    group.add(right, left, new THREE.Mesh(body, mat));

    const scale = 0.75 + Math.random() * 1.15;
    group.scale.setScalar(scale);

    birds.push({
      group, mat, left, right,
      /* Flocks, not a scatter: birds share a lead position and hold a loose
         offset from it, so they arrive together and turn together. */
      flock: i % 4,
      offset: new THREE.Vector3(
        (Math.random() - 0.5) * 9,
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 11
      ),
      // Smaller birds beat faster, which is most of what sells the size.
      flap: 6.5 + (2 - scale) * 3.4 + Math.random() * 1.6,
      phase: Math.random() * Math.PI * 2,
    });
    scene.add(group);
  }
  return birds;
}

/* Depth band the flocks keep to, same idea as the cloud layers: close enough
   to read as birds, never so close they become geometry. */
const BIRD_NEAR = 26;
const BIRD_SPAN = 165;

function flyBirds(birds, camera, t) {
  for (const b of birds) {
    /* Each flock crosses the corridor on its own slow diagonal, and wraps
       within the band so a page of any length always has birds in it. */
    const f = b.flock;
    const drift = ((t * (2.4 + f * 0.7) + f * 40) % 96) - 48;
    const lead = new THREE.Vector3(
      drift,
      6 + Math.sin(t * 0.19 + f * 1.7) * 5.5 + f * 2.4,
      camera.position.z - (BIRD_NEAR + ((f * 41 + t * 3.1) % BIRD_SPAN))
    );
    b.group.position.copy(lead).add(b.offset);

    // Billboard, so the silhouette never turns edge-on and vanishes.
    b.group.quaternion.copy(camera.quaternion);

    /* The flap. Wings sweep UP fast and settle down slow — a symmetric sine
       looks like a machine. Raising the sine to a power skews the dwell to
       the bottom of the stroke, which is where a real wingbeat spends it. */
    const raw = Math.sin(t * b.flap + b.phase);
    const angle = Math.sign(raw) * Math.abs(raw) ** 0.7 * 0.62;
    b.right.rotation.z = angle;
    b.left.rotation.z = -angle; // mirrored by scale.x, so the sign flips back

    const d = camera.position.z - b.group.position.z;
    const near = THREE.MathUtils.smoothstep(d, BIRD_NEAR * 0.5, BIRD_NEAR + 10);
    const far = 1 - THREE.MathUtils.smoothstep(d, BIRD_SPAN * 0.55, BIRD_SPAN);
    b.mat.opacity = 0.82 * near * far;
    b.group.visible = b.mat.opacity > 0.02;
  }
}
