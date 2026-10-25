// What the 3D bug wears. Every account starts with this kit; there are no other character accessories yet,
// so they are all "starter". When unlockable ones arrive, add them here with their own rarity.

export type AccessoryRarity = 'starter'

// Clothing, a hat, or anything else the bug carries or wears
export type AccessoryKind = 'clothing' | 'hat' | 'accessory'

export interface Accessory {
  id: string
  kind: AccessoryKind
  name: string
  rarity: AccessoryRarity
}

export const RARITY_LABELS: Record<AccessoryRarity, string> = {
  starter: 'Starter',
}

// Tabler has no plain hat, so hats use the graduation cap
export const KIND_ICONS: Record<AccessoryKind, string> = {
  clothing: 'ti-shirt',
  hat: 'ti-school',
  accessory: 'ti-sparkles',
}

export const KIND_LABELS: Record<AccessoryKind, string> = {
  clothing: 'Clothing',
  hat: 'Hat',
  accessory: 'Accessory',
}

export const EQUIPPED_ACCESSORIES: Accessory[] = [
  { id: 'glasses', kind: 'accessory', name: 'Round tortoiseshell glasses', rarity: 'starter' },
  { id: 'hoodie', kind: 'clothing', name: 'DEV_BUG hoodie', rarity: 'starter' },
  { id: 'shirt', kind: 'clothing', name: 'Light blue shirt', rarity: 'starter' },
  { id: 'trousers', kind: 'clothing', name: 'Khaki trousers', rarity: 'starter' },
  { id: 'sneakers', kind: 'clothing', name: 'Canvas sneakers', rarity: 'starter' },
  { id: 'usb', kind: 'accessory', name: 'USB stick keychain', rarity: 'starter' },
  { id: 'mug', kind: 'accessory', name: 'Power button coffee mug', rarity: 'starter' },
]
