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

const CLOUDS = 240;

export function supportsWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/* Soft round puff, drawn once and shared by every cloud billboard. */
function cloudTexture() {
  const s = 128;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grd.addColorStop(0, "rgba(255,255,255,0.9)");
  grd.addColorStop(0.45, "rgba(255,255,255,0.42)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, s, s);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

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

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 600);

  /* Warm daylight: a big soft sky/ground bounce plus one low key light, so the
     prints catch a highlight along one edge the way paper does outdoors. */
  scene.add(new THREE.HemisphereLight(0xdcebf5, 0xe8dcc4, 2.1));
  const key = new THREE.DirectionalLight(0xffe9cf, 1.5);
  key.position.set(6, 9, 4);
  scene.add(key);

  const clouds = new URLSearchParams(location.search).has('nocloud') ? [] : buildClouds(scene);
  const prints = buildPrints(scene);
  const kite = new URLSearchParams(location.search).has('nokite') ? null : buildKite(scene);

  /* ---------- Sizing ---------- */
  let vh = innerHeight;
  let docH = 1;
  function resize() {
    vh = innerHeight;
    docH = Math.max(1, document.documentElement.scrollHeight);
    camera.aspect = innerWidth / vh;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, vh, false);
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

    fade(prints, camera);
    driftClouds(clouds, camera, t);
    if (kite) flyKite(kite, camera, t);

    renderer.render(scene, camera);
  }

  addEventListener("resize", resize, { passive: true });
  resize();
  raf = requestAnimationFrame(frame);

  if (new URLSearchParams(location.search).has("debug")) {
    window.__sky = { scene, camera, prints, clouds, renderer };
  }

  document.documentElement.classList.add("webgl");
  return () => {
    cancelAnimationFrame(raf);
    removeEventListener("resize", resize);
    renderer.dispose();
  };
}

/* ---------- Clouds ----------
   The actual sensation of travel comes from these, not from the prints: a
   volumetric field at many depths, near ones sweeping past fast and far ones
   barely moving. Billboards rather than geometry — at this softness nobody can
   tell, and 150 of them cost nothing. */
function buildClouds(scene) {
  const tex = cloudTexture();
  const group = new THREE.Group();
  const items = [];

  for (let i = 0; i < CLOUDS; i++) {
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      opacity: 0,
      /* Soft blue-grey with warm ones mixed in. Pure white disappears against
         this sky; these hold their shape top to bottom of the gradient. */
      color: i % 4 === 0 ? 0xf6dcc0 : i % 3 === 0 ? 0xffffff : 0xaec6da,
    });
    const size = 18 + Math.random() * 74;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size * 0.62), mat);
    m.renderOrder = -1;
    /* Tighter around the corridor than feels right on paper: puffs have to
       pass CLOSE to read as speed. Ones that stay out at the edges just look
       like a static backdrop. */
    const spread = 34;
    m.position.set(
      (Math.random() - 0.5) * spread * 2.4,
      (Math.random() - 0.5) * spread,
      0
    );
    items.push({ mesh: m, baseOpacity: 0.34 + Math.random() * 0.4, drift: 0.4 + Math.random() });
    group.add(m);
  }
  scene.add(group);
  return items;
}

function driftClouds(items, camera, t) {
  // Recycle: keep every puff inside a window around the camera so a page of
  // any length is covered by a fixed number of them.
  const span = 260;
  for (const c of items) {
    const p = c.mesh.position;
    let d = p.z - camera.position.z;
    if (d > 20) p.z -= span;
    if (d < -span + 20) p.z += span;
    d = camera.position.z - p.z;
    p.x += Math.sin(t * 0.05 * c.drift + p.z) * 0.004;
    c.mesh.lookAt(camera.position);
    // Fade in from the haze and out again as they pass.
    const near = THREE.MathUtils.smoothstep(d, 1, 16);
    const far = 1 - THREE.MathUtils.smoothstep(d, HAZE * 0.5, HAZE);
    c.mesh.material.opacity = c.baseOpacity * near * far;
  }
}

