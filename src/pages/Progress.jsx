import { useMemo } from 'react';
import { useAssignments, useCompletions, useUsers } from '../hooks';

export default function Progress() {
  const { assignments, loading: aLoading } = useAssignments();
  const { completions, loading: cLoading } = useCompletions();
  const { users, loading: uLoading } = useUsers();

  const doneSet = useMemo(() => {
    const set = new Set();
    for (const c of completions) {
      if (c.done) set.add(`${c.assignmentId}_${c.userId}`);
    }
    return set;
  }, [completions]);

  const loading = aLoading || cLoading || uLoading;
  const sortedAssignments = useMemo(
    () => [...assignments].sort((a, b) => (a.date < b.date ? -1 : 1)),
    [assignments],
  );
  const sortedUsers = useMemo(
    () =>
      [...users].sort((a, b) =>
        (a.displayName || '').localeCompare(b.displayName || ''),
      ),
    [users],
  );

  return (
    <div className="progress-page">
      <h1>Group progress</h1>
      <p className="lede">Who has checked off each assignment. Visible to everyone.</p>

      {loading && <p className="muted">Loading…</p>}

      {!loading && (sortedUsers.length === 0 || sortedAssignments.length === 0) && (
        <p className="muted">Need at least one member and one assignment to show progress.</p>
      )}

      {!loading && sortedUsers.length > 0 && sortedAssignments.length > 0 && (
        <div className="table-wrap">
          <table className="progress-table">
            <thead>
              <tr>
                <th>Member</th>
                {sortedAssignments.map((a) => (
                  <th key={a.id} title={a.title}>
                    <span>{a.date}</span>
                    <small>{a.title}</small>
                  </th>
                ))}
                <th>Done</th>
              </tr>
            </thead>
            <tbody>
              {sortedUsers.map((u) => {
                const count = sortedAssignments.filter((a) =>
                  doneSet.has(`${a.id}_${u.id}`),
                ).length;
                return (
                  <tr key={u.id}>
                    <td>{u.displayName || u.email || 'Member'}</td>
                    {sortedAssignments.map((a) => {
                      const done = doneSet.has(`${a.id}_${u.id}`);
                      return (
                        <td key={a.id} className={done ? 'yes' : 'no'}>
                          {done ? '✓' : '·'}
                        </td>
                      );
                    })}
                    <td>
                      {count}/{sortedAssignments.length}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
