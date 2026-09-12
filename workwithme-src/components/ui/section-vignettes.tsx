import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useMotionSettings } from "@/components/motion-settings";

type VignetteProps = { className?: string };

// Decorative scenes remain complete while still. Only visible scenes animate;
// the shared motion switch and a backgrounded tab both pause their CSS timelines.
function Vignette({
  children,
  className = "",
}: VignetteProps & { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const { enabled } = useMotionSettings();
  const [visible, setVisible] = useState(false);
  const [awake, setAwake] = useState(() => !document.hidden);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.08 },
    );
    const visibility = () => setAwake(!document.hidden);
    observer.observe(node);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`section-vignette ${className}`}
      aria-hidden="true"
      data-active={enabled && visible && awake ? "true" : "false"}
    >
      {children}
    </div>
  );
}

/** Insert first inside .trust-details, above its disclosure rows. */
export function ConversationSketch({ className = "" }: VignetteProps) {
  return (
    <Vignette className={`conversation-sketch ${className}`}>
      <svg viewBox="0 0 500 202" fill="none" focusable="false">
        <path d="M40 172h409" stroke="#101710" strokeOpacity=".13" />
        <path
          d="M110 133C63 192 213 191 256 146S391 126 375 83"
          stroke="#101710"
          strokeOpacity=".22"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          className="vignette-conversation-signal"
          d="M110 133C63 192 213 191 256 146S391 126 375 83"
          stroke="#638443"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="3 14"
        />
        <g className="vignette-chat-first">
          <path
            d="M58 48a16 16 0 0 1 16-16h153a16 16 0 0 1 16 16v76a16 16 0 0 1-16 16H108l-29 22v-22h-5a16 16 0 0 1-16-16Z"
            fill="#101710"
          />
          <path
            d="M77 52h42"
            stroke="#eff1dc"
            strokeOpacity=".2"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle
            cx="94"
            cy="89"
            r="5"
            fill="#eff1dc"
            className="vignette-speaking-dot dot-one"
          />
          <circle
            cx="117"
            cy="89"
            r="5"
            fill="#eff1dc"
            className="vignette-speaking-dot dot-two"
          />
          <circle
            cx="140"
            cy="89"
            r="5"
            fill="#eff1dc"
            className="vignette-speaking-dot dot-three"
          />
          <path
            d="m180 104 13-27 13 27m-21-8h16"
            stroke="#85dbe7"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
        <g className="vignette-chat-second">
          <path
            d="M283 30a15 15 0 0 1 15-15h133a15 15 0 0 1 15 15v67a15 15 0 0 1-15 15h-7v18l-26-18H298a15 15 0 0 1-15-15Z"
            fill="#d8ff62"
            stroke="#101710"
            strokeOpacity=".16"
          />
          <path
            d="M308 43h106M308 58h84M308 73h49"
            stroke="#101710"
            strokeOpacity=".38"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            className="vignette-chat-scribble"
            d="m377 85 5-8 5 8 5-8 5 8 5-8 5 8"
            stroke="#101710"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
        <g className="vignette-connection-knot">
          <rect
            x="245"
            y="101"
            width="38"
            height="38"
            rx="12"
            fill="#85dbe7"
            stroke="#101710"
            strokeWidth="1.3"
          />
          <path
            d="m257 117 5-5a5 5 0 0 1 7 7l-3 3m-5-5-3 3a5 5 0 0 0 7 7l5-5"
            stroke="#101710"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </g>
        <path
          className="vignette-conversation-star"
          d="m34 41 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z"
          fill="#df8f79"
        />
        <path
          d="M457 141h9m-4.5-4.5v9"
          stroke="#101710"
          strokeOpacity=".45"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </Vignette>
  );
}

