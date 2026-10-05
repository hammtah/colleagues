import { useNavigate } from 'react-router-dom';
import { isFutureDateString, getLocalDateString } from '../utils/date';

export default function AssignmentCard({
  assignment,
  done,
  doneCount,
  totalUsers,
  conceptId,
  isModerator = false,
  canMoveUp = false,
  canMoveDown = false,
  onMoveUp,
  onMoveDown,
}) {
  const navigate = useNavigate();
  const locked = isFutureDateString(assignment.date, getLocalDateString());

  const completionPercent = totalUsers > 0
    ? Math.round((doneCount / totalUsers) * 100)
    : 0;

  const handleClick = () => {
    if (locked) return;
    const params = conceptId ? `?concept=${conceptId}` : '';
    navigate(`/assignment/${assignment.id}${params}`);
  };

  return (
    <article
      className={`assignment-row ${done ? 'assignment-row--done' : ''} ${locked ? 'assignment-row--locked' : ''}`}
      onClick={handleClick}
      role="button"
      tabIndex={locked ? -1 : 0}
      aria-disabled={locked}
      onKeyDown={(e) => {
        if (!locked && (e.key === 'Enter' || e.key === ' ')) handleClick();
      }}
    >
      <div className="assignment-row-left">
        {/* Done indicator circle */}
        <div className={`assignment-done-circle ${done ? 'done' : ''}`}>
          {done && (
            <span className="material-symbols-outlined" style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}>
              check
            </span>
          )}
        </div>

        <div className="assignment-row-info">
          <h3 className="assignment-row-title" title={assignment.title}>{assignment.title}</h3>
          <span className="assignment-row-date muted">{assignment.date}</span>
        </div>
      </div>

      <div className="assignment-row-right">
        {/* Moderator Reorder Controls */}
        {isModerator && (onMoveUp || onMoveDown) && (
          <div className="assignment-reorder-actions" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="reorder-btn"
              disabled={!canMoveUp}
              onClick={(e) => {
                e.stopPropagation();
                if (canMoveUp && onMoveUp) onMoveUp(assignment);
              }}
              title="Move assignment up"
              aria-label="Move assignment up"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                arrow_upward
              </span>
            </button>
            <button
              type="button"
              className="reorder-btn"
              disabled={!canMoveDown}
              onClick={(e) => {
                e.stopPropagation();
                if (canMoveDown && onMoveDown) onMoveDown(assignment);
              }}
              title="Move assignment down"
              aria-label="Move assignment down"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                arrow_downward
              </span>
            </button>
          </div>
        )}

        {/* Mini completion bar */}
        <div className="assignment-row-progress">
          <div className="progress-bar-mini">
            <div className="progress-fill-mini" style={{ width: `${completionPercent}%` }} />
          </div>
          <span className="assignment-row-stat muted">
            {doneCount}/{totalUsers}
          </span>
        </div>
        <span className="material-symbols-outlined assignment-row-chevron">
          {locked ? 'lock' : 'chevron_right'}
        </span>
      </div>
    </article>
  );
}
