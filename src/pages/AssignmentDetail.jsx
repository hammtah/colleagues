import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import CommentThread from '../components/CommentThread';
import { AssignmentComposer } from '../components/ModeratorForms';
import GamifiedCompletionModal from '../components/GamifiedCompletionModal';
import {
  useAssignments,
  useCompletions,
  useUsers,
  useEvents,
  setCompletion,
  deleteAssignment,
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

  const hasContent = Boolean(item.solutionUrl || groupedNotes);

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
          <span className="expand-label">{expanded ? 'Hide Details' : hasContent ? 'View Solution' : 'View Status'}</span>
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
          ) : null}

          {/* Grouped Pattern, Key Insight & Blockers */}
          {groupedNotes ? (
            <div className="colleague-detail-box insight">
              <div className="box-header">
                <span className="material-symbols-outlined">notes</span>
                <span>Pattern, Key Insight & Blockers</span>
              </div>
              <p style={{ whiteSpace: 'pre-wrap' }}>{groupedNotes}</p>
            </div>
          ) : null}

          {!item.solutionUrl && !groupedNotes && (
            <span className="muted" style={{ fontSize: '0.85rem' }}>✓ Completed (No submission details required)</span>
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
  const { user, isModerator } = useAuth();

  const conceptId = searchParams.get('concept') || '';

  const { assignments, loading: assignmentsLoading } = useAssignments(conceptId || null);
  const { completions, loading: completionsLoading } = useCompletions();
  const { users, loading: usersLoading } = useUsers();
  const { events, loading: eventsLoading } = useEvents();

  const [isEditing, setIsEditing] = useState(false);
  const [isModEditing, setIsModEditing] = useState(false);
  const [solutionUrl, setSolutionUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [forceExpandedAll, setForceExpandedAll] = useState(null);
  const [showGameModal, setShowGameModal] = useState(false);
  const [gamifiedPrevPoints, setGamifiedPrevPoints] = useState(0);

  const loading = assignmentsLoading || completionsLoading || usersLoading || eventsLoading;

  const assignment = useMemo(
    () => assignments.find((a) => a.id === assignmentId) || null,
    [assignments, assignmentId]
  );

  const linkMode = assignment ? (assignment.linkMode || 'required') : 'required';
  const noteMode = assignment ? (assignment.noteMode || 'optional') : 'optional';
  const isNoFieldsSubmission = linkMode === 'none' && noteMode === 'none';

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

  // Compute user stats (completed count & total points)
  const myStats = useMemo(() => {
    if (!user) return { totalPoints: 0, completedCount: 0 };
    const userDoneCompletions = completions.filter((c) => c.userId === user.uid && c.done === true);
    const userRsvpEvents = events.filter((e) => e.rsvps?.includes(user.uid));
    const completedCount = userDoneCompletions.length;
    const totalPoints = completedCount * 20 + userRsvpEvents.length * 50;
    return { totalPoints, completedCount };
  }, [user, completions, events]);

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

  const handleQuickToggleDone = async () => {
    if (!assignment || !user || locked) return;
    setBusy(true);
    try {
      const nextDone = !myDone;
      const calculatedPrev = myDone
        ? Math.max(0, myStats.totalPoints - 20)
        : myStats.totalPoints;
      setGamifiedPrevPoints(calculatedPrev);

      await setCompletion(assignment.id, user.uid, nextDone);
      if (nextDone) {
        setShowGameModal(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  const handleSubmitSolution = async (e) => {
    e.preventDefault();
    if (!assignment || !user || locked) return;

    let url = solutionUrl.trim();
    if (linkMode === 'required' && !url) {
      setFormError('Solution link is mandatory for this assignment.');
      return;
    }

    if (linkMode === 'none') {
      url = '';
    } else if (url && !/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }

    let noteText = notes.trim();
    if (noteMode === 'required' && !noteText) {
      setFormError('Notes / Key Insights are mandatory for this assignment.');
      return;
    }
    if (noteMode === 'none') {
      noteText = '';
    }

    setBusy(true);
    setFormError('');
    try {
      const calculatedPrev = myDone
        ? Math.max(0, myStats.totalPoints - 20)
        : myStats.totalPoints;
      setGamifiedPrevPoints(calculatedPrev);

      await setCompletion(assignment.id, user.uid, true, {
        solutionUrl: url,
        notes: noteText,
      });
      setIsEditing(false);
      setShowGameModal(true);
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

  const handleDeleteAssignment = async () => {
    if (!assignment || !isModerator) return;
    if (!window.confirm(`Delete assignment "${assignment.title}"? This cannot be undone.`)) return;
    try {
      await deleteAssignment(assignment.id);
      handleBack();
    } catch (err) {
      console.error('Failed to delete assignment', err);
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

                <span className="requirement-tag" style={{ marginLeft: 'auto', fontSize: '0.8rem', padding: '0.2rem 0.5rem', background: 'var(--surface-hover)', borderRadius: '6px', color: 'var(--muted)' }}>
                  {isNoFieldsSubmission
                    ? 'No Submission Required'
                    : linkMode === 'required'
                    ? 'Link Required'
                    : noteMode === 'required'
                    ? 'Note Required'
                    : 'Optional Submission'}
                </span>

                {isModerator && (
                  <div className="mod-assignment-actions" style={{ marginLeft: '0.5rem', display: 'flex', gap: '0.3rem' }}>
                    <button
                      type="button"
                      className="btn ghost icon-btn"
                      onClick={() => setIsModEditing((v) => !v)}
                      title="Edit Assignment"
                      style={{ padding: '0.2rem 0.4rem' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit</span>
                    </button>
                    <button
                      type="button"
                      className="btn ghost icon-btn danger"
                      onClick={handleDeleteAssignment}
                      title="Delete Assignment"
                      style={{ padding: '0.2rem 0.4rem' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                    </button>
                  </div>
                )}
              </div>

              {isModEditing ? (
                <div style={{ marginTop: '1rem', padding: '1rem', border: '1px solid var(--line)', borderRadius: '12px', background: 'var(--surface)' }}>
                  <AssignmentComposer
                    conceptId={assignment.conceptId}
                    editingAssignment={assignment}
                    onCancel={() => setIsModEditing(false)}
                    onSaved={() => setIsModEditing(false)}
                  />
                </div>
              ) : (
                <>
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
                </>
              )}
            </div>

            {/* My Submission / Solution Section */}
            <div className="detail-submission-section">
              <div className="submission-section-header">
                <h2>
                  <span className="material-symbols-outlined" style={{ color: 'var(--brand)', verticalAlign: 'middle', marginRight: '0.5rem' }}>
                    {myDone ? 'task_alt' : 'assignment_turned_in'}
                  </span>
                  {isNoFieldsSubmission ? 'Assignment Completion' : 'My Solution'}
                </h2>
                {myDone && (
                  <span className="submission-done-badge">
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check_circle</span>
                    Completed
                  </span>
                )}
              </div>

              {/* Simple No-Fields Submission */}
              {isNoFieldsSubmission ? (
                <div className="no-fields-submission-card" style={{ background: 'var(--surface-hover)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '28px', color: 'var(--brand)' }}>verified</span>
                    <div>
                      <strong style={{ fontSize: '0.98rem' }}>
                        {myDone ? 'You have completed this assignment' : 'No submission link or notes required'}
                      </strong>
                      <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
                        {myDone ? 'You can unmark it at any time if needed.' : 'Click below to mark this assignment as completed directly.'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`btn ${myDone ? 'ghost danger' : 'primary-btn'}`}
                    onClick={handleQuickToggleDone}
                    disabled={busy}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.75rem 1rem' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                      {myDone ? 'cancel' : 'check_circle'}
                    </span>
                    {myDone ? 'Mark as Uncompleted' : 'Mark as Completed'}
                  </button>
                </div>
              ) : (!myDone || isEditing) ? (
                <form onSubmit={handleSubmitSolution} className="submission-form">
                  {formError && (
                    <div className="submission-error-banner">
                      <span className="material-symbols-outlined">error</span>
                      {formError}
                    </div>
                  )}

                  {/* Solution URL - Only if linkMode !== 'none' */}
                  {linkMode !== 'none' && (
                    <div className="submission-field">
                      <label htmlFor="solutionUrl">
                        Solution Link {linkMode === 'required' ? <span className="field-required">*</span> : <span className="field-optional">(optional)</span>}
                      </label>
                      <div className="input-with-icon">
                        <span className="material-symbols-outlined field-icon">link</span>
                        <input
                          id="solutionUrl"
                          type="text"
                          placeholder="https://github.com/... or submission link"
                          value={solutionUrl}
                          onChange={(e) => setSolutionUrl(e.target.value)}
                          required={linkMode === 'required'}
                          disabled={busy}
                        />
                      </div>
                      <small className="field-hint">
                        {linkMode === 'required' ? 'Mandatory: Provide link to your code or repository.' : 'Optional: Provide link to your code or repository if applicable.'}
                      </small>
                    </div>
                  )}

                  {/* Grouped Notes / Pattern, Key Insight & Blockers - Only if noteMode !== 'none' */}
                  {noteMode !== 'none' && (
                    <div className="submission-field">
                      <label htmlFor="notes">
                        Pattern, Key Insight & Blockers {noteMode === 'required' ? <span className="field-required">*</span> : <span className="field-optional">(optional)</span>}
                      </label>
                      <textarea
                        id="notes"
                        rows={4}
                        placeholder="Share the pattern/strategy used, key insights, or what initially blocked you..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        required={noteMode === 'required'}
                        disabled={busy}
                      />
                    </div>
                  )}

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
                  {linkMode !== 'none' && myCompletion.solutionUrl ? (
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
                  ) : null}

                  {noteMode !== 'none' && (myCompletion.notes || myCompletion.keyInsight) ? (
                    <div className="submission-view-item">
                      <span className="submission-view-label">Pattern, Key Insight & Blockers</span>
                      <div className="submission-box insight-box">
                        <span className="material-symbols-outlined box-icon">notes</span>
                        <p style={{ whiteSpace: 'pre-wrap' }}>{myCompletion.notes || myCompletion.keyInsight}</p>
                      </div>
                    </div>
                  ) : null}

                  {!myCompletion.solutionUrl && !(myCompletion.notes || myCompletion.keyInsight) && (
                    <div className="submission-view-item">
                      <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>✓ Completed (No submission details required).</p>
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

      {/* Gamified Points Completion Modal */}
      <GamifiedCompletionModal
        isOpen={showGameModal}
        onClose={() => setShowGameModal(false)}
        prevPoints={gamifiedPrevPoints}
        pointsAdded={20}
        assignmentTitle={assignment?.title}
        userName={user?.displayName || user?.email?.split('@')[0] || 'Member'}
        userEmail={user?.email || ''}
        userPhotoUrl={user?.photoURL || ''}
      />
    </div>
  );
}
