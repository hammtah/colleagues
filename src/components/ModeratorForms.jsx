import { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { createAssignment, saveConcept } from '../hooks';

export function ConceptEditor({ concept }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
  });
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (concept) {
      setForm({
        title: concept.title || '',
        description: concept.description || '',
        startDate: concept.startDate || '',
        endDate: concept.endDate || '',
      });
    }
  }, [concept]);

  const onChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await saveConcept(form, user.uid);
      setMessage('Concept saved.');
      setOpen(false);
    } catch (err) {
      setMessage(err.message || 'Failed to save concept');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mod-panel">
      <button type="button" className="btn ghost" onClick={() => setOpen((v) => !v)}>
        {open ? 'Close concept editor' : 'Edit concept of the month'}
      </button>
      {open && (
        <form className="stack-form" onSubmit={submit}>
          <label>
            Title
            <input name="title" value={form.title} onChange={onChange} required />
          </label>
          <label>
            Description
            <textarea
              name="description"
              value={form.description}
              onChange={onChange}
              rows={3}
              required
            />
          </label>
          <div className="row">
            <label>
              Start
              <input
                type="date"
                name="startDate"
                value={form.startDate}
                onChange={onChange}
                required
              />
            </label>
            <label>
              End
              <input
                type="date"
                name="endDate"
                value={form.endDate}
                onChange={onChange}
                required
              />
            </label>
          </div>
          <button type="submit" className="btn" disabled={saving}>
            Save concept
          </button>
        </form>
      )}
      {message && <p className="muted">{message}</p>}
    </section>
  );
}

export function AssignmentComposer() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    title: '',
    link: '',
    note: '',
    date: new Date().toISOString().slice(0, 10),
  });
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const onChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await createAssignment(form, user.uid);
      setForm({
        title: '',
        link: '',
        note: '',
        date: new Date().toISOString().slice(0, 10),
      });
      setMessage('Assignment posted.');
      setOpen(false);
    } catch (err) {
      setMessage(err.message || 'Failed to post assignment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mod-panel">
      <button type="button" className="btn" onClick={() => setOpen((v) => !v)}>
        {open ? 'Close' : 'Post assignment'}
      </button>
      {open && (
        <form className="stack-form" onSubmit={submit}>
          <label>
            Title
            <input name="title" value={form.title} onChange={onChange} required />
          </label>
          <label>
            Link
            <input
              name="link"
              type="url"
              value={form.link}
              onChange={onChange}
              placeholder="https://"
              required
            />
          </label>
          <label>
            Note (optional)
            <textarea name="note" value={form.note} onChange={onChange} rows={2} />
          </label>
          <label>
            Date
            <input type="date" name="date" value={form.date} onChange={onChange} required />
          </label>
          <button type="submit" className="btn" disabled={saving}>
            Publish
          </button>
        </form>
      )}
      {message && <p className="muted">{message}</p>}
    </section>
  );
}
