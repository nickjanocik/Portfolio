import {
  useId,
  useRef,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { FileSearch, Mail, RotateCw } from "lucide-react";

// The supplied glass layers, composed around real controls rather than
// clickable images or a link wrapped around the whole dock.
export function GlassEffect({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const filter = `glass-${useId().replace(/[^a-z0-9]/gi, "")}`;
  return (
    <div className={`liquid-glass ${className}`} style={style}>
      <svg className="glass-filter" aria-hidden="true">
        <defs>
          <filter id={filter} x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.009 0.018"
              numOctaves="1"
              seed="17"
              result="noise"
            />
            <feGaussianBlur in="noise" stdDeviation="2" result="soft" />
            <feDisplacementMap
              in="SourceGraphic"
              in2="soft"
              scale="12"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>
      <span
        className="glass-refraction"
        style={{ filter: `url(#${filter})` }}
        aria-hidden="true"
      />
      <span className="glass-tint" aria-hidden="true" />
      <span className="glass-shine" aria-hidden="true" />
      <div className="glass-contents">{children}</div>
    </div>
  );
}

export function SpoofIcon({
  index,
  decorative = true,
}: {
  index: number;
  decorative?: boolean;
}) {
  return (
    <span className={`spoof-icon spoof-${index}`} aria-hidden={decorative}>
      {index === 0 && (
        <>
          <span className="notes-cap" />
          <span className="notes-rules">
            <i />
            <i />
            <i />
          </span>
          <span className="notes-fold" />
        </>
      )}
      {index === 1 && <Mail size={38} strokeWidth={1.55} />}
      {index === 2 && (
        <>
          <span className="finder-half" />
          <FileSearch size={36} strokeWidth={1.4} />
        </>
      )}
      {index === 3 && (
        <>
          <span className="calendar-cap">PLAN</span>
          <RotateCw size={31} strokeWidth={1.7} />
        </>
      )}
    </span>
  );
}
export const dockApps = [
  {
    name: "JobNotes",
    description: "Service work",
    label: "JobNotes: service and trades",
  },
  {
    name: "Orderly",
    description: "Orders & supply",
    label: "Orderly: orders and supply",
  },
  {
    name: "BillFinder",
    description: "Property invoices",
    label: "BillFinder: property and offices",
  },
  {
    name: "Plan B",
    description: "Events & projects",
    label: "Plan B: events and projects",
  },
];
export function GlassDock({
  selected,
  onSelect,
}: {
  selected: number;
  onSelect: (index: number) => void;
}) {
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
    onSelect(next);
    buttons.current[next]?.focus();
  }
  return (
    <GlassEffect className="apps-glass-dock">
      <div
        className="glass-dock"
        role="tablist"
        aria-label="Explore a business workflow"
      >
        {dockApps.map((app, i) => (
          <button
            key={app.name}
            type="button"
            role="tab"
            aria-label={app.label}
            id={`workflow-tab-${i}`}
            aria-controls={`workflow-panel-${i}`}
            aria-selected={selected === i}
            tabIndex={selected === i ? 0 : -1}
            onClick={() => onSelect(i)}
            onKeyDown={(event) => navigate(event, i)}
            ref={(node) => {
              buttons.current[i] = node;
            }}
          >
            <SpoofIcon index={i} />
            <span className="dock-app-name">{app.name}</span>
            <span className="dock-app-description">{app.description}</span>
            <span className="dock-active-dot" />
          </button>
        ))}
      </div>
    </GlassEffect>
  );
}
