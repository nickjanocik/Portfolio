import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUpRight,
  ArrowRight,
  Check,
  FileText,
  GitMerge,
  Mouse,
  Plus,
  MessageSquare,
  Users,
  Blocks,
  ReceiptText,
  LifeBuoy,
} from "lucide-react";
import copy from "@/content.json";
import Booking from "@/components/booking";
import Possibilities from "@/components/possibilities";
import { useDepthMotion } from "@/components/depth-motion";
import GlyphPortal from "@/components/ui/glyph-portal";

function Workflow() {
  return (
    <div
      className="workflow-scene"
      aria-label="Illustrative workflow: approved notes become an invoice draft for your team to review"
    >
      <div className="scene-orbit orbit-one" />
      <div className="scene-orbit orbit-two" />
      <div className="scene-orbit orbit-three" />
      <div className="workflow-card notes-card">
        <div className="card-kicker">
          <FileText size={15} /> THE WORK IS DONE <span>01</span>
        </div>
        <h3>
          Job notes, meet
          <br />
          your next step.
        </h3>
        <div className="note-lines">
          <i />
          <i />
          <i />
        </div>
        <span className="tiny-tag">Approved job notes</span>
      </div>
      <div className="connection-node">
        <GitMerge size={26} />
      </div>
      <div className="workflow-card review-card">
        <div className="card-kicker">
          <span className="status-dot" /> READY FOR YOUR TEAM <span>02</span>
        </div>
        <h3>
          An invoice draft.
          <br />A little less busywork.
        </h3>
        <div className="review-line">
          <Check size={15} /> Approved prices matched
        </div>
        <div className="review-line">
          <Check size={15} /> Missing details flagged
        </div>
        <div className="review-bottom">
          People make the final call.
          <ArrowUpRight size={18} />
        </div>
      </div>
      <span className="scene-caption">
        ILLUSTRATIVE WORKFLOW <span>↗</span>
      </span>
    </div>
  );
}

