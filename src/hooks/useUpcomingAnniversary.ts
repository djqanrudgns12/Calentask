import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Anniversary, OverlayEvent } from '@/utils/anniversaryCalculator';
import { startOfDay, addDays, differenceInDays } from 'date-fns';

export function useUpcomingAnniversary() {
  const supabase = createClient();

  return useQuery({
    queryKey: ['upcoming-anniversary'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;

      const { data: anniversaries, error } = await supabase
        .from('anniversaries')
        .select('*')
        .eq('user_id', userData.user.id);

      if (error || !anniversaries || anniversaries.length === 0) {
        return null;
      }

      // lunar-javascript(음력 계산)를 초기 번들에서 분리하기 위해 지연 로딩
      const { calculateOverlays } = await import('@/utils/anniversaryCalculator');

      const today = startOfDay(new Date());
      // 앞으로 1년치 검색
      const oneYearLater = addDays(today, 365);
      
      let allOverlays: OverlayEvent[] = [];
      (anniversaries as Anniversary[]).forEach(ann => {
        // 사이드바 표시 여부 체크 (undefined면 true로 간주)
        if (ann.calculation_rule?.options?.show_in_sidebar === false) {
          return;
        }
        const overlays = calculateOverlays(ann, today, oneYearLater);
        allOverlays = [...allOverlays, ...overlays];
      });

      // 오늘 이후의 이벤트 중 가장 가까운 이벤트 찾기
      const futureEvents = allOverlays
        .filter(event => new Date(event.start_time) >= today)
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

      if (futureEvents.length === 0) return null;

      const nearestEvent = futureEvents[0];
      const eventDate = startOfDay(new Date(nearestEvent.start_time));
      const daysLeft = differenceInDays(eventDate, today);

      return {
        event: nearestEvent,
        daysLeft,
        isToday: daysLeft === 0
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
