const AVATAR_COLORS = [
  '0F6B4C',
  '2E6F95',
  '7C4DFF',
  'B54708',
  '4F7D53',
  '8B5E3C',
  '2F5D62',
  '6C5B7B',
];

const colorCache = new Map();

function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function getAvatarBackgroundColor(input) {
  const key = (input || '').trim().toLowerCase();
  if (!key) return AVATAR_COLORS[0];

  const cached = colorCache.get(key);
  if (cached) return cached;

  const color = AVATAR_COLORS[hashString(key) % AVATAR_COLORS.length];
  colorCache.set(key, color);
  return color;
}
