import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  useId,
  type PointerEvent,
} from "react";
import { ArrowDown, ArrowUpRight, RotateCw } from "lucide-react";
import { useMotionSettings } from "@/components/motion-settings";
import "@/falling-code-objects.css";

const HeroShader = lazy(async () => {
  try {
    return await import("./hero-shader");
  } catch {
    // The copy and controls remain usable if a decorative chunk cannot load.
    return { default: (_props: { active: boolean; palette: number }) => <></> };
  }
});
const FallingCodeObjects = lazy(async () => {
  try {
    return await import("./falling-code-objects");
  } catch {
    return {
      default: (_props: { active: boolean; palette?: number }) => <></>,
    };
  }
});
const moods = ["Fresh perspective", "A warmer outlook", "Room to breathe"];

// The supplied Paper shader becomes an edge-to-edge, interactive opening scene.
// Native scroll, links, and one small palette control keep the way forward clear.
export default function ShaderHero() {
  const ref = useRef<HTMLElement>(null);
  const circleId = `hero-scroll-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const { enabled } = useMotionSettings();
  const [visible, setVisible] = useState(true);
  const [awake, setAwake] = useState(!document.hidden);
  const [palette, setPalette] = useState(0);
  const [changed, setChanged] = useState(false);
  const pointer = useRef({ x: 0, y: 0 });
  const frame = useRef(0);
  const active = visible && awake && enabled;

  useEffect(() => {
    const element = ref.current!;
    const observer = new IntersectionObserver(([entry]) =>
      setVisible(entry.isIntersecting),
    );
    observer.observe(element);
    const visibility = () => setAwake(!document.hidden);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      cancelAnimationFrame(frame.current);
    };
  }, []);

  useEffect(() => {
    if (!active) {
      cancelAnimationFrame(frame.current);
      frame.current = 0;
      ref.current?.style.setProperty("--pointer-x", "0");
      ref.current?.style.setProperty("--pointer-y", "0");
    }
  }, [active]);

  const move = (event: PointerEvent<HTMLElement>) => {
    if (!active || event.pointerType === "touch") return;
    const rect = event.currentTarget.getBoundingClientRect();
    pointer.current = {
      x: (event.clientX - rect.left) / rect.width - 0.5,
      y: (event.clientY - rect.top) / rect.height - 0.5,
    };
    if (!frame.current)
      frame.current = requestAnimationFrame(() => {
        frame.current = 0;
        ref.current?.style.setProperty(
          "--pointer-x",
          String(pointer.current.x),
        );
        ref.current?.style.setProperty(
          "--pointer-y",
          String(pointer.current.y),
        );
      });
  };
  const leave = () => {
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    ref.current?.style.setProperty("--pointer-x", "0");
    ref.current?.style.setProperty("--pointer-y", "0");
  };
  const stir = () => {
    setPalette((value) => (value + 1) % moods.length);
    setChanged(true);
  };

  return (
    <section
      ref={ref}
      className="shader-hero"
      aria-labelledby="hero-title"
      data-active={active}
      data-palette={palette}
      onPointerMove={move}
      onPointerLeave={leave}
    >
      <span className="header-sentinel" aria-hidden="true" />
      <div className="hero-atmosphere" aria-hidden="true">
        <div className="hero-color-fallback" />
        <Suspense fallback={null}>
          <HeroShader active={active} palette={palette} />
        </Suspense>
        <div className="hero-shade" />
        <Suspense fallback={null}>
          <FallingCodeObjects active={active} palette={palette} />
        </Suspense>
        <svg
          className="hero-contours"
          viewBox="0 0 1440 1000"
          preserveAspectRatio="xMidYMid slice"
          focusable="false"
        >
          <g fill="none" stroke="currentColor" strokeWidth=".7">
            <path d="M-200 950 C150 950 320 60 760 80 S1220 990 1600 300" />
            <path d="M-180 1000 C170 1000 340 95 760 110 S1230 1020 1630 330" />
            <path d="M-160 1050 C190 1050 360 130 760 140 S1240 1050 1660 360" />
          </g>
        </svg>
      </div>
      <div className="hero-meta">
        <span>INDEPENDENT MIND. PRACTICAL SOFTWARE.</span>
        <span>HOUSTON, TEXAS ↗</span>
      </div>
      <div className="hero-center">
        <p className="hero-kicker">
          <span /> SOFTWARE & AUTOMATION, WITH PEOPLE IN MIND
        </p>
        <h1 id="hero-title" className="hero-statement">
          <span className="hero-line-one">Make room.</span>
          <span className="hero-line-two">
            For <span className="hero-flow">better work.</span>
          </span>
        </h1>
        <p className="hero-description">
          I build practical software and automation that take repetitive work
          off your team’s plate.
        </p>
        <div className="hero-actions">
          <a href="#contact" className="hero-consultation">
            Book a free consultation
            <span>
              <ArrowUpRight size={21} />
            </span>
          </a>
          <a href="#closer" className="hero-explore">
            See where this goes
            <ArrowDown size={17} />
          </a>
        </div>
        <span className="hero-reassurance">
          20 minutes. One process. No obligation.
        </span>
      </div>
      <div className="hero-bottom">
        <span className="hero-bottom-note">
          LESS REPETITION.
          <br />
          MORE ROOM FOR WHAT MATTERS.
        </span>
        <a
          className="hero-scroll-orbit"
          href="#closer"
          aria-label="Scroll to meet Nick"
        >
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <defs>
              <path
                id={circleId}
                d="M60 60m-45 0a45 45 0 1 1 90 0a45 45 0 1 1-90 0"
              />
            </defs>
            <text>
              <textPath href={`#${circleId}`}>
                A LITTLE LESS FRICTION · A LITTLE MORE FLOW ·{" "}
              </textPath>
            </text>
          </svg>
          <ArrowDown size={24} />
        </a>
        <button className="hero-stir" type="button" onClick={stir}>
          <RotateCw size={16} />
          <span>Stir the flow</span>
        </button>
      </div>
      <span className="sr-only" role="status">
        {changed ? `${moods[palette]} colors selected.` : ""}
      </span>
    </section>
  );
}
