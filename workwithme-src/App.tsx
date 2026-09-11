import { useEffect, useState } from "react";
import { Pause, Play, ArrowUpRight, Check, Mouse, Plus } from "lucide-react";
import copy from "@/content.json";
import Booking from "@/components/booking";
import Possibilities from "@/components/possibilities";
import { useDepthMotion } from "@/components/depth-motion";
import { ScannerCardStream } from "@/components/ui/scanner-card-stream";
import { FloatingParticles } from "@/components/ui/floating-particles";
import { PrismaHero } from "@/components/ui/prisma-hero";
import { useMotionSettings } from "@/components/motion-settings";
import GlyphPortal from "@/components/ui/glyph-portal";

export default function App() {
  const { enabled, toggle } = useMotionSettings();
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
      <header
        className={`site-header design-header ${scrolled ? "header-scrolled" : ""}`}
      >
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
        <button
          type="button"
          className="motion-toggle"
          onClick={toggle}
          aria-pressed={!enabled}
          aria-label={enabled ? "Pause animations" : "Resume animations"}
        >
          {enabled ? <Pause size={14} /> : <Play size={14} />}
          <span>{enabled ? "Motion on" : "Motion off"}</span>
        </button>
      </header>
      <main id="main">
        <PrismaHero background={<FloatingParticles />} />
        <div id="closer" className="portal-chapter">
          <GlyphPortal
            word="FLOW"
            motionEnabled={enabled}
            interactive={true}
            scrollLength={1.2}
            fontFamily="Arial, sans-serif"
            fontWeight={900}
            enterLabel="Meet Nick"
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
                <p className="eyebrow">THE PERSON YOU’LL BE WORKING WITH</p>
                <h2>
                  I’m Nick.
                  <br />
                  Let’s make work
                  <br />
                  work better.
                </h2>
                <p>
                  Houston-based software engineer. Texas A&M grad. Curious about
                  how your business actually works.
                </p>
                <p className="intro-emphasis">{copy.intro.emphasis}</p>
                <details className="read-more">
                  <summary>
                    A little more about me
                    <Plus size={16} />
                  </summary>
                  <div className="disclosure-copy">
                    <p>{copy.intro.heading}</p>
                    {copy.intro.body.map((p) => (
                      <p key={p}>{p}</p>
                    ))}
                    {copy.hero.body.map((p) => (
                      <p key={p}>{p}</p>
                    ))}
                  </div>
                </details>
              </div>
            </section>
          </GlyphPortal>
        </div>
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
          <div className="implementation-grid scanner-layout">
            <div className="implementation-copy">
              <h2 id="implementation-title">
                An answer is a start.
                <br />
                <span>A finished job is the point.</span>
              </h2>
              <p className="concise-lead">
                Your employees shouldn’t have to become the connection between
                an AI tool and the rest of your business.
              </p>
              <details className="read-more">
                <summary>
                  What does that look like?
                  <Plus size={17} />
                </summary>
                <div className="disclosure-copy">
                  <p>{copy.implementation.prompt}</p>
                  <p>{copy.implementation.process}</p>
                  {copy.implementation.body.map((p) => (
                    <p key={p}>{p}</p>
                  ))}
                  <p>{copy.implementation.closing}</p>
                </div>
              </details>
            </div>
            <ScannerCardStream />
          </div>
        </section>
        <section
          className="trust-section section-shell"
          id="experience"
          aria-labelledby="trust-title"
        >
          <div>
            <p className="eyebrow">BUILT AROUND PEOPLE</p>
            <h2 id="trust-title">
              One conversation.
              <br />
              One person to call.
            </h2>
            <p>You’ll work directly with the person building it.</p>
            <a className="text-link" href="https://nickjanocik.com">
              More about my background
              <ArrowUpRight size={16} />
            </a>
          </div>
          <div className="trust-details">
            <details className="read-more">
              <summary>
                The work behind this
                <Plus size={18} />
              </summary>
              <div className="disclosure-copy">
                <p>{copy.experience.heading}</p>
                {copy.experience.items.map((item) => (
                  <div key={item.title}>
                    <h3>{item.title}</h3>
                    <p>{item.body}</p>
                  </div>
                ))}
                <p>{copy.experience.closing}</p>
              </div>
            </details>
            <details className="read-more" id="together">
              <summary>
                What working together looks like
                <Plus size={18} />
              </summary>
              <div className="disclosure-copy">
                {copy.relationship.body.map((p) => (
                  <p key={p}>{p}</p>
                ))}
                {copy.relationship.items.map((item) => (
                  <div key={item.title}>
                    <h3>{item.title}</h3>
                    {item.body.map((p) => (
                      <p key={p}>{p}</p>
                    ))}
                  </div>
                ))}
              </div>
            </details>
          </div>
        </section>
        <section
          className="start section-shell"
          id="start"
          aria-labelledby="start-title"
        >
          <div className="start-heading">
            <p className="eyebrow">LET’S START SMALL</p>
            <h2 id="start-title">
              A little proof.
              <br />
              Before a big commitment.
            </h2>
            <p className="start-short">
              Let me earn your trust on a job you’ve already finished.
            </p>
          </div>
          <ol className="compact-steps">
            {copy.start.steps.map((step, i) => (
              <li key={step.title}>
                <details>
                  <summary>
                    <span className="step-count">0{i + 1}</span>
                    <span>
                      {
                        [
                          "Talk it through.",
                          "Try a small test.",
                          "Keep two back.",
                          "You decide.",
                        ][i]
                      }
                    </span>
                    <Plus size={18} />
                  </summary>
                  <div className="disclosure-copy">
                    <h3>{step.title}</h3>
                    {step.body.map((p) => (
                      <p key={p}>{p}</p>
                    ))}
                  </div>
                </details>
              </li>
            ))}
          </ol>
          <details className="read-more start-rationale">
            <summary>
              Why start this way?
              <Plus size={16} />
            </summary>
            <div className="disclosure-copy">
              {copy.start.body.map((p) => (
                <p key={p}>{p}</p>
              ))}
              <p>{copy.start.emphasis}</p>
            </div>
          </details>
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
