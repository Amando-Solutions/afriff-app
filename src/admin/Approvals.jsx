import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { COLLECTIONS, getField } from './schema.js';
import { approveChange, rejectChange, useChanges } from './data.js';

const show = (v) => {
  if (v === true) return 'Yes';
  if (v === false) return 'No';
  if (v == null || v === '') return '—';
  return String(v);
};

// Only the fields that differ between the live version and the proposed one
function Diff({ change }) {
  const fields = COLLECTIONS[change.collection]?.fields || [];
  if (change.action === 'delete') return <p className="ad-diff-delete">Delete this item.</p>;
  const rows = fields
    .map((f) => ({ f, before: getField(change.before, f.key), after: getField(change.data, f.key) }))
    .filter(({ before, after }) => show(before) !== show(after));
  if (rows.length === 0) return <p className="muted small">No visible changes.</p>;
  return (
    <dl className="ad-diff">
      {rows.map(({ f, before, after }) => (
        <div key={f.key} className="ad-diff-row">
          <dt>{f.label}</dt>
          {change.action === 'update' && <dd className="ad-diff-before">{show(before)}</dd>}
          <dd className="ad-diff-after">{show(after)}</dd>
        </div>
      ))}
    </dl>
  );
}

const when = (ts) => (ts?.seconds ? new Date(ts.seconds * 1000).toLocaleString('en-GB', { timeZone: 'Africa/Lagos', dateStyle: 'medium', timeStyle: 'short' }) : 'just now');

function ChangeCard({ change, admin }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const act = async (fn) => {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };
  return (
    <div className="ad-card ad-change">
      <div className="ad-change-head">
        <span className="ad-change-title">{change.summary}</span>
        <span className="muted small">{COLLECTIONS[change.collection]?.title} · by {change.submittedByName} · {when(change.submittedAt)}</span>
      </div>
      <Diff change={change} />
      {error && <p className="ad-error">{error}</p>}
      <div className="ad-actions">
        <button type="button" className="btn btn-gold btn-small" disabled={busy} onClick={() => act(() => approveChange(change, admin))}>
          <Check size={16} /> Approve
        </button>
        <button type="button" className="btn btn-outline btn-small" disabled={busy}
          onClick={() => {
            const note = window.prompt('Reason for rejecting (optional, the editor will see it):', '');
            if (note !== null) act(() => rejectChange(change, admin, note));
          }}>
          <X size={16} /> Reject
        </button>
      </div>
    </div>
  );
}

export function Approvals({ profile }) {
  const { items, error } = useChanges({ pendingOnly: true });
  return (
    <div className="ad-page">
      <h1 className="ad-title">Approvals</h1>
      <p className="muted">Changes from editors. Approving saves the change in the database (attendees see it after Publish to app); rejecting sends it back with your note.</p>
      {error && <p className="ad-error">{error}</p>}
      {items == null && <p className="muted">Loading…</p>}
      {items?.length === 0 && <p className="ad-note">Nothing waiting. You're all caught up.</p>}
      <div className="ad-list">
        {items?.map((c) => <ChangeCard key={c.id} change={c} admin={profile} />)}
      </div>
    </div>
  );
}

const STATUS = { pending: 'Waiting for approval', approved: 'Approved', rejected: 'Rejected' };

export function MyChanges({ profile }) {
  const { items, error } = useChanges({ mineUid: profile.id });
  return (
    <div className="ad-page">
      <h1 className="ad-title">My changes</h1>
      <p className="muted">Everything you've sent for approval, newest first.</p>
      {error && <p className="ad-error">{error}</p>}
      {items == null && <p className="muted">Loading…</p>}
      {items?.length === 0 && <p className="muted">You haven't sent any changes yet. Open Festival data to start.</p>}
      <div className="ad-list">
        {items?.map((c) => (
          <div key={c.id} className="ad-card ad-change">
            <div className="ad-change-head">
              <span className="ad-change-title">{c.summary}</span>
              <span className={`ad-status ${c.status}`}>{STATUS[c.status] || c.status}</span>
            </div>
            <span className="muted small">Sent {when(c.submittedAt)}{c.reviewedByName ? ` · reviewed by ${c.reviewedByName}` : ''}</span>
            {c.note && <p className="ad-info">Note from admin: {c.note}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
