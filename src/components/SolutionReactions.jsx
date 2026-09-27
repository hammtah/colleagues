import { useState } from 'react';
import { toggleReaction } from '../hooks';

const REACTION_EMOJIS = ['🧠', '👍', '🔥'];

export default function SolutionReactions({ completion, currentUserId, usersById = {} }) {
  const [busyEmoji, setBusyEmoji] = useState(null);

  if (!completion || !completion.id) return null;

  const reactions = completion.reactions || {};

  const handleToggle = async (e, emoji) => {
    e.stopPropagation();
    if (!currentUserId || busyEmoji) return;

    setBusyEmoji(emoji);
    try {
      await toggleReaction(completion.id, emoji, currentUserId, reactions);
    } catch (err) {
      console.error('Failed to toggle reaction', err);
    } finally {
      setBusyEmoji(null);
    }
  };

  return (
    <div className="solution-reactions-bar">
      {REACTION_EMOJIS.map((emoji) => {
        const uids = reactions[emoji] || [];
        const count = uids.length;
        const hasReacted = uids.includes(currentUserId);

        const names = uids.map(
          (uid) => usersById[uid]?.displayName || usersById[uid]?.email?.split('@')[0] || 'Colleague'
        );

        let tooltip = `React with ${emoji}`;
        if (names.length > 0) {
          tooltip = `${count} ${count === 1 ? 'colleague' : 'colleagues'} reacted (${names.join(', ')})`;
        }

        return (
          <button
            key={emoji}
            type="button"
            className={`reaction-chip ${hasReacted ? 'active' : ''} ${count === 0 ? 'zero' : ''} ${busyEmoji === emoji ? 'busy' : ''}`}
            onClick={(e) => handleToggle(e, emoji)}
            title={tooltip}
            aria-label={`${emoji} reaction count: ${count}`}
          >
            <span className="reaction-emoji">{emoji}</span>
            <span className="reaction-count">{count}</span>
          </button>
        );
      })}
    </div>
  );
}
