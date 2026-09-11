import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

const MotionContext = createContext({ enabled: true, toggle: () => {} });

export function MotionProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setEnabled(!media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle('motion-paused', !enabled);
    return () => document.documentElement.classList.remove('motion-paused');
  }, [enabled]);
  return <MotionContext value={{ enabled, toggle: () => setEnabled(value => !value) }}>{children}</MotionContext>;
}

export function useMotionSettings() { return useContext(MotionContext); }
