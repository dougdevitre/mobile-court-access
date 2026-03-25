/**
 * Example: Offline-Capable Court Filing Form
 *
 * Demonstrates how to build a form that works seamlessly offline.
 * When the user submits while offline, the mutation is queued in
 * IndexedDB and automatically replayed when connectivity returns.
 */

import React, { useState, FormEvent } from 'react';
import { useOfflineSync } from '../src/hooks/useOfflineSync';

/** Shape of a basic court filing submission */
interface FilingFormData {
  caseNumber: string;
  documentType: string;
  description: string;
  filingDate: string;
}

/**
 * OfflineFilingForm
 *
 * A mobile-friendly form that queues submissions when offline
 * and syncs them when connectivity returns. Shows real-time
 * status of the sync queue.
 */
export default function OfflineFilingForm() {
  const { isOnline, pendingCount, syncStatus, forceSync } = useOfflineSync();

  const [formData, setFormData] = useState<FilingFormData>({
    caseNumber: '',
    documentType: 'motion',
    description: '',
    filingDate: new Date().toISOString().split('T')[0],
  });

  const [submitted, setSubmitted] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // The Service Worker intercepts this request.
    // If online: forwarded to the API immediately.
    // If offline: queued in IndexedDB for later replay.
    const response = await fetch('/api/filings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    if (response.ok || response.status === 0 /* opaque offline response */) {
      setSubmitted(true);
      setFormData({
        caseNumber: '',
        documentType: 'motion',
        description: '',
        filingDate: new Date().toISOString().split('T')[0],
      });
    }
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 16 }}>
      {/* Connectivity Banner */}
      {!isOnline && (
        <div role="alert" style={{ background: '#fff3cd', padding: 12, borderRadius: 8, marginBottom: 16 }}>
          You are offline. Your filing will be saved and submitted when connectivity returns.
        </div>
      )}

      {/* Sync Status */}
      {pendingCount > 0 && (
        <div style={{ background: '#d1ecf1', padding: 12, borderRadius: 8, marginBottom: 16 }}>
          <strong>{pendingCount}</strong> filing(s) waiting to sync.
          {' '}
          {isOnline && syncStatus === 'idle' && (
            <button onClick={forceSync} style={{ marginLeft: 8 }}>
              Sync Now
            </button>
          )}
          {syncStatus === 'syncing' && <span> Syncing...</span>}
        </div>
      )}

      {/* Success Message */}
      {submitted && (
        <div role="status" style={{ background: '#d4edda', padding: 12, borderRadius: 8, marginBottom: 16 }}>
          Filing {isOnline ? 'submitted successfully' : 'queued for submission'}.
        </div>
      )}

      {/* Filing Form */}
      <form onSubmit={handleSubmit}>
        <h2>File a Court Document</h2>

        <label htmlFor="caseNumber" style={{ display: 'block', marginTop: 12 }}>
          Case Number
        </label>
        <input
          id="caseNumber"
          name="caseNumber"
          type="text"
          value={formData.caseNumber}
          onChange={handleChange}
          placeholder="e.g. 2025-CV-001234"
          required
          style={{ width: '100%', padding: 10, fontSize: 16 }}
        />

        <label htmlFor="documentType" style={{ display: 'block', marginTop: 12 }}>
          Document Type
        </label>
        <select
          id="documentType"
          name="documentType"
          value={formData.documentType}
          onChange={handleChange}
          style={{ width: '100%', padding: 10, fontSize: 16 }}
        >
          <option value="motion">Motion</option>
          <option value="petition">Petition</option>
          <option value="response">Response</option>
          <option value="affidavit">Affidavit</option>
          <option value="brief">Brief</option>
        </select>

        <label htmlFor="description" style={{ display: 'block', marginTop: 12 }}>
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Brief description of the filing..."
          rows={4}
          required
          style={{ width: '100%', padding: 10, fontSize: 16 }}
        />

        <label htmlFor="filingDate" style={{ display: 'block', marginTop: 12 }}>
          Filing Date
        </label>
        <input
          id="filingDate"
          name="filingDate"
          type="date"
          value={formData.filingDate}
          onChange={handleChange}
          required
          style={{ width: '100%', padding: 10, fontSize: 16 }}
        />

        <button
          type="submit"
          style={{
            marginTop: 20,
            width: '100%',
            padding: 14,
            fontSize: 18,
            fontWeight: 'bold',
            background: '#0d6efd',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          {isOnline ? 'Submit Filing' : 'Save Filing (Offline)'}
        </button>
      </form>
    </div>
  );
}
