import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useAssignments, useCompletions, useUsers } from '../hooks';
import { getAvatarBackgroundColor } from '../utils/avatar';

const REACTION_EMOJIS = ['🧠', '👍', '🔥'];

function SubmissionCard({ completion, assignment, usersById }) {
  const reactions = completion.reactions || {};
  const REACTION_EMOJIS_LOCAL = ['🧠', '👍', '🔥'];

  const totalReactions = REACTION_EMOJIS_LOCAL.reduce(
    (sum, e) => sum + (reactions[e] || []).length,
    0
  );

  return (
    <Link
      to={`/assignment/${assignment.id}`}
      className="profile-submission-card"
      aria-label={`View ${assignment.title}`}
    >
      <div className="profile-submission-header">
        <div className="profile-submission-title-row">
          <span className="profile-submission-title">{assignment.title}</span>
          <span className="material-symbols-outlined profile-submission-chevron">
            chevron_right
          </span>
        </div>
        {assignment.date && (
          <span className="profile-submission-date muted">{assignment.date}</span>
        )}
      </div>

      <div className="profile-reactions-row">
        {REACTION_EMOJIS_LOCAL.map((emoji) => {
          const uids = reactions[emoji] || [];
          const count = uids.length;
          const names = uids.map(
            (uid) =>
              usersById[uid]?.displayName ||
              usersById[uid]?.email?.split('@')[0] ||
              'Colleague'
          );
          return (
            <div
              key={emoji}
              className={`profile-reaction-item ${count === 0 ? 'zero' : 'has-reactions'}`}
              title={count > 0 ? `${names.join(', ')}` : `No ${emoji} reactions yet`}
            >
              <span className="profile-reaction-emoji">{emoji}</span>
              <span className="profile-reaction-count">{count}</span>
              {count > 0 && (
                <span className="profile-reactor-names">{names.join(', ')}</span>
              )}
            </div>
          );
        })}
        {totalReactions === 0 && (
          <span className="profile-no-reactions muted">No reactions yet</span>
        )}
      </div>
    </Link>
  );
}

export default function Profile() {
  const { user, profile, isModerator, logout } = useAuth();
  const { assignments, loading: assignmentsLoading } = useAssignments();
  const { completions, loading: completionsLoading } = useCompletions();
  const { users, loading: usersLoading } = useUsers();

  const loading = assignmentsLoading || completionsLoading || usersLoading;

  const usersById = useMemo(
    () => Object.fromEntries(users.map((u) => [u.id, u])),
    [users]
  );

  const assignmentsById = useMemo(
    () => Object.fromEntries(assignments.map((a) => [a.id, a])),
    [assignments]
  );

  // My completed submissions
  const mySubmissions = useMemo(() => {
    if (!user) return [];
    return completions
      .filter((c) => c.userId === user.uid && c.done)
      .map((c) => ({
        completion: c,
        assignment: assignmentsById[c.assignmentId],
      }))
      .filter((item) => item.assignment)
      .sort((a, b) => {
        const aTime = a.completion.updatedAt?.seconds ?? 0;
        const bTime = b.completion.updatedAt?.seconds ?? 0;
        return bTime - aTime;
      });
  }, [completions, user, assignmentsById]);

  // Total reactions received across all my submissions
  const totalReactionsReceived = useMemo(() => {
    return mySubmissions.reduce((total, { completion }) => {
      const reactions = completion.reactions || {};
      return (
        total +
        REACTION_EMOJIS.reduce((s, e) => s + (reactions[e] || []).length, 0)
      );
    }, 0);
  }, [mySubmissions]);

  const name = profile?.displayName || user?.email?.split('@')[0] || 'Member';
  const userKey = profile?.email || name;
  const bgColor = getAvatarBackgroundColor(userKey);
  const avatarUrl =
    user?.photoURL ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      name
    )}&background=${bgColor}&color=fff&bold=true&size=128`;

  const memberSince = (() => {
    if (!profile?.createdAt) return null;
    const ts = profile.createdAt;
    const date = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts.seconds * 1000);
    return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  })();

  return (
    <div className="profile-page">
      {/* Identity Card */}
      <div className="profile-header-card">
        <img src={avatarUrl} alt={name} className="profile-avatar" />
        <div className="profile-identity">
          <div className="profile-name-row">
            <h1 className="profile-name">{name}</h1>
            <span className={`profile-role-chip ${isModerator ? 'moderator' : ''}`}>
              {isModerator ? 'Moderator' : 'Member'}
            </span>
          </div>
          {memberSince && (
            <p className="profile-since muted">Member since {memberSince}</p>
          )}
          <div className="profile-stat-pills">
            <span className="profile-stat-pill">
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                task_alt
              </span>
              {mySubmissions.length} submission{mySubmissions.length !== 1 ? 's' : ''}
            </span>
            <span className="profile-stat-pill">
              <span style={{ fontSize: '15px', lineHeight: 1 }}>🔥</span>
              {totalReactionsReceived} reaction{totalReactionsReceived !== 1 ? 's' : ''} received
            </span>
          </div>
        </div>
        <button
          type="button"
          className="btn ghost profile-signout-btn"
          onClick={logout}
          title="Sign out"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            logout
          </span>
          Sign out
        </button>
      </div>

      {/* Submissions Section */}
      <section className="profile-submissions-section">
        <h2 className="profile-section-title">
          <span className="material-symbols-outlined" style={{ fontSize: '20px', verticalAlign: 'middle', marginRight: '0.4rem', color: 'var(--brand)' }}>
            assignment_turned_in
          </span>
          My Submissions
        </h2>

        {loading ? (
          <div className="profile-loading">
            <div className="auth-loading-spinner" />
            <p className="muted">Loading submissions…</p>
          </div>
        ) : mySubmissions.length === 0 ? (
          <div className="profile-empty-state">
            <span className="material-symbols-outlined profile-empty-icon">inbox</span>
            <p>No submissions yet.</p>
            <small className="muted">Complete an assignment to see it here.</small>
          </div>
        ) : (
          <div className="profile-submissions-list">
            {mySubmissions.map(({ completion, assignment }) => (
              <SubmissionCard
                key={completion.id}
                completion={completion}
                assignment={assignment}
                usersById={usersById}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
