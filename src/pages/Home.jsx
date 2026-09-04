import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { ConceptManager } from '../components/ModeratorForms';
import { useConcepts, useAssignments, useCompletions } from '../hooks';

const getConceptImage = (concept) => {
  if (concept.imageUrl && concept.imageUrl.trim() !== '') {
    return concept.imageUrl;
  }
  const title = (concept.title || '').toLowerCase();
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

export default function Home() {
  const { user, isModerator } = useAuth();
  const navigate = useNavigate();
  const { concepts, loading: conceptsLoading } = useConcepts();
  const { assignments, loading: assignmentsLoading } = useAssignments();
  const { completions, loading: completionsLoading } = useCompletions();

  const loading = conceptsLoading || assignmentsLoading || completionsLoading;

  const conceptDetailsList = useMemo(() => {
    if (loading || !user) return [];

    return concepts.map((concept) => {
      const conceptAssignments = assignments.filter((a) => a.conceptId === concept.id);
      const totalAssignments = conceptAssignments.length;

      const completedCount = conceptAssignments.filter((a) => {
        const key = `${a.id}_${user.uid}`;
        const completion = completions.find((c) => c.id === key);
        return completion?.done === true;
      }).length;

      const progressPercent = totalAssignments > 0 
        ? Math.round((completedCount / totalAssignments) * 100) 
        : 0;

      let status = 'Not Started';
      if (totalAssignments > 0) {
        if (progressPercent === 100) {
          status = 'Completed';
        } else if (progressPercent > 0) {
          status = 'In Progress';
        }
      }

      return {
        ...concept,
        totalAssignments,
        completedCount,
        progressPercent,
        status,
        durationText: getDurationText(concept.startDate, concept.endDate),
        imageUrl: getConceptImage(concept),
      };
    });
  }, [concepts, assignments, completions, loading, user]);

  const handleSelectConcept = (conceptId) => {
    navigate(`/concept/${conceptId}`);
  };

  return (
    <div className="concepts-dashboard">
      <header className="dashboard-header">
        <h1>Learning Concepts</h1>
        <p className="lede">Master your professional skills through curated tracks.</p>
      </header>

      {loading && <p className="muted">Loading dashboard tracks…</p>}

      {!loading && conceptDetailsList.length === 0 && (
        <div className="empty-dashboard">
          <p className="muted">No learning concepts have been added yet.</p>
          {isModerator && <p className="muted">As a moderator, use the controls below to add the first concept.</p>}
        </div>
      )}

      {!loading && conceptDetailsList.length > 0 && (
        <div className="concept-grid">
          {conceptDetailsList.map((concept) => {
            const statusClass = concept.status.toLowerCase().replace(' ', '-');
            return (
              <div 
                key={concept.id} 
                className="concept-card"
                onClick={() => handleSelectConcept(concept.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleSelectConcept(concept.id);
                  }
                }}
              >
                <div className="concept-card-image-wrap">
                  <img 
                    src={concept.imageUrl} 
                    alt={concept.title} 
                    className="concept-card-image"
                    loading="lazy"
                  />
                  <div className={`concept-card-badge ${statusClass}`}>
                    {concept.status === 'Completed' && (
                      <span className="badge-icon">✓</span>
                    )}
                    {concept.status}
                  </div>
                </div>
                <div className="concept-card-content">
                  <h3 className="concept-card-title">{concept.title}</h3>
                  <p className="concept-card-desc">{concept.description}</p>
                  
                  <div className="concept-card-footer">
                    <div className="concept-card-progress-label">
                      <span>Progress</span>
                      <span>{concept.progressPercent}%</span>
                    </div>
                    <div className="concept-card-progress-bar">
                      <div 
                        className="concept-card-progress-fill" 
                        style={{ width: `${concept.progressPercent}%` }}
                      ></div>
                    </div>
                    {concept.durationText && (
                      <div className="concept-card-meta">
                        <span className="material-symbols-outlined" style={{ fontSize: '16px', verticalAlign: 'middle' }}>
                          schedule
                        </span>
                        <span>{concept.durationText}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isModerator && (
        <div className="mod-stack" style={{ marginTop: '3rem' }}>
          <h2 style={{ fontFamily: '"Fraunces", Georgia, serif', marginBottom: '1rem' }}>Moderator Track Management</h2>
          <ConceptManager
            concepts={concepts}
            selectedConceptId=""
            onSelect={handleSelectConcept}
          />
        </div>
      )}
    </div>
  );
}
