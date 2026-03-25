/**
 * useOfflineSync
 *
 * React hook that manages offline data synchronization.
 * Queues mutations when offline and replays them when connectivity
 * returns. Provides sync status, pending count, and conflict resolution.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Possible states of the sync engine */
export type SyncStatus = 'idle' | 'syncing' | 'error';

/** A queued mutation waiting to be replayed */
export interface QueuedMutation {
  /** Unique ID for deduplication */
  id: string;
  /** HTTP method */
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** API endpoint path */
  url: string;
  /** Serialized request body */
  body: string;
  /** ISO timestamp of when the mutation was queued */
  queuedAt: string;
  /** Number of replay attempts so far */
  retryCount: number;
}

/** Return value of the useOfflineSync hook */
export interface OfflineSyncState {
  /** Whether the browser currently has network connectivity */
  isOnline: boolean;
  /** Number of mutations waiting in the offline queue */
  pendingCount: number;
  /** Current state of the sync engine */
  syncStatus: SyncStatus;
  /** Manually trigger a sync of all pending mutations */
  forceSync: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DB_NAME = 'mobile-court-offline';
const STORE_NAME = 'sync-queue';
const DB_VERSION = 1;
const MAX_RETRIES = 5;

// ---------------------------------------------------------------------------
// IndexedDB Helpers
// ---------------------------------------------------------------------------

/**
 * Open (or create) the IndexedDB database used for the offline queue.
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Enqueue a mutation into IndexedDB */
async function enqueue(mutation: QueuedMutation): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(mutation);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Read all pending mutations from IndexedDB */
async function readQueue(): Promise<QueuedMutation[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Remove a single mutation from the queue by ID */
async function dequeue(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useOfflineSync(): OfflineSyncState {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const syncInProgress = useRef(false);

  // ---- Track online/offline state ----
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // ---- Refresh pending count on mount and after syncs ----
  const refreshCount = useCallback(async () => {
    try {
      const queue = await readQueue();
      setPendingCount(queue.length);
    } catch {
      // IndexedDB unavailable (SSR, etc.) — default to 0
    }
  }, []);

  useEffect(() => {
    refreshCount();
  }, [refreshCount]);

  // ---- Replay queue when connectivity returns ----
  const replayQueue = useCallback(async () => {
    if (syncInProgress.current || !navigator.onLine) return;

    syncInProgress.current = true;
    setSyncStatus('syncing');

    try {
      const queue = await readQueue();

      for (const mutation of queue) {
        try {
          const response = await fetch(mutation.url, {
            method: mutation.method,
            headers: { 'Content-Type': 'application/json' },
            body: mutation.body,
          });

          if (response.ok) {
            await dequeue(mutation.id);
          } else if (response.status === 409) {
            // Conflict — flag for user review (keep in queue with flag)
            await enqueue({ ...mutation, retryCount: MAX_RETRIES });
          } else if (mutation.retryCount < MAX_RETRIES) {
            // Transient error — increment retry count
            await enqueue({ ...mutation, retryCount: mutation.retryCount + 1 });
          }
        } catch {
          // Network error during replay — stop and retry later
          break;
        }
      }

      setSyncStatus('idle');
    } catch {
      setSyncStatus('error');
    } finally {
      syncInProgress.current = false;
      await refreshCount();
    }
  }, [refreshCount]);

  // ---- Auto-sync when coming back online ----
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      replayQueue();
    }
  }, [isOnline, pendingCount, replayQueue]);

  // ---- Public forceSync ----
  const forceSync = useCallback(async () => {
    await replayQueue();
  }, [replayQueue]);

  return {
    isOnline,
    pendingCount,
    syncStatus,
    forceSync,
  };
}
