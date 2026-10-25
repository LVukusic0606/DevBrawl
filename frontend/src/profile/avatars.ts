// The preset profile pictures. avatar-01.webp is id 1, matching User.AvatarCount on the backend.
const files = import.meta.glob<string>('../assets/avatars/avatar-*.webp', { eager: true, import: 'default' })

// Names for screen readers, in the same order as the files
const LABELS = [
  'Grumpy',
  'Surprised',
  'Smirking',
  'Smiling',
  'Worried',
  'Doubtful',
  'Winking',
  'Shy',
  'Unimpressed',
  'Sly',
  'Delighted',
  'Annoyed',
]

export interface Avatar {
  id: number
  // null: a season reward that doesn't have its picture yet (shown as a placeholder)
  url: string | null
  label: string
  // Unlocked in the season pass instead of free for everyone
  season: boolean
}

// Avatars 1 to 12 are free for everyone (User.AvatarCount on the backend)
export const STARTER_AVATAR_COUNT = 12

// Season pass avatars, ids from SeasonCatalog on the backend.
// PLACEHOLDERS: adding avatar-13.webp ... avatar-23.webp to assets/avatars replaces them automatically.
const SEASON_AVATAR_IDS = [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]

const fromFiles: Avatar[] = Object.keys(files)
  .sort()
  .map((path, index) => ({
    id: index + 1,
    url: files[path],
    label: LABELS[index] ?? `Season avatar ${index + 1}`,
    season: index + 1 > STARTER_AVATAR_COUNT,
  }))

export const AVATARS: Avatar[] = [
  ...fromFiles,
  ...SEASON_AVATAR_IDS.filter((id) => !fromFiles.some((avatar) => avatar.id === id)).map((id) => ({
    id,
    url: null,
    label: `Season avatar ${id}`,
    season: true,
  })),
]

export function findAvatar(id: number | null): Avatar | undefined {
  return AVATARS.find((avatar) => avatar.id === id)
}
