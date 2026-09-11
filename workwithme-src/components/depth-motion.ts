import { useEffect } from "react";

// Keep document scrolling native. Only approaching surfaces move along the z axis.
export function useDepthMotion() {
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const panels = Array.from(
      document.querySelectorAll<HTMLElement>(".depth-panel"),
    );
    const visible = new Set<HTMLElement>();
    let raf = 0;
    const paint = () => {
      raf = 0;
      for (const panel of visible) {
        const top = panel.getBoundingClientRect().top;
        const approach = Math.max(
          0,
          Math.min(
            1,
            (top - window.innerHeight * 0.24) / (window.innerHeight * 0.76),
          ),
        );
        panel.style.setProperty(
          "--depth",
          motion.matches ? "0" : String(approach),
        );
      }
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(paint);
    };
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const panel = entry.target as HTMLElement;
          if (entry.isIntersecting) visible.add(panel);
          else visible.delete(panel);
        }
        schedule();
      },
      { rootMargin: "12% 0px" },
    );
    panels.forEach((panel) => observer.observe(panel));
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    motion.addEventListener("change", schedule);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      motion.removeEventListener("change", schedule);
    };
  }, []);
}
