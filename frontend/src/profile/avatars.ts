// The preset profile pictures. avatar-01.webp is id 1; the ids match User.StarterAvatarIds and SeasonCatalog on the backend.
const files = import.meta.glob<string>('../assets/avatars/avatar-*.webp', { eager: true, import: 'default' })

// Free for everyone (User.StarterAvatarIds on the backend): 12 faces, 10 recolors of them and a deep brown
// skin tone (36, added after the season pass ids). Every other id is a season pass reward.
const STARTER_AVATAR_IDS = new Set([...Array.from({ length: 22 }, (_, i) => i + 1), 36])

// Names for screen readers and the season pass, by id
const LABELS: Record<number, string> = {
  1: 'Grumpy',
  2: 'Surprised',
  3: 'Smirking',
  4: 'Smiling',
  5: 'Worried',
  6: 'Doubtful',
  7: 'Winking',
  8: 'Shy',
  9: 'Unimpressed',
  10: 'Sly',
  11: 'Delighted',
  12: 'Annoyed',
  13: 'Teal hacker',
  14: 'Night owl',
  15: 'Lime rookie',
  16: 'Ladybug',
  17: 'Ice architect',
  18: 'Golden ace',
  19: 'Midnight coder',
  20: 'Pink speedrunner',
  21: 'Silver bot',
  22: 'Mint',
  // Season pass: three ultra rare finishes, then the character bugs
  23: 'Hologram',
  24: 'Golden legend',
  25: 'Obsidian',
  26: 'Viking',
  27: 'Astronaut',
  28: 'Pirate',
  29: 'Wizard',
  30: 'Ninja',
  31: 'King',
  32: 'Detective',
  33: 'Cowboy',
  34: 'Cyberpunk',
  35: 'Chef',
  36: 'Beaming',
}

// Season pass avatars, ids from SeasonCatalog on the backend.
// Every season avatar has a picture now; an id without its avatar-NN.webp would show a placeholder.
const SEASON_AVATAR_IDS = [23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35]

// The rarest rewards in the pass; their cards get the gold reward color
const ULTRA_RARE_IDS = new Set([23, 24, 25])

export interface Avatar {
  id: number
  // null: a season reward that doesn't have its picture yet (shown as a placeholder)
  url: string | null
  label: string
  // Unlocked in the season pass instead of free for everyone
  season: boolean
  ultraRare: boolean
}

function avatar(id: number, url: string | null): Avatar {
  return {
    id,
    url,
    label: LABELS[id] ?? `Season avatar ${id}`,
    season: !STARTER_AVATAR_IDS.has(id),
    ultraRare: ULTRA_RARE_IDS.has(id),
  }
}

const fromFiles: Avatar[] = Object.entries(files).map(([path, url]) =>
  avatar(Number(path.match(/avatar-(\d+)\.webp$/)?.[1]), url),
)

export const AVATARS: Avatar[] = [
  ...fromFiles,
  ...SEASON_AVATAR_IDS.filter((id) => !fromFiles.some((a) => a.id === id)).map((id) => avatar(id, null)),
  // Starter avatars first, so the picker lists everything free before the season rewards
].sort((a, b) => Number(a.season) - Number(b.season) || a.id - b.id)

export function findAvatar(id: number | null): Avatar | undefined {
  return AVATARS.find((a) => a.id === id)
}
