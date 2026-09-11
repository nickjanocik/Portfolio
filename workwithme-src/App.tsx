import { useEffect, useState } from "react";
import {
  ArrowDown,
  Pause,
  Play,
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
import { ScannerCardStream } from "@/components/ui/scanner-card-stream";
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
      <header className={`site-header design-header ${scrolled ? "header-scrolled" : ""}`}>
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
        <button type="button" className="motion-toggle" onClick={toggle} aria-pressed={!enabled} aria-label={enabled ? 'Pause animations' : 'Resume animations'}>{enabled ? <Pause size={14}/> : <Play size={14}/>}<span>{enabled ? 'Motion on' : 'Motion off'}</span></button>
      </header>
      <main id="main">
        <PrismaHero />
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
          motionEnabled={enabled}
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
          <div className="implementation-grid scanner-layout">
            <div className="implementation-copy">
              <h2 id="implementation-title">An answer is a start.<br /><span>A finished job is the point.</span></h2>
              <p className="concise-lead">Your employees shouldn’t have to become the connection between an AI tool and the rest of your business.</p>
              <details className="read-more"><summary>What does that look like?<Plus size={17}/></summary><div className="disclosure-copy"><p>{copy.implementation.prompt}</p><p>{copy.implementation.process}</p>{copy.implementation.body.map(p=><p key={p}>{p}</p>)}<p>{copy.implementation.closing}</p></div></details>
            </div>
            <ScannerCardStream />
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
