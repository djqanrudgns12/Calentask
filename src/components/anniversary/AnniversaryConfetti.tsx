'use client'

import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { useUpcomingAnniversary } from '@/hooks/useUpcomingAnniversary';

export function AnniversaryConfetti() {
  const { data } = useUpcomingAnniversary();
  const [hasFired, setHasFired] = useState(false);

  useEffect(() => {
    // 마운트 후 오늘이 D-Day인 기념일이 있고 아직 폭죽을 터뜨리지 않았다면
    if (data?.isToday && !hasFired) {
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: [data.event.hex_color || '#F43F5E', '#ffffff', '#FDE68A']
        });
        confetti({
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
      setHasFired(true);
    }
  }, [data, hasFired]);

  return null;
}
