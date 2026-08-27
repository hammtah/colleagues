export const MODERATOR_UID = import.meta.env.VITE_MODERATOR_UID || "F59J1f4EeSNBiRWQSOkKA9AflON2";

export function isModeratorUid(uid) {
  return Boolean(MODERATOR_UID && uid && uid === MODERATOR_UID);
}
