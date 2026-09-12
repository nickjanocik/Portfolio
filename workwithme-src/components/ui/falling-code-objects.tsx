import { useEffect, useRef } from "react";
import { createIndustryObjects } from "./industry-objects";
import type {
  BufferGeometry,
  CanvasTexture,
  Group,
  Material,
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

        // Several small four-line fragments turn each object into a compact
        // shower of code. Shared textures keep the denser effect inexpensive.
        const codeBlocks = [
          ["const job = {", "  status: 'ready',", "  crew: assigned", "};"],
          [
            "await orders",
            "  .validate()",
            "  .dispatch();",
            "return receipt;",
          ],
          [
            "const slots =",
            "  calendar.free();",
            "schedule(slots);",
            "notify(team);",
          ],
          ["inventory.map(item =>", "  ({ ...item,", "     ok: true })", ");"],
          ["if (paid) {", "  ledger.post();", "  invoice.close();", "}"],
          [
            "const route =",
            "  plan(stops);",
            "await route.run();",
            "track(delivery);",
          ],
          [
            "await bookings",
            "  .confirm();",
            "rooms.sync();",
            "return welcome;",
          ],
          ["for (const row", "  of records) {", "  await save(row);", "}"],
          [
            "check(stock);",
            "create(order);",
            "send(receipt);",
            "queue.sync();",
          ],
          [
            "const report =",
            "  build(metrics);",
            "review(report);",
            "export results;",
          ],
          ["fields.map(plot", "  => inspect(plot)", ");", "schedule(care);"],
          [
            "await lessons",
            "  .prepare();",
            "roster.sync();",
            "return progress;",
          ],
        ];
        const glyphs = codeBlocks.map((lines) => {
          const surface = document.createElement("canvas");
          const pen = surface.getContext("2d");
          if (!pen) throw new Error("Canvas lettering is unavailable");
          pen.font = "500 26px ui-monospace, Menlo, monospace";
          surface.width =
            Math.ceil(
              Math.max(...lines.map((line) => pen.measureText(line).width)),
            ) + 20;
          surface.height = 142;
          pen.font = "500 26px ui-monospace, Menlo, monospace";
          pen.textBaseline = "top";
          pen.lineWidth = 3;
          pen.lineJoin = "round";
          lines.forEach((line, index) => {
            pen.strokeStyle = "rgba(10, 30, 20, .75)";
            pen.strokeText(line, 10, 7 + index * 33);
            pen.fillStyle = index % 3 === 0 ? "#ffffff" : "#c8e6cd";
            pen.fillText(line, 10, 7 + index * 33);
          });
          const texture = new THREE.CanvasTexture(surface);
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.generateMipmaps = false;
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          textures.add(texture);
          return { texture, aspect: surface.width / surface.height };
        });

        let seed = 39017;
        const random = () => {
          seed = (seed * 1664525 + 1013904223) >>> 0;
          return seed / 4294967296;
        };
        const catalog = createIndustryObjects({
          THREE,
          geometry,
          material,
          paints,
        });
        const prototypes = [...catalog, ...catalog];
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
          side: number;
          phase: number;
          duration: number;
          depth: number;
          size: number;
          tilt: number;
          lane: number;
          impact: number;
          spin: boolean;
        };
        const actors: Actor[] = prototypes.map((prototype, i) => {
          const object = new THREE.Group();
          object.add(prototype.object.clone(true));
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
          const pieces = Array.from({ length: 8 }, (_, j) => {
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
              x: (j % 2 ? 0.48 : -0.48) + (random() - 0.5) * 0.35,
              y: (Math.floor(j / 2) - 1.5) * 0.62 + (random() - 0.5) * 0.12,
              turn: (random() - 0.5) * 0.34,
            };
          });
          return {
            object,
            paints: [...cloned.values()],
            pieces,
            side: i % 2 ? 1 : -1,
            phase: (i / prototypes.length + 0.21) % 1,
            duration: 13.4 + random() * 2.8,
            depth: -1.6 + random() * 2.8,
            size: 0.8 + random() * 0.36,
            tilt: 0.18 + random() * 0.24,
            lane: Math.floor(i / 2) % 2,
            impact: 0.43 + random() * 0.36,
            spin: prototype.spin ?? false,
          };
        });

        const update = () => {
          if (!width || !height) return;
          const pixelUnit = worldHeight / height;
          const worldWidth = (worldHeight * width) / height;
          actors.forEach((actor, i) => {
            const included = !mobile || i < catalog.length;
            const phase = mobile
              ? (i / catalog.length + 0.25) % 1
              : actor.phase;
            const age = (elapsed / actor.duration + phase) % 1;
            const falling = age < 0.67;
            const burst = clamp((age - 0.67) / 0.29, 0, 1);
            const depth = (camera.position.z - actor.depth) / camera.position.z;
            const lane = mobile
              ? 0.77 + actor.lane * 0.06
              : 0.74 + actor.lane * 0.16;
            const x =
              actor.side *
              ((worldWidth * lane) / 2 +
                Math.sin(elapsed * 0.32 + i * 2.1) * worldWidth * 0.007) *
              depth;
            const impactY = mobile
              ? 0.78 + (actor.impact - 0.43) * 0.15
              : actor.impact;
            const travel = Math.pow(clamp(age / 0.67, 0, 1), 1.16);
            const yNormal = -0.16 + travel * (impactY + 0.16);
            let opacity = smooth(0.09, 0.18, yNormal);
            if (mobile)
              opacity *=
                1 -
                smooth(0.27, 0.34, yNormal) * (1 - smooth(0.65, 0.73, yNormal));
            const objectPixels =
              (mobile ? 43 : clamp(width * 0.06, 64, 87)) * actor.size;
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
            if (actor.spin) actor.object.rotation.z += elapsed * 0.22;
            actor.paints.forEach((paint) => {
              paint.opacity = opacity;
            });

            const showingCode = included && !falling && age < 0.96;
            const codeOpacity =
              (1 - smooth(0.18, 0.88, burst)) * smooth(0, 0.055, burst) * 0.8;
            const spread = 1 - Math.exp(-burst * 6);
            actor.pieces.forEach((piece, j) => {
              piece.sprite.visible = showingCode && (!mobile || j < 6);
              if (!piece.sprite.visible) return;
              const distance = (mobile ? 46 : 65) * spread;
              let sx = x / (pixelUnit * depth) + piece.x * distance;
              const glyphPixels = (mobile ? 32 : 40) * (0.78 + spread * 0.22);
              // Leave room for the entire token, including its slight rotation.
              const outer =
                width / 2 - (glyphPixels * (piece.aspect + 0.3)) / 2 - 12;
              const extent = Math.min(
                width * (mobile ? 0.32 : 0.31),
                outer - 8,
              );
              sx =
                actor.side < 0
                  ? clamp(sx, -outer, -extent)
                  : clamp(sx, extent, outer);
              const sy =
                (0.5 - impactY) * height +
                piece.y * distance -
                burst * burst * (mobile ? 40 : 55);
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
          host.dataset.objectCount = String(
            mobile ? catalog.length : prototypes.length,
          );
          host.dataset.codeLines = String(mobile ? 24 : 32);
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
        host.dataset.scene = "falling-industry-objects";
        host.dataset.industries = catalog
          .map((item) => item.industry)
          .join(", ");
        host.dataset.objectCount = String(prototypes.length);
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
