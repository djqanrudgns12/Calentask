import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { createStatsEngine, type Schedule } from './engine';
import { isAllowedUser, TIDY_STATS_OWNER_USERNAME, type StatsData, type StatsInput } from './model';
import { runQuery, StatsError } from './transport';

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export async function canUserViewTidyStats(
  supabase: SupabaseServerClient,
  user: { id: string; email?: string | null } | null | undefined,
): Promise<boolean> {
  if (!user || !isAllowedUser(user.id, process.env.TIDY_STATS_ALLOWED_USER_IDS)) return false;
  if (user.email?.endsWith('@calentask.com') && user.email.toLowerCase() !== `${TIDY_STATS_OWNER_USERNAME}@calentask.com`) {
    return false;
  }
  const { data: profile, error } = await supabase
    .from('users')
    .select('username')
    .eq('id', user.id)
    .single();
  if (error || !profile) return false;
  return isAllowedUser(user.id, process.env.TIDY_STATS_ALLOWED_USER_IDS, profile.username);
}

export async function requireStatsUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new StatsError('UNAUTHENTICATED', '다시 로그인한 뒤 통계를 열어 주세요.', 401);
  if (!process.env.TIDY_STATS_ALLOWED_USER_IDS?.trim()) throw new StatsError('SETUP_REQUIRED', '통계 열람 계정 설정이 필요합니다. 배포 안내의 TIDY_STATS_ALLOWED_USER_IDS를 등록해 주세요.', 503);
  if (!(await canUserViewTidyStats(supabase, user))) throw new StatsError('FORBIDDEN', '이 계정에는 Tidy Task 통계 열람 권한이 없습니다.', 403);
  return user;
}

// 인스턴스 수명 동안 캐시·진행 중 계산·동시 실행 제한을 공유한다.
const engine = createStatsEngine({ run: runQuery });

export async function getStats(input: StatsInput, schedule?: Schedule): Promise<StatsData> {
  const key = process.env.POSTHOG_PERSONAL_API_KEY?.trim();
  const project = process.env.POSTHOG_PROJECT_ID?.trim();
  if (!key || !project || !/^\d+$/.test(project)) throw new StatsError('SETUP_REQUIRED', 'PostHog 연결 설정이 필요합니다. POSTHOG_PERSONAL_API_KEY와 POSTHOG_PROJECT_ID를 등록해 주세요.', 503);
  return engine.getSnapshot({ key, project }, input, schedule);
}
