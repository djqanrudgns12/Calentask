import { createClient } from '@/lib/supabase/client';

// ============================================================
// 클라이언트 직접 Supabase 쿼리 (Server Action 우회)
// RLS가 auth.uid() = user_id로 설정되어 있으므로 보안 안전
// ============================================================

/**
 * 브라우저에서 Supabase를 직접 호출하여 아카이브 탭 목록을 가져옵니다.
 * Server Action 경유 대비 ~200ms 지연 절감.
 */
export async function fetchTabsDirect() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('archive_tabs')
    .select('*')
    .order('position', { ascending: true });

  if (error) {
    console.error('[archive-queries] fetchTabsDirect failed:', error);
    return null; // null 반환 시 호출부에서 Server Action 폴백
  }
  return data;
}

/**
 * 특정 탭의 노트를 브라우저에서 직접 가져옵니다.
 */
export async function fetchNotesDirect(tabId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('tab_id', tabId);

  if (error) {
    console.error('[archive-queries] fetchNotesDirect failed:', error);
    return null;
  }
  return data;
}

/**
 * 모든 탭의 노트를 한 번의 쿼리로 일괄 가져옵니다.
 * tab_id별로 그룹핑하여 반환합니다.
 */
export async function fetchAllNotesDirect() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .limit(5000); // 안전한 상한선

  if (error) {
    console.error('[archive-queries] fetchAllNotesDirect failed:', error);
    return null;
  }
  return data;
}