/* ---------- Prints ----------
   One lit plane per photograph, in a cream mat, hung in the corridor on the
   opposite side from that row's text column. Positions come from the DOM: each
   .story-row is still in the document (its copy is real text), so its offset
   is the truth about where in the flight its pictures belong. */
function buildPrints(scene) {
  const loader = new THREE.TextureLoader();
  const out = [];

  for (const row of document.querySelectorAll(".story-row")) {
    const cards = [...row.querySelectorAll(".photo-card")];
    const reversed = row.classList.contains("story-row-reverse");

    cards.forEach((card, i) => {
      const img = card.querySelector("img");
      const name = img?.getAttribute("src")?.match(/opt\/([^/]+)-\d+\.jpg$/)?.[1];
      const meta = name ? photos[name] : null;
      if (!name || !meta) return;

      // AVIF at the widest generated size that isn't overkill for a plane.
      const w = meta.widths.includes(960) ? 960 : meta.widths.at(-1);

      const aspect = meta.w / meta.h;
      const h = 13.5;
      const wUnits = h * aspect;

      const group = new THREE.Group();

      // The mat: a slightly larger cream plane behind the image.
      const mat = new THREE.Mesh(
        new THREE.PlaneGeometry(wUnits + 0.9, h + 0.9),
        new THREE.MeshLambertMaterial({ color: 0xfbf7ef, transparent: true })
      );
      mat.position.z = -0.02;
      group.add(mat);

      const faceMat = new THREE.MeshLambertMaterial({ transparent: true });
      const face = new THREE.Mesh(new THREE.PlaneGeometry(wUnits, h), faceMat);
      group.add(face);

      /* A plane with no map yet is a white rectangle, and a lit white
         rectangle hanging in the sky is very obviously a bug. Hold the whole
         print back until its texture is actually decoded, and fall back to the
         JPEG if AVIF fails to decode anywhere. */
      const record = { loaded: false };
      const applyTexture = (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 4;
        faceMat.map = tex;
        faceMat.needsUpdate = true;
        record.loaded = true;
      };
      loader.load(`assets/opt/${name}-${w}.avif`, applyTexture, undefined, () => {
        loader.load(`assets/opt/${name}-${w}.jpg`, applyTexture);
      });

      group.rotation.z = (Math.random() - 0.5) * 0.06;
      scene.add(group);

      Object.assign(record, {
        group,
        row,
        index: i,
        count: cards.length,
        reversed,
        materials: [mat.material, faceMat],
      });
      out.push(record);
    });
  }
  return out;
}

/* Place each print in the corridor from its row's position in the document. */
function layoutPrints(prints) {
  for (const p of prints) {
    const r = p.row.getBoundingClientRect();
    const rowCentreDoc = r.top + scrollY + r.height / 2;

    // Text sits on one side; the pictures hang on the other. Under .webgl the
    // row is a single column, so a normal row's copy is left and a reversed
    // row's copy is pushed right by margin-left:auto — the prints take the
    // opposite side from whichever that is.
    const side = p.reversed ? -1 : 1;
    // Fan the row's prints out along the corridor rather than stacking them.
    const t = p.count > 1 ? p.index / (p.count - 1) - 0.5 : 0;

    p.group.position.set(
      side * (15.5 + Math.abs(t) * 5) + t * side * 3,
      -t * 9 + (p.index % 2 ? 1.6 : -1.2),
      -(rowCentreDoc * UNITS_PER_PX) + t * 15
    );
    // Angle them slightly toward the corridor's centre line, as if hung.
    p.group.rotation.y = -side * 0.28;
  }
}

/* Dissolve into the haze rather than into a fog colour — the backdrop is the
   CSS sky gradient showing through a transparent canvas, so fading to
   transparent is the only thing that blends against it correctly. */
function fade(prints, camera) {
  for (const p of prints) {
    const d = camera.position.z - p.group.position.z;
    const near = THREE.MathUtils.smoothstep(d, 1, 14);
    const far = 1 - THREE.MathUtils.smoothstep(d, HAZE * 0.45, HAZE * 0.85);
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
