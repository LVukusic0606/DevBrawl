// The preset tags a player can show next to their nickname. Ids match UserTags.All on the backend.
export interface Tag {
  id: string
  label: string
  // Tabler outline icon
  icon: string
  // Unlocked in the season pass instead of free for everyone
  season?: boolean
}

export const TAGS: Tag[] = [
  { id: 'learner', label: 'Learner', icon: 'ti-school' },
  { id: 'builder', label: 'Builder', icon: 'ti-hammer' },
  { id: 'bug-hunter', label: 'Bug hunter', icon: 'ti-bug' },
  { id: 'architect', label: 'Architect', icon: 'ti-sitemap' },
  { id: 'mentor', label: 'Mentor', icon: 'ti-users' },

  // Season pass tags, ids from SeasonCatalog on the backend. PLACEHOLDER labels and icons.
  { id: 'rookie', label: 'Rookie', icon: 'ti-plant', season: true },
  { id: 'debugger', label: 'Debugger', icon: 'ti-bug-off', season: true },
  { id: 'query-whisperer', label: 'Query whisperer', icon: 'ti-database-search', season: true },
  { id: 'stack-tracer', label: 'Stack tracer', icon: 'ti-stack-2', season: true },
  { id: 'season-finisher', label: 'Season finisher', icon: 'ti-flag-check', season: true },
  { id: 'root-cause-hunter', label: 'Root cause hunter', icon: 'ti-zoom-code', season: true },
  { id: '404-survivor', label: '404 survivor', icon: 'ti-error-404', season: true },
  { id: 'race-condition', label: 'Race condition', icon: 'ti-arrows-shuffle', season: true },
  { id: 'zero-downtime', label: 'Zero downtime', icon: 'ti-heartbeat', season: true },
  { id: 'cache-invalidator', label: 'Cache invalidator', icon: 'ti-bolt', season: true },
  { id: 'kernel-panic', label: 'Kernel panic', icon: 'ti-alert-octagon', season: true },
]

export function findTag(id: string | null): Tag | undefined {
  return TAGS.find((tag) => tag.id === id)
}
