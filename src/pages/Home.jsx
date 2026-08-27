import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import AssignmentCard from '../components/AssignmentCard';
import { AssignmentComposer, ConceptManager } from '../components/ModeratorForms';
import { useAssignments, useCompletions, useConcepts, useUsers } from '../hooks';

export default function Home() {
  const { user, isModerator } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { concepts, loading: conceptsLoading } = useConcepts();

  const selectedConceptId = searchParams.get('concept') || '';
  const selectedConcept = concepts.find((c) => c.id === selectedConceptId) || null;

  const { assignments, loading: assignmentsLoading } = useAssignments(
    selectedConceptId || null,
  );
  const { completions, loading: completionsLoading } = useCompletions();
  const { users, loading: usersLoading } = useUsers();

  useEffect(() => {
    if (conceptsLoading || concepts.length === 0) return;
    const valid = concepts.some((c) => c.id === selectedConceptId);
    if (!valid) {
      setSearchParams({ concept: concepts[0].id }, { replace: true });
    }
  }, [concepts, conceptsLoading, selectedConceptId, setSearchParams]);

  const usersById = useMemo(
    () => Object.fromEntries(users.map((u) => [u.id, u])),
    [users],
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

  const loading =
    conceptsLoading || assignmentsLoading || completionsLoading || usersLoading;

  const selectConcept = (conceptId) => {
    if (conceptId) {
      setSearchParams({ concept: conceptId });
    } else {
      setSearchParams({});
    }
  };

  return (
    <div className="feed">
      {concepts.length > 0 && (
        <div className="concept-switcher">
          <label htmlFor="concept-select">Concept</label>
          <select
            id="concept-select"
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

      <section className="concept-banner">
        {selectedConcept ? (
          <>
            <p className="eyebrow">Concept</p>
            <h1>{selectedConcept.title}</h1>
            <p>{selectedConcept.description}</p>
            <p className="muted">
              {selectedConcept.startDate} → {selectedConcept.endDate}
            </p>
          </>
        ) : (
          <>
            <h1>No concepts yet</h1>
            <p className="muted">
              {isModerator
                ? 'Create a concept below to start posting assignments.'
                : 'Ask the moderator to create a concept.'}
            </p>
          </>
        )}
      </section>

      {isModerator && (
        <div className="mod-stack">
          <ConceptManager
            concepts={concepts}
            selectedConceptId={selectedConceptId}
            onSelect={selectConcept}
          />
          <AssignmentComposer conceptId={selectedConceptId} />
        </div>
      )}

      <section className="assignment-list">
        <h2>Assignments</h2>
        {loading && <p className="muted">Loading feed…</p>}
        {!loading && !selectedConcept && (
          <p className="muted">Select a concept to see its assignments.</p>
        )}
        {!loading && selectedConcept && assignments.length === 0 && (
          <p className="muted">No assignments for this concept yet.</p>
        )}
        {assignments.map((a) => {
          const done = Boolean(completionMap[`${a.id}_${user.uid}`]);
          const doneCount = users.filter((u) =>
            completionMap[`${a.id}_${u.id}`],
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
        })}
      </section>
    </div>
  );
}
