import { useState } from 'react';
import { useAuth } from '../AuthContext';
import { addComment, deleteComment, useComments } from '../hooks';

function formatTime(value) {
  if (!value?.toDate) return '';
  return value.toDate().toLocaleString();
}

export default function CommentThread({ assignmentId, usersById, defaultOpen = false }) {
  const { user, isModerator } = useAuth();
  const { comments, loading } = useComments(assignmentId);
  const [open, setOpen] = useState(defaultOpen);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSaving(true);
    setError('');
    try {
      await addComment(assignmentId, user.uid, text);
      setText('');
    } catch (err) {
      setError(err.message || 'Could not post comment');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (commentId) => {
    try {
      await deleteComment(assignmentId, commentId);
    } catch (err) {
      setError(err.message || 'Could not delete comment');
    }
  };

  return (
    <div className="comments">
      {!defaultOpen && (
        <button type="button" className="linkish" onClick={() => setOpen((v) => !v)}>
          {open ? 'Hide' : 'Show'} comments ({comments.length})
        </button>
      )}
      {open && (
        <div className="comments-panel">
          {loading && <p className="muted">Loading comments…</p>}
          {!loading && comments.length === 0 && (
            <p className="muted">No comments yet.</p>
          )}
          <ul className="comment-list">
            {comments.map((c) => {
              const name = usersById[c.userId]?.displayName || 'Member';
              const canDelete = c.userId === user.uid || isModerator;
              return (
                <li key={c.id}>
                  <div className="comment-meta">
                    <strong>{name}</strong>
                    <span>{formatTime(c.createdAt)}</span>
                  </div>
                  <p>{c.text}</p>
                  {canDelete && (
                    <button type="button" className="linkish danger" onClick={() => remove(c.id)}>
                      Delete
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          <form className="comment-form" onSubmit={submit}>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Add a comment"
              maxLength={2000}
              required
            />
            <button type="submit" className="btn" disabled={saving}>
              Post
            </button>
          </form>
          {error && <p className="error">{error}</p>}
        </div>
      )}
    </div>
  );
}
