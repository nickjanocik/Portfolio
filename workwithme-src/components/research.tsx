import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { ArrowRight, ArrowUpRight, Plus } from "lucide-react";
import { useMotionSettings } from "@/components/motion-settings";
import { researchChapters } from "@/lib/research-evidence";
import "@/research.css";

export default function Research() {
  const [selected, setSelected] = useState(0);
  const [visible, setVisible] = useState(false);
  const [awake, setAwake] = useState(() => !document.hidden);
  const { enabled } = useMotionSettings();
  const ref = useRef<HTMLElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const id = `research-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const chapter = researchChapters[selected];

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) =>
      setVisible(entry.isIntersecting),
    );
    const visibility = () => setAwake(!document.hidden);
    observer.observe(element);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  const navigate = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = index;
    if (event.key === "ArrowRight")
      next = (index + 1) % researchChapters.length;
    else if (event.key === "ArrowLeft")
      next = (index + researchChapters.length - 1) % researchChapters.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = researchChapters.length - 1;
    else return;
    event.preventDefault();
    setSelected(next);
    tabs.current[next]?.focus();
  };

  return (
    <section
      id="research"
      ref={ref}
      className="research-section section-shell"
      aria-labelledby={`${id}-title`}
      data-active={enabled && visible && awake}
      data-chapter={selected}
    >
      <div className="research-heading">
        <div>
          <p className="eyebrow">A LITTLE EVIDENCE. A LOT OF POSSIBILITY.</p>
          <h2 id={`${id}-title`}>
            Big potential.
            <br />
            <span>The fit comes first.</span>
          </h2>
        </div>
        <p>
          It’s reasonable to want proof before changing how your business works.
          Here’s what the evidence says.
        </p>
      </div>

      <div
        className="research-tabs"
        role="tablist"
        aria-label="Explore the research"
      >
        {researchChapters.map((item, index) => (
          <button
            key={item.label}
            ref={(node) => {
              tabs.current[index] = node;
            }}
            type="button"
            role="tab"
            id={`${id}-tab-${index}`}
            aria-controls={`${id}-panel-${index}`}
            aria-selected={index === selected}
            tabIndex={index === selected ? 0 : -1}
            onClick={() => setSelected(index)}
            onKeyDown={(event) => navigate(event, index)}
          >
            <span className="research-step">0{index + 1}</span>
            {item.label}
            <ArrowUpRight size={17} aria-hidden="true" />
          </button>
        ))}
      </div>

      {researchChapters.map((item, index) => (
        <div
          key={item.label}
          role="tabpanel"
          id={`${id}-panel-${index}`}
          aria-labelledby={`${id}-tab-${index}`}
          hidden={index !== selected}
          tabIndex={0}
          className="research-panel"
        >
          {index === selected && (
            <>
              <div className="research-number-scene">
                <span className="research-evidence-type">{chapter.kind}</span>
                <p className="research-number">{chapter.figure}</p>
                <p className="research-unit">{chapter.unit}</p>
                <svg
                  className="research-signal"
                  viewBox="0 0 420 110"
                  fill="none"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path
                    className="research-signal-track"
                    d="M-10 77C40 77 40 29 89 29S139 87 180 65S194 6 216 20S199 98 247 78S290 38 430 38"
                  />
                  <path
                    className="research-signal-pulse"
                    d="M-10 77C40 77 40 29 89 29S139 87 180 65S194 6 216 20S199 98 247 78S290 38 430 38"
                  />
                  <circle
                    cx="350"
                    cy="39"
                    r="12"
                    fill="#d8ff62"
                    stroke="#1b3526"
                    strokeWidth="1.5"
                  />
                  <path
                    d="m345 39 3 3 6-7"
                    stroke="#1b3526"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="research-story">
                <h3>{chapter.title}</h3>
                <p className="research-explanation">{chapter.body}</p>
                <a
                  className="research-source"
                  href={chapter.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {chapter.source} <ArrowUpRight size={14} aria-hidden="true" />
                </a>
                <details className="research-details">
                  <summary>
                    What’s behind the number{" "}
                    <Plus size={16} aria-hidden="true" />
                  </summary>
                  <div>
                    {chapter.notes.map((note) => (
                      <p key={note}>{note}</p>
                    ))}
                  </div>
                </details>
                {selected < researchChapters.length - 1 && (
                  <button
                    className="research-next"
                    type="button"
                    onClick={() => {
                      const next = selected + 1;
                      setSelected(next);
                      tabs.current[next]?.focus();
                    }}
                  >
                    {selected === 0
                      ? "What happens when it fits?"
                      : "And what about the money?"}
                    <ArrowRight size={16} aria-hidden="true" />
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      ))}
      <p className="research-takeaway">
        These are external findings. My approach for your business: pick one
        workflow. Measure the change. Build on what helps.
      </p>
    </section>
  );
}
