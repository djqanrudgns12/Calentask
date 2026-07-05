import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Anniversary, OverlayEvent } from '@/utils/anniversaryCalculator';

/**
 * 데이터베이스에서 사용자의 기념일 설정을 가져와
 * 요청된 날짜 범위 내의 오버레이(가상 일정)를 계산하여 반환하는 훅
 */
export function useAnniversaryOverlay(rangeStart: string, rangeEnd: string) {
  const supabase = createClient();

  return useQuery<OverlayEvent[]>({
    queryKey: ['anniversaries', rangeStart, rangeEnd],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return [];

      const { data: anniversaries, error } = await supabase
        .from('anniversaries')
        .select('*')
        .eq('user_id', userData.user.id);

      if (error) {
        console.error('Failed to fetch anniversaries:', error);
        return [];
      }

      // lunar-javascript(음력 계산)를 초기 번들에서 분리하기 위해 지연 로딩
      const { calculateOverlays } = await import('@/utils/anniversaryCalculator');

      const start = new Date(rangeStart);
      const end = new Date(rangeEnd);
      let allOverlays: OverlayEvent[] = [];

      (anniversaries as Anniversary[]).forEach(ann => {
        const overlays = calculateOverlays(ann, start, end);
        allOverlays = [...allOverlays, ...overlays];
      });

      return allOverlays;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
