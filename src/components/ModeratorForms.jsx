import { useState } from 'react';
import { useAuth } from '../AuthContext';
import {
  createConcept,
  deleteConcept,
  updateConcept,
  createAssignment,
} from '../hooks';

const emptyConceptForm = () => ({
  title: '',
  description: '',
  startDate: '',
  endDate: '',
  imageUrl: '',
});

export function ConceptManager({ concepts, selectedConceptId, onSelect }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('list');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyConceptForm());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const onChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const resetForm = () => {
    setForm(emptyConceptForm());
    setEditingId(null);
    setMode('list');
  };

  const startCreate = () => {
    setForm(emptyConceptForm());
    setEditingId(null);
    setMode('form');
  };

  const startEdit = (concept) => {
    setForm({
      title: concept.title || '',
      description: concept.description || '',
      startDate: concept.startDate || '',
      endDate: concept.endDate || '',
      imageUrl: concept.imageUrl || '',
    });
    setEditingId(concept.id);
    setMode('form');
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      if (editingId) {
        await updateConcept(editingId, form, user.uid);
        setMessage('Concept updated.');
      } else {
        await createConcept(form, user.uid);
        setMessage('Concept created.');
      }
      resetForm();
    } catch (err) {
      setMessage(err.message || 'Failed to save concept');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (concept) => {
    if (
      !window.confirm(
        `Delete "${concept.title}" and all of its assignments? This cannot be undone.`,
      )
    ) {
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      await deleteConcept(concept.id);
      if (selectedConceptId === concept.id) {
        const remaining = concepts.filter((c) => c.id !== concept.id);
        onSelect(remaining[0]?.id || '');
      }
      setMessage('Concept deleted.');
      resetForm();
    } catch (err) {
      setMessage(err.message || 'Failed to delete concept');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mod-panel">
      <button type="button" className="btn ghost" onClick={() => setOpen((v) => !v)}>
        {open ? 'Close concept manager' : 'Manage concepts'}
      </button>
      {open && (
        <div className="concept-manager">
          {mode === 'list' && (
            <>
              <button type="button" className="btn" onClick={startCreate}>
                New concept
              </button>
              <ul className="concept-list">
                {concepts.map((c) => (
                  <li key={c.id}>
                    <div>
                      <strong>{c.title}</strong>
                      <p className="muted">
                        {c.startDate} → {c.endDate}
                      </p>
                    </div>
                    <div className="concept-actions">
                      <button type="button" className="linkish" onClick={() => onSelect(c.id)}>
                        View
                      </button>
                      <button type="button" className="linkish" onClick={() => startEdit(c)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="linkish danger"
                        onClick={() => onDelete(c)}
                        disabled={saving}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              {concepts.length === 0 && (
                <p className="muted">No concepts yet. Create one to get started.</p>
              )}
            </>
          )}
          {mode === 'form' && (
            <form className="stack-form" onSubmit={submit}>
              <h3>{editingId ? 'Edit concept' : 'New concept'}</h3>
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
              <label>
                Cover Image URL (optional)
                <input
                  name="imageUrl"
                  type="url"
                  value={form.imageUrl}
                  onChange={onChange}
                  placeholder="https://example.com/image.png"
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
              <div className="form-actions">
                <button type="button" className="btn ghost" onClick={resetForm}>
                  Cancel
                </button>
                <button type="submit" className="btn" disabled={saving}>
                  {editingId ? 'Save changes' : 'Create concept'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
      {message && <p className="muted">{message}</p>}
    </section>
  );
}

export function AssignmentComposer({ conceptId }) {
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
    if (!conceptId) {
      setMessage('Select or create a concept first.');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      await createAssignment(form, conceptId, user.uid);
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

  if (!conceptId) {
    return (
      <section className="mod-panel">
        <p className="muted">Create or select a concept before posting assignments.</p>
      </section>
    );
  }

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
