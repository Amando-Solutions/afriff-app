import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, DownloadCloud, Plus, Save, Search } from 'lucide-react';
import { COLLECTIONS, COLLECTION_ORDER, fromForm, slugify, toForm } from './schema.js';
import { deleteItem, downloadBackup, importAll, saveItem, useCollection } from './data.js';

// ---------- Festival data home: one card per kind of data ----------

function CountCard({ name }) {
  const { items } = useCollection(name);
  const c = COLLECTIONS[name];
  return (
    <a href={`#/admin/data/${name}`} className="ad-tile">
      <span className="ad-tile-text">
        <span className="ad-tile-title">{c.title}</span>
        <span className="muted small">{items == null ? 'Loading…' : `${items.length} in the database`}</span>
      </span>
      <ChevronRight size={20} className="ad-chevron" />
    </a>
  );
}

const listCounts = (counts) =>
  Object.entries(counts).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${(COLLECTIONS[k]?.title || k).toLowerCase()}`).join(', ');

function ImportPanel() {
  const [state, setState] = useState({ busy: false, done: null, error: '', progress: '' });
  const run = async () => {
    setState({ busy: true, done: null, error: '', progress: 'Checking what\'s already there…' });
    try {
      const done = await importAll((n, total) => setState((s) => ({ ...s, progress: `${n} of ${total} added…` })));
      setState({ busy: false, done, error: '', progress: '' });
    } catch (e) {
      setState({ busy: false, done: null, error: e.message, progress: '' });
    }
  };
  const added = state.done && listCounts(state.done.added);
  const kept = state.done && Object.values(state.done.kept).reduce((a, b) => a + b, 0);
  return (
    <div className="ad-card ad-import">
      <h2 className="ad-h2"><DownloadCloud size={20} /> Festival data from afriff.com</h2>
      <p className="muted small">
        Copies the films, events, venues, partners and How to attend text collected from afriff.com (plus sample times) into the database. It only adds what's missing (whole items, or new fields like sponsor logos): anything already filled in, including your team's edits, is never overwritten, so it's safe to press again.
      </p>
      <button type="button" className="btn btn-gold btn-small" onClick={run} disabled={state.busy}>
        {state.busy ? state.progress : 'Add missing festival data'}
      </button>
      {state.done && (
        <p className="ad-note">
          {added ? `Added ${added}.` : 'No items were missing.'}{' '}
          {state.done.filled ? `Filled in ${state.done.filled} new field${state.done.filled === 1 ? '' : 's'} (such as sponsor logos) on existing items. ` : ''}
          {kept ? `Everything your team already entered was left as it is.` : ''}
        </p>
      )}
      {state.error && <p className="ad-error">Couldn't load: {state.error}</p>}
    </div>
  );
}

function BackupPanel() {
  const [state, setState] = useState({ busy: false, done: null, error: '' });
  const run = async () => {
    setState({ busy: true, done: null, error: '' });
    try {
      setState({ busy: false, done: await downloadBackup(), error: '' });
    } catch (e) {
      setState({ busy: false, done: null, error: e.message });
    }
  };
  return (
    <div className="ad-card ad-import">
      <h2 className="ad-h2"><Save size={20} /> Backup</h2>
      <p className="muted small">Saves a copy of everything in the database (films, screenings, events, venues, news, sponsors, How to attend, queue counts) as a file on this device. Do this before launch and before big edit days.</p>
      <button type="button" className="btn btn-outline btn-small" onClick={run} disabled={state.busy}>
        {state.busy ? 'Preparing…' : 'Download backup'}
      </button>
      {state.done && <p className="ad-note">Downloaded: {listCounts(state.done)}.</p>}
      {state.error && <p className="ad-error">Couldn't make the backup: {state.error}</p>}
    </div>
  );
}

export function DataHome({ profile }) {
  return (
    <div className="ad-page">
      <h1 className="ad-title">Festival data</h1>
      <p className="muted">
        {profile.role === 'admin'
          ? 'Your changes go live in the database straight away.'
          : 'Your changes are sent to an admin for approval before attendees see them.'}
      </p>
      <p className="ad-info">The attendee app switches to reading this data in build step 3. Until then it shows its built-in copy.</p>
      {profile.role === 'admin' && <><ImportPanel /><BackupPanel /></>}
      <div className="ad-tiles">
        {COLLECTION_ORDER.map((name) => <CountCard key={name} name={name} />)}
      </div>
    </div>
  );
}

// ---------- List of one kind of data ----------

function useRefs(colName) {
  // screenings show film titles and venue names; other lists need venues at most
  const films = useCollection('films');
  const venues = useCollection('venues');
  return useMemo(() => ({ films: films.map, venues: venues.map }), [films.map, venues.map, colName]); // eslint-disable-line react-hooks/exhaustive-deps
}

export function DataList({ col }) {
  const c = COLLECTIONS[col];
  const { items, error } = useCollection(col);
  const refs = useRefs(col);
  const [q, setQ] = useState('');
  if (!c) return <div className="ad-page"><p className="ad-error">Unknown section.</p></div>;

  const query = q.trim().toLowerCase();
  const shown = (items || [])
    .filter((it) => !query || `${c.label(it, refs)} ${c.sub(it, refs)}`.toLowerCase().includes(query))
    .sort(c.sort);

  return (
    <div className="ad-page">
      <a href="#/admin/data" className="ad-back"><ChevronLeft size={18} /> Festival data</a>
      <div className="ad-list-head">
        <h1 className="ad-title">{c.title}</h1>
        <a href={`#/admin/data/${col}/new`} className="btn btn-gold btn-small"><Plus size={16} /> Add {c.single}</a>
      </div>
      <div className="search-box ad-search">
        <Search size={18} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${c.title.toLowerCase()}`} />
      </div>
      {error && <p className="ad-error">{error}</p>}
      {items == null && <p className="muted">Loading…</p>}
      {items?.length === 0 && <p className="muted">Nothing here yet. Add one, or load the festival data from the Festival data page.</p>}
      <div className="ad-rows">
        {shown.map((it) => (
          <a key={it.id} href={`#/admin/data/${col}/${encodeURIComponent(it.id)}`} className="ad-row">
            <span className="ad-row-text">
              <span className="ad-row-title">{c.label(it, refs)}</span>
              <span className="muted small">{c.sub(it, refs)}</span>
            </span>
            <ChevronRight size={18} className="ad-chevron" />
          </a>
        ))}
      </div>
      {items && <p className="muted small">{shown.length} of {items.length}</p>}
    </div>
  );
}

