import type { Avatar } from './avatars'

// An avatar's picture, a placeholder for season avatars without art yet, or the nickname's first letter
export function AvatarPicture({ avatar, nickname }: { avatar: Avatar | undefined; nickname: string }) {
  if (!avatar) return <>{nickname.charAt(0).toUpperCase()}</>
  if (!avatar.url) return <i className="ti ti-user-star avatar-placeholder" aria-hidden="true" />
  return <img src={avatar.url} alt="" />
}
