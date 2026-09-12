import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { useAuth } from '../AuthContext';
import { useCompletions, useAssignments, useUsers, useEvents } from '../hooks';
import { useTheme } from '../ThemeContext';

// Custom Chart Tooltip
function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const value = payload[0].value;
    return (
      <div className="chart-tooltip-card">
        <p className="tooltip-label">{label}</p>
        <p className="tooltip-value">
          <span className="tooltip-count">{value}</span> {value === 1 ? 'assignment' : 'assignments'} completed
        </p>
      </div>
    );
  }
  return null;
}

// Static preview data shown ONLY when locked (prevents inspector from revealing real user data)
const STATIC_LOCKED_PREVIEW_DATA = [
  { label: 'Mon', completed: 2 },
  { label: 'Tue', completed: 4 },
  { label: 'Wed', completed: 1 },
  { label: 'Thu', completed: 5 },
  { label: 'Fri', completed: 3 },
  { label: 'Sat', completed: 4 },
  { label: 'Sun', completed: 2 },
];

export default function Progress() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { completions, loading: loadingCompletions } = useCompletions();
  const { assignments, loading: loadingAssignments } = useAssignments();
  const { users, loading: loadingUsers } = useUsers();
  const { events, loading: loadingEvents } = useEvents();

  const [viewMode, setViewMode] = useState('daily'); // 'daily' | 'weekly'
  const [scope, setScope] = useState('mine'); // 'mine' | 'team'

  const isDark = theme === 'dark';
  const loading = loadingCompletions || loadingAssignments || loadingUsers || loadingEvents;

  // Map assignments by ID for quick date lookups
  const assignmentMap = useMemo(() => {
    const map = new Map();
    assignments.forEach((a) => map.set(a.id, a));
    return map;
  }, [assignments]);

  // Extract completion dates accurately
  const processedCompletions = useMemo(() => {
    return completions
      .filter((c) => c.done)
      .map((c) => {
        let dateObj = null;

        if (c.updatedAt) {
          if (typeof c.updatedAt.toDate === 'function') {
            dateObj = c.updatedAt.toDate();
          } else if (c.updatedAt.seconds) {
            dateObj = new Date(c.updatedAt.seconds * 1000);
          } else if (c.updatedAt instanceof Date) {
            dateObj = c.updatedAt;
          }
        }

        // Fallback to assignment date if completion timestamp is not set
        if (!dateObj && c.assignmentId) {
          const assign = assignmentMap.get(c.assignmentId);
          if (assign?.date) {
            dateObj = new Date(assign.date);
          }
        }

        return {
          ...c,
          completionDate: dateObj || new Date(),
        };
      });
  }, [completions, assignmentMap]);

  // Count user RSVP events for total points calculation
  const userRsvpCount = useMemo(() => {
    if (!events || !user?.uid) return 0;
    return events.filter((e) => Array.isArray(e.rsvps) && e.rsvps.includes(user.uid)).length;
  }, [events, user?.uid]);

  // Total points for current logged-in user (20 pts per assignment, 50 pts per event RSVP)
  const totalUserCompleted = useMemo(() => {
    return processedCompletions.filter((c) => c.userId === user?.uid).length;
  }, [processedCompletions, user?.uid]);

  const userPoints = totalUserCompleted * 20 + userRsvpCount * 50;
  const REQUIRED_POINTS = 180;
  const isUnlocked = userPoints >= REQUIRED_POINTS;
  const pointsProgress = Math.min(100, Math.round((userPoints / REQUIRED_POINTS) * 100));
  const pointsNeeded = Math.max(0, REQUIRED_POINTS + 1 - userPoints);

  // Filter completions based on scope ('mine' vs 'team')
  const filteredCompletions = useMemo(() => {
    if (scope === 'mine') {
      return processedCompletions.filter((c) => c.userId === user?.uid);
    }
    return processedCompletions;
  }, [processedCompletions, scope, user?.uid]);

  // Aggregate daily data (last 7 days)
  const dailyData = useMemo(() => {
    const days = [];
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const shortLabel = d.toLocaleDateString(undefined, { weekday: 'short' });
      days.push({
        dateKey: dateStr,
        label: shortLabel,
        completed: 0,
      });
    }

    const dayMap = new Map(days.map((d) => [d.dateKey, d]));

    filteredCompletions.forEach((c) => {
      const dateKey = c.completionDate.toISOString().split('T')[0];
      if (dayMap.has(dateKey)) {
        dayMap.get(dateKey).completed += 1;
      }
    });

    return days;
  }, [filteredCompletions]);

  // Aggregate weekly data (last 8 weeks)
  const weeklyData = useMemo(() => {
    const weeks = [];
    const now = new Date();

    for (let i = 7; i >= 0; i--) {
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() - i * 7);

      const day = weekEnd.getDay();
      const diffToMon = weekEnd.getDate() - day + (day === 0 ? -6 : 1);
      const weekStart = new Date(weekEnd.setDate(diffToMon));
      weekStart.setHours(0, 0, 0, 0);

      const weekStop = new Date(weekStart);
      weekStop.setDate(weekStop.getDate() + 6);
      weekStop.setHours(23, 59, 59, 999);

      const label = `Wk ${weekStart.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}`;

      weeks.push({
        weekStart,
        weekStop,
        label,
        completed: 0,
      });
    }

    filteredCompletions.forEach((c) => {
      const time = c.completionDate.getTime();
      weeks.forEach((w) => {
        if (time >= w.weekStart.getTime() && time <= w.weekStop.getTime()) {
          w.completed += 1;
        }
      });
    });

    return weeks;
  }, [filteredCompletions]);

  const totalAssignmentsCount = assignments.length;

  const completionRate = useMemo(() => {
    if (!totalAssignmentsCount) return 0;
    return Math.min(100, Math.round((totalUserCompleted / totalAssignmentsCount) * 100));
  }, [totalAssignmentsCount, totalUserCompleted]);

  const dailyAverage = useMemo(() => {
    const totalDaily = dailyData.reduce((acc, d) => acc + d.completed, 0);
    return (totalDaily / dailyData.length).toFixed(1);
  }, [dailyData]);

  // If locked, supply static dummy preview data so devtools inspection cannot view real metrics
  const activeChartData = isUnlocked
    ? (viewMode === 'daily' ? dailyData : weeklyData)
    : STATIC_LOCKED_PREVIEW_DATA;

  const displayUserCompleted = isUnlocked ? totalUserCompleted : 3;
  const displayCompletionRate = isUnlocked ? completionRate : 40;
  const displayDailyAverage = isUnlocked ? dailyAverage : '2.1';

  if (loading) {
    return (
      <div className="progress-page">
        <div className="progress-loading">
          <div className="auth-loading-spinner" />
          <p className="muted">Loading progress data…</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`progress-page progress-wrapper ${!isUnlocked ? 'is-locked-wrapper' : ''}`}>
      {/* Blurred Preview Dashboard */}
      <div className={`progress-dashboard-content ${!isUnlocked ? 'locked-blurred-content' : ''}`}>
        <header className="progress-header">
          <div>
            <h1 className="page-title">Progress & Activity</h1>
            <p className="muted">Track your assignment completion frequency and performance flow.</p>
          </div>
          <div className="scope-toggle-group">
            <button
              type="button"
              className={`btn small ${scope === 'mine' ? 'primary' : 'ghost'}`}
              onClick={() => setScope('mine')}
            >
              My Stats
            </button>
            <button
              type="button"
              className={`btn small ${scope === 'team' ? 'primary' : 'ghost'}`}
              onClick={() => setScope('team')}
            >
              Team Stats
            </button>
          </div>
        </header>

        {/* Curved Wave Chart Section */}
        <section className="chart-card wave-chart-card">
          <div className="chart-card-header">
            <div>
              <h2 className="chart-title">
                {scope === 'mine' ? 'Weekly Flow Analysis' : 'Team Weekly Flow Analysis'}
              </h2>
              <span className="muted text-xs">
                {viewMode === 'daily' ? 'Daily completion pace' : 'Weekly completion pace'}
              </span>
            </div>

            <div className="view-toggle">
              <button
                type="button"
                className={`toggle-tab ${viewMode === 'daily' ? 'active' : ''}`}
                onClick={() => setViewMode('daily')}
              >
                Daily
              </button>
              <button
                type="button"
                className={`toggle-tab ${viewMode === 'weekly' ? 'active' : ''}`}
                onClick={() => setViewMode('weekly')}
              >
                Weekly
              </button>
            </div>
          </div>

          <div className="chart-container" style={{ width: '100%', height: 340 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activeChartData} margin={{ top: 25, right: 20, left: -20, bottom: 15 }}>
                <defs>
                  <linearGradient id="waveGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--brand, #0f6b4c)" stopOpacity={isDark ? 0.45 : 0.3} />
                    <stop offset="95%" stopColor="var(--brand, #0f6b4c)" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 13, fontWeight: 500 }}
                  axisLine={{ stroke: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}
                  tickLine={false}
                  interval={0}
                  dy={10}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                {isUnlocked && <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--brand)', strokeWidth: 1, strokeDasharray: '4 4' }} />}
                <Area
                  type="monotone"
                  dataKey="completed"
                  stroke="var(--brand, #0f6b4c)"
                  strokeWidth={3.5}
                  fillOpacity={1}
                  fill="url(#waveGradient)"
                  dot={{
                    r: 5,
                    fill: isDark ? '#141e1b' : '#ffffff',
                    stroke: 'var(--brand, #0f6b4c)',
                    strokeWidth: 2.5,
                  }}
                  activeDot={{
                    r: 7,
                    fill: 'var(--brand, #0f6b4c)',
                    stroke: '#ffffff',
                    strokeWidth: 3,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Stat Cards Below Chart */}
        <section className="progress-kpi-grid combined-kpi-grid">
          <div className="kpi-card wave-kpi-card">
            <div className="kpi-info">
              <span className="kpi-label">Average Daily Pace</span>
              <span className="kpi-value">{displayDailyAverage} <span className="kpi-unit">/ day</span></span>
              <span className="muted text-xs">Pace over current period</span>
            </div>
            <div className="kpi-icon-wrap brand-bg">
              <span className="material-symbols-outlined">schedule</span>
            </div>
          </div>

          <div className="kpi-card wave-kpi-card combined-progress-card">
            <div className="combined-progress-content">
              <div className="combined-card-header">
                <div>
                  <span className="kpi-label">Curriculum Completion</span>
                  <div className="combined-value-row">
                    <span className="kpi-value">
                      {displayUserCompleted} <span className="kpi-unit">/ {totalAssignmentsCount || 10} finished</span>
                    </span>
                    <span className="progress-badge">{displayCompletionRate}%</span>
                  </div>
                </div>
                <div className="kpi-icon-wrap accent-bg">
                  <span className="material-symbols-outlined">task_alt</span>
                </div>
              </div>

              <div className="visual-progress-container" title={`${displayCompletionRate}% Completed`}>
                <div className="visual-progress-track">
                  <div
                    className="visual-progress-fill"
                    style={{ width: `${displayCompletionRate}%` }}
                  />
                </div>
              </div>

              <div className="combined-card-footer">
                <span className="muted text-xs">Score: <strong>{isUnlocked ? userPoints : 0} pts</strong></span>
                <span className="muted text-xs">
                  {totalAssignmentsCount - displayUserCompleted > 0
                    ? `${totalAssignmentsCount - displayUserCompleted} remaining`
                    : 'All completed! 🎉'}
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* 🔒 Lock Overlay: Lock Icon + Title + Integrated Progress Bar Widget */}
      {!isUnlocked &&
        createPortal(
          <div className="locked-minimal-overlay">
            <div className="locked-minimal-content">
              <div className="locked-simple-badge">
                <span className="material-symbols-outlined">lock</span>
              </div>
              <h2 className="locked-simple-title">
                Achieve {REQUIRED_POINTS} pts to unlock
              </h2>

              <div className="locked-progress-widget">
                <div className="locked-progress-labels">
                  <span className="muted text-xs font-semibold">PROGRESS</span>
                  <span className="locked-pts-ratio">
                    <strong>{userPoints}</strong> / {REQUIRED_POINTS} pts
                  </span>
                </div>
                <div className="visual-progress-track">
                  <div
                    className="visual-progress-fill"
                    style={{ width: `${pointsProgress}%` }}
                  />
                </div>
                <div className="locked-progress-footer">
                  <span className="muted text-xs">{pointsNeeded} pts remaining</span>
                  <span className="progress-badge-sm">{pointsProgress}%</span>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
