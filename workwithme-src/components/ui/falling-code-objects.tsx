import { useEffect, useRef } from "react";
import type {
  BufferGeometry,
  CanvasTexture,
  Group,
  Material,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Sprite,
  SpriteMaterial,
} from "three";

interface FallingCodeObjectsProps {
  active: boolean;
  palette?: number;
  className?: string;
}

const themes = [
  {
    body: "#a0b580",
    edge: "#537e67",
    cream: "#f2eed3",
    dark: "#132b24",
    tape: "#d5ef9c",
    accent: "#77cbc2",
    metal: "#e2d6a1",
  },
  {
    body: "#b3bc80",
    edge: "#687952",
    cream: "#fff0cb",
    dark: "#2a3021",
    tape: "#ecd68d",
    accent: "#dca36f",
    metal: "#e8d3a2",
  },
  {
    body: "#91bcad",
    edge: "#407f73",
    cream: "#e9f1d9",
    dark: "#102e2b",
    tape: "#c6e9a3",
    accent: "#78d2cb",
    metal: "#d4e8c7",
  },
];
const mobileStartPhases = [0.3, 0.26, 0.7, 0.56];
const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));
const smooth = (start: number, end: number, value: number) => {
  const t = clamp((value - start) / (end - start), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Little business collectibles fall through the hero and break into working code. */
export default function FallingCodeObjects({
  active,
  palette = 0,
  className = "",
}: FallingCodeObjectsProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(active);
  const paletteRef = useRef(palette);
  const syncRef = useRef<(() => void) | null>(null);
  const colorRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    activeRef.current = active;
    syncRef.current?.();
  }, [active]);
  useEffect(() => {
    paletteRef.current = palette;
    colorRef.current?.();
  }, [palette]);

  useEffect(() => {
    const host = hostRef.current!;
    let disposed = false;
    let teardown = () => {};

    void import("three")
      .then((THREE) => {
        if (disposed) return;
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("webgl2", {
          alpha: true,
          antialias: true,
          depth: true,
          stencil: false,
          powerPreference: "low-power",
          premultipliedAlpha: true,
        });
        if (!context) {
          host.dataset.render = "fallback";
          return;
        }
        let renderer: InstanceType<typeof THREE.WebGLRenderer>;
        try {
          renderer = new THREE.WebGLRenderer({
            canvas,
            context,
            alpha: true,
            antialias: true,
          });
        } catch {
          context.getExtension("WEBGL_lose_context")?.loseContext();
          host.dataset.render = "fallback";
          return;
        }

        const geometries = new Set<BufferGeometry>();
        const materials = new Set<Material>();
        const textures = new Set<CanvasTexture>();
        const paintMaterials: Array<{
          material: MeshStandardMaterial;
          color: keyof (typeof themes)[0];
        }> = [];
        let raf = 0,
          previous = 0,
          elapsed = 0,
          width = 0,
          height = 0;
        let mobile = false,
          lost = false,
          ready = false,
          cleaned = false;
        let resizeObserver: ResizeObserver | undefined;
        let contextLost: (() => void) | undefined;
        const geometry = <T extends BufferGeometry>(value: T): T => {
          geometries.add(value);
          return value;
        };
        const material = <T extends Material>(value: T): T => {
          materials.add(value);
          return value;
        };
        teardown = () => {
          if (cleaned) return;
          cleaned = true;
          cancelAnimationFrame(raf);
          raf = 0;
          resizeObserver?.disconnect();
          if (contextLost)
            canvas.removeEventListener("webglcontextlost", contextLost);
          syncRef.current = null;
          colorRef.current = null;
          geometries.forEach((value) => value.dispose());
          materials.forEach((value) => value.dispose());
          textures.forEach((value) => value.dispose());
          renderer.dispose();
          if (!context.isContextLost()) renderer.forceContextLoss();
          canvas.remove();
        };

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 50);
        camera.position.z = 16;
        const worldHeight =
          2 * Math.tan((17 * Math.PI) / 180) * camera.position.z;
        renderer.setClearColor(0, 0);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.18;
        scene.add(new THREE.HemisphereLight("#f7f1d6", "#274d3a", 2.3));
        const key = new THREE.DirectionalLight("#fff6db", 3.4);
        key.position.set(-5, 7, 9);
        scene.add(key);
        const rim = new THREE.DirectionalLight("#b8efdd", 2.5);
        rim.position.set(7, 2, 2);
        scene.add(rim);

        const block = geometry(new THREE.BoxGeometry(1, 1, 1));
        const plane = geometry(new THREE.PlaneGeometry(1, 1));
        const binding = geometry(new THREE.TorusGeometry(0.105, 0.039, 5, 10));
        const ripple = geometry(new THREE.RingGeometry(0.86, 1, 32));
        const paints = Object.fromEntries(
          Object.keys(themes[0]).map((name) => {
            const color = name as keyof (typeof themes)[0];
            const value = material(
              new THREE.MeshStandardMaterial({
                color: themes[0][color],
                roughness: 0.48,
                metalness: 0.08,
                flatShading: true,
              }),
            );
            paintMaterials.push({ material: value, color });
            return [color, value];
          }),
        ) as Record<keyof (typeof themes)[0], MeshStandardMaterial>;

        const box = (
          parent: Group,
          color: keyof typeof paints,
          size: number[],
          position = [0, 0, 0],
        ) => {
          const mesh = new THREE.Mesh(block, paints[color]);
          mesh.scale.set(size[0], size[1], size[2]);
          mesh.position.set(position[0], position[1], position[2]);
          parent.add(mesh);
          return mesh;
        };

        const textTexture = (text: string, screen = false) => {
          const surface = document.createElement("canvas");
          surface.width = screen ? 384 : 512;
          surface.height = screen ? 240 : 112;
          const pen = surface.getContext("2d");
          if (!pen) throw new Error("Canvas lettering is unavailable");
          if (screen) {
            pen.fillStyle = "#102d24";
            pen.fillRect(0, 0, surface.width, surface.height);
            pen.font = "600 67px ui-monospace, Menlo, monospace";
            pen.fillStyle = "#d7f4aa";
            pen.fillText("> run", 24, 87);
            pen.fillStyle = "#91c6b7";
            pen.font = "500 38px ui-monospace, Menlo, monospace";
            pen.fillText("sync()", 26, 151);
            pen.fillStyle = "#e9edcf";
            pen.fillRect(27, 184, 112, 9);
            pen.fillStyle = "#81ac95";
            pen.fillRect(154, 184, 56, 9);
          } else {
            pen.font = "700 64px ui-monospace, Menlo, monospace";
            const measured = Math.ceil(pen.measureText(text).width);
            surface.width = measured + 34;
            pen.font = "700 64px ui-monospace, Menlo, monospace";
            pen.textAlign = "center";
            pen.textBaseline = "middle";
            pen.lineWidth = 7;
            pen.lineJoin = "round";
            pen.strokeStyle = "rgba(10, 30, 20, .85)";
            pen.strokeText(text, surface.width / 2, 56);
            pen.fillStyle = "#ffffff";
            pen.fillText(text, surface.width / 2, 56);
          }
          const texture = new THREE.CanvasTexture(surface);
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.generateMipmaps = false;
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          textures.add(texture);
          return { texture, aspect: surface.width / surface.height };
        };

        const crate = new THREE.Group();
        box(crate, "body", [1, 1, 1]);
        box(crate, "tape", [0.18, 1.025, 1.025]);
        box(crate, "edge", [1.025, 0.13, 1.025], [0, -0.13, 0]);
        box(crate, "cream", [0.29, 0.22, 0.03], [0.3, 0.2, 0.512]);
        box(crate, "dark", [0.16, 0.025, 0.015], [0.3, 0.23, 0.535]);
        box(crate, "dark", [0.11, 0.025, 0.015], [0.275, 0.17, 0.535]);

        const calendar = new THREE.Group();
        box(calendar, "edge", [1.22, 1.25, 0.26]);
        box(calendar, "cream", [1.12, 1.04, 0.045], [0, -0.075, 0.152]);
        box(calendar, "accent", [1.23, 0.25, 0.28], [0, 0.5, 0]);
        for (const x of [-0.34, 0.34]) {
          const ring = new THREE.Mesh(binding, paints.metal);
          ring.position.set(x, 0.63, 0.015);
          ring.rotation.x = Math.PI / 2;
          calendar.add(ring);
        }
        const date = textTexture("24");
        const dateMaterial = material(
          new THREE.MeshBasicMaterial({
            map: date.texture,
            transparent: true,
            color: "#365f48",
          }),
        );
        const datePlane = new THREE.Mesh(plane, dateMaterial);
        datePlane.scale.set(0.63, 0.44, 1);
        datePlane.position.set(0, -0.01, 0.185);
        calendar.add(datePlane);
        for (let i = 0; i < 3; i++)
          box(
            calendar,
            "body",
            [0.14, 0.09, 0.018],
            [(i - 1) * 0.25, -0.37, 0.185],
          );

        const terminal = new THREE.Group();
        box(terminal, "edge", [1.38, 0.98, 0.3]);
        box(terminal, "cream", [1.35, 0.96, 0.08], [0, 0, 0.14]);
        const screen = textTexture("", true);
        const screenMaterial = material(
          new THREE.MeshBasicMaterial({ map: screen.texture }),
        );
        const screenPlane = new THREE.Mesh(plane, screenMaterial);
        screenPlane.position.set(0, 0.025, 0.19);
        screenPlane.scale.set(1.14, 0.73, 1);
        terminal.add(screenPlane);
        box(terminal, "edge", [0.19, 0.38, 0.24], [0, -0.66, -0.015]);
        box(terminal, "cream", [0.89, 0.11, 0.46], [0, -0.87, 0.04]);

        const cog = new THREE.Group();
        const shape = new THREE.Shape();
        for (let i = 0; i < 40; i++) {
          const angle = (i / 40) * Math.PI * 2;
          const radius = i % 4 === 0 || i % 4 === 3 ? 0.55 : 0.72;
          const x = Math.cos(angle) * radius,
            y = Math.sin(angle) * radius;
          if (i === 0) shape.moveTo(x, y);
          else shape.lineTo(x, y);
        }
        shape.closePath();
        const hole = new THREE.Path();
        hole.absarc(0, 0, 0.23, 0, Math.PI * 2, true);
        shape.holes.push(hole);
        const gearGeometry = geometry(
          new THREE.ExtrudeGeometry(shape, {
            depth: 0.24,
            steps: 1,
            bevelEnabled: true,
            bevelSegments: 1,
            bevelSize: 0.025,
            bevelThickness: 0.025,
            curveSegments: 12,
          }),
        );
        const gearMesh = new THREE.Mesh(gearGeometry, [
          paints.tape,
          paints.edge,
        ]);
        gearMesh.position.z = -0.12;
        cog.add(gearMesh);

        const glyphs = [
          "{ }",
          "sync()",
          "=>",
          "done;",
          "await",
          "run()",
          "01",
          "return",
        ].map((text) => textTexture(text));
        let seed = 39017;
        const random = () => {
          seed = (seed * 1664525 + 1013904223) >>> 0;
          return seed / 4294967296;
        };
        const prototypes = [crate, calendar, terminal, cog, calendar, crate];
        type CodePiece = {
          sprite: Sprite;
          material: SpriteMaterial;
          aspect: number;
          x: number;
          y: number;
          turn: number;
        };
        type Actor = {
          object: Group;
          paints: Material[];
          pieces: CodePiece[];
          ring: Mesh;
          ringMaterial: MeshBasicMaterial;
          side: number;
          phase: number;
          duration: number;
          depth: number;
          size: number;
          tilt: number;
        };
        const actors: Actor[] = prototypes.map((prototype, i) => {
          const object = prototype.clone(true);
          const cloned = new Map<Material, Material>();
          object.traverse((child) => {
            if (!(child instanceof THREE.Mesh)) return;
            const clonePaint = (source: Material) => {
              if (cloned.has(source)) return cloned.get(source)!;
              const copy = material(source.clone());
              copy.transparent = true;
              const themed = paintMaterials.find(
                (entry) => entry.material === source,
              );
              if (themed)
                paintMaterials.push({
                  material: copy as MeshStandardMaterial,
                  color: themed.color,
                });
              cloned.set(source, copy);
              return copy;
            };
            child.material = Array.isArray(child.material)
              ? child.material.map(clonePaint)
              : clonePaint(child.material);
          });
          scene.add(object);
          const pieces = Array.from({ length: 5 }, (_, j) => {
            const glyph = glyphs[(i * 3 + j) % glyphs.length];
            const spriteMaterial = material(
              new THREE.SpriteMaterial({
                map: glyph.texture,
                transparent: true,
                depthWrite: false,
                depthTest: false,
              }),
            );
            const sprite = new THREE.Sprite(spriteMaterial);
            sprite.visible = false;
            sprite.renderOrder = 3;
            scene.add(sprite);
            return {
              sprite,
              material: spriteMaterial,
              aspect: glyph.aspect,
              x: (random() - 0.5) * 2,
              y: (random() - 0.65) * 2,
              turn: (random() - 0.5) * 0.8,
            };
          });
          const ringMaterial = material(
            new THREE.MeshBasicMaterial({
              transparent: true,
              opacity: 0,
              depthWrite: false,
              depthTest: false,
              color: "#dcf1ad",
            }),
          );
          const ring = new THREE.Mesh(ripple, ringMaterial);
          ring.visible = false;
          scene.add(ring);
          return {
            object,
            paints: [...cloned.values()],
            pieces,
            ring,
            ringMaterial,
            side: i % 2 ? 1 : -1,
            phase: [0.09, 0.38, 0.68, 0.82, 0.24, 0.52][i],
            duration: 10.8 + random() * 1.7,
            depth: -0.8 + random() * 1.9,
            size: 0.9 + random() * 0.22,
            tilt: 0.18 + random() * 0.24,
          };
        });

        const update = () => {
          if (!width || !height) return;
          const pixelUnit = worldHeight / height;
          const worldWidth = (worldHeight * width) / height;
          actors.forEach((actor, i) => {
            const included = !mobile || i < 4;
            const phase = mobile
              ? (mobileStartPhases[i] ?? actor.phase)
              : actor.phase;
            const age = (elapsed / actor.duration + phase) % 1;
            const falling = age < 0.67;
            const burst = clamp((age - 0.67) / 0.29, 0, 1);
            const depth = (camera.position.z - actor.depth) / camera.position.z;
            const lane = mobile ? 0.8 : 0.765;
            const x =
              actor.side *
              ((worldWidth * lane) / 2 +
                Math.sin(elapsed * 0.32 + i * 2.1) * worldWidth * 0.012) *
              depth;
            const impactY = mobile ? 0.805 : 0.66;
            const travel = Math.pow(clamp(age / 0.67, 0, 1), 1.16);
            const yNormal = -0.16 + travel * (impactY + 0.16);
            let opacity = smooth(0.09, 0.18, yNormal);
            if (mobile)
              opacity *=
                1 -
                smooth(0.27, 0.34, yNormal) * (1 - smooth(0.65, 0.73, yNormal));
            const objectPixels =
              (mobile ? 55 : clamp(width * 0.074, 83, 112)) * actor.size;
            const objectScale = (objectPixels * pixelUnit * depth) / 1.35;
            actor.object.visible = included && falling && opacity > 0.01;
            actor.object.scale.setScalar(objectScale);
            actor.object.position.set(
              x,
              (0.5 - yNormal) * worldHeight * depth,
              actor.depth,
            );
            actor.object.rotation.set(
              0.23 + Math.sin(elapsed * 0.42 + i) * 0.12,
              actor.side * (0.35 + Math.sin(elapsed * 0.37 + i) * 0.3),
              actor.side * actor.tilt + Math.sin(elapsed * 0.5 + i * 2) * 0.16,
            );
            if (i === 3) actor.object.rotation.z += elapsed * 0.22;
            actor.paints.forEach((paint) => {
              paint.opacity = opacity;
            });

            const showingCode = included && !falling && age < 0.96;
            const codeOpacity =
              (1 - smooth(0.57, 1, burst)) * smooth(0, 0.055, burst);
            const spread = 1 - Math.exp(-burst * 6);
            actor.pieces.forEach((piece, j) => {
              piece.sprite.visible = showingCode && (!mobile || j < 4);
              if (!piece.sprite.visible) return;
              const distance = (mobile ? 70 : 150) * spread;
              let sx = x / (pixelUnit * depth) + piece.x * distance * 0.6;
              const glyphPixels = (mobile ? 24 : 33) * (0.65 + spread * 0.35);
              // Leave room for the entire token, including its slight rotation.
              const outer =
                width / 2 - (glyphPixels * (piece.aspect + 0.3)) / 2 - 12;
              const extent = Math.min(
                width * (mobile ? 0.355 : 0.295),
                outer - 8,
              );
              sx =
                actor.side < 0
                  ? clamp(sx, -outer, -extent)
                  : clamp(sx, extent, outer);
              const sy =
                (0.5 - impactY) * height +
                piece.y * distance * 0.62 -
                burst * burst * (mobile ? 70 : 135);
              piece.sprite.position.set(
                sx * pixelUnit * depth,
                sy * pixelUnit * depth,
                actor.depth + 0.2,
              );
              const size = glyphPixels * pixelUnit * depth;
              piece.sprite.scale.set(size * piece.aspect, size, 1);
              piece.material.opacity = codeOpacity;
              piece.material.rotation = piece.turn * spread;
            });
            actor.ring.visible = showingCode && burst < 0.24;
            if (actor.ring.visible) {
              actor.ring.position.set(
                x,
                (0.5 - impactY) * worldHeight * depth,
                actor.depth + 0.1,
              );
              actor.ring.scale.setScalar(objectScale * (0.35 + burst * 6));
              actor.ringMaterial.opacity = (1 - burst / 0.24) * 0.38;
            }
          });
        };

        const render = () => {
          if (disposed || lost || !ready) return;
          try {
            update();
            renderer.render(scene, camera);
          } catch {
            lost = true;
            cancelAnimationFrame(raf);
            raf = 0;
            canvas.style.visibility = "hidden";
            host.dataset.render = "fallback";
            teardown();
          }
        };
        const frame = (now: number) => {
          raf = 0;
          if (!activeRef.current || disposed || lost || !ready) {
            previous = 0;
            return;
          }
          elapsed += previous ? Math.min((now - previous) / 1000, 0.05) : 0;
          previous = now;
          render();
          if (!lost && activeRef.current && !disposed)
            raf = requestAnimationFrame(frame);
        };
        const sync = () => {
          if (activeRef.current && ready && !lost && !disposed) {
            if (!raf) raf = requestAnimationFrame(frame);
          } else {
            cancelAnimationFrame(raf);
            raf = 0;
            previous = 0;
          }
        };
        const recolor = () => {
          const index = Number.isFinite(paletteRef.current)
            ? Math.abs(Math.trunc(paletteRef.current)) % themes.length
            : 0;
          const theme = themes[index];
          paintMaterials.forEach(({ material: paint, color }) =>
            paint.color.set(theme[color]),
          );
          actors.forEach((actor) => {
            actor.ringMaterial.color.set(theme.tape);
            actor.pieces.forEach((piece, j) =>
              piece.material.color.set(
                j % 3 === 0
                  ? theme.cream
                  : j % 3 === 1
                    ? theme.tape
                    : theme.accent,
              ),
            );
          });
          render();
        };
        const resize = () => {
          if (disposed || lost) return;
          width = host.clientWidth;
          height = host.clientHeight;
          ready = width > 0 && height > 0;
          if (!ready) {
            sync();
            return;
          }
          mobile = width < 700;
          renderer.setPixelRatio(
            Math.min(
              window.devicePixelRatio || 1,
              1.5,
              Math.sqrt(1_250_000 / (width * height)),
            ),
          );
          renderer.setSize(width, height, false);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          render();
          sync();
        };
        contextLost = () => {
          lost = true;
          cancelAnimationFrame(raf);
          raf = 0;
          previous = 0;
          canvas.style.visibility = "hidden";
          host.dataset.render = "fallback";
          teardown();
        };
        canvas.addEventListener("webglcontextlost", contextLost);
        host.appendChild(canvas);
        host.dataset.render = "webgl";
        host.dataset.scene = "falling-collectibles";
        syncRef.current = sync;
        colorRef.current = recolor;
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(host);
        recolor();
        resize();
      })
      .catch(() => {
        teardown();
        if (!disposed) host.dataset.render = "fallback";
      });

    return () => {
      disposed = true;
      teardown();
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className={`hero-code-fall ${className}`}
      data-render="loading"
      aria-hidden="true"
    >
      <div className="hero-code-fallback">
        <span>{">_"}</span>
        <span>{"{ }"}</span>
      </div>
    </div>
  );
}
