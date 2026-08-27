import { useMemo } from 'react';
import { useAuth } from '../AuthContext';
import AssignmentCard from '../components/AssignmentCard';
import { AssignmentComposer, ConceptEditor } from '../components/ModeratorForms';
import { useAssignments, useCompletions, useConcept, useUsers } from '../hooks';

export default function Home() {
  const { user, isModerator } = useAuth();
  const { concept, loading: conceptLoading } = useConcept();
  const { assignments, loading: assignmentsLoading } = useAssignments();
  const { completions, loading: completionsLoading } = useCompletions();
  const { users, loading: usersLoading } = useUsers();

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
    conceptLoading || assignmentsLoading || completionsLoading || usersLoading;

  return (
    <div className="feed">
      <section className="concept-banner">
        {concept ? (
          <>
            <p className="eyebrow">Concept of the month</p>
            <h1>{concept.title}</h1>
            <p>{concept.description}</p>
            <p className="muted">
              {concept.startDate} → {concept.endDate}
            </p>
          </>
        ) : (
          <>
            <h1>No concept set yet</h1>
            <p className="muted">
              {isModerator
                ? 'Use the editor below to set the current concept.'
                : 'Ask the moderator to post the concept of the month.'}
            </p>
          </>
        )}
      </section>

      {isModerator && (
        <div className="mod-stack">
          <ConceptEditor concept={concept} />
          <AssignmentComposer />
        </div>
      )}

      <section className="assignment-list">
        <h2>Assignments</h2>
        {loading && <p className="muted">Loading feed…</p>}
        {!loading && assignments.length === 0 && (
          <p className="muted">No assignments yet.</p>
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
