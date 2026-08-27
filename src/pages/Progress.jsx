import { useMemo, useState } from 'react';
import ProgressTable from '../components/ProgressTable';
import { useAssignments, useCompletions, useConcepts, useUsers } from '../hooks';

export default function Progress() {
  const { concepts, loading: conceptsLoading } = useConcepts();
  const { assignments, loading: aLoading } = useAssignments();
  const { completions, loading: cLoading } = useCompletions();
  const { users, loading: uLoading } = useUsers();
  const [view, setView] = useState('overall');

  const doneSet = useMemo(() => {
    const set = new Set();
    for (const c of completions) {
      if (c.done) set.add(`${c.assignmentId}_${c.userId}`);
    }
    return set;
  }, [completions]);

  const assignmentsByConcept = useMemo(() => {
    const map = {};
    for (const concept of concepts) {
      map[concept.id] = assignments.filter((a) => a.conceptId === concept.id);
    }
    return map;
  }, [assignments, concepts]);

  const loading = conceptsLoading || aLoading || cLoading || uLoading;

  const selectedConcept = concepts.find((c) => c.id === view);
  const viewAssignments =
    view === 'overall' ? assignments : assignmentsByConcept[view] || [];

  return (
    <div className="progress-page">
      <h1>Group progress</h1>
      <p className="lede">
        Per-concept breakdown and overall progress across all concepts.
      </p>

      <div className="progress-switcher">
        <label htmlFor="progress-view">Show</label>
        <select
          id="progress-view"
          value={view}
          onChange={(e) => setView(e.target.value)}
        >
          <option value="overall">Overall (all concepts)</option>
          {concepts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </div>

      {loading && <p className="muted">Loading…</p>}

      {!loading && users.length === 0 && (
        <p className="muted">Need at least one member to show progress.</p>
      )}

      {!loading && users.length > 0 && view === 'overall' && (
        <ProgressTable
          title="Overall progress"
          assignments={assignments}
          users={users}
          doneSet={doneSet}
        />
      )}

      {!loading && users.length > 0 && view !== 'overall' && selectedConcept && (
        <ProgressTable
          title={selectedConcept.title}
          assignments={viewAssignments}
          users={users}
          doneSet={doneSet}
        />
      )}

      {!loading && view !== 'overall' && !selectedConcept && (
        <p className="muted">Concept not found.</p>
      )}
    </div>
  );
}
