// The preset tags a player can show next to their nickname. Ids match UserTags.All on the backend.
export interface Tag {
  id: string
  label: string
  // Tabler outline icon
  icon: string
}

export const TAGS: Tag[] = [
  { id: 'learner', label: 'Learner', icon: 'ti-school' },
  { id: 'builder', label: 'Builder', icon: 'ti-hammer' },
  { id: 'bug-hunter', label: 'Bug hunter', icon: 'ti-bug' },
  { id: 'architect', label: 'Architect', icon: 'ti-sitemap' },
  { id: 'mentor', label: 'Mentor', icon: 'ti-users' },
]

export function findTag(id: string | null): Tag | undefined {
  return TAGS.find((tag) => tag.id === id)
}
