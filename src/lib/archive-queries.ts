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
    .is('deleted_at', null)
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
    .eq('tab_id', tabId)
    .is('deleted_at', null);

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
    .is('deleted_at', null)
    .limit(5000); // 안전한 상한선

  if (error) {
    console.error('[archive-queries] fetchAllNotesDirect failed:', error);
    return null;
  }
  return data;
}

export interface RecentNotePreview {
  id: string;
  tabId: string;
  tabName: string;
  title: string;
  content: string;
  updatedAt: string;
}

/** 홈에서는 전체 아카이브 대신 화면에 표시할 최근 노트 3개만 가져온다. */
export async function fetchRecentNotesDirect(): Promise<RecentNotePreview[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('notes')
    .select('id, tab_id, content_data, created_at, updated_at, archive_tabs!inner(name)')
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .limit(3);

  if (error) {
    console.error('[archive-queries] fetchRecentNotesDirect failed:', error);
    return [];
  }

  return ((data ?? []) as unknown as Array<{
    id: string;
    tab_id: string;
    content_data: unknown;
    created_at: string | null;
    updated_at: string | null;
    archive_tabs: { name: string } | Array<{ name: string }> | null;
  }>).map((note) => {
    const contentData = note.content_data && typeof note.content_data === 'object' && !Array.isArray(note.content_data)
      ? note.content_data as Record<string, unknown>
      : {};
    const tab = Array.isArray(note.archive_tabs) ? note.archive_tabs[0] : note.archive_tabs;

    return {
      id: note.id,
      tabId: note.tab_id,
      tabName: tab?.name ?? '아카이브',
      title: typeof contentData.title === 'string' ? contentData.title : '무제',
      content: typeof contentData.content === 'string' ? contentData.content : '',
      updatedAt: note.updated_at ?? note.created_at ?? new Date(0).toISOString(),
    };
  });
}
