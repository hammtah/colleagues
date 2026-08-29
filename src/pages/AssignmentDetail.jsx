import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { useAuth } from '../AuthContext';
import CommentThread from '../components/CommentThread';
import {
  useAssignments,
  useCompletions,
  useUsers,
  setCompletion,
} from '../hooks';
import { getLocalDateString, isFutureDateString } from '../utils/date';

function ColleagueCard({ item, currentUserId, forceExpanded }) {
  const [expanded, setExpanded] = useState(false);
  const isMe = item.userId === currentUserId;

  // Sync state if parent triggers expand all / collapse all
  useEffect(() => {
    if (forceExpanded !== null && forceExpanded !== undefined) {
      setExpanded(forceExpanded);
    }
  }, [forceExpanded]);

  const toggleExpanded = (e) => {
    e.stopPropagation();
    setExpanded((prev) => !prev);
  };

  // Group notes & legacy fields into a single text block
  const groupedNotes = (
    item.notes ||
    [
      item.pattern ? `Pattern: ${item.pattern}` : '',
      item.keyInsight ? `Key Insight: ${item.keyInsight}` : '',
      item.blockers ? `Initial Blockers: ${item.blockers}` : '',
    ]
      .filter(Boolean)
      .join('\n\n')
  ).trim();

  return (
    <div className={`colleague-card ${isMe ? 'is-me' : ''} ${expanded ? 'expanded' : ''}`}>
      <div className="colleague-card-header" onClick={() => setExpanded((prev) => !prev)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setExpanded((prev) => !prev); }}>
        <div className="colleague-avatar-badge">
          {(item.user.displayName || item.user.email || 'M').charAt(0).toUpperCase()}
        </div>
        <div className="colleague-info">
          <span className="colleague-name">
            {item.user.displayName || item.user.email || 'Colleague'}
            {isMe && <span className="me-chip">You</span>}
          </span>
        </div>
        <button
          type="button"
          className="colleague-expand-btn"
          onClick={toggleExpanded}
          aria-label={expanded ? 'Collapse details' : 'View solution & details'}
        >
          <span className="expand-label">{expanded ? 'Hide Details' : 'View Solution'}</span>
          <span className="material-symbols-outlined expand-icon">
            {expanded ? 'expand_less' : 'expand_more'}
          </span>
        </button>
      </div>

      {/* Expanded Content Area */}
      {expanded && (
        <div className="colleague-card-body">
          {/* Solution Link */}
          {item.solutionUrl ? (
            <a
              href={item.solutionUrl}
              target="_blank"
              rel="noreferrer"
              className="colleague-solution-btn"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>link</span>
              Open Solution Link
              <span className="material-symbols-outlined" style={{ fontSize: '14px', marginLeft: 'auto' }}>open_in_new</span>
            </a>
          ) : (
            <span className="muted" style={{ fontSize: '0.8rem' }}>No link provided</span>
          )}

          {/* Grouped Pattern, Key Insight & Blockers */}
          {groupedNotes && (
            <div className="colleague-detail-box insight">
              <div className="box-header">
                <span className="material-symbols-outlined">notes</span>
                <span>Pattern, Key Insight & Blockers</span>
              </div>
              <p style={{ whiteSpace: 'pre-wrap' }}>{groupedNotes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AssignmentDetail() {
  const { assignmentId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const conceptId = searchParams.get('concept') || '';

  const { assignments, loading: assignmentsLoading } = useAssignments(conceptId || null);
  const { completions, loading: completionsLoading } = useCompletions();
  const { users, loading: usersLoading } = useUsers();

  const [isEditing, setIsEditing] = useState(false);
  const [solutionUrl, setSolutionUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [forceExpandedAll, setForceExpandedAll] = useState(null);
  const [showCelebration, setShowCelebration] = useState(false);

  const loading = assignmentsLoading || completionsLoading || usersLoading;

  const assignment = useMemo(
    () => assignments.find((a) => a.id === assignmentId) || null,
    [assignments, assignmentId]
  );

  const usersById = useMemo(
    () => Object.fromEntries(users.map((u) => [u.id, u])),
    [users]
  );

  // All completed records for this assignment
  const assignmentCompletions = useMemo(() => {
    if (!assignment) return [];
    return completions.filter((c) => c.assignmentId === assignment.id && c.done);
  }, [completions, assignment]);

  // Completion record for current user
  const myCompletion = useMemo(() => {
    if (!user || !assignment) return null;
    return assignmentCompletions.find((c) => c.userId === user.uid) || null;
  }, [assignmentCompletions, assignment, user]);

  const myDone = Boolean(myCompletion);

  // Sync form fields when myCompletion changes or when opening edit mode
  useEffect(() => {
    if (myCompletion && !isEditing) {
      setSolutionUrl(myCompletion.solutionUrl || '');
      setNotes(
        myCompletion.notes ||
        [myCompletion.pattern ? `Pattern: ${myCompletion.pattern}` : '', myCompletion.keyInsight, myCompletion.blockers ? `Blockers: ${myCompletion.blockers}` : ''].filter(Boolean).join('\n\n') ||
        ''
      );
    }
  }, [myCompletion, isEditing]);

  const doneCount = assignmentCompletions.length;
  const completionPercent = users.length > 0
    ? Math.round((doneCount / users.length) * 100)
    : 0;

  const completedColleagues = useMemo(() => {
    if (!assignment) return [];
    return assignmentCompletions.map((comp) => {
      const u = usersById[comp.userId] || {
        displayName: 'Member',
        email: 'member@colleagues.com',
      };
      return {
        ...comp,
        user: u,
      };
    });
  }, [assignmentCompletions, assignment, usersById]);

  const locked = assignment ? isFutureDateString(assignment.date, getLocalDateString()) : false;

  const handleStartEdit = () => {
    if (myCompletion) {
      setSolutionUrl(myCompletion.solutionUrl || '');
      setNotes(
        myCompletion.notes ||
        [myCompletion.pattern ? `Pattern: ${myCompletion.pattern}` : '', myCompletion.keyInsight, myCompletion.blockers ? `Blockers: ${myCompletion.blockers}` : ''].filter(Boolean).join('\n\n') ||
        ''
      );
    }
    setFormError('');
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setFormError('');
    if (myCompletion) {
      setSolutionUrl(myCompletion.solutionUrl || '');
      setNotes(myCompletion.notes || myCompletion.keyInsight || '');
    }
  };

  const handleSubmitSolution = async (e) => {
    e.preventDefault();
    if (!assignment || !user || locked) return;

    let url = solutionUrl.trim();
    if (!url) {
      setFormError('Solution link is mandatory.');
      return;
    }

    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }

    setBusy(true);
    setFormError('');
    try {
      await setCompletion(assignment.id, user.uid, true, {
        solutionUrl: url,
        notes,
      });
      setIsEditing(false);
      setShowCelebration(true);

      // Trigger Confetti Celebration!
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#22c55e', '#10b981', '#3b82f6', '#f59e0b', '#ec4899'],
        });
      } catch (err) {
        console.error(err);
      }

      // Auto dismiss notification after 5 seconds
      setTimeout(() => {
        setShowCelebration(false);
      }, 5000);
    } catch (err) {
      console.error(err);
      setFormError('Failed to submit solution. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleUnmarkDone = async () => {
    if (!assignment || !user || locked) return;
    if (!window.confirm('Are you sure you want to mark this assignment as uncompleted?')) return;

    setBusy(true);
    try {
      await setCompletion(assignment.id, user.uid, false);
      setIsEditing(false);
      setSolutionUrl('');
      setNotes('');
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  const handleBack = () => {
    const params = conceptId ? `?concept=${conceptId}` : '';
    navigate(`/feed${params}`);
  };

  const toggleExpandAll = () => {
    setForceExpandedAll((prev) => (prev === true ? false : true));
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

  // Circumference for SVG ring
  const RADIUS = 40;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const dashOffset = CIRCUMFERENCE - (completionPercent / 100) * CIRCUMFERENCE;

  return (
    <div className="detail-page-container">
      {/* Top Navigation */}
      <button type="button" className="detail-back-btn" onClick={handleBack}>
        <span className="material-symbols-outlined">arrow_back</span>
        Back to Feed
      </button>

      {/* Main 2-Column Split Layout */}
      <div className="detail-split-layout">
        {/* Left / Main Column */}
        <div className="detail-main-column">
          {/* Assignment Header Card */}
          <div className="detail-card">
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

            {/* My Submission / Solution Section */}
            <div className="detail-submission-section">
              <div className="submission-section-header">
                <h2>
                  <span className="material-symbols-outlined" style={{ color: 'var(--brand)', verticalAlign: 'middle', marginRight: '0.5rem' }}>
                    {myDone ? 'task_alt' : 'assignment_turned_in'}
                  </span>
                  My Solution
                </h2>
                {myDone && !isEditing && (
                  <span className="submission-done-badge">
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check_circle</span>
                    Completed
                  </span>
                )}
              </div>

              {/* Form Mode (If not completed OR editing) */}
              {(!myDone || isEditing) ? (
                <form onSubmit={handleSubmitSolution} className="submission-form">
                  {formError && (
                    <div className="submission-error-banner">
                      <span className="material-symbols-outlined">error</span>
                      {formError}
                    </div>
                  )}

                  {/* Solution URL - Mandatory */}
                  <div className="submission-field">
                    <label htmlFor="solutionUrl">
                      Solution Link <span className="field-required">*</span>
                    </label>
                    <div className="input-with-icon">
                      <span className="material-symbols-outlined field-icon">link</span>
                      <input
                        id="solutionUrl"
                        type="text"
                        placeholder="https://github.com/... or LeetCode submission link"
                        value={solutionUrl}
                        onChange={(e) => setSolutionUrl(e.target.value)}
                        required
                        disabled={busy}
                      />
                    </div>
                    <small className="field-hint">Mandatory: Provide link to your code or repository.</small>
                  </div>

                  {/* Grouped Notes / Pattern, Key Insight & Blockers - Optional */}
                  <div className="submission-field">
                    <label htmlFor="notes">
                      Pattern, Key Insight & Blockers <span className="field-optional">(optional)</span>
                    </label>
                    <textarea
                      id="notes"
                      rows={5}
                      placeholder="Share the pattern/strategy used, key insights, or what initially blocked you..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      disabled={busy}
                    />
                  </div>

                  {/* Form Actions */}
                  <div className="submission-form-actions">
                    <button type="submit" className="btn primary-btn" disabled={busy}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px', verticalAlign: 'middle', marginRight: '0.4rem' }}>
                        send
                      </span>
                      {myDone ? 'Save Changes' : 'Submit & Mark Completed'}
                    </button>
                    {isEditing && (
                      <button type="button" className="btn ghost" onClick={handleCancelEdit} disabled={busy}>
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              ) : (
                /* View Mode (Completed state summary card) */
                <div className="submission-view-card">
                  <div className="submission-view-item">
                    <span className="submission-view-label">Solution Link</span>
                    <a
                      href={myCompletion.solutionUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="submission-link-pill"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>link</span>
                      <span>{myCompletion.solutionUrl}</span>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>open_in_new</span>
                    </a>
                  </div>

                  {(myCompletion.notes || myCompletion.keyInsight) && (
                    <div className="submission-view-item">
                      <span className="submission-view-label">Pattern, Key Insight & Blockers</span>
                      <div className="submission-box insight-box">
                        <span className="material-symbols-outlined box-icon">notes</span>
                        <p style={{ whiteSpace: 'pre-wrap' }}>{myCompletion.notes || myCompletion.keyInsight}</p>
                      </div>
                    </div>
                  )}

                  <div className="submission-view-actions">
                    <button type="button" className="btn ghost" onClick={handleStartEdit} disabled={busy}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px', verticalAlign: 'middle', marginRight: '0.3rem' }}>
                        edit
                      </span>
                      Edit My Solution
                    </button>
                    <button type="button" className="linkish danger" onClick={handleUnmarkDone} disabled={busy}>
                      Unmark as Completed
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Discussion Section */}
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

        {/* Right Column / Panel: Completed Colleagues */}
        <aside className="detail-sidebar-column">
          {/* Progress Ring Card */}
          <div className="sidebar-card sidebar-progress-card">
            <h3 className="sidebar-card-title">Completion Progress</h3>
            <div className="completion-ring-wrap">
              <svg width="90" height="90" viewBox="0 0 100 100">
                <circle
                  cx="50" cy="50" r={RADIUS}
                  fill="none"
                  stroke="var(--line)"
                  strokeWidth="10"
                />
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

          {/* Completed Colleagues List Card */}
          <div className="sidebar-card completed-colleagues-card">
            <div className="sidebar-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="sidebar-card-title" style={{ margin: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px', verticalAlign: 'middle', marginRight: '0.4rem', color: 'var(--brand)' }}>
                  group
                </span>
                Completed ({completedColleagues.length})
              </h3>
              {completedColleagues.length > 0 && (
                <button
                  type="button"
                  className="linkish"
                  style={{ fontSize: '0.8rem', fontWeight: 600 }}
                  onClick={toggleExpandAll}
                >
                  {forceExpandedAll === true ? 'Collapse All' : 'Expand All'}
                </button>
              )}
            </div>

            {completedColleagues.length === 0 ? (
              <div className="empty-colleagues-state">
                <span className="material-symbols-outlined empty-icon">pending_actions</span>
                <p>No completions yet.</p>
                <small className="muted">Be the first colleague to submit your solution!</small>
              </div>
            ) : (
              <div className="completed-colleagues-list">
                {completedColleagues.map((item) => (
                  <ColleagueCard
                    key={item.id}
                    item={item}
                    currentUserId={user?.uid}
                    forceExpanded={forceExpandedAll}
                  />
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Celebration Toast Notification */}
      {showCelebration && (
        <div className="celebration-toast-overlay">
          <div className="celebration-toast">
            <div className="celebration-icon-wrap">
              <span className="material-symbols-outlined celebration-check">task_alt</span>
            </div>
            <div className="celebration-text">
              <h3>🎉 Assignment Completed!</h3>
              <p>Awesome work! Your solution & details have been saved.</p>
            </div>
            <button
              type="button"
              className="celebration-close-btn"
              onClick={() => setShowCelebration(false)}
              aria-label="Close notification"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
