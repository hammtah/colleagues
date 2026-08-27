import { useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import CommentThread from '../components/CommentThread';
import {
  useAssignments,
  useCompletions,
  useUsers,
  setCompletion,
} from '../hooks';
import { getLocalDateString, isFutureDateString } from '../utils/date';

export default function AssignmentDetail() {
  const { assignmentId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const conceptId = searchParams.get('concept') || '';

  const { assignments, loading: assignmentsLoading } = useAssignments(conceptId || null);
  const { completions, loading: completionsLoading } = useCompletions();
  const { users, loading: usersLoading } = useUsers();

  const [busy, setBusy] = useState(false);

  const loading = assignmentsLoading || completionsLoading || usersLoading;

  const assignment = useMemo(
    () => assignments.find((a) => a.id === assignmentId) || null,
    [assignments, assignmentId]
  );

  const usersById = useMemo(
    () => Object.fromEntries(users.map((u) => [u.id, u])),
    [users]
  );

  const completionMap = useMemo(() => {
    const map = {};
    for (const c of completions) {
      if (c.done) map[`${c.assignmentId}_${c.userId}`] = true;
    }
    return map;
  }, [completions]);

  const myDone = useMemo(() => {
    if (!user || !assignment) return false;
    return Boolean(completionMap[`${assignment.id}_${user.uid}`]);
  }, [completionMap, assignment, user]);

  const doneCount = useMemo(() => {
    if (!assignment) return 0;
    return users.filter((u) => completionMap[`${assignment.id}_${u.id}`]).length;
  }, [completionMap, assignment, users]);

  const completionPercent = users.length > 0
    ? Math.round((doneCount / users.length) * 100)
    : 0;

  const locked = assignment ? isFutureDateString(assignment.date, getLocalDateString()) : false;

  const toggle = async () => {
    if (!assignment || !user || locked) return;
    setBusy(true);
    try {
      await setCompletion(assignment.id, user.uid, !myDone);
    } finally {
      setBusy(false);
    }
  };

  const handleBack = () => {
    const params = conceptId ? `?concept=${conceptId}` : '';
    navigate(`/feed${params}`);
  };

  if (loading) {
    return (
      <div className="detail-page">
        <p className="muted">Loading…</p>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="detail-page">
        <button type="button" className="btn ghost" onClick={handleBack}>
          ← Back to Feed
        </button>
        <p className="muted" style={{ marginTop: '1rem' }}>Assignment not found.</p>
      </div>
    );
  }

  if (locked) {
    return (
      <div className="detail-page">
        <button type="button" className="detail-back-btn" onClick={handleBack}>
          <span className="material-symbols-outlined">arrow_back</span>
          Back to Feed
        </button>

        <div className="detail-card detail-card--locked">
          <div className="detail-header detail-header--locked">
            <div className="detail-meta">
              <span className="detail-date">
                <span className="material-symbols-outlined" style={{ fontSize: '16px', verticalAlign: 'middle' }}>
                  lock
                </span>
                {assignment.date}
              </span>
            </div>
            <h1 className="detail-title">{assignment.title}</h1>
          </div>

          <div className="detail-stats-row">
            <div className="detail-stat-card detail-locked-state" style={{ gridColumn: '1 / -1' }}>
              <span className="material-symbols-outlined detail-locked-icon">lock</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Circumference for the SVG ring
  const RADIUS = 40;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const dashOffset = CIRCUMFERENCE - (completionPercent / 100) * CIRCUMFERENCE;

  return (
    <div className="detail-page">
      {/* Back button */}
      <button type="button" className="detail-back-btn" onClick={handleBack}>
        <span className="material-symbols-outlined">arrow_back</span>
        Back to Feed
      </button>

      {/* Main card */}
      <div className="detail-card">
        {/* Header */}
        <div className="detail-header">
          <div className="detail-meta">
            <span className="detail-date">
              <span className="material-symbols-outlined" style={{ fontSize: '16px', verticalAlign: 'middle' }}>
                calendar_today
              </span>
              {assignment.date}
            </span>
          </div>
          <h1 className="detail-title">
            {assignment.link ? (
              <a href={assignment.link} target="_blank" rel="noreferrer" className="detail-title-link">
                {assignment.title}
                <span className="material-symbols-outlined" style={{ fontSize: '20px', verticalAlign: 'middle', marginLeft: '0.4rem' }}>
                  open_in_new
                </span>
              </a>
            ) : (
              assignment.title
            )}
          </h1>
          {assignment.note && (
            <p className="detail-note">{assignment.note}</p>
          )}
        </div>

        {/* Stats Row */}
        <div className="detail-stats-row">
          {/* Completion Ring */}
          <div className="detail-stat-card">
            <div className="completion-ring-wrap">
              <svg width="100" height="100" viewBox="0 0 100 100">
                {/* Background circle */}
                <circle
                  cx="50" cy="50" r={RADIUS}
                  fill="none"
                  stroke="var(--line)"
                  strokeWidth="10"
                />
                {/* Progress arc */}
                <circle
                  cx="50" cy="50" r={RADIUS}
                  fill="none"
                  stroke="var(--brand)"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={dashOffset}
                  transform="rotate(-90 50 50)"
                  style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                />
                <text
                  x="50" y="50"
                  textAnchor="middle"
                  dominantBaseline="central"
                  style={{ fontWeight: '800', fontSize: '18px', fill: 'var(--brand)' }}
                >
                  {completionPercent}%
                </text>
              </svg>
            </div>
            <div className="detail-stat-label">
              <span className="stat-value">{doneCount} / {users.length}</span>
              <span className="stat-caption">colleagues completed</span>
            </div>
          </div>

          {/* Done Toggle */}
          <div className="detail-stat-card detail-done-card">
            <button
              type="button"
              className={`done-toggle-btn ${myDone ? 'done' : ''}`}
              onClick={toggle}
              disabled={busy}
            >
              <span className="material-symbols-outlined done-toggle-icon" style={{ fontVariationSettings: "'FILL' 1" }}>
                {myDone ? 'check_circle' : 'radio_button_unchecked'}
              </span>
              <span>{myDone ? 'Completed!' : 'Mark as Done'}</span>
            </button>
            {myDone && (
              <p className="muted" style={{ marginTop: '0.5rem', fontSize: '0.85rem', textAlign: 'center' }}>
                Great work — keep it up!
              </p>
            )}
          </div>
        </div>

        {/* Comments */}
        <div className="detail-comments-section">
          <h2 className="detail-section-heading">
            <span className="material-symbols-outlined" style={{ fontSize: '20px', verticalAlign: 'middle', marginRight: '0.4rem' }}>
              forum
            </span>
            Discussion
          </h2>
          <CommentThread assignmentId={assignment.id} usersById={usersById} defaultOpen={true} />
        </div>
      </div>
    </div>
  );
}
