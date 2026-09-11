import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  Clock3,
  Mail,
  Check,
  LoaderCircle,
} from "lucide-react";
import {
  CALENDLY_URL,
  CONTACT_EMAIL,
  FORM_ENDPOINT,
  emailDraft,
} from "@/lib/contact";
import copy from "@/content.json";

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
          {state === "sending" ? "Sending…" : copy.contact.submit}
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
  return (
    <section
      id="contact"
      className="contact-section section-shell"
      aria-labelledby="contact-title"
    >
      <div className="contact-top">
        <p className="eyebrow">A BETTER WORKDAY STARTS WITH A CONVERSATION</p>
        <span className="contact-star" aria-hidden="true">
          ↗
        </span>
        <h2 id="contact-title">{copy.contact.heading}</h2>
        <div className="contact-intro">
          {copy.contact.body.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      </div>
      <div className="contact-layout">
        <div className="consultation-info">
          <span className="round-icon">
            <CalendarDays size={25} />
          </span>
          <h3>{copy.contact.primaryCta}</h3>
          <span className="duration">
            <Clock3 size={15} />
            20 minutes · One process · No obligation
          </span>
          <p>{copy.hero.ctaSupport}</p>
          {!CALENDLY_URL && (
            <a
              className="button primary"
              href={`mailto:${CONTACT_EMAIL}?subject=Free%20consultation&body=Hi%20Nick%2C%0A%0AI%E2%80%99d%20like%20to%20find%20a%20time%20for%20a%20free%2020-minute%20consultation.%0A%0AHere%E2%80%99s%20the%20process%20I%20have%20in%20mind%3A%20`}
            >
              Find a time by email <ArrowUpRight size={18} />
            </a>
          )}
          <div className="alternative-contact">
            <p>{copy.contact.alternative}</p>
            <a href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
              <ArrowUpRight size={15} />
            </a>
          </div>
        </div>
        <div className="contact-surface">
          {CALENDLY_URL ? (
            <>
              <CalendlyEmbed url={CALENDLY_URL} />
              <details className="email-alternative">
                <summary>
                  Prefer to send a note?
                  <Mail size={17} />
                </summary>
                <ContactForm />
              </details>
            </>
          ) : (
            <ContactForm />
          )}
        </div>
      </div>
    </section>
  );
}
