import { useNavigate } from 'react-router-dom';

export default function AssignmentCard({ assignment, done, doneCount, totalUsers, conceptId }) {
  const navigate = useNavigate();

  const completionPercent = totalUsers > 0
    ? Math.round((doneCount / totalUsers) * 100)
    : 0;

  const handleClick = () => {
    const params = conceptId ? `?concept=${conceptId}` : '';
    navigate(`/assignment/${assignment.id}${params}`);
  };

  return (
    <article
      className={`assignment-row ${done ? 'assignment-row--done' : ''}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') handleClick();
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
          <h3 className="assignment-row-title">{assignment.title}</h3>
          <span className="assignment-row-date muted">{assignment.date}</span>
        </div>
      </div>

      <div className="assignment-row-right">
        {/* Mini completion bar */}
        <div className="assignment-row-progress">
          <div className="progress-bar-mini">
            <div className="progress-fill-mini" style={{ width: `${completionPercent}%` }} />
          </div>
          <span className="assignment-row-stat muted">
            {doneCount}/{totalUsers}
          </span>
        </div>
        <span className="material-symbols-outlined assignment-row-chevron">chevron_right</span>
      </div>
    </article>
  );
}
