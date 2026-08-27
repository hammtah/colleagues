export const MODERATOR_UID = import.meta.env.VITE_MODERATOR_UID || '';

export function isModeratorUid(uid) {
  return Boolean(MODERATOR_UID && uid && uid === MODERATOR_UID);
}
