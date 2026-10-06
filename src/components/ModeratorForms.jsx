import { useState, useEffect, useMemo } from 'react';
import MarkdownIt from 'markdown-it';
import 'highlight.js/styles/atom-one-dark.css';
import { useAuth } from '../AuthContext';
import {
  createConcept,
  deleteConcept,
  updateConcept,
  toggleConceptHidden,
  createAssignment,
  updateAssignment,
} from '../hooks';
import { getLocalDateString } from '../utils/date';

import hljs from 'highlight.js';

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  highlight(str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return (
          '<pre class="hljs-pre"><code class="hljs">' +
          hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
          '</code></pre>'
        );
      } catch (_) { /* ignore */ }
    }
    return '<pre class="hljs-pre"><code class="hljs">' + md.utils.escapeHtml(str) + '</code></pre>';
  },
});

const emptyConceptForm = () => ({
  title: '',
  description: '',
  startDate: '',
  endDate: '',
  imageUrl: '',
  hidden: false,
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
      hidden: Boolean(concept.hidden),
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

  const onToggleHidden = async (concept) => {
    setSaving(true);
    setMessage('');
    try {
      await toggleConceptHidden(concept.id, concept.hidden);
      setMessage(concept.hidden ? 'Concept unhidden.' : 'Concept hidden from regular members.');
    } catch (err) {
      setMessage(err.message || 'Failed to update hidden status');
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
                      <strong>
                        {c.title}{' '}
                        {c.hidden && (
                          <span
                            className="badge-hidden-pill"
                            style={{
                              fontSize: '0.75rem',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: 'rgba(239, 68, 68, 0.15)',
                              color: '#ef4444',
                              marginLeft: '6px',
                              fontWeight: '600',
                            }}
                          >
                            Hidden
                          </span>
                        )}
                      </strong>
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
                        className="linkish"
                        onClick={() => onToggleHidden(c)}
                        disabled={saving}
                      >
                        {c.hidden ? 'Unhide' : 'Hide'}
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
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginTop: '0.5rem',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  name="hidden"
                  checked={form.hidden}
                  onChange={(e) => setForm((prev) => ({ ...prev, hidden: e.target.checked }))}
                />
                <span>Hide concept from regular members</span>
              </label>
              <div className="form-actions" style={{ marginTop: '1rem' }}>
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

export function AssignmentComposer({ conceptId, defaultDate, editingAssignment, onCancel, onSaved }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    title: '',
    link: '',
    note: '',
    markdownContent: '',
    date: defaultDate || getLocalDateString(),
    linkMode: 'required',
    noteMode: 'optional',
    isOptional: false,
    hidden: false,
  });
  const [open, setOpen] = useState(Boolean(editingAssignment));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [mdTab, setMdTab] = useState('write');

  useEffect(() => {
    if (editingAssignment) {
      setForm({
        title: editingAssignment.title || '',
        link: editingAssignment.link || '',
        note: editingAssignment.note || '',
        markdownContent: editingAssignment.markdownContent || '',
        date: editingAssignment.date || defaultDate || getLocalDateString(),
        linkMode: editingAssignment.linkMode || 'required',
        noteMode: editingAssignment.noteMode || 'optional',
        isOptional: Boolean(editingAssignment.isOptional),
        hidden: Boolean(editingAssignment.hidden),
      });
      setOpen(true);
    } else if (defaultDate) {
      setForm((prev) => ({ ...prev, date: defaultDate }));
    }
  }, [defaultDate, editingAssignment]);

  const onChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!conceptId && !editingAssignment) {
      setMessage('Select or create a concept first.');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      if (editingAssignment) {
        await updateAssignment(editingAssignment.id, form);
        setMessage('Assignment updated.');
        if (onSaved) onSaved();
      } else {
        await createAssignment(form, conceptId, user.uid);
        setForm({
          title: '',
          link: '',
          note: '',
          markdownContent: '',
          date: defaultDate || getLocalDateString(),
          linkMode: 'required',
          noteMode: 'optional',
          isOptional: false,
          hidden: false,
        });
        setMessage('Assignment posted.');
        setOpen(false);
        if (onSaved) onSaved();
      }
    } catch (err) {
      setMessage(err.message || 'Failed to save assignment');
    } finally {
      setSaving(false);
    }
  };

  if (!conceptId && !editingAssignment) {
    return (
      <section className="mod-panel">
        <p className="muted">Create or select a concept before posting assignments.</p>
      </section>
    );
  }

  const isNoFields = form.linkMode === 'none' && form.noteMode === 'none';
  const mdPreviewHtml = useMemo(() => md.render(form.markdownContent || ''), [form.markdownContent]);

  return (
    <section className={editingAssignment ? '' : 'mod-panel'}>
      {!editingAssignment && (
        <button type="button" className="btn" onClick={() => setOpen((v) => !v)}>
          {open ? 'Close' : 'Post assignment'}
        </button>
      )}
      {open && (
        <form className="stack-form" onSubmit={submit}>
          {editingAssignment && <h3>Edit Assignment</h3>}
          <label>
            Assignment Title <span className="field-required">*</span>
            <input name="title" value={form.title} onChange={onChange} required placeholder="e.g. Two Sum problem or Chapter 1 Reading" />
          </label>
          <label>
            Problem / Resource Link <span className="field-optional">(optional)</span>
            <input
              name="link"
              type="url"
              value={form.link}
              onChange={onChange}
              placeholder="https://leetcode.com/... or https://..."
            />
          </label>
          <label>
            Instructions / Note <span className="field-optional">(optional)</span>
            <textarea name="note" value={form.note} onChange={onChange} rows={2} placeholder="Optional short instructions or notes for members..." />
          </label>

          {/* Markdown Content Field */}
          <div className="md-editor-field">
            <div className="md-editor-label">
              <span>Assignment Description</span>
              <span className="field-optional">(optional — supports Markdown)</span>
            </div>
            <div className="md-editor-tabs">
              <button
                type="button"
                className={`md-tab-btn${mdTab === 'write' ? ' active' : ''}`}
                onClick={() => setMdTab('write')}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>edit</span>
                Write
              </button>
              <button
                type="button"
                className={`md-tab-btn${mdTab === 'preview' ? ' active' : ''}`}
                onClick={() => setMdTab('preview')}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>preview</span>
                Preview
              </button>
            </div>
            {mdTab === 'write' ? (
              <textarea
                name="markdownContent"
                value={form.markdownContent}
                onChange={onChange}
                rows={8}
                placeholder={'Write markdown here...\n\n# Heading\n**bold**, _italic_, `code`\n\n```js\nconsole.log(\'hello\')\n```'}
                className="md-editor-textarea"
              />
            ) : (
              <div
                className="md-preview-pane assignment-md-body"
                dangerouslySetInnerHTML={{ __html: mdPreviewHtml || '<p class="md-preview-empty">Nothing to preview yet.</p>' }}
              />
            )}
            <p className="md-editor-hint">
              <span className="material-symbols-outlined" style={{ fontSize: '13px', verticalAlign: 'middle' }}>info</span>
              {' '}This content will be rendered as formatted text when members open the assignment.
            </p>
          </div>

          <label>
            Date <span className="field-required">*</span>
            <input type="date" name="date" value={form.date} onChange={onChange} required />
          </label>

          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', margin: '0.5rem 0' }}>
            <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                name="isOptional"
                checked={Boolean(form.isOptional)}
                onChange={(e) => setForm((prev) => ({ ...prev, isOptional: e.target.checked }))}
                style={{ width: '18px', height: '18px', accentColor: 'var(--brand)', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.95rem', fontWeight: '500' }}>
                Mark as <strong>Optional Assignment</strong>
              </span>
            </label>

            <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                name="hidden"
                checked={Boolean(form.hidden)}
                onChange={(e) => setForm((prev) => ({ ...prev, hidden: e.target.checked }))}
                style={{ width: '18px', height: '18px', accentColor: '#ef4444', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.95rem', fontWeight: '500', color: form.hidden ? '#ef4444' : undefined }}>
                Hide assignment from members
              </span>
            </label>
          </div>

          {/* Member Submission Settings */}
          <div className="submission-config-box">
            <div className="submission-config-header">
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--brand)' }}>tune</span>
              <strong>Member Submission Fields</strong>
            </div>
            
            <div className="row" style={{ marginTop: '0.5rem' }}>
              <label>
                Solution Link Field
                <select name="linkMode" value={form.linkMode} onChange={onChange}>
                  <option value="required">Mandatory Link (Required)</option>
                  <option value="optional">Optional Link</option>
                  <option value="none">No Link (Disabled)</option>
                </select>
              </label>

              <label>
                Notes / Insight Field
                <select name="noteMode" value={form.noteMode} onChange={onChange}>
                  <option value="optional">Optional Notes</option>
                  <option value="required">Mandatory Notes (Required)</option>
                  <option value="none">No Notes (Disabled)</option>
                </select>
              </label>
            </div>

            <div className="submission-config-hint">
              <span className="material-symbols-outlined" style={{ fontSize: '16px', verticalAlign: 'middle', marginRight: '0.3rem' }}>info</span>
              {isNoFields ? (
                <span>No submission fields required. Members complete this assignment with a <strong>single click</strong>.</span>
              ) : form.linkMode === 'required' ? (
                <span>Members <strong>must provide a solution link</strong> to mark completed.</span>
              ) : form.noteMode === 'required' ? (
                <span>Members <strong>must write notes/key insights</strong> to mark completed.</span>
              ) : (
                <span>Members can submit optional links/notes when completing.</span>
              )}
            </div>
          </div>

          <div className="form-actions" style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button type="submit" className="btn" disabled={saving}>
              {editingAssignment ? 'Save Assignment' : 'Publish Assignment'}
            </button>
            {editingAssignment && onCancel && (
              <button type="button" className="btn ghost" onClick={onCancel} disabled={saving}>
                Cancel
              </button>
            )}
          </div>
        </form>
      )}
      {message && <p className="muted" style={{ marginTop: '0.5rem' }}>{message}</p>}
    </section>
  );
}
