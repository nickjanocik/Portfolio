import { useEffect, useId, useRef, type CSSProperties } from "react";
import { useMotionSettings } from "@/components/motion-settings";
import "@/transitions.css";

export interface SectionTransitionProps {
  variant?: "ribbon" | "fold" | "pinch";
  /** Match the exact solid color at the preceding section's bottom edge. */
  from: string;
  /** Match the exact solid color at the following section's top edge. */
  to: string;
  accent?: string;
  mirror?: boolean;
  /** Desktop height; automatically compresses on small screens. */
  height?: number;
  className?: string;
}

/** A decorative, full-width continuation of the surfaces on either side. */
export function SectionTransition({
  variant = "ribbon",
  from,
  to,
  accent = "#d8ff62",
  mirror = false,
  height = 84,
  className = "",
}: SectionTransitionProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const { enabled } = useMotionSettings();
  const id = `flow-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const reset = () => {
      element.style.removeProperty("--st-drift");
      element.style.removeProperty("--st-lift");
      element.style.removeProperty("--st-open");
    };
    if (!enabled) {
      reset();
      return;
    }

    let frame = 0;
    let visible = false;
    const paint = () => {
      frame = 0;
      if (!visible || document.hidden) return;
      const rect = element.getBoundingClientRect();
      const progress = Math.max(
        0,
        Math.min(
          1,
          (window.innerHeight - rect.top) / (window.innerHeight + rect.height),
        ),
      );
      // No content moves: only the illustrated joining surfaces gently unfold.
      element.style.setProperty(
        "--st-drift",
        `${((progress - 0.5) * 100).toFixed(2)}px`,
      );
      element.style.setProperty(
        "--st-lift",
        `${((progress - 0.5) * 10).toFixed(2)}px`,
      );
      element.style.setProperty(
        "--st-open",
        (0.94 + progress * 0.12).toFixed(3),
      );
    };
    const schedule = () => {
      if (visible && !document.hidden && !frame)
        frame = requestAnimationFrame(paint);
    };
    const cancel = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };
    const onVisibility = () => {
      if (document.hidden) cancel();
      else schedule();
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) {
          window.addEventListener("scroll", schedule, { passive: true });
          window.addEventListener("resize", schedule);
          schedule();
        } else {
          window.removeEventListener("scroll", schedule);
          window.removeEventListener("resize", schedule);
          cancel();
        }
      },
      { rootMargin: "100px 0px", threshold: 0 },
    );
    observer.observe(element);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      document.removeEventListener("visibilitychange", onVisibility);
      cancel();
      reset();
    };
  }, [enabled]);

  const style = {
    "--st-from": from,
    "--st-to": to,
    "--st-accent": accent,
    "--st-height": `${Math.max(44, Math.min(100, height))}px`,
  } as CSSProperties;

  return (
    <div
      ref={elementRef}
      className={`section-transition section-transition--${variant} ${className}`.trim()}
      style={style}
      aria-hidden="true"
      data-motion={enabled ? "on" : "off"}
      data-mirror={mirror ? "true" : undefined}
    >
      <svg
        className="section-transition__art"
        viewBox="0 0 1440 100"
        preserveAspectRatio="none"
        focusable="false"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`${id}-ribbon`} x1="0" y1="0" x2="1" y2="0.65">
            <stop offset="0" stopColor={accent} stopOpacity="0.45" />
            <stop offset="0.38" stopColor={accent} />
            <stop offset="0.76" stopColor={accent} />
            <stop offset="1" stopColor={accent} stopOpacity="0.64" />
          </linearGradient>
          <linearGradient id={`${id}-crease`} x1="0" y1="0" x2="0.75" y2="1">
            <stop offset="0" stopColor={accent} />
            <stop offset="0.5" stopColor={accent} stopOpacity="0.85" />
            <stop offset="1" stopColor={to} />
          </linearGradient>
          <linearGradient id={`${id}-shadow`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#000000" stopOpacity="0.22" />
            <stop offset="1" stopColor="#000000" stopOpacity="0" />
          </linearGradient>
        </defs>

        {variant === "ribbon" && (
          <>
            <path
              className="section-transition__surface"
              d="M-100 65 C190 108 405 3 730 40 C1040 76 1225 3 1540 29 L1540 160 L-100 160Z"
              fill={to}
            />
            <g className="section-transition__ribbon">
              <path
                d="M-100 28 C205 126 412 -4 745 36 C1068 75 1235 -7 1540 13 L1540 38 C1224 12 1060 103 731 61 C405 19 204 152 -100 47Z"
                fill={`url(#${id}-ribbon)`}
              />
              <path
                d="M-100 47 C204 152 405 19 731 61 C1060 103 1224 12 1540 38 L1540 44 C1230 22 1052 111 729 69 C407 28 207 158 -100 54Z"
                fill={`url(#${id}-shadow)`}
              />
            </g>
          </>
        )}

        {variant === "fold" && (
          <>
            <path
              className="section-transition__surface"
              d="M-100 62 C200 91 500 73 834 26 C1051 -5 1253 43 1540 59 L1540 160 L-100 160Z"
              fill={to}
            />
            <g className="section-transition__fold">
              <path
                d="M-100 60 C234 94 527 62 834 26 C1020 4 1077 1 1168 12 C1037 25 954 67 830 70 C501 66 210 105 -100 78Z"
                fill={`url(#${id}-crease)`}
              />
              <path
                d="M834 26 C1020 4 1077 1 1168 12 C1037 25 954 67 830 70 C929 58 960 31 1037 24 C966 24 905 27 834 26Z"
                fill={from}
                opacity="0.36"
              />
              <path
                d="M-100 78 C210 105 501 66 830 70 C949 68 1037 28 1168 12 C1037 39 953 79 830 80 C504 77 217 110 -100 88Z"
                fill={`url(#${id}-shadow)`}
              />
            </g>
          </>
        )}

        {variant === "pinch" && (
          <>
            <path
              d="M-100 33 C210 25 458 73 720 68 C982 63 1230 12 1540 23 L1540 160 L-100 160Z"
              fill={to}
            />
            <g className="section-transition__pinch">
              <path
                d="M-100 3 C174 8 387 34 720 61 C1053 34 1266 8 1540 3 L1540 20 C1248 20 1011 46 720 66 C429 46 192 20 -100 20Z"
                fill={`url(#${id}-ribbon)`}
              />
              <path
                d="M-100 78 C194 83 409 78 720 66 C1031 78 1246 83 1540 78 L1540 93 C1223 94 981 80 720 70 C459 80 217 94 -100 93Z"
                fill={accent}
                opacity="0.82"
              />
              <path d="M486 62 Q720 69 954 62 Q720 77 486 62Z" fill={accent} />
            </g>
          </>
        )}
      </svg>
    </div>
  );
}

export default SectionTransition;
