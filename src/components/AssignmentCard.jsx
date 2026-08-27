import { useState } from 'react';
import { useAuth } from '../AuthContext';
import { setCompletion } from '../hooks';
import CommentThread from './CommentThread';

export default function AssignmentCard({
  assignment,
  done,
  doneCount,
  totalUsers,
  usersById,
}) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    setBusy(true);
    try {
      await setCompletion(assignment.id, user.uid, !done);
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="assignment">
      <div className="assignment-head">
        <div>
          <h3>
            {assignment.link ? (
              <a href={assignment.link} target="_blank" rel="noreferrer">
                {assignment.title}
              </a>
            ) : (
              assignment.title
            )}
          </h3>
          <p className="muted">{assignment.date}</p>
        </div>
        <label className="done-check">
          <input
            type="checkbox"
            checked={done}
            disabled={busy}
            onChange={toggle}
          />
          Done
        </label>
      </div>
      {assignment.note && <p className="note">{assignment.note}</p>}
      <p className="progress-pill">
        {doneCount}/{totalUsers} completed
      </p>
      <CommentThread assignmentId={assignment.id} usersById={usersById} />
    </article>
  );
}
