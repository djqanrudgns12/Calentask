import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { useArchiveStore } from '@/store/useArchiveStore';

// 1. Create Yjs Document
export const ydoc = new Y.Doc();

// 2. Setup WebRTC Provider for P2P Sync (using a unique room name)
// This will connect devices on the same network or over public signaling servers.
export const provider = new WebrtcProvider('calentask-life-os-room-v1', ydoc);

// 3. Define Shared Types
export const yTabs = ydoc.getMap('tabs');
export const yItems = ydoc.getMap('items');

// 4. Synchronization Logic
let isSyncing = false;

export function initYjsSync() {
  // P2P sync is disabled.
  // Archive data is now persisted to Supabase (server) and fetched on mount,
  // so WebRTC-based local sync is no longer the source of truth.
  // Re-enable this only after implementing conflict resolution between
  // server data and P2P-received data.
}
