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

const CLOUDS = 330;
const FOV = 50;

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

/* A cumulus puff, built rather than drawn as one soft dot.

   A single radial gradient reads as fog, not as cloud — it has no silhouette.
   This stacks a handful of overlapping lobes to get a lumpy edge, then lights
   the result from above with a vertical ramp: sunlit warm along the top,
   turning to cool violet shadow underneath. At golden hour that top-to-bottom
   split is most of what tells you these are clouds and where the sun is.

   Several variants are generated so the field doesn't read as one shape
   repeated 330 times. */
function cloudTextures(count = 4) {
  const out = [];
  for (let n = 0; n < count; n++) {
    const s = 256;
    const c = document.createElement("canvas");
    c.width = c.height = s;
    const g = c.getContext("2d");

    // 1. Silhouette: overlapping lobes, accumulated so they merge.
    g.globalCompositeOperation = "lighter";
    const lobes = 7 + Math.floor(Math.random() * 5);
    for (let i = 0; i < lobes; i++) {
      const bx = s * 0.5 + (Math.random() - 0.5) * s * 0.62;
      // biased low, so the mass sits under a domed top like real cumulus
      const by = s * 0.6 + (Math.random() - 0.5) * s * 0.3;
      const br = s * (0.13 + Math.random() * 0.17);
      const grd = g.createRadialGradient(bx, by, 0, bx, by, br);
      grd.addColorStop(0, "rgba(255,255,255,0.62)");
      grd.addColorStop(0.55, "rgba(255,255,255,0.26)");
      grd.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = grd;
      g.beginPath();
      g.arc(bx, by, br, 0, Math.PI * 2);
      g.fill();
    }

    // 2. Light it: warm sunlit crown, cool shadowed base.
    g.globalCompositeOperation = "source-atop";
    const lg = g.createLinearGradient(0, s * 0.12, 0, s * 0.92);
    lg.addColorStop(0, "rgb(255, 233, 201)");
    lg.addColorStop(0.4, "rgb(252, 206, 178)");
    lg.addColorStop(0.72, "rgb(206, 172, 178)");
    lg.addColorStop(1, "rgb(148, 138, 168)");
    g.fillStyle = lg;
    g.fillRect(0, 0, s, s);

    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    out.push(t);
  }
  return out;
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

  scene.add(buildSun());

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

    const sun = scene.getObjectByName("sun");
    if (sun) {
      sun.position.set(camera.position.x - 46, camera.position.y - 10, camera.position.z - 190);
      sun.lookAt(camera.position);
    }

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
  const texes = cloudTextures();
  const group = new THREE.Group();
  const items = [];

  for (let i = 0; i < CLOUDS; i++) {
    const mat = new THREE.MeshBasicMaterial({
      map: texes[i % texes.length],
      transparent: true,
      depthWrite: false,
      opacity: 0,
      /* The texture already carries the golden-hour lighting, so this only
         nudges it — warmer for the ones nearer the sun's side, cooler for the
         ones in shadow. */
      color: i % 5 === 0 ? 0xffe2bd : i % 3 === 0 ? 0xffffff : 0xd8cfda,
    });
    const size = 20 + Math.random() * 86;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size * 0.62), mat);
    m.renderOrder = -1;
    /* Tighter around the corridor than feels right on paper: puffs have to
       pass CLOSE to read as speed. Ones that stay out at the edges just look
       like a static backdrop. */
    const spread = 30;
    m.position.set(
      (Math.random() - 0.5) * spread * 2.6,
      (Math.random() - 0.5) * spread * 1.1,
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
      const h = 12;
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

    /* Prints always left, copy always right — no alternating.

       Alternating is structurally broken in a corridor: rows swap sides, so a
       row's departing prints always land on exactly the side the NEXT row's
       copy arrives on, and they overlap across every handover. Pushing them
       wider or deeper only shrinks the collision, it never removes it.

       Fixing the sides also reads better: the copy stays in one place for the
       whole flight instead of jumping left-right-left as you scroll. Variety
       comes from depth now, which is the whole point of the corridor. */
    const side = -1;
    const t = p.count > 1 ? p.index / (p.count - 1) - 0.5 : 0; // -0.5 .. 0.5
    const alt = p.index % 2 ? 1 : -1;

    /* Separation has to be measured against the prints' own size — they are
       ~16 units wide and 12 tall, so a three-unit fan just stacks them. Rows
       with more than a couple of pictures get strung out along the corridor
       instead of across it, so you meet them one at a time. */
    const zSpread = p.count > 2 ? 86 : 38;
    const ySpread = p.count > 2 ? 9 : 15;

    p.group.position.set(
      // Wider than feels necessary on paper: the copy column is ~46ch and the
      // NEXT row's prints hang on the same side as THIS row's text, so they
      // collide across the handover unless they're pushed well clear.
      side * (18 + alt * 6),
      t * ySpread + alt * 1.5,
      // Biased deeper than the row's own plane so a row's pictures arrive with
      // it rather than ahead of the copy you're still reading.
      -(rowCentreDoc * UNITS_PER_PX) + (t - 0.35) * zSpread
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
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;

  const sun = new THREE.Mesh(
    new THREE.PlaneGeometry(150, 150),
    new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.85,
    })
  );
  sun.name = "sun";
  sun.renderOrder = -2;
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
