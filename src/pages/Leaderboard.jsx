import { useMemo, useState } from 'react';
import { useAuth } from '../AuthContext';
import { useConcepts, useAssignments, useCompletions, useEvents, useUsers } from '../hooks';

const getUserAvatar = (name) => {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0F6B4C&color=fff&bold=true&size=128`;
};

export default function Leaderboard() {
  const { user } = useAuth();
  const { concepts, loading: conceptsLoading } = useConcepts();
  const { assignments, loading: assignmentsLoading } = useAssignments();
  const { completions, loading: completionsLoading } = useCompletions();
  const { events, loading: eventsLoading } = useEvents();
  const { users, loading: usersLoading } = useUsers();

  const [selectedConceptId, setSelectedConceptId] = useState('overall');
  const [timeframe, setTimeframe] = useState('monthly'); // 'monthly' or 'all-time'

  const loading =
    conceptsLoading || assignmentsLoading || completionsLoading || eventsLoading || usersLoading;

  // Determine active month/year for monthly timeframe filtering
  const { filterYear, filterMonth, monthLabel } = useMemo(() => {
    let year = new Date().getFullYear();
    let month = new Date().getMonth() + 1; // 1-indexed

    // Fallback: If there are no assignments in the current system month,
    // default to the month of the latest scheduled assignment in the database.
    const hasAssignmentsInCurrentMonth = assignments.some((a) => {
      const parts = a.date.split('-');
      return parts.length === 3 && parseInt(parts[0], 10) === year && parseInt(parts[1], 10) === month;
    });

    if (!hasAssignmentsInCurrentMonth && assignments.length > 0) {
      const sorted = [...assignments].sort((a, b) => b.date.localeCompare(a.date));
      const parts = sorted[0].date.split('-');
      if (parts.length === 3) {
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10);
      }
    }

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    return {
      filterYear: year,
      filterMonth: month,
      monthLabel: `${monthNames[month - 1]} ${year}`,
    };
  }, [assignments]);

  const standings = useMemo(() => {
    if (loading || !user) return [];

    return users.map((u) => {
      const isMe = u.id === user.uid;
      const displayName = isMe ? 'You' : u.displayName || u.email?.split('@')[0] || 'Member';

      // 1. Calculate Completed Assignments
      const userCompletions = completions.filter((c) => c.userId === u.id && c.done === true);
      const completedAssignments = assignments.filter((a) => {
        const isDone = userCompletions.some((c) => c.assignmentId === a.id);
        if (!isDone) return false;

        // Concept Filter
        if (selectedConceptId !== 'overall' && a.conceptId !== selectedConceptId) {
          return false;
        }

        // Timeframe Filter
        if (timeframe === 'monthly') {
          const parts = a.date.split('-');
          if (parts.length !== 3) return false;
          return parseInt(parts[0], 10) === filterYear && parseInt(parts[1], 10) === filterMonth;
        }

        return true;
      });

      // Total assignments count for this concept and timeframe
      const totalConceptAssignments = assignments.filter((a) => {
        if (selectedConceptId !== 'overall' && a.conceptId !== selectedConceptId) {
          return false;
        }
        if (timeframe === 'monthly') {
          const parts = a.date.split('-');
          if (parts.length !== 3) return false;
          return parseInt(parts[0], 10) === filterYear && parseInt(parts[1], 10) === filterMonth;
        }
        return true;
      });

      // 2. Calculate Event RSVPs
      const rsvpEvents = events.filter((e) => {
        const isRsvpd = e.rsvps.includes(u.id);
        if (!isRsvpd) return false;

        // Timeframe Filter (Events are global, so we only filter by month if timeframe is monthly)
        if (timeframe === 'monthly') {
          const parts = e.date.split('-');
          if (parts.length !== 3) return false;
          return parseInt(parts[0], 10) === filterYear && parseInt(parts[1], 10) === filterMonth;
        }

        return true;
      });

      const completedCount = completedAssignments.length;
      const totalCount = totalConceptAssignments.length;
      const rsvpCount = rsvpEvents.length;

      // Point Calculation Formula:
      // +20 points per assignment completed
      // +50 points per event RSVP'd
      const points = completedCount * 20 + rsvpCount * 50;

      return {
        userId: u.id,
        displayName,
        email: u.email,
        isMe,
        completedCount,
        totalCount,
        rsvpCount,
        points,
        avatarUrl: getUserAvatar(u.displayName || u.email?.split('@')[0] || 'Member'),
      };
    }).sort((a, b) => {
      // Primary sort: Points (descending)
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      // Secondary sort: Completed Count (descending)
      if (b.completedCount !== a.completedCount) {
        return b.completedCount - a.completedCount;
      }
      // Tertiary sort: Display Name alphabetically
      return a.displayName.localeCompare(b.displayName);
    });
  }, [users, assignments, completions, events, selectedConceptId, timeframe, filterYear, filterMonth, loading, user]);

  const selectedConcept = concepts.find((c) => c.id === selectedConceptId) || null;

  // Split standings into Podium (Top 3) and Rankings (Rank 4+)
  const top1 = standings[0] || null;
  const top2 = standings[1] || null;
  const top3 = standings[2] || null;
  const otherRanks = standings.slice(3);

  return (
    <div className="leaderboard-page">
      {/* Page Header & Controls */}
      <div className="leaderboard-header-row">
        <div className="leaderboard-title">
          <h2>
            {selectedConceptId === 'overall' 
              ? 'Overall Standings' 
              : `${selectedConcept?.title || 'Track'} Standings`}
          </h2>
          <p className="muted">
            Track your progress against colleagues. Timeframe: {timeframe === 'monthly' ? monthLabel : 'All-Time'}
          </p>
        </div>

        <div className="timeframe-toggle">
          <button
            type="button"
            className={`timeframe-btn ${timeframe === 'monthly' ? 'active' : ''}`}
            onClick={() => setTimeframe('monthly')}
          >
            Monthly
          </button>
          <button
            type="button"
            className={`timeframe-btn ${timeframe === 'all-time' ? 'active' : ''}`}
            onClick={() => setTimeframe('all-time')}
          >
            All-Time
          </button>
        </div>
      </div>

      {/* Switcher & Filters */}
      <div className="concept-switcher" style={{ marginBottom: '2rem' }}>
        <label htmlFor="concept-select">Filter Track</label>
        <select
          id="concept-select"
          value={selectedConceptId}
          onChange={(e) => setSelectedConceptId(e.target.value)}
        >
          <option value="overall">Overall (All Tracks)</option>
          {concepts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </div>

      {loading && <p className="muted">Loading standings…</p>}

      {!loading && standings.length === 0 && (
        <div className="empty-dashboard">
          <p className="muted">No colleagues found in the database.</p>
        </div>
      )}

      {!loading && standings.length > 0 && (
        <>
          {/* Podium (Top 3) */}
          <div className="podium-container">
            {/* Rank 2 */}
            {top2 && (
              <div className="podium-card silver">
                <div className="podium-avatar-wrap">
                  <img src={top2.avatarUrl} alt={top2.displayName} className="podium-avatar" />
                  <div className="podium-rank-num">2</div>
                </div>
                <h3>{top2.displayName}</h3>
                <div className="podium-score">
                  <span className="score-value">{top2.points.toLocaleString()}</span>
                  <span className="score-label">Points</span>
                </div>
                <small className="muted" style={{ marginTop: '0.25rem', fontSize: '0.75rem' }}>
                  {top2.completedCount} completed
                </small>
              </div>
            )}

            {/* Rank 1 */}
            {top1 && (
              <div className="podium-card gold">
                <div className="premium-badge">
                  <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                    workspace_premium
                  </span>
                </div>
                <div className="podium-avatar-wrap">
                  <img src={top1.avatarUrl} alt={top1.displayName} className="podium-avatar" />
                  <div className="podium-rank-num">1</div>
                </div>
                <h3>{top1.displayName}</h3>
                <div className="podium-score">
                  <span className="score-value">{top1.points.toLocaleString()}</span>
                  <span className="score-label">Points</span>
                </div>
                <small className="muted" style={{ marginTop: '0.25rem', fontSize: '0.75rem' }}>
                  {top1.completedCount} completed
                </small>
              </div>
            )}

            {/* Rank 3 */}
            {top3 && (
              <div className="podium-card bronze">
                <div className="podium-avatar-wrap">
                  <img src={top3.avatarUrl} alt={top3.displayName} className="podium-avatar" />
                  <div className="podium-rank-num">3</div>
                </div>
                <h3>{top3.displayName}</h3>
                <div className="podium-score">
                  <span className="score-value">{top3.points.toLocaleString()}</span>
                  <span className="score-label">Points</span>
                </div>
                <small className="muted" style={{ marginTop: '0.25rem', fontSize: '0.75rem' }}>
                  {top3.completedCount} completed
                </small>
              </div>
            )}
          </div>

          {/* Table (Ranks 4+) */}
          {otherRanks.length > 0 && (
            <div className="leaderboard-table-card">
              <div className="table-wrap" style={{ border: 'none', boxShadow: 'none', borderRadius: '0' }}>
                <table className="leaderboard-table">
                  <thead>
                    <tr>
                      <th style={{ width: '80px', textAlign: 'center' }}>Rank</th>
                      <th>Colleague</th>
                      <th style={{ textAlign: 'center' }}>Completed</th>
                      <th style={{ textAlign: 'right', width: '120px' }}>Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {otherRanks.map((item, idx) => {
                      const rankNum = idx + 4;
                      const percent = item.totalCount > 0 
                        ? Math.round((item.completedCount / item.totalCount) * 100) 
                        : 0;
                      return (
                        <tr 
                          key={item.userId} 
                          className={`table-row-hover ${item.isMe ? 'current-user' : ''}`}
                        >
                          <td style={{ textAlign: 'center', fontWeight: '800' }}>
                            <span style={{ fontSize: '1.2rem', color: item.isMe ? 'var(--brand)' : 'var(--muted)' }}>
                              {rankNum}
                            </span>
                          </td>
                          <td>
                            <div className="colleague-cell">
                              <img src={item.avatarUrl} alt={item.displayName} className="colleague-avatar" />
                              <span style={{ fontWeight: item.isMe ? '700' : '500' }}>
                                {item.displayName}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div className="progress-cell-content">
                              <div className="progress-bar-mini">
                                <div 
                                  className="progress-fill-mini" 
                                  style={{ 
                                    width: `${percent}%`, 
                                    backgroundColor: item.isMe ? 'var(--brand)' : 'var(--brand)'
                                  }}
                                ></div>
                              </div>
                              <span style={{ fontSize: '0.85rem', fontWeight: item.isMe ? '700' : '400' }}>
                                {item.completedCount}/{item.totalCount}
                              </span>
                            </div>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: '800', fontSize: '1.1rem', color: item.isMe ? 'var(--brand)' : 'var(--ink)' }}>
                            {item.points.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