/** Insert after the short introduction in .start-heading or beside that block. */
export function SampleTestSketch({ className = "" }: VignetteProps) {
  const clipId = `sample-track-${useId().replace(/[^a-z0-9]/gi, "")}`;
  return (
    <Vignette className={`sample-test-sketch ${className}`}>
      <svg viewBox="0 0 470 180" fill="none" focusable="false">
        <defs>
          <clipPath id={clipId}>
            <rect x="171" y="39" width="123" height="82" rx="10" />
          </clipPath>
        </defs>
        <path
          d="M147 86h155"
          stroke="#101710"
          strokeOpacity=".35"
          strokeWidth="1.5"
          strokeDasharray="3 7"
        />
        <path
          d="m280 80 7 6-7 6"
          stroke="#101710"
          strokeOpacity=".55"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <g transform="translate(37 35) rotate(-14 55 55)">
          <rect
            width="78"
            height="104"
            rx="9"
            fill="#101710"
            fillOpacity=".13"
            stroke="#101710"
            strokeOpacity=".3"
          />
        </g>
        <g transform="translate(55 24) rotate(-5 39 52)">
          <rect
            width="78"
            height="104"
            rx="9"
            fill="#eff1dc"
            stroke="#101710"
            strokeOpacity=".26"
          />
          <path
            d="M15 25h45m-45 12h32m-32 12h45"
            stroke="#101710"
            strokeOpacity=".2"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
        <g className="vignette-source-record">
          <rect
            x="82"
            y="22"
            width="84"
            height="111"
            rx="10"
            fill="#eff1dc"
            stroke="#101710"
            strokeWidth="1.2"
          />
          <path
            d="M98 46h33m-33 13h50m-50 13h41m-41 13h23"
            stroke="#101710"
            strokeOpacity=".42"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M142 22v18h24"
            stroke="#101710"
            strokeOpacity=".35"
            strokeWidth="1.2"
          />
          <rect x="98" y="107" width="25" height="8" rx="4" fill="#85dbe7" />
        </g>
        <g clipPath={`url(#${clipId})`}>
          <g className="vignette-paper-pass">
            <rect
              x="188"
              y="56"
              width="43"
              height="54"
              rx="6"
              fill="#eff1dc"
              stroke="#101710"
              strokeOpacity=".45"
            />
            <path
              d="M198 72h22m-22 8h16m-16 8h20"
              stroke="#101710"
              strokeOpacity=".35"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </g>
        </g>
        <g className="vignette-review-record">
          <rect
            x="309"
            y="23"
            width="108"
            height="120"
            rx="15"
            fill="#101710"
          />
          <path
            d="M329 43h28m-28 10h49"
            stroke="#eff1dc"
            strokeOpacity=".3"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <rect x="336" y="68" width="53" height="53" rx="17" fill="#d8ff62" />
          <path
            className="vignette-review-check"
            d="m349 95 9 9 18-21"
            pathLength="1"
            stroke="#101710"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
        <path
          d="M185 151h89"
          stroke="#101710"
          strokeOpacity=".26"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <g className="vignette-held-records">
          <rect
            x="197"
            y="136"
            width="24"
            height="30"
            rx="4"
            fill="#eff1dc"
            stroke="#101710"
            strokeOpacity=".45"
            transform="rotate(-8 209 151)"
          />
          <rect
            x="232"
            y="136"
            width="24"
            height="30"
            rx="4"
            fill="#eff1dc"
            stroke="#101710"
            strokeOpacity=".45"
            transform="rotate(8 244 151)"
          />
          <path
            d="M204 147h9m25 0h10m-44 6h7m27 0h8"
            stroke="#101710"
            strokeOpacity=".4"
            strokeLinecap="round"
          />
        </g>
        <path
          className="vignette-proof-spark"
          d="m432 38 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z"
          fill="#101710"
        />
      </svg>
    </Vignette>
  );
}

/** Insert beneath the heading inside .faq-heading. */
export function QuestionSculpture({ className = "" }: VignetteProps) {
  return (
    <Vignette className={`question-sculpture ${className}`}>
      <svg viewBox="0 0 300 226" fill="none" focusable="false">
        <ellipse
          className="vignette-question-shadow"
          cx="155"
          cy="202"
          rx="80"
          ry="9"
          fill="#101710"
          fillOpacity=".1"
        />
        <path
          d="m34 177 20-6m-4 22 14-12"
          stroke="#101710"
          strokeOpacity=".25"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <g className="vignette-question-body">
          <path
            d="M103 64c0-53 92-56 92-2 0 31-45 31-45 64"
            stroke="#101710"
            strokeWidth="31"
            strokeLinecap="round"
            transform="translate(11 10)"
          />
          <path
            d="M103 64c0-53 92-56 92-2 0 31-45 31-45 64"
            stroke="#eff1dc"
            strokeWidth="32"
            strokeLinecap="round"
          />
          <path
            d="M103 64c0-53 92-56 92-2 0 31-45 31-45 64"
            stroke="#101710"
            strokeWidth="29"
            strokeLinecap="round"
          />
          <path
            d="M103 64c0-53 92-56 92-2 0 31-45 31-45 64"
            stroke="#85dbe7"
            strokeWidth="25"
            strokeLinecap="round"
          />
          <path
            d="M111 51c5-19 23-25 37-23"
            stroke="#eff1dc"
            strokeOpacity=".85"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <g className="vignette-question-dot">
            <rect
              x="140"
              y="161"
              width="30"
              height="30"
              rx="8"
              fill="#101710"
            />
            <rect
              x="131"
              y="153"
              width="30"
              height="30"
              rx="8"
              fill="#d8ff62"
              stroke="#101710"
              strokeWidth="1.3"
            />
            <path
              d="M138 158h9"
              stroke="#eff1dc"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </g>
        </g>
        <g className="vignette-question-flare">
          <path
            d="m239 92 4 13 13 4-13 4-4 13-4-13-13-4 13-4Z"
            fill="#df8f79"
          />
          <path
            d="M237 107h5m-2.5-2.5v5"
            stroke="#101710"
            strokeOpacity=".4"
            strokeLinecap="round"
          />
        </g>
        <path
          className="vignette-curiosity-line"
          d="M61 59C30 97 40 135 76 147"
          stroke="#101710"
          strokeOpacity=".4"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeDasharray="2 7"
        />
        <circle cx="64" cy="52" r="4" fill="#101710" />
      </svg>
    </Vignette>
  );
}
