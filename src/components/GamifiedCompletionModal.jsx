import { useEffect, useState, useRef } from 'react';
import { getAvatarBackgroundColor } from '../utils/avatar';

const getUserAvatarUrl = (name, email) => {
  const bgColor = getAvatarBackgroundColor(email || name);
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'Member')}&background=${bgColor}&color=fff&bold=true&size=128`;
};

export default function GamifiedCompletionModal({
  isOpen,
  onClose,
  prevPoints = 0,
  pointsAdded = 20,
  assignmentTitle = '',
  userName = 'Member',
  userEmail = '',
  userPhotoUrl = '',
}) {
  const targetPoints = prevPoints + pointsAdded;
  const [displayedPoints, setDisplayedPoints] = useState(prevPoints);
  const [isIncreasing, setIsIncreasing] = useState(false);
  const animFrameRef = useRef(null);

  const avatarSrc = userPhotoUrl || getUserAvatarUrl(userName, userEmail);

  useEffect(() => {
    if (!isOpen) {
      setDisplayedPoints(prevPoints);
      setIsIncreasing(false);
      return;
    }

    setDisplayedPoints(prevPoints);
    setIsIncreasing(true);

    const startTime = performance.now();
    const duration = 2500; // 2.5 seconds for clear visible point count-up

    const animatePoints = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 2);
      const current = Math.floor(prevPoints + easeProgress * pointsAdded);

      setDisplayedPoints(current);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animatePoints);
      } else {
        setDisplayedPoints(targetPoints);
        setIsIncreasing(false);
      }
    };

    const timer = setTimeout(() => {
      animFrameRef.current = requestAnimationFrame(animatePoints);
    }, 350);

    return () => {
      clearTimeout(timer);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isOpen, prevPoints, pointsAdded, targetPoints]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="points-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="points-modal-card" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="points-modal-close"
          onClick={onClose}
          aria-label="Close modal"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="points-modal-header">
          <div className="points-done-icon">
            <span className="material-symbols-outlined">task_alt</span>
          </div>
          <h3>Assignment Completed!</h3>
          {assignmentTitle && (
            <p className="points-assignment-title">"{assignmentTitle}"</p>
          )}
        </div>

        {/* User avatar/name on left, points on right */}
        <div className="points-modal-body">
          <div className="points-user-group">
            <img
              src={avatarSrc}
              alt={userName}
              className="points-user-avatar"
            />
            <span className="points-user-name" title={userName}>
              {userName}
            </span>
          </div>

          <div className="points-display-card">
            <span className="points-label">TOTAL POINTS</span>

            <div className="points-value-wrap">
              <span className={`points-number ${isIncreasing ? 'animating' : ''}`}>
                {displayedPoints.toLocaleString()}
              </span>
              <span className="points-unit">PTS</span>
            </div>
          </div>

          <div className="arrow-points-wrapper">
            <span className={`material-symbols-outlined ${isIncreasing ? 'animating' : ''}`} style={{fontSize: '64px', color: '#e00000'}}>
              arrow_drop_up
            </span>
            <span className="points-added-label">+{pointsAdded}pts</span>
          </div>
        </div>

        <button
          type="button"
          className="btn primary-btn points-modal-btn"
          onClick={onClose}
        >
          Done
        </button>
      </div>
    </div>
  );
}
