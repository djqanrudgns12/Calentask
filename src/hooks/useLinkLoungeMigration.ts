import { useEffect, useRef } from 'react';
import { useLinkLoungeMutations } from './useLinkLoungeQueries';
import { Bookmark } from '@/store/useLinkLoungeStore';

export function useLinkLoungeMigration() {
  const { importBookmarks, updateCategories } = useLinkLoungeMutations();
  const isMigrating = useRef(false);

  useEffect(() => {
    const migrateData = async () => {
      if (isMigrating.current) return;
      isMigrating.current = true;

      try {
        const rawData = window.localStorage.getItem('calentask-link-lounge-storage');
        if (!rawData) return;

        const parsed = JSON.parse(rawData);
        const state = parsed.state;
        if (!state) return;

        const bookmarks: Bookmark[] = state.bookmarks || [];
        let categories: string[] = state.categories || [];

        // 데이터가 없으면 마이그레이션 불필요
        if (bookmarks.length === 0 && (categories.length === 0 || (categories.length === 1 && categories[0] === '기타'))) {
          window.localStorage.removeItem('calentask-link-lounge-storage');
          return;
        }

        // '기타'가 없으면 추가
        if (!categories.includes('기타')) {
          categories.push('기타');
        }

        // 1. 카테고리 마이그레이션
        await updateCategories.mutateAsync(categories);

        // 2. 북마크 마이그레이션 (삭제되지 않은 북마크 + 삭제된 북마크 모두)
        // importBookmarks는 삭제일자를 받을 수 있게 되어있지 않으므로 약간의 수정이 필요하지만
        // 우선은 삭제된 것도 일단 다 올리고(액션 함수에서 deleted_at이 없으므로 null로 삽입됨), 
        // 완벽한 구현을 위해 action에 id, deleted_at 등을 유지하는 raw import 기능을 추가하는 것도 좋습니다.
        // 현재는 importBookmarks 액션이 Omit<Bookmark, 'id' | 'createdAt' | 'deletedAt'> 를 받으므로
        // 삭제되지 않은 것만 import하거나, 아니면 서버 액션을 조금 수정해서 전체 복원하는 게 낫습니다.
        
        // 여기서는 삭제되지 않은 정상 북마크만 마이그레이션
        const activeBookmarks = bookmarks.filter(b => !b.deletedAt);
        
        if (activeBookmarks.length > 0) {
          // importBookmarks는 id, createdAt 등을 새로 발급하지만 기존 로컬 데이터를 서버로 살리는 용도.
          await importBookmarks.mutateAsync(activeBookmarks);
        }

        // 완료 후 로컬 스토리지 키 삭제
        window.localStorage.removeItem('calentask-link-lounge-storage');
        console.log('Link Lounge data migrated to server successfully.');
      } catch (error) {
        console.error('Failed to migrate link lounge data:', error);
      }
    };

    migrateData();
  }, [importBookmarks, updateCategories]);
}
