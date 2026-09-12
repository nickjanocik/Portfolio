import { useEffect, useRef } from "react";
import {
  HardHat,
  Package,
  Building2,
  CalendarDays,
  ScanLine,
} from "lucide-react";
import { useMotionSettings } from "@/components/motion-settings";

const objects = [
  {
    Icon: HardHat,
    title: "A finished job",
    accent: "#e6c16c",
    code: "job.approved_notes\nparts.match(price_list)\ninvoice.prepare()\nmissing.flag_for_review()\nawait team.confirm()",
  },
  {
    Icon: Package,
    title: "An incoming order",
    accent: "#8fcde0",
    code: "order.read(document)\ncustomer.find(record)\nproducts.match(sku)\nuncertain.flag()\nawait staff.review()",
  },
  {
    Icon: Building2,
    title: "A property invoice",
    accent: "#bea5e5",
    code: "property.find(job)\nwork_order.lookup()\ninvoice.compare()\nexceptions.highlight()\nawait person.approve()",
  },
  {
    Icon: CalendarDays,
    title: "A change of plans",
    accent: "#a9d281",
    code: "change.confirm()\nproposal.align()\nschedule.update_draft()\nbilling.prepare()\nawait team.decide()",
  },
];
const stream = [...objects, ...objects, ...objects];

// The reference scanner's moving image/code layers, adapted to real container
// coordinates, finite looping, and a single loop with complete teardown.
export function ScannerCardStream() {
  const stage = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const { enabled } = useMotionSettings();
  useEffect(() => {
    const container = stage.current!;
    const line = track.current!;
    const cards = Array.from(
      line.querySelectorAll<HTMLElement>(".scanner-object"),
    );
    let width = 0,
      cardWidth = 0,
      gap = 30,
      cycle = 1,
      position = 0;
    let raf = 0,
      last = 0,
      visible = false;
    const paint = () => {
      line.style.transform = `translate3d(${position}px,0,0)`;
      for (let i = 0; i < cards.length; i++) {
        const cut = Math.max(
          0,
          Math.min(
            1,
            (width / 2 - (position + i * (cardWidth + gap))) / cardWidth,
          ),
        );
        cards[i].style.setProperty("--scan-cut", `${cut * 100}%`);
      }
    };
    const resize = () => {
      width = container.clientWidth;
      cardWidth = cards[0]?.offsetWidth || 230;
      gap = parseFloat(getComputedStyle(line).gap) || 30;
      cycle = (cardWidth + gap) * objects.length;
      // Show a half-transformed object immediately, including the still mode.
      position = -cycle + width / 2 - cardWidth / 2;
      paint();
    };
    const frame = (time: number) => {
      raf = 0;
      if (!visible || !enabled || document.hidden) {
        last = 0;
        return;
      }
      const dt = last ? Math.min((time - last) / 1000, 0.05) : 0;
      last = time;
      position -= dt * 45;
      if (position < -cycle * 2) position += cycle;
      paint();
      raf = requestAnimationFrame(frame);
    };
    const sync = () => {
      if (visible && enabled && !document.hidden && !raf)
        raf = requestAnimationFrame(frame);
      else if ((!visible || !enabled || document.hidden) && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
        last = 0;
      }
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        sync();
      },
      { rootMargin: "80px" },
    );
    const size = new ResizeObserver(resize);
    observer.observe(container);
    size.observe(container);
    document.addEventListener("visibilitychange", sync);
    resize();
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      size.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [enabled]);

  return (
    <figure
      className="scanner-figure"
      aria-label="Illustration: service jobs, orders, property invoices and event plans become software workflows, with people reviewing the result."
    >
      <div className="scanner-stage" ref={stage} aria-hidden="true">
        <div className="scanner-grid" />
        <div className="scanner-track" ref={track}>
          {stream.map(({ Icon, title, accent, code }, i) => (
            <div className="scanner-object" key={i}>
              <div className="scanner-solid" style={{ color: accent }}>
                <Icon size={124} strokeWidth={1.1} />
                <span>{title}</span>
              </div>
              <div className="scanner-code">
                <pre>{Array.from({ length: 4 }, () => code).join("\n\n")}</pre>
              </div>
            </div>
          ))}
        </div>
        <div className="scanner-beam">
          <i />
          <i />
          <i />
        </div>
        <span className="scanner-side-label label-code">
          A LITTLE MORE FLOW
        </span>
        <span className="scanner-side-label label-object">EVERYDAY WORK</span>
      </div>
      <figcaption>
        <ScanLine size={14} />
        <span>Illustrative workflows. Your people stay in control.</span>
      </figcaption>
    </figure>
  );
}
