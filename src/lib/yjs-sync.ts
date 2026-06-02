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
  // Subscribe to Zustand changes -> Push to Yjs
  useArchiveStore.subscribe((state, prevState) => {
    if (isSyncing) return;
    
    // Only push if there's a difference to avoid infinite loops
    if (state.tabs !== prevState.tabs) {
      isSyncing = true;
      ydoc.transact(() => {
        yTabs.set('data', JSON.stringify(state.tabs));
      });
      isSyncing = false;
    }

    if (state.items !== prevState.items) {
      isSyncing = true;
      ydoc.transact(() => {
        yItems.set('data', JSON.stringify(state.items));
      });
      isSyncing = false;
    }
  });

  // Subscribe to Yjs changes -> Push to Zustand
  yTabs.observe(() => {
    if (isSyncing) return;
    const data = yTabs.get('data') as string;
    if (data) {
      isSyncing = true;
      useArchiveStore.getState().setTabs(JSON.parse(data));
      isSyncing = false;
    }
  });

  yItems.observe(() => {
    if (isSyncing) return;
    const data = yItems.get('data') as string;
    if (data) {
      isSyncing = true;
      // We don't have a bulk setItems action, but we can update the store directly
      useArchiveStore.setState({ items: JSON.parse(data) });
      isSyncing = false;
    }
  });
}