export default function App() {
  const [scrolled, setScrolled] = useState(false);
  useDepthMotion();
  useEffect(() => {
    const hero = document.querySelector(".header-sentinel");
    const observer = new IntersectionObserver(
      ([entry]) => setScrolled(!entry.isIntersecting),
      { threshold: 0 },
    );
    if (hero) observer.observe(hero);
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        if (!window.location.hash) return;
        let id = window.location.hash.slice(1);
        try {
          id = decodeURIComponent(id);
        } catch {
          return;
        }
        document.getElementById(id)?.scrollIntoView({ block: "start" });
      });
    });
    return () => {
      observer.disconnect();
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
    };
  }, []);
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className={`site-header ${scrolled ? "header-scrolled" : ""}`}>
        <a
          className="brand"
          href="/workwithme/"
          aria-label="Work with Nick, home"
        >
          <span className="brand-mark">
            n<span>j</span>
            <i />
          </span>
          <span>
            nick janocik
            <span className="brand-caption">
              SOFTWARE. WITH PEOPLE IN MIND.
            </span>
          </span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#possibilities">The possibilities</a>
          <a href="#approach">The approach</a>
          <a className="header-cta" href="#contact">
            Let’s talk <ArrowUpRight size={16} />
          </a>
        </nav>
      </header>
      <main id="main">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-grid" />
          <span className="header-sentinel" aria-hidden="true" />
          <div className="hero-inner">
            <div className="hero-copy">
              <p className="eyebrow">
                <span className="status-dot" /> SOFTWARE & AUTOMATION FOR
                HOUSTON BUSINESSES
              </p>
              <h1 id="hero-title">
                Make your business
                <br />
                <span>easier to run.</span>
              </h1>
              <p className="hero-subtitle">
                Give your people more room
                <br />
                to do their best work.
              </p>
              <p className="hero-lead">
                Your team has better things to do than enter the same
                information twice, chase down paperwork, and work around
                software that doesn’t quite fit.
              </p>
              <div className="hero-actions">
                <a className="button primary" href="#contact">
                  Book a free consultation <ArrowUpRight size={19} />
                </a>
                <a className="text-link" href="#possibilities">
                  See what we could simplify <ArrowDown size={16} />
                </a>
              </div>
              <p className="cta-support">
                A 20-minute conversation about one part of your business. You
                don’t need a technical background or a project brief.
              </p>
            </div>
            <Workflow />
          </div>
          <div className="hero-foot">
            <span>
              <span className="status-dot" /> HOUSTON, TX · WORKING DIRECTLY
              WITH YOU
            </span>
            <a href="#closer">
              A little less friction. A little more flow.{" "}
              <ArrowDown size={16} />
            </a>
            <span className="hero-coordinate">01 / A BETTER WORKDAY</span>
          </div>
        </section>
        <section className="hero-note section-shell" id="closer">
          <span className="section-number">
            LET’S TAKE A CLOSER LOOK <ArrowDown size={18} />
          </span>
          <div>
            <p>
              I help you find the parts of your business that could work better,
              then build practical solutions around the way you actually
              operate. Sometimes that means AI. Sometimes it means connecting
              the tools you already have.
            </p>
            <p>
              The goal is to help your business move faster, make fewer
              avoidable mistakes, and make the workday a little less frustrating
              for everyone involved.
            </p>
          </div>
        </section>
        <GlyphPortal
          word="EASIER"
          interactive={true}
          scrollLength={1.2}
          fontFamily="Arial, sans-serif"
          fontWeight={900}
          enterLabel="Meet the person behind the work"
          className="easier-portal"
          style={{
            "--gp-paper": "#101310",
            "--gp-ink": "#d8ff62",
            "--gp-field": "#d8ff62",
            "--gp-foreground": "#151a11",
          }}
          background={<div className="portal-fill" />}
          front={
            <>
              <span className="portal-top">LESS REPETITION. MORE ROOM.</span>
              <p className="portal-sub">
                Good work deserves a better way through.
              </p>
              <span className="portal-scroll">
                <Mouse size={16} /> Scroll to step inside
              </span>
            </>
          }
        >
          <section id="nick" className="intro-content">
            <div className="intro-photo">
              <img
                src="/workwithme/images/nick.jpg"
                alt="Nick looking into a sunset, wearing a flannel shirt"
                width="640"
                height="960"
                loading="lazy"
              />
              <span className="photo-caption">
                NICK JANOCIK <span>Houston, Texas ↗</span>
              </span>
            </div>
            <div className="intro-copy">
              <p className="eyebrow">{copy.intro.eyebrow}</p>
              <h2>{copy.intro.heading}</h2>
              {copy.intro.body.map((p) => (
                <p key={p}>{p}</p>
              ))}
              <p className="intro-emphasis">{copy.intro.emphasis}</p>
            </div>
          </section>
        </GlyphPortal>
        <Possibilities />
        <section
          className="implementation section-shell depth-section"
          id="approach"
          aria-labelledby="implementation-title"
        >
          <p className="eyebrow">
            <span className="section-index">04</span>
            {copy.implementation.eyebrow}
          </p>
          <div className="implementation-grid">
            <div className="implementation-copy">
              <h2 id="implementation-title">{copy.implementation.heading}</h2>
              <div className="body-copy">
                {copy.implementation.body.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
            </div>
            <div className="prompt-process depth-panel">
              <div className="prompt-box">
                <span className="mini-label">
                  <MessageSquare size={16} /> A PROMPT
                </span>
                <p>{copy.implementation.prompt}</p>
                <span className="prompt-cursor" aria-hidden="true" />
              </div>
              <div className="process-bridge">
                <ArrowDown size={20} />
                <span>The useful part is what happens next.</span>
              </div>
              <div className="process-box">
                <span className="mini-label">
                  <GitMerge size={17} /> A PROCESS
                </span>
                <p>{copy.implementation.process}</p>
                <div className="process-chips">
                  <span>Approved information</span>
                  <ArrowRight size={14} />
                  <span>Validation</span>
                  <ArrowRight size={14} />
                  <span>Human review</span>
                </div>
                <span className="flow-disclaimer">
                  A proposed workflow we can design together
                </span>
              </div>
            </div>
          </div>
          <div className="implementation-bottom">
            <span className="large-asterisk" aria-hidden="true">
              ✳
            </span>
            <blockquote>{copy.implementation.emphasis}</blockquote>
            <p>{copy.implementation.closing}</p>
          </div>
        </section>
        <section
          className="experience section-shell"
          id="experience"
          aria-labelledby="experience-title"
        >
          <p className="eyebrow">
            <span className="section-index">05</span>
            {copy.experience.eyebrow}
          </p>
          <h2 id="experience-title">{copy.experience.heading}</h2>
          <div className="experience-list">
            {copy.experience.items.map((item, i) => (
              <article className="experience-item" key={item.title}>
                <span className="experience-number">
                  0{i + 1}
                  <ArrowUpRight size={21} />
                </span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
          <div className="experience-foot">
            <p>{copy.experience.closing}</p>
            <a className="text-link" href="https://nickjanocik.com">
              {copy.experience.link}
              <ArrowUpRight size={18} />
            </a>
          </div>
        </section>
        <section
          className="relationship section-shell depth-section"
          id="together"
          aria-labelledby="relationship-title"
        >
          <div className="relationship-intro">
            <p className="eyebrow">
              <span className="section-index">06</span>
              {copy.relationship.eyebrow}
            </p>
            <h2 id="relationship-title">{copy.relationship.heading}</h2>
            <div className="body-copy">
              {copy.relationship.body.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
            <div className="relationship-signature">
              <img
                src="/workwithme/images/nick.jpg"
                alt=""
                loading="lazy"
                width="48"
                height="48"
              />
              <span>
                One conversation.
                <br />
                <strong>One person to call.</strong>
              </span>
              <ArrowUpRight size={22} />
            </div>
          </div>
          <div className="commitments">
            {copy.relationship.items.map((item, i) => {
              const Icon = [Users, Blocks, ReceiptText, LifeBuoy][i];
              return (
                <article className="commitment depth-panel" key={item.title}>
                  <div className="commitment-top">
                    <Icon size={24} />
                    <span>0{i + 1}</span>
                  </div>
                  <h3>{item.title}</h3>
                  {item.body.map((p) => (
                    <p key={p}>{p}</p>
                  ))}
                </article>
              );
            })}
          </div>
        </section>
        <section
          className="start section-shell"
          id="start"
          aria-labelledby="start-title"
        >
          <div className="start-heading">
            <p className="eyebrow">
              <span className="section-index">07</span>
              {copy.start.eyebrow}
            </p>
            <h2 id="start-title">{copy.start.heading}</h2>
            <div className="start-intro">
              <div className="body-copy">
                {copy.start.body.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
              <p className="start-emphasis">
                {copy.start.emphasis}
                <ArrowDown size={30} />
              </p>
            </div>
          </div>
          <ol className="start-steps">
            {copy.start.steps.map((step, i) => (
              <li key={step.title}>
                <span className="step-count">0{i + 1}</span>
                <div>
                  <h3>{step.title}</h3>
                  {step.body.map((p) => (
                    <p key={p}>{p}</p>
                  ))}
                </div>
              </li>
            ))}
          </ol>
          <div className="offer-boundary">
            <div>
              <span className="offer-mark">
                <Check size={21} />
              </span>
              <a className="button dark-button" href="#contact">
                {copy.start.cta}
                <ArrowUpRight size={19} />
              </a>
            </div>
            <p>{copy.start.boundary}</p>
          </div>
        </section>
        <section className="faq section-shell" aria-labelledby="faq-title">
          <div className="faq-heading">
            <p className="eyebrow">
              <span className="section-index">08</span>GOOD QUESTIONS
            </p>
            <h2 id="faq-title">{copy.faq.heading}</h2>
          </div>
          <div className="faq-list">
            {copy.faq.items.map((item, i) => (
              <details key={item.question}>
                <summary>
                  <span className="faq-number">0{i + 1}</span>
                  <span>{item.question}</span>
                  <Plus size={20} aria-hidden="true" />
                </summary>
                <div className="faq-answer">
                  {item.answer.map((p) => (
                    <p key={p}>{p}</p>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </section>
        <Booking />
      </main>
      <footer className="site-footer">
        <div className="footer-top">
          <a className="brand" href="/workwithme/">
            <span className="brand-mark">
              n<span>j</span>
              <i />
            </span>
            <span>
              nick janocik
              <span className="brand-caption">
                SOFTWARE. WITH PEOPLE IN MIND.
              </span>
            </span>
          </a>
          <a href="#main" className="back-top">
            Back to the beginning <ArrowUpRight size={18} />
          </a>
        </div>
        <div className="footer-word" aria-hidden="true">
          less friction.
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Nick Janocik</span>
          <span>Houston, Texas</span>
          <a href="https://nickjanocik.com">
            The personal side <ArrowUpRight size={14} />
          </a>
        </div>
      </footer>
    </>
  );
}
