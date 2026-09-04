import { useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import AssignmentCard from '../components/AssignmentCard';
import { AssignmentComposer } from '../components/ModeratorForms';
import { useConcepts, useAssignments, useCompletions, useUsers } from '../hooks';

const getConceptImage = (concept) => {
  if (concept?.imageUrl && concept.imageUrl.trim() !== '') {
    return concept.imageUrl;
  }
  const title = (concept?.title || '').toLowerCase();
  if (title.includes('blind') || title.includes('structure') || title.includes('algorithm') || title.includes('leet')) {
    return 'https://lh3.googleusercontent.com/aida-public/AB6AXuBQMa48qagoY_5X_d8K5SAt8YCNN8ki3zEYniexfEM1JyPyDgw3wng8aFtbnNSI9d0vVkXXUQcIHpj1NL8wdlmE5wduy5ryEvIAj0bVezK-3nhof8BZP2MnRcTij_59tJ3jSUrAMFt5N-3JvagTlynXlRbfbCccBoRQv4jt4beBRLs4lM-MTISjDT-CUgXzSEpIWt0cqjsU6WWgguLt4Mg8FwVjDOQPThc8xwJ-asNavjY6k927Uv6_';
  }
  if (title.includes('system') || title.includes('design') || title.includes('distrib') || title.includes('architect')) {
    return 'https://lh3.googleusercontent.com/aida-public/AB6AXuB7MeXL6BSyLM2boAdoUNshW0mLtOPOo77QVcj3EGZShu3rCuy0cNM_7sHcNdKUy0MAM5sPE1nXvHoDcM5TCoYiEO5fD_zIU8m_j3lBuC1LE0jbnFhDdI9xyYrJzEQt4PufKjHwKfr4B_GGcfY8Vds55-pL48np_8RDPHhb1zsncvHe1v6WTQUTuil2J4RPh5uMJJqzn_7Q01Fex_F92YoUg02xDXDrW8nguC7EzeoZZieF20xmnd_v';
  }
  if (title.includes('react') || title.includes('front') || title.includes('ui') || title.includes('pattern') || title.includes('javascript') || title.includes('web')) {
    return 'https://lh3.googleusercontent.com/aida-public/AB6AXuAvXY3dXY9in0fnuXS4jc0xsCofzYBw5uD_5vU-lWSwr98DXkUyfW8OgR23gHMOh_cqcVnR2k0-WZneYdgnopyl2U4bm2Qx1WJj6uzXsIcS211k18GpjRW68orQgXbet0RUHZ7UuCP56fEC4EY9tgyzcSPjZgrEl0J0Odi4k8EFxq4z2tkJiIDG10QvYjxYnMkXQKxyjaLsDDUbN23046HkOiaKw-ai2etvHo1ClwbNRc7zm4ijpYuD';
  }
  return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop';
};

const getDurationText = (startDate, endDate) => {
  if (!startDate || !endDate) return '';
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return '';
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.ceil(diffDays / 7);
  if (diffWeeks <= 1) {
    return `${diffDays} ${diffDays === 1 ? 'Day' : 'Days'}`;
  }
  return `${diffWeeks} ${diffWeeks === 1 ? 'Week' : 'Weeks'}`;
};

export default function ConceptDetail() {
  const { conceptId } = useParams();
  const navigate = useNavigate();
  const { user, isModerator } = useAuth();

  const { concepts, loading: conceptsLoading } = useConcepts();
  const { assignments, loading: assignmentsLoading } = useAssignments(conceptId);
  const { completions, loading: completionsLoading } = useCompletions();
  const { users, loading: usersLoading } = useUsers();

  const loading = conceptsLoading || assignmentsLoading || completionsLoading || usersLoading;

  const concept = useMemo(() => {
    return concepts.find((c) => c.id === conceptId) || null;
  }, [concepts, conceptId]);

  const completionMap = useMemo(() => {
    const map = {};
    for (const c of completions) {
      if (c.done) {
        map[`${c.assignmentId}_${c.userId}`] = true;
      }
    }
    return map;
  }, [completions]);

  const conceptStats = useMemo(() => {
    if (!concept || !user) return { completedCount: 0, total: 0, progressPercent: 0, status: 'Not Started' };

    const total = assignments.length;
    const completedCount = assignments.filter((a) => completionMap[`${a.id}_${user.uid}`] === true).length;
    const progressPercent = total > 0 ? Math.round((completedCount / total) * 100) : 0;

    let status = 'Not Started';
    if (total > 0) {
      if (progressPercent === 100) status = 'Completed';
      else if (progressPercent > 0) status = 'In Progress';
    }

    return { completedCount, total, progressPercent, status };
  }, [concept, assignments, completionMap, user]);

  if (loading) {
    return (
      <div className="concept-detail-page">
        <p className="muted">Loading concept details…</p>
      </div>
    );
  }

  if (!concept) {
    return (
      <div className="concept-detail-page">
        <nav className="breadcrumb-nav">
          <Link to="/" className="btn ghost back-btn">
            <span className="material-symbols-outlined">arrow_back</span>
            Back to Concepts
          </Link>
        </nav>
        <div className="empty-dashboard" style={{ marginTop: '2rem' }}>
          <h2>Concept not found</h2>
          <p className="muted">The concept track you are looking for does not exist or has been removed.</p>
        </div>
      </div>
    );
  }

  const imageUrl = getConceptImage(concept);
  const durationText = getDurationText(concept.startDate, concept.endDate);
  const statusClass = conceptStats.status.toLowerCase().replace(' ', '-');

  return (
    <div className="concept-detail-page">
      <nav className="breadcrumb-nav">
        <button type="button" className="btn ghost back-btn" onClick={() => navigate('/')}>
          <span className="material-symbols-outlined">arrow_back</span>
          Back to Concepts
        </button>
      </nav>

      {/* Hero Banner Section */}
      <header className="concept-detail-hero">
        <div className="concept-hero-image-wrap">
          <img src={imageUrl} alt={concept.title} className="concept-hero-image" />
          <div className={`concept-card-badge ${statusClass}`}>
            {conceptStats.status === 'Completed' && <span className="badge-icon">✓</span>}
            {conceptStats.status}
          </div>
        </div>

        <div className="concept-hero-content">
          <h1 className="concept-hero-title">{concept.title}</h1>
          <p className="concept-hero-desc">{concept.description}</p>

          <div className="concept-hero-meta">
            {durationText && (
              <span className="meta-pill">
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  schedule
                </span>
                {durationText}
              </span>
            )}
            <span className="meta-pill">
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                assignment
              </span>
              {conceptStats.total} {conceptStats.total === 1 ? 'Assignment' : 'Assignments'}
            </span>
          </div>

          <div className="concept-hero-progress">
            <div className="progress-header">
              <span>Your Progress ({conceptStats.completedCount}/{conceptStats.total} completed)</span>
              <span className="progress-pct">{conceptStats.progressPercent}%</span>
            </div>
            <div className="progress-bar-large">
              <div className="progress-fill-large" style={{ width: `${conceptStats.progressPercent}%` }} />
            </div>
          </div>
        </div>
      </header>

      {/* Assignments Section */}
      <section className="concept-assignments-section">
        <div className="section-header">
          <h2>Track Assignments</h2>
          <span className="muted">{assignments.length} {assignments.length === 1 ? 'assignment' : 'assignments'}</span>
        </div>

        {assignments.length === 0 ? (
          <div className="empty-assignments-box">
            <span className="material-symbols-outlined empty-icon">assignment_late</span>
            <p className="muted">No assignments scheduled for this concept yet.</p>
          </div>
        ) : (
          <div className="assignments-container" style={{ display: 'grid', gap: '1rem' }}>
            {assignments.map((a) => {
              const done = Boolean(completionMap[`${a.id}_${user.uid}`]);
              const doneCount = users.filter((u) => completionMap[`${a.id}_${u.id}`]).length;
              return (
                <AssignmentCard
                  key={a.id}
                  assignment={a}
                  done={done}
                  doneCount={doneCount}
                  totalUsers={users.length || 1}
                  conceptId={conceptId}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* Moderator actions */}
      {isModerator && (
        <section className="mod-stack" style={{ marginTop: '3rem' }}>
          <h2 style={{ fontFamily: '"Fraunces", Georgia, serif', marginBottom: '1rem' }}>
            Moderator: Add Assignment to {concept.title}
          </h2>
          <AssignmentComposer conceptId={conceptId} />
        </section>
      )}
    </div>
  );
}
