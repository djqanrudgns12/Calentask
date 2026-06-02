import Dexie, { Table } from 'dexie';

// Define the database structure
export class ArchiveDatabase extends Dexie {
  store!: Table<{ id: string; value: string }, string>;

  constructor() {
    super('ArchiveDatabase');
    this.version(1).stores({
      store: 'id' // Primary key
    });
  }
}

export const db = new ArchiveDatabase();

// Zustand 커스텀 비동기 스토리지 엔진 (Dexie 기반)
export const dexieStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      if (typeof window === 'undefined') return null;

      // 1. 기존 LocalStorage 데이터 안전망(Migration & Backup) 검사
      const localData = localStorage.getItem(name);
      if (localData) {
        console.info(`[Migration] Found existing data for ${name} in LocalStorage. Migrating to Dexie...`);
        // 손실 방지를 위해 백업본 생성
        localStorage.setItem(`${name}-backup-${Date.now()}`, localData);
        
        // Dexie로 마이그레이션
        await db.store.put({ id: name, value: localData });
        
        // 메인 LocalStorage 키 삭제 (이후부터는 Dexie 사용)
        localStorage.removeItem(name);
        return localData;
      }

      // 2. 평상시 Dexie에서 데이터 로드
      const record = await db.store.get(name);
      return record ? record.value : null;
    } catch (error) {
      console.error('[Dexie Storage] Failed to get item:', error);
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await db.store.put({ id: name, value });
    } catch (error) {
      console.error('[Dexie Storage] Failed to set item:', error);
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await db.store.delete(name);
    } catch (error) {
      console.error('[Dexie Storage] Failed to remove item:', error);
    }
  },
};
