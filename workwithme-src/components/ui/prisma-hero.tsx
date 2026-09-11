import { motion, useInView } from 'framer-motion';
import { ArrowDown, ArrowUpRight } from 'lucide-react';
import { useRef, type CSSProperties, type ReactNode } from 'react';
import { useMotionSettings } from '@/components/motion-settings';

// Adapted from the supplied Prisma hero: framed stage, bottom-aligned type,
// restrained supporting copy, and staggered word entrances.
export function WordsPullUp({ text, className = '', style }: { text: string; className?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const { enabled } = useMotionSettings();
  return <span ref={ref} className={`words-pull-up ${className}`} style={style}>
    {text.split(' ').map((word, i, words) => <motion.span key={`${word}-${i}`} initial={false} animate={enabled && !inView ? { y: 28, opacity: 0 } : { y: 0, opacity: 1 }} transition={{ duration: enabled ? .7 : 0, delay: enabled ? i * .08 : 0, ease: [.16, 1, .3, 1] }}>{word}{i < words.length - 1 ? '\u00a0' : ''}</motion.span>)}
  </span>;
}

export function PrismaHero({ background }: { background?: ReactNode }) {
  return <section className="prisma-hero" aria-labelledby="hero-title">
    <span className="header-sentinel" aria-hidden="true" />
    <div className="prisma-frame">
      <div className="prisma-backdrop" aria-hidden="true">{background}</div>
      <div className="prisma-vignette" aria-hidden="true" />
      <div className="prisma-topline"><span>SOFTWARE & AUTOMATION</span><span>HOUSTON, TX ↗</span></div>
      <div className="prisma-bottom">
        <h1 id="hero-title"><span className="prisma-pretitle"><WordsPullUp text="Make your business" /></span><WordsPullUp text="easier." className="prisma-word" /></h1>
        <div className="prisma-side"><p>Give your people more room to do their best work.</p><a className="prisma-cta" href="#contact">Book a free consultation<span><ArrowUpRight size={20} /></span></a><span className="prisma-small">20 minutes. One process. No obligation.</span></div>
      </div>
      <a href="#closer" className="prisma-scroll">A little less friction. A little more flow.<ArrowDown size={15} /></a>
    </div>
  </section>;
}
