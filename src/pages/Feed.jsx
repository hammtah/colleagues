import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import AssignmentCard from '../components/AssignmentCard';
import { AssignmentComposer } from '../components/ModeratorForms';
import { useAssignments, useCompletions, useConcepts, useUsers } from '../hooks';

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const getFriendlyDateLabel = (dateStr) => {
  if (!dateStr) return '';
  // Force parsing as local date to prevent timezone shift issues
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const d = new Date(year, month, day);
  
  if (isNaN(d.getTime())) return dateStr;
  
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

const getCalendarCells = (year, month) => {
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells = [];

  // Trailing days of previous month
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    cells.push({
      day: daysInPrevMonth - i,
      isCurrentMonth: false,
      dateStr: '',
    });
  }

  // Days of current month
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({
      day: d,
      isCurrentMonth: true,
      dateStr,
    });
  }

  // Fill up grid to 42 cells (6 rows * 7 days)
  const remaining = 42 - cells.length;
  for (let n = 1; n <= remaining; n++) {
    cells.push({
      day: n,
      isCurrentMonth: false,
      dateStr: '',
    });
  }

  return cells;
};

export default function Feed() {
  const { user, isModerator } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { concepts, loading: conceptsLoading } = useConcepts();

  const selectedConceptId = searchParams.get('concept') || '';
  const selectedConcept = concepts.find((c) => c.id === selectedConceptId) || null;

  const { assignments, loading: assignmentsLoading } = useAssignments(
    selectedConceptId || null
  );
  const { completions, loading: completionsLoading } = useCompletions();
  const { users, loading: usersLoading } = useUsers();

  const todayStr = new Date().toLocaleDateString('sv').slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

  const loading =
    conceptsLoading || assignmentsLoading || completionsLoading || usersLoading;

  // Auto-redirect to first concept if none is selected
  useEffect(() => {
    if (conceptsLoading || concepts.length === 0) return;
    const valid = concepts.some((c) => c.id === selectedConceptId);
    if (!valid) {
      setSearchParams({ concept: concepts[0].id }, { replace: true });
    }
  }, [concepts, conceptsLoading, selectedConceptId, setSearchParams]);

  // Align calendar view and active selection to concept's dates
  useEffect(() => {
    if (selectedConcept) {
      const today = new Date().toLocaleDateString('sv').slice(0, 10);
      const inRange = today >= selectedConcept.startDate && today <= selectedConcept.endDate;
      
      const defaultDate = inRange ? today : selectedConcept.startDate;
      setSelectedDate(defaultDate);

      const defaultDateObj = new Date(defaultDate);
      if (!isNaN(defaultDateObj.getTime())) {
        setCalendarMonth(defaultDateObj.getMonth());
        setCalendarYear(defaultDateObj.getFullYear());
      }
    }
  }, [selectedConceptId, selectedConcept]);

  const selectConcept = (conceptId) => {
    if (conceptId) {
      setSearchParams({ concept: conceptId });
    } else {
      setSearchParams({});
    }
  };

  const usersById = useMemo(
    () => Object.fromEntries(users.map((u) => [u.id, u])),
    [users]
  );

  const completionMap = useMemo(() => {
    const map = {};
    for (const c of completions) {
      if (c.done) {
        map[`${c.assignmentId}_${c.userId}`] = true;
      }
    }
    return map;
  }, [completions]);

  const handlePrevMonth = () => {
    setCalendarMonth((prev) => {
      if (prev === 0) {
        setCalendarYear((y) => y - 1);
        return 11;
      }
      return prev - 1;
    });
  };

  const handleNextMonth = () => {
    setCalendarMonth((prev) => {
      if (prev === 11) {
        setCalendarYear((y) => y + 1);
        return 0;
      }
      return prev + 1;
    });
  };

  const dayAssignments = useMemo(() => {
    return assignments.filter(
      (a) => a.conceptId === selectedConceptId && a.date === selectedDate
    );
  }, [assignments, selectedConceptId, selectedDate]);

  const calendarCells = useMemo(() => {
    return getCalendarCells(calendarYear, calendarMonth);
  }, [calendarYear, calendarMonth]);

  if (!loading && concepts.length === 0) {
    return (
      <div className="empty-dashboard" style={{ marginTop: '2rem' }}>
        <h2>No tracks available</h2>
        <p className="muted">
          {isModerator
            ? 'Please create a learning track first on the Concepts page.'
            : 'Please ask your moderator to create a learning track.'}
        </p>
      </div>
    );
  }

  return (
    <div className="feed-container">
      {selectedConcept && (
        <header className="dashboard-header">
          <h1>Track: {selectedConcept.title}</h1>
          <p className="lede">{selectedConcept.description}</p>
        </header>
      )}

      {loading && <p className="muted">Loading tracker feed…</p>}

      {!loading && selectedConcept && (
        <div className="calendar-focus-layout">
          {/* Left Column: Daily Focus */}
          <div className="focus-column">
            <div className="focus-header">
              <h2>Focus for the Day</h2>
              <span className="muted" style={{ fontWeight: '500' }}>
                {getFriendlyDateLabel(selectedDate)}
              </span>
            </div>

            {/* Assignments List */}
            <div className="assignments-container" style={{ display: 'grid', gap: '1rem' }}>
              {dayAssignments.length === 0 ? (
                <div className="empty-assignments">
                  <p className="muted">No assignments scheduled for this day.</p>
                </div>
              ) : (
                dayAssignments.map((a) => {
                  const done = Boolean(completionMap[`${a.id}_${user.uid}`]);
                  const doneCount = users.filter((u) =>
                    completionMap[`${a.id}_${u.id}`]
                  ).length;
                  return (
                    <AssignmentCard
                      key={a.id}
                      assignment={a}
                      done={done}
                      doneCount={doneCount}
                      totalUsers={users.length || 1}
                      usersById={usersById}
                    />
                  );
                })
              )}
            </div>

            {/* Moderator: Schedule assignments for the selected date */}
            {isModerator && (
              <div className="moderator-scheduler" style={{ marginTop: '1rem' }}>
                <h3 style={{ fontFamily: '"Fraunces", Georgia, serif', fontSize: '1.25rem', marginBottom: '0.5rem' }}>
                  Schedule Assignment on this Date
                </h3>
                <AssignmentComposer conceptId={selectedConceptId} defaultDate={selectedDate} />
              </div>
            )}
          </div>

          {/* Right Column: Calendar Tracker */}
          <div className="calendar-column">
            {/* Concept Selector Dropdown */}
            {concepts.length > 1 && (
              <div className="concept-selector-card">
                <h3>Select Track</h3>
                <select
                  value={selectedConceptId}
                  onChange={(e) => selectConcept(e.target.value)}
                >
                  {concepts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Calendar Card */}
            <div className="calendar-widget">
              <div className="calendar-header-nav">
                <button onClick={handlePrevMonth} className="btn ghost icon-btn" type="button">
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <h2>
                  {monthNames[calendarMonth]} {calendarYear}
                </h2>
                <button onClick={handleNextMonth} className="btn ghost icon-btn" type="button">
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>

              <div className="calendar-grid">
                {/* Weekdays */}
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                  <div key={d} className="calendar-weekday">
                    {d}
                  </div>
                ))}

                {/* Day Cells */}
                {calendarCells.map((cell, idx) => {
                  const isSelected = cell.isCurrentMonth && cell.dateStr === selectedDate;
                  let cellClass = 'calendar-day';
                  let hasAssignmentsOnDay = false;
                  let isAllCompleted = false;

                  if (!cell.isCurrentMonth) {
                    cellClass += ' empty';
                  } else {
                    const dayTasks = assignments.filter(
                      (a) => a.conceptId === selectedConceptId && a.date === cell.dateStr
                    );
                    if (dayTasks.length > 0) {
                      hasAssignmentsOnDay = true;
                      isAllCompleted = dayTasks.every(
                        (a) => completionMap[`${a.id}_${user.uid}`] === true
                      );
                    }

                    if (isSelected) {
                      cellClass += ' active';
                    } else if (hasAssignmentsOnDay) {
                      cellClass += isAllCompleted ? ' completed' : ' incomplete';
                    } else {
                      cellClass += ' plain';
                    }
                  }

                  return (
                    <div
                      key={idx}
                      className={cellClass}
                      onClick={() => cell.dateStr && setSelectedDate(cell.dateStr)}
                      role="button"
                      tabIndex={cell.dateStr ? 0 : -1}
                      onKeyDown={(e) => {
                        if (cell.dateStr && (e.key === 'Enter' || e.key === ' ')) {
                          setSelectedDate(cell.dateStr);
                        }
                      }}
                    >
                      {cell.day}
                    </div>
                  );
                })}
              </div>

              {/* Calendar Legend */}
              <div className="calendar-legend">
                <div className="legend-item">
                  <span className="legend-dot green"></span>
                  <span>All Done</span>
                </div>
                <div className="legend-item">
                  <span className="legend-dot red"></span>
                  <span>Incomplete</span>
                </div>
                <div className="legend-item">
                  <span className="legend-dot plain"></span>
                  <span>No Task</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
