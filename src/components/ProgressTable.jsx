import { useMemo } from 'react';

export default function ProgressTable({ title, assignments, users, doneSet }) {
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

  if (sortedUsers.length === 0 || sortedAssignments.length === 0) {
    return (
      <section className="progress-section">
        {title && <h2>{title}</h2>}
        <p className="muted">No assignments to show yet.</p>
      </section>
    );
  }

  return (
    <section className="progress-section">
      {title && <h2>{title}</h2>}
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
    </section>
  );
}
