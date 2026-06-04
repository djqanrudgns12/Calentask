// yjs-sync.ts
// P2P sync is disabled.
// Archive data is now persisted to Supabase (server) and fetched on mount,
// so WebRTC-based local sync is no longer the source of truth.
// Re-enable this only after implementing conflict resolution between
// server data and P2P-received data.

// 불필요한 WebRTC 연결과 Yjs Document 생성을 제거하여
// 백그라운드 리소스 소모(시그널링 서버 통신 등)를 완전히 차단합니다.

export function initYjsSync() {
  // No-op: P2P sync disabled in favor of Supabase server sync
}
