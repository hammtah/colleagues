import { useMemo, useState } from 'react';
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
import { useCompletions, useAssignments, useUsers } from '../hooks';
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

export default function Progress() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { completions, loading: loadingCompletions } = useCompletions();
  const { assignments, loading: loadingAssignments } = useAssignments();
  const { users, loading: loadingUsers } = useUsers();

  const [viewMode, setViewMode] = useState('daily'); // 'daily' | 'weekly'
  const [scope, setScope] = useState('mine'); // 'mine' | 'team'

  const isDark = theme === 'dark';
  const loading = loadingCompletions || loadingAssignments || loadingUsers;

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
      const dateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD
      const shortLabel = d.toLocaleDateString(undefined, { weekday: 'short' });
      const fullLabel = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
      days.push({
        dateKey: dateStr,
        label: shortLabel,
        fullLabel,
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

      // Find start of week (Monday)
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

  // Key metrics
  const totalUserCompleted = useMemo(() => {
    return processedCompletions.filter((c) => c.userId === user?.uid).length;
  }, [processedCompletions, user?.uid]);

  const totalUserPoints = totalUserCompleted * 20;
  const totalAssignmentsCount = assignments.length;

  // Completion Rate %
  const completionRate = useMemo(() => {
    if (!totalAssignmentsCount) return 0;
    return Math.min(100, Math.round((totalUserCompleted / totalAssignmentsCount) * 100));
  }, [totalAssignmentsCount, totalUserCompleted]);

  // Daily Average Pace
  const dailyAverage = useMemo(() => {
    const totalDaily = dailyData.reduce((acc, d) => acc + d.completed, 0);
    return (totalDaily / dailyData.length).toFixed(1);
  }, [dailyData]);

  const chartData = viewMode === 'daily' ? dailyData : weeklyData;

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
    <div className="progress-page">
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

      {/* Main Curved Wave Chart Section */}
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
            <AreaChart data={chartData} margin={{ top: 25, right: 20, left: -20, bottom: 15 }}>
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
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ stroke: 'var(--brand)', strokeWidth: 1, strokeDasharray: '4 4' }}
              />
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

      {/* Streamlined Stat Cards Row Below Chart */}
      <section className="progress-kpi-grid combined-kpi-grid">
        <div className="kpi-card wave-kpi-card">
          <div className="kpi-info">
            <span className="kpi-label">Average Daily Pace</span>
            <span className="kpi-value">{dailyAverage} <span className="kpi-unit">/ day</span></span>
            <span className="muted text-xs">Pace over current period</span>
          </div>
          <div className="kpi-icon-wrap brand-bg">
            <span className="material-symbols-outlined">schedule</span>
          </div>
        </div>

        {/* Combined Completion & Visual Progress Bar Card */}
        <div className="kpi-card wave-kpi-card combined-progress-card">
          <div className="combined-progress-content">
            <div className="combined-card-header">
              <div>
                <span className="kpi-label">Curriculum Completion</span>
                <div className="combined-value-row">
                  <span className="kpi-value">
                    {totalUserCompleted} <span className="kpi-unit">/ {totalAssignmentsCount || 0} finished</span>
                  </span>
                  <span className="progress-badge">{completionRate}%</span>
                </div>
              </div>
              <div className="kpi-icon-wrap accent-bg">
                <span className="material-symbols-outlined">task_alt</span>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="visual-progress-container" title={`${completionRate}% Completed`}>
              <div className="visual-progress-track">
                <div
                  className="visual-progress-fill"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </div>

            <div className="combined-card-footer">
              <span className="muted text-xs">Score: <strong>{totalUserPoints} pts</strong></span>
              <span className="muted text-xs">
                {totalAssignmentsCount - totalUserCompleted > 0
                  ? `${totalAssignmentsCount - totalUserCompleted} remaining`
                  : 'All completed! 🎉'}
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
