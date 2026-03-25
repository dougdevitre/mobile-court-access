/**
 * OfflineIndicator
 *
 * Displays a visual indicator when the user is offline. Shows sync
 * status and pending changes count. Automatically hides when the
 * connection is restored and all changes are synced.
 */

import React from 'react';

export function OfflineIndicator() {
  // TODO: Subscribe to online/offline events
  // TODO: Display pending sync count
  // TODO: Show reconnection progress
  return <div className="offline-indicator" role="status" aria-live="polite" />;
}
