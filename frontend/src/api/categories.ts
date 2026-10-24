import { authFetch } from './auth'

export interface CategoryInfo {
  id: number
  slug: string
  name: string
  description: string
}

export function getCategories() {
  return authFetch<CategoryInfo[]>('/api/categories')
}
