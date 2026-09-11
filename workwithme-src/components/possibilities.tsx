import { useRef, useState, type KeyboardEvent } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  ClipboardCheck,
  FileText,
  HardHat,
  Package,
  Building2,
  CalendarDays,
  GitMerge,
  Users,
} from "lucide-react";
import copy from "@/content.json";

const categories = [
  {
    short: "Service & trades",
    Icon: HardHat,
    input: "Approved job notes",
    middle: "Details + approved prices",
    result: "Invoice draft",
    control: "Your team checks the charges",
  },
  {
    short: "Orders & supply",
    Icon: Package,
    input: "An email or PDF order",
    middle: "Customer + product records",
    result: "Prepared order",
    control: "Your staff resolves uncertain matches",
  },
  {
    short: "Property & offices",
    Icon: Building2,
    input: "An incoming invoice",
    middle: "Work order + authorization",
    result: "Discrepancies highlighted",
    control: "A person approves the spending",
  },
  {
    short: "Events & projects",
    Icon: CalendarDays,
    input: "One approved change",
    middle: "Proposal + schedule + billing",
    result: "Aligned documents",
    control: "New decisions stay with your team",
  },
];

export default function Possibilities() {
  const [selected, setSelected] = useState(0);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? 3
          : (index + (event.key === "ArrowRight" ? 1 : -1) + 4) % 4;
    setSelected(next);
    buttons.current[next]?.focus();
  }
  return (
    <section
      id="possibilities"
      className="possibilities section-shell depth-section"
      aria-labelledby="possibilities-title"
    >
      <div className="section-heading">
        <p className="eyebrow">
          <span className="section-index">03</span>
          {copy.problems.eyebrow}
        </p>
        <div className="heading-split">
          <h2 id="possibilities-title">{copy.problems.heading}</h2>
          <div className="body-copy">
            {copy.problems.body.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        </div>
      </div>
      <div
        className="possibility-tabs"
        role="tablist"
        aria-label="Explore a business workflow"
      >
        {categories.map(({ short, Icon }, i) => (
          <button
            key={short}
            type="button"
            role="tab"
            id={`workflow-tab-${i}`}
            aria-selected={selected === i}
            aria-controls={`workflow-panel-${i}`}
            tabIndex={selected === i ? 0 : -1}
            onClick={() => setSelected(i)}
            onKeyDown={(event) => navigate(event, i)}
            ref={(node) => {
              buttons.current[i] = node;
            }}
          >
            <Icon size={19} />
            <span>{short}</span>
            <span className="tab-number">0{i + 1}</span>
          </button>
        ))}
      </div>
      {copy.problems.examples.map((example, i) => (
        <div
          key={i}
          role="tabpanel"
          id={`workflow-panel-${i}`}
          aria-labelledby={`workflow-tab-${i}`}
          tabIndex={0}
          hidden={selected !== i}
          className="workflow-panel depth-panel"
        >
          <div className="example-copy">
            <span className="example-audience">{example.audience}</span>
            <h3>{example.title}</h3>
            {example.body.map((p) => (
              <p key={p}>{p}</p>
            ))}
            <p className="example-outcome">
              <span>
                <ArrowUpRight size={20} />
              </span>
              {example.outcome}
            </p>
          </div>
          <div className="example-flow">
            <span className="flow-label">
              <span className="status-dot" /> ONE POSSIBLE WAY THROUGH
            </span>
            <div className="flow-step">
              <FileText size={21} />
              <span>{categories[i].input}</span>
              <span className="flow-step-number">01</span>
            </div>
            <span className="flow-connector">
              <ArrowDown size={17} />
            </span>
            <div className="flow-step">
              <GitMerge size={21} />
              <span>{categories[i].middle}</span>
              <span className="flow-step-number">02</span>
            </div>
            <span className="flow-connector">
              <ArrowDown size={17} />
            </span>
            <div className="flow-step step-result">
              <ClipboardCheck size={21} />
              <span>{categories[i].result}</span>
              <Check size={17} />
            </div>
            <div className="human-check">
              <Users size={17} />
              <span>{categories[i].control}</span>
            </div>
            <span className="flow-disclaimer">Illustrative workflow</span>
          </div>
        </div>
      ))}
      <div className="possibility-foot">
        <p>{copy.problems.note}</p>
        <a href="#contact">
          {copy.problems.closing}
          <ArrowRight size={20} />
        </a>
      </div>
    </section>
  );
}
