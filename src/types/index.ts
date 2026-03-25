/**
 * Mobile Court Access — Shared Type Definitions
 */

/** Offline sync status */
export type SyncStatus = 'idle' | 'syncing' | 'error' | 'complete';

/** A queued mutation waiting to be synced */
export interface QueuedMutation {
  id: string;
  endpoint: string;
  method: 'POST' | 'PUT' | 'DELETE';
  payload: unknown;
  createdAt: Date;
  retryCount: number;
}

/** Voice command definition */
export interface VoiceCommand {
  pattern: string;
  description: string;
  handler: (transcript: string) => void;
}

/** Bandwidth mode */
export type BandwidthMode = 'normal' | 'low';

/** Device viewport category */
export type ViewportCategory = 'mobile' | 'tablet' | 'desktop';
