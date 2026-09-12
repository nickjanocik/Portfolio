import { useEffect, useRef } from "react";
import type { ShaderMount, ShaderMountUniforms } from "@paper-design/shaders";

type ShaderLibrary = typeof import("@paper-design/shaders");
type Layer = "mesh" | "ring";
type MountedLayer = {
  mount: ShaderMount;
  host: HTMLDivElement;
  layer: Layer;
  destroy: () => void;
};

const palettes = [
  {
    mesh: ["#101710", "#284c35", "#659789", "#c6dc99", "#436339"],
    ring: ["#edf0da", "#9cbcb0", "#cde5a7", "#d8ff62"],
  },
  {
    mesh: ["#1d1510", "#6d392a", "#e38b58", "#f2d889", "#338d87"],
    ring: ["#ffe5bd", "#ffba72", "#ef8269", "#9ce6d4"],
  },
  {
    mesh: ["#051923", "#0e4150", "#3abfc9", "#b5e8b0", "#e5a16a"],
    ring: ["#dcfff2", "#66e5ef", "#a7e580", "#ffc08a"],
  },
];

const speeds: Record<Layer, number> = { mesh: 0.22, ring: 0.7 };

function colorsFor(library: ShaderLibrary, palette: number, layer: Layer) {
  const value = Number.isFinite(palette) ? Math.trunc(palette) : 0;
  const index = ((value % palettes.length) + palettes.length) % palettes.length;
  return palettes[index][layer].map(library.getShaderColorFromString);
}

function releaseCanvas(canvas: HTMLCanvasElement) {
  try {
    canvas
      .getContext("webgl2")
      ?.getExtension("WEBGL_lose_context")
      ?.loseContext();
  } catch {
    // The context may already have been lost by the browser.
  }
  canvas.remove();
}

/** Paper's shader visuals with caught initialization and a persistent CSS fallback. */
export default function HeroShader({
  active,
  palette,
}: {
  active: boolean;
  palette: number;
}) {
  const meshRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(active);
  const paletteRef = useRef(palette);
  const libraryRef = useRef<ShaderLibrary | null>(null);
  const mountedRef = useRef<MountedLayer[]>([]);

  useEffect(() => {
    activeRef.current = active;
    for (const { mount, layer } of mountedRef.current) {
      mount.setSpeed(active ? speeds[layer] : 0);
    }
  }, [active]);

  useEffect(() => {
    paletteRef.current = palette;
    const library = libraryRef.current;
    if (!library) return;
    for (const { mount, layer } of mountedRef.current) {
      mount.setUniforms({ u_colors: colorsFor(library, palette, layer) });
    }
  }, [palette]);

  useEffect(() => {
    const meshHost = meshRef.current;
    const ringHost = ringRef.current;
    if (!meshHost || !ringHost) return;
    let disposed = false;
    const cancelSizeWaits = new Set<() => void>();

    const waitForSize = (host: HTMLDivElement) =>
      new Promise<boolean>((resolve) => {
        const hasSize = () => host.clientWidth > 0 && host.clientHeight > 0;
        if (hasSize()) {
          resolve(true);
          return;
        }
        const cancel = () => {
          observer.disconnect();
          cancelSizeWaits.delete(cancel);
          resolve(false);
        };
        const observer = new ResizeObserver(() => {
          if (!hasSize()) return;
          observer.disconnect();
          cancelSizeWaits.delete(cancel);
          resolve(!disposed);
        });
        cancelSizeWaits.add(cancel);
        observer.observe(host);
      });

    const startLayer = async (
      library: ShaderLibrary,
      host: HTMLDivElement,
      layer: Layer,
      uniforms: ShaderMountUniforms,
    ) => {
      try {
        if (!(await waitForSize(host)) || disposed) return;
        const mount = new library.ShaderMount(
          host,
          layer === "mesh"
            ? library.meshGradientFragmentShader
            : library.pulsingBorderFragmentShader,
          {
            ...uniforms,
            u_colors: colorsFor(library, paletteRef.current, layer),
          },
          { alpha: true, antialias: false, powerPreference: "low-power" },
          activeRef.current ? speeds[layer] : 0,
          layer === "mesh" ? 6000 : 12000,
          1,
          layer === "mesh" ? 1_200_000 : 500_000,
        );
        const canvas = mount.canvasElement;
        const entry: MountedLayer = {
          mount,
          host,
          layer,
          destroy: () => {
            canvas.removeEventListener("webglcontextlost", onContextLost);
            try {
              mount.dispose();
            } finally {
              releaseCanvas(canvas);
            }
          },
        };
        const onContextLost = () => {
          host.dataset.render = "context-lost";
          mountedRef.current = mountedRef.current.filter(
            (item) => item !== entry,
          );
          entry.destroy();
        };
        canvas.addEventListener("webglcontextlost", onContextLost);
        mountedRef.current.push(entry);
        host.dataset.render = "webgl";
      } catch {
        // A constructor can append a canvas before failing to obtain or compile WebGL.
        host.querySelectorAll("canvas").forEach(releaseCanvas);
        host.dataset.render = "fallback";
      }
    };

    void (async () => {
      try {
        const library = await import("@paper-design/shaders");
        if (disposed) return;
        libraryRef.current = library;
        const sizing = {
          u_fit: library.ShaderFitOptions.contain,
          u_scale: 1,
          u_rotation: 0,
          u_originX: 0.5,
          u_originY: 0.5,
          u_offsetX: 0,
          u_offsetY: 0,
          u_worldWidth: 0,
          u_worldHeight: 0,
        };
        void startLayer(library, meshHost, "mesh", {
          ...sizing,
          u_colorsCount: 5,
          u_distortion: 0.7,
          u_swirl: 0.65,
          u_grainMixer: 0,
          u_grainOverlay: 0,
        });

        // This image is an embedded data PNG supplied by the package, not a request.
        const noise = library.getShaderNoiseTexture();
        if (!noise) throw new Error("Shader noise is unavailable");
        await noise.decode();
        if (disposed) return;
        await startLayer(library, ringHost, "ring", {
          ...sizing,
          u_scale: 0.85,
          u_colorBack: library.getShaderColorFromString("#00000000"),
          u_colorsCount: 4,
          u_roundness: 1,
          u_thickness: 0.025,
          u_marginLeft: 0,
          u_marginRight: 0,
          u_marginTop: 0,
          u_marginBottom: 0,
          u_aspectRatio: library.PulsingBorderAspectRatios.square,
          u_softness: 0.5,
          u_intensity: 0.3,
          u_bloom: 0.4,
          u_spots: 3,
          u_spotSize: 0.35,
          u_pulse: 0.1,
          u_smoke: 0.25,
          u_smokeSize: 0.5,
          u_noiseTexture: noise,
        });
      } catch {
        if (disposed) return;
        for (const host of [meshHost, ringHost]) {
          if (host.dataset.render === "loading")
            host.dataset.render = "fallback";
        }
      }
    })();

    return () => {
      disposed = true;
      cancelSizeWaits.forEach((cancel) => cancel());
      mountedRef.current.forEach((entry) => entry.destroy());
      mountedRef.current = [];
      libraryRef.current = null;
    };
  }, []);

  return (
    <>
      <div
        ref={meshRef}
        className="hero-mesh"
        data-render="loading"
        aria-hidden="true"
      />
      <div
        ref={ringRef}
        className="hero-energy-ring"
        data-render="loading"
        aria-hidden="true"
      />
    </>
  );
}
