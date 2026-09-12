import { useEffect, useRef, useState } from "react";
import { Palette } from "lucide-react";
import { useMotionSettings } from "@/components/motion-settings";
import type { TubesApp } from "@/vendor/tubes1";

const palettes = [
  {
    name: "Garden",
    tubes: ["#c9ed83", "#5cbfc0", "#ac95d7"],
    lights: ["#d7f68b", "#86dcda", "#c2acff", "#f7e9bd"],
  },
  {
    name: "Afterglow",
    tubes: ["#ec906d", "#d79dc9", "#b2a2ed"],
    lights: ["#ffbd8b", "#ffa7d3", "#c4b2ff", "#ffe7b6"],
  },
  {
    name: "Tidal",
    tubes: ["#5ec5dc", "#6e8dde", "#94ddca"],
    lights: ["#9eeaff", "#a9b8ff", "#b5f5d6", "#e5eaff"],
  },
];

// The supplied metallic tube cursor, scoped to the invitation and loaded only
// when it approaches the viewport. The canvas never intercepts page controls.
export default function TubesCursor() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<TubesApp | null>(null);
  const syncRef = useRef<(() => void) | null>(null);
  const { enabled } = useMotionSettings();
  const enabledRef = useRef(enabled);
  const [ready, setReady] = useState(false);
  const [palette, setPalette] = useState(0);
  const [hasChanged, setHasChanged] = useState(false);

  useEffect(() => {
    enabledRef.current = enabled;
    appRef.current?.three.setPaused(!enabled);
    syncRef.current?.();
  }, [enabled]);

  useEffect(() => {
    const container = containerRef.current!;
    const canvas = canvasRef.current!;
    let disposed = false,
      loading = false,
      failed = false,
      near = false;
    const fallback = () => {
      failed = true;
      if (disposed) return;
      container.dataset.render = "fallback";
      setReady(false);
      appRef.current?.dispose();
      appRef.current = null;
    };
    const initialize = () => {
      if (
        disposed ||
        failed ||
        loading ||
        appRef.current ||
        !near ||
        !enabledRef.current
      )
        return;
      const { width, height } = container.getBoundingClientRect();
      if (width < 1 || height < 1) return;
      loading = true;
      container.dataset.render = "loading";
      void import("@/vendor/tubes1")
        .then(({ default: createTubes }) => {
          if (disposed) return;
          if (!enabledRef.current || !near) {
            loading = false;
            return;
          }
          const app = createTubes(canvas, {
            bloom: false,
            sleepRadiusX: 380,
            sleepRadiusY: 170,
            sleepTimeScale1: 0.75,
            sleepTimeScale2: 1.25,
            tubes: {
              count: 10,
              minRadius: 0.018,
              maxRadius: 0.06,
              minTubularSegments: 48,
              maxTubularSegments: 96,
              lerp: 0.15,
              noise: 0.09,
              material: { metalness: 0.45, roughness: 0.22 },
              colors: palettes[0].tubes,
              lights: { intensity: 250, colors: palettes[0].lights },
            },
            onError: fallback,
          });
          if (disposed || failed) {
            app.dispose();
            return;
          }
          appRef.current = app;
          app.three.setPaused(!enabledRef.current);
          container.dataset.render = "ready";
          setReady(true);
        })
        .catch(fallback);
    };
    syncRef.current = initialize;
    const observer = new IntersectionObserver(
      ([entry]) => {
        near = entry.isIntersecting;
        initialize();
      },
      { rootMargin: "160px" },
    );
    const size = new ResizeObserver(initialize);
    observer.observe(container);
    size.observe(container);
    const lost = () => fallback();
    canvas.addEventListener("webglcontextlost", lost);
    return () => {
      disposed = true;
      syncRef.current = null;
      observer.disconnect();
      size.disconnect();
      canvas.removeEventListener("webglcontextlost", lost);
      appRef.current?.dispose();
      appRef.current = null;
    };
  }, []);

  const changeColors = () => {
    const app = appRef.current;
    if (!app || !enabled) return;
    const next = (palette + 1) % palettes.length;
    app.tubes.setColors(palettes[next].tubes);
    app.tubes.setLightsColors(palettes[next].lights);
    setPalette(next);
    setHasChanged(true);
  };

  return (
    <>
      <div
        ref={containerRef}
        className="tubes-backdrop"
        aria-hidden="true"
        data-render="idle"
      >
        <div className="tubes-still">
          <i />
          <i />
          <i />
        </div>
        <canvas ref={canvasRef} />
      </div>
      <button
        className="tube-color-control"
        type="button"
        onClick={changeColors}
        disabled={!ready || !enabled}
        aria-label="Change tube colors"
      >
        <Palette size={15} aria-hidden="true" />
        <span>Change colors</span>
      </button>
      <span className="sr-only" role="status">
        {hasChanged ? `${palettes[palette].name} colors selected.` : ""}
      </span>
    </>
  );
}
