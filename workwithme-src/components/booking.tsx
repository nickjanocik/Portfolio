import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowUpRight, Mail, Check, LoaderCircle } from "lucide-react";
import {
  CALENDLY_URL,
  CONTACT_EMAIL,
  FORM_ENDPOINT,
  emailDraft,
} from "@/lib/contact";
import copy from "@/content.json";
import TubesCursor from "@/components/ui/tubes-cursor";

function CalendlyEmbed({ url }: { url: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [scheduled, setScheduled] = useState(false);
  const source = new URL(url);
  source.searchParams.set("embed_domain", window.location.hostname);
  source.searchParams.set("embed_type", "Inline");
  source.searchParams.set("background_color", "f2f3eb");
  source.searchParams.set("text_color", "192016");
  source.searchParams.set("primary_color", "496b16");
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (
        event.origin !== "https://calendly.com" ||
        event.source !== frame.current?.contentWindow
      )
        return;
      if (event.data?.event === "calendly.event_scheduled") setScheduled(true);
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, []);
  return (
    <div className="scheduler">
      {scheduled && (
        <p className="booking-confirmation" role="status">
          <Check size={18} /> Your consultation is booked. Check your email for
          the details.
        </p>
      )}
      <iframe
        ref={frame}
        src={source.href}
        title="Book a free 20-minute consultation with Nick through Calendly"
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
      />
      <p className="scheduler-fallback">
        Having trouble with the calendar?{" "}
        <a href={url} target="_blank" rel="noopener noreferrer">
          Open the booking page <ArrowUpRight size={14} />
        </a>
      </p>
    </div>
  );
}

function ContactForm() {
  const [state, setState] = useState<
    "idle" | "sending" | "sent" | "draft" | "error"
  >("idle");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "sending") return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const fields = {
      name: String(data.get("name") ?? ""),
      email: String(data.get("email") ?? ""),
      business: String(data.get("business") ?? ""),
      message: String(data.get("message") ?? ""),
    };
    if (!FORM_ENDPOINT) {
      window.location.href = emailDraft(fields);
      setState("draft");
      return;
    }
    setState("sending");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    try {
      const result = await fetch(FORM_ENDPOINT, {
        method: "POST",
        body: JSON.stringify(fields),
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        signal: controller.signal,
      });
      const receipt = await result.json();
      if (!result.ok || receipt.ok !== true)
        throw new Error("No confirmed receipt");
      setState("sent");
      form.reset();
    } catch {
      setState("error");
    } finally {
      clearTimeout(timeout);
    }
  }
  return (
    <form className="contact-form" onSubmit={submit}>
      <div className="form-heading">
        <Mail size={19} />
        <h3>A note is a good place to start.</h3>
      </div>
      <div className="form-row">
        <label htmlFor="contact-name">
          Name
          <input
            id="contact-name"
            name="name"
            autoComplete="name"
            required
            maxLength={100}
          />
        </label>
        <label htmlFor="contact-email">
          Work email
          <input
            id="contact-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
          />
        </label>
      </div>
      <label htmlFor="contact-business">
        Business
        <input
          id="contact-business"
          name="business"
          autoComplete="organization"
          maxLength={160}
        />
      </label>
      <label htmlFor="contact-message">
        What keeps taking more effort than it should?
        <textarea
          id="contact-message"
          name="message"
          rows={4}
          required
          maxLength={3000}
          aria-describedby="message-help"
        />
      </label>
      <p className="form-helper" id="message-help">
        {copy.contact.helper}
      </p>
      <div className="form-action">
        <button
          type="submit"
          className="button dark-button"
          disabled={state === "sending"}
        >
          {state === "sending"
            ? "Sending…"
            : FORM_ENDPOINT
              ? copy.contact.submit
              : "Prepare an email"}
          {state === "sending" ? (
            <LoaderCircle size={17} className="spin" />
          ) : (
            <ArrowUpRight size={18} />
          )}
        </button>
        {!FORM_ENDPOINT && (
          <p className="form-mode">
            Opens your email app.
            <br />
            Review your note, then send.
          </p>
        )}
      </div>
      <div aria-live="polite" aria-atomic="true" className="form-status">
        {state === "sent" && <p>{copy.contact.success}</p>}
        {state === "draft" && (
          <p>
            Your email draft is ready to send in your email app. If it didn’t
            open, email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
            Your note hasn’t been sent by this page.
          </p>
        )}
        {state === "error" && (
          <p>
            We couldn’t confirm that your note was received. Please try again or
            email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </p>
        )}
      </div>
    </form>
  );
}

export default function Booking() {
  const [showCalendar, setShowCalendar] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (showCalendar) calendarRef.current?.focus();
  }, [showCalendar]);
  return (
    <section
      id="contact"
      className="contact-section closing-section"
      aria-labelledby="contact-title"
    >
      <div className="contact-invitation">
        <TubesCursor />
        <p className="closing-eyebrow">
          A LITTLE LESS FRICTION. A LOT MORE POSSIBILITY.
        </p>
        <div className="closing-copy">
          <h2 id="contact-title">
            What could
            <br />
            <span>be easier?</span>
          </h2>
          <p>
            You don’t need a solution in mind.
            <br />
            That’s something we can work out together.
          </p>
          {CALENDLY_URL ? (
            <button
              type="button"
              className="prisma-cta"
              aria-expanded={showCalendar}
              aria-controls="consultation-calendar"
              onClick={() => setShowCalendar(true)}
            >
              {copy.contact.primaryCta}
              <span>
                <ArrowUpRight size={19} />
              </span>
            </button>
          ) : (
            <a
              className="prisma-cta"
              href={`mailto:${CONTACT_EMAIL}?subject=Free%20consultation&body=Hi%20Nick%2C%0A%0AI%E2%80%99d%20like%20to%20find%20a%20time%20for%20a%20free%2020-minute%20consultation.%0A%0AHere%E2%80%99s%20the%20process%20I%20have%20in%20mind%3A%20`}
            >
              Find a time by email
              <span>
                <ArrowUpRight size={19} />
              </span>
            </a>
          )}
          <span className="closing-small">
            20 minutes. One process. No obligation.
          </span>
        </div>
        <div className="closing-bottom">
          <span>LET’S MAKE ROOM FOR BETTER WORK.</span>
          <span className="tube-pointer-hint">
            Move your cursor. Follow the possibilities. ↗
          </span>
        </div>
      </div>
      <div className="closing-contact-options">
        {CALENDLY_URL && (
          <div
            id="consultation-calendar"
            ref={calendarRef}
            className="contact-surface closing-calendar"
            hidden={!showCalendar}
            tabIndex={-1}
          >
            {showCalendar && <CalendlyEmbed url={CALENDLY_URL} />}
          </div>
        )}
        <details className="email-alternative closing-note">
          <summary>
            Prefer to send a note?
            <Mail size={17} aria-hidden="true" />
          </summary>
          <div className="closing-note-intro">
            <h3>{copy.contact.heading}</h3>
            {copy.contact.body.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
          <div className="contact-surface">
            <ContactForm />
          </div>
        </details>
        <a className="closing-email" href={`mailto:${CONTACT_EMAIL}`}>
          {CONTACT_EMAIL}
          <ArrowUpRight size={14} />
        </a>
      </div>
    </section>
  );
}