// ---------- Edit form ----------

function Field({ f, value, onChange, refs }) {
  const common = { id: f.key, value, onChange: (e) => onChange(f.key, e.target.value), required: f.required };
  let input;
  if (f.type === 'textarea') input = <textarea {...common} rows={5} />;
  else if (f.type === 'checkbox') {
    return (
      <label className="ad-check">
        <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(f.key, e.target.checked)} />
        <span>{f.label}</span>
      </label>
    );
  } else if (f.type === 'select' || f.type === 'day') {
    input = (
      <select {...common}>
        <option value="">{f.required ? 'Choose…' : '— none —'}</option>
        {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    );
  } else if (f.type === 'ref') {
    const opts = Object.values(refs[f.ref] || {}).sort((a, b) => (a.title || a.name || '').localeCompare(b.title || b.name || ''));
    input = (
      <select {...common}>
        <option value="">{f.required ? 'Choose…' : '— none —'}</option>
        {opts.map((o) => <option key={o.id} value={o.id}>{o.title || o.name}</option>)}
      </select>
    );
  } else {
    const type = { number: 'number', url: 'url', time: 'time', color: 'color', datetime: 'datetime-local' }[f.type] || 'text';
    input = <input {...common} type={type} inputMode={f.type === 'number' ? 'numeric' : undefined} />;
  }
  return (
    <label className="ad-field" htmlFor={f.key}>
      <span>{f.label}{f.required && <em> *</em>}</span>
      {input}
      {f.hint && <small className="muted">{f.hint}</small>}
    </label>
  );
}

