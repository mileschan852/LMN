export type Lang = 'en' | 'tc' | 'sc' | 'ru' | 'ja' | 'ko'

export interface FilterOption {
  value: string
  label: Record<string, string>
}

export interface FilterConfig {
  key: string
  label: Record<string, string>
  options: FilterOption[]
}

export interface UserProfile {
  id: string
  name: string
  age?: number
  height: number
  weight: number
  position: number
  isSide: boolean
  isOnline: boolean
  distance: number
  lat?: number
  lng?: number
  isOwn?: boolean
  preference1?: 'Safe' | 'Raw'
  preference2?: 'Clean' | 'Party' | 'Party✓'
  preference3?: '1on1' | 'Group'
  preference4?: 'Host' | 'Travel' | 'Outdoor' | 'Sauna'
  openToMessages?: boolean
  tgUsername?: string
  tgPhotoUrl?: string
  tgPhotos?: string[]
  updatedAt?: string
  hasPhoto: boolean
  hasRealPhoto?: boolean
  invisibleUntil?: string
  isInvisible: boolean
  gender?: string
  seekingGender?: string
  dob?: string | null
  seekingToday?: string
  meetupType?: string | null
  hideAge?: boolean
}

export interface PaymentItem {
  purpose: string
  title: string
  description: string
  price: number
}
