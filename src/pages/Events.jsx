import { useMemo, useState } from 'react';
import { useAuth } from '../AuthContext';
import { createEvent, deleteEvent, toggleRsvp, useEvents, useUsers } from '../hooks';

const EVENT_TYPES = [
  { value: 'coding_challenge', label: 'Coding challenge' },
  { value: 'mock_interview', label: 'Mock interview' },
  { value: 'other', label: 'Other' },
];

function typeLabel(type) {
  return EVENT_TYPES.find((t) => t.value === type)?.label || type;
}

export default function Events() {
  const { user, isModerator } = useAuth();
  const { events, loading } = useEvents();
  const { users } = useUsers();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '',
    type: 'coding_challenge',
    date: new Date().toISOString().slice(0, 10),
    description: '',
  });

  const usersById = useMemo(
    () => Object.fromEntries(users.map((u) => [u.id, u])),
    [users],
  );

  const onChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await createEvent(form, user.uid);
      setForm({
        title: '',
        type: 'coding_challenge',
        date: new Date().toISOString().slice(0, 10),
        description: '',
      });
      setOpen(false);
    } catch (err) {
      setError(err.message || 'Could not create event');
    } finally {
      setSaving(false);
    }
  };

  const onRsvp = async (eventId, going) => {
    try {
      await toggleRsvp(eventId, user.uid, going);
    } catch (err) {
      setError(err.message || 'RSVP failed');
    }
  };

  const onDelete = async (eventId) => {
    if (!window.confirm('Delete this event?')) return;
    try {
      await deleteEvent(eventId);
    } catch (err) {
      setError(err.message || 'Delete failed');
    }
  };

  return (
    <div className="events-page">
      <div className="events-head">
        <div>
          <h1>Events</h1>
          <p className="lede">Coding challenges, mock interviews, and group sessions.</p>
        </div>
        {isModerator && (
          <button type="button" className="btn" onClick={() => setOpen((v) => !v)}>
            {open ? 'Close' : 'Create event'}
          </button>
        )}
      </div>

      {isModerator && open && (
        <form className="stack-form panel" onSubmit={submit}>
          <label>
            Title
            <input name="title" value={form.title} onChange={onChange} required />
          </label>
          <label>
            Type
            <select name="type" value={form.type} onChange={onChange}>
              {EVENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Date
            <input type="date" name="date" value={form.date} onChange={onChange} required />
          </label>
          <label>
            Description
            <textarea
              name="description"
              value={form.description}
              onChange={onChange}
              rows={3}
            />
          </label>
          <button type="submit" className="btn" disabled={saving}>
            Create
          </button>
        </form>
      )}

      {error && <p className="error">{error}</p>}
      {loading && <p className="muted">Loading events…</p>}
      {!loading && events.length === 0 && <p className="muted">No events yet.</p>}

      <div className="event-list">
        {events.map((event) => {
          const rsvps = event.rsvps || [];
          const going = rsvps.includes(user.uid);
          return (
            <article key={event.id} className="event-card">
              <div className="event-top">
                <div>
                  <p className="eyebrow">{typeLabel(event.type)}</p>
                  <h2>{event.title}</h2>
                  <p className="muted">{event.date}</p>
                </div>
                <div className="event-actions">
                  <button
                    type="button"
                    className={going ? 'btn ghost' : 'btn'}
                    onClick={() => onRsvp(event.id, !going)}
                  >
                    {going ? 'Cancel RSVP' : 'RSVP'}
                  </button>
                  {isModerator && (
                    <button
                      type="button"
                      className="btn ghost danger-btn"
                      onClick={() => onDelete(event.id)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
              {event.description && <p>{event.description}</p>}
              <div className="rsvp-list">
                <strong>Going ({rsvps.length})</strong>
                {rsvps.length === 0 ? (
                  <p className="muted">Nobody yet.</p>
                ) : (
                  <ul>
                    {rsvps.map((uid) => (
                      <li key={uid}>{usersById[uid]?.displayName || uid}</li>
                    ))}
                  </ul>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