export function ItemForm({ col, id, profile }) {
  const c = COLLECTIONS[col];
  const { items, map } = useCollection(col);
  const refs = useRefs(col);
  const isNew = id === 'new';
  const existing = isNew ? null : map[id];
  const [values, setValues] = useState(null);
  const [status, setStatus] = useState({ busy: false, msg: '', error: '' });

  // fill the form once the item has loaded
  if (values == null && (isNew || existing)) {
    setValues(isNew ? toForm(col, {}) : toForm(col, existing));
  }
  if (!c) return <div className="ad-page"><p className="ad-error">Unknown section.</p></div>;
  if (!isNew && items && !existing) {
    return (
      <div className="ad-page">
        <a href={`#/admin/data/${col}`} className="ad-back"><ChevronLeft size={18} /> {c.title}</a>
        <p className="muted">This {c.single} doesn't exist (it may have been deleted).</p>
      </div>
    );
  }
  if (values == null) return <div className="ad-page"><p className="muted">Loading…</p></div>;

  const set = (key, v) => setValues((s) => ({ ...s, [key]: v }));
  const strip = (doc) => {
    if (!doc) return null;
    const { id: _id, ...rest } = doc;
    return rest;
  };

  const save = async (e) => {
    e.preventDefault();
    setStatus({ busy: true, msg: '', error: '' });
    try {
      const formData = fromForm(col, values);
      // keep fields the form doesn't show (e.g. a film's placeholder poster colours)
      const data = { ...(strip(existing) || {}), ...formData };
      if (!formData.link) delete data.link;
      const label = c.label(data, refs);
      const docId = isNew ? `${slugify(c.idFrom ? data[c.idFrom] : label)}-${Math.random().toString(36).slice(2, 6)}` : id;
      const result = await saveItem({ profile, col, id: docId, data, before: strip(existing), summary: `${isNew ? 'New' : 'Edit'} ${c.single}: ${label}` });
      setStatus({ busy: false, error: '', msg: result === 'saved' ? 'Saved. It\'s live in the database.' : 'Sent for approval. An admin will review it.' });
      if (isNew && result === 'saved') window.location.hash = `#/admin/data/${col}/${encodeURIComponent(docId)}`;
    } catch (err) {
      setStatus({ busy: false, msg: '', error: `Couldn't save: ${err.message}` });
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete this ${c.single}? ${profile.role === 'admin' ? 'This can\'t be undone.' : 'An admin will need to approve it.'}`)) return;
    setStatus({ busy: true, msg: '', error: '' });
    try {
      const result = await deleteItem({ profile, col, id, before: strip(existing), summary: `Delete ${c.single}: ${c.label(existing, refs)}` });
      if (result === 'saved') window.location.hash = `#/admin/data/${col}`;
      else setStatus({ busy: false, error: '', msg: 'Deletion sent for approval.' });
    } catch (err) {
      setStatus({ busy: false, msg: '', error: `Couldn't delete: ${err.message}` });
    }
  };

  return (
    <div className="ad-page">
      <a href={`#/admin/data/${col}`} className="ad-back"><ChevronLeft size={18} /> {c.title}</a>
      <h1 className="ad-title">{isNew ? `New ${c.single}` : c.label(existing, refs)}</h1>
      {profile.role !== 'admin' && <p className="ad-info">You're an editor: saving sends this to an admin for approval.</p>}
      <form className="ad-form ad-edit" onSubmit={save}>
        {c.fields.map((f) => <Field key={f.key} f={f} value={values[f.key]} onChange={set} refs={refs} />)}
        {status.error && <p className="ad-error" role="alert">{status.error}</p>}
        {status.msg && <p className="ad-note" role="status">{status.msg}</p>}
        <div className="ad-actions">
          <button type="submit" className="btn btn-gold" disabled={status.busy}>
            {status.busy ? 'Saving…' : profile.role === 'admin' ? 'Save' : 'Send for approval'}
          </button>
          {!isNew && <button type="button" className="btn btn-outline ad-danger" onClick={remove} disabled={status.busy}>Delete</button>}
        </div>
      </form>
    </div>
  );
}
