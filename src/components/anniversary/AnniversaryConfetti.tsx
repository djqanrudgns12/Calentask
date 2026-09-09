'use client'

import { useEffect, useState } from 'react';
import type { Options } from 'canvas-confetti';
import { useUpcomingAnniversary } from '@/hooks/useUpcomingAnniversary';

const loadConfetti = () => import('canvas-confetti');
let confettiModule: ReturnType<typeof loadConfetti> | undefined;

function fireConfetti(options: Options) {
  confettiModule ??= loadConfetti();
  void confettiModule.then(({ default: confetti }) => confetti(options));
}

export function AnniversaryConfetti() {
  const { data } = useUpcomingAnniversary();
  const [hasFired, setHasFired] = useState(false);

  useEffect(() => {
    // 마운트 후 오늘이 D-Day인 기념일이 있고 아직 폭죽을 터뜨리지 않았다면
    if (data?.isToday && !hasFired) {
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        fireConfetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: [data.event.hex_color || '#F43F5E', '#ffffff', '#FDE68A']
        });
        fireConfetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: [data.event.hex_color || '#F43F5E', '#ffffff', '#FDE68A']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };

      frame();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHasFired(true);
    }
  }, [data, hasFired]);

  return null;
}
