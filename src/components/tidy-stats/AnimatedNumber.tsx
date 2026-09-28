'use client';

import { useLayoutEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import motion from './TidyStatsMotion.module.css';

const DURATION_MS = 700;
const easeOut = (t: number) => 1 - (1 - t) ** 3;

/**
 * 처음에는 0부터, 이후에는 화면에 보이던 값부터 새 값까지 세고 바뀐 값을 잠깐 강조한다.
 * 프레임마다 React 렌더를 일으키지 않도록 글자는 DOM에 직접 쓴다. 화면 낭독기는 최종 값만 읽는다.
 * format은 렌더마다 새로 만들지 않는 함수를 넘긴다.
 */
export function AnimatedNumber({ value, format, className = '' }: { value: number | null; format: (value: number | null) => string; className?: string }) {
  const text = useRef<HTMLSpanElement>(null);
  const box = useRef<HTMLSpanElement>(null);
  const displayed = useRef<number | null>(null);
  const reduced = !!useReducedMotion();

  // 그리기 전에 첫 프레임을 써서 최종 값이 잠깐 보였다가 다시 세는 깜빡임을 막는다.
  useLayoutEffect(() => {
    const node = text.current;
    if (!node) return;
    const from = displayed.current;
    if (value === null || reduced || from === value) {
      node.textContent = format(value);
      displayed.current = value;
      return;
    }
    if (from !== null && box.current) {
      box.current.dataset.flash = 'false';
      void box.current.offsetWidth;   // 같은 강조 애니메이션을 처음부터 다시 시작한다
      box.current.dataset.flash = 'true';
    }
    const start = from ?? 0;
    const started = performance.now();
    let frame = 0;
    const step = (at: number) => {
      const t = Math.min(1, (at - started) / DURATION_MS);
      const current = t === 1 ? value : Math.round(start + (value - start) * easeOut(t));
      displayed.current = current;
      node.textContent = format(current);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    node.textContent = format(start);
    frame = requestAnimationFrame(step);
    // 중간에 값이 바뀌면 지금 보이는 값에서 이어서 센다.
    return () => cancelAnimationFrame(frame);
  }, [value, reduced, format]);

  return <span ref={box} className={`${motion.number} ${className}`}>
    <span ref={text} aria-hidden="true" />
    <span className="sr-only">{format(value)}</span>
  </span>;
}
