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
  url: string
  label: string
}

export const AVATARS: Avatar[] = Object.keys(files)
  .sort()
  .map((path, index) => ({ id: index + 1, url: files[path], label: LABELS[index] }))

export function findAvatar(id: number | null): Avatar | undefined {
  return AVATARS.find((avatar) => avatar.id === id)
}
