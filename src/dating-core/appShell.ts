// ─── Dating App Shell Hook ───────────────────────────────────────────
// Extracts the ~200 lines of duplicated App() boilerplate that every
// dating app repeats: state declarations, init effects, payment hooks,
// heartbeat, admin recheck, etc.
//
// Each app passes a config object with its specific values and receives
// back all the state + callbacks it needs.

import { useState, useEffect, useRef, useCallback } from 'react'
import { createStorage, getTg, getUserId, type StorageConfig } from './storage'
import { setGridRowsUnlocked as apiSetGridRows, setFiltersUnlocked as apiSetFilters, updateInvisibleStatus } from './supabase'
import type { UserProfile } from './types'
import type { Raffle } from './supabase'
import type { Lang } from './i18n'
import { getDefaultLang } from './i18n'
import {
  useRefreshCooldown,
  useNearbyRefresh,
  useHeartbeat,
  useFlyingMessages,
  useAdminRecheck,
  useRaffleActions,
} from './hooks'
import { usePaymentUnlock } from './payments'

// ─── Configuration ───────────────────────────────────────────────────

export interface DatingAppConfig {
  /** Storage prefix, e.g. 'hkmod' or 'lmn' */
  storagePrefix: string
  /** Supabase table name, e.g. 'users' or 'lmn_users' */
  tableName: string
  /** Cloudflare Worker URL for payments */
  workerUrl: string
  /** Telegram channel URL for follow-to-unlock (e.g. 'https://t.me/HKMO_D') */
  channelUrl: string
  /** Admin Telegram user IDs */
  adminIds: number[]
  /** Admin Telegram usernames */
  adminUsernames: string[]
  /** Default own profile object */
  defaultProfile: UserProfile
  /** Extra storage config (optional) */
  storageConfig?: StorageConfig
}

// ─── Result ──────────────────────────────────────────────────────────

export interface DatingAppState {
  // Navigation
  view: string
  setView: React.Dispatch<React.SetStateAction<string>>
  showSplash: boolean
  setShowSplash: React.Dispatch<React.SetStateAction<boolean>>

  // Profile
  ownProfile: UserProfile
  setOwnProfile: React.Dispatch<React.SetStateAction<UserProfile>>

  // Photo overlay
  photoOverlay: UserProfile | null
  setPhotoOverlay: React.Dispatch<React.SetStateAction<UserProfile | null>>

  // Location
  locationGranted: boolean
  setLocationGranted: React.Dispatch<React.SetStateAction<boolean>>

  // Admin
  isAdmin: boolean
  setIsAdmin: React.Dispatch<React.SetStateAction<boolean>>
  adminAction: string | null
  setAdminAction: React.Dispatch<React.SetStateAction<string | null>>

  // Group membership
  groupCheck: 'checking' | 'member' | 'not_member'
  setGroupCheck: React.Dispatch<React.SetStateAction<'checking' | 'member' | 'not_member'>>

  // Language
  lang: Lang
  setLang: React.Dispatch<React.SetStateAction<Lang>>

  // Payment / unlock
  starsPaidFor: Set<string>
  setStarsPaidFor: React.Dispatch<React.SetStateAction<Set<string>>>
  filtersUnlocked: boolean
  setFiltersUnlocked: React.Dispatch<React.SetStateAction<boolean>>
  editProfileUnlocked: boolean
  gridRowsUnlocked: number
  setGridRowsUnlocked: React.Dispatch<React.SetStateAction<number>>
  channelFollowUnlock: number
  setChannelFollowUnlock: React.Dispatch<React.SetStateAction<number>>
  isPremium: boolean
  setIsPremium: React.Dispatch<React.SetStateAction<boolean>>

  // Invisible mode
  invisibleUntil: string | null
  setInvisibleUntil: React.Dispatch<React.SetStateAction<string | null>>
  invisibleActive: boolean
  setInvisibleActive: React.Dispatch<React.SetStateAction<boolean>>
  isInvisible: boolean
  hasPurchasedInvisible: boolean

  // Raffle
  raffle: Raffle | null
  setRaffle: React.Dispatch<React.SetStateAction<Raffle | null>>

  // Flying messages
  flyingMessages: import('./hooks').FlyingMessageItem[]
  setFlyingMessages: React.Dispatch<React.SetStateAction<import('./hooks').FlyingMessageItem[]>>
  lastFlyingSendRef: React.MutableRefObject<number>

  // Refresh cooldown
  canRefresh: boolean
  remainingFormatted: string
  markRefreshed: () => void

  // Users / nearby
  users: UserProfile[]
  setUsers: React.Dispatch<React.SetStateAction<UserProfile[]>>
  isLoadingUsers: boolean
  setIsLoadingUsers: React.Dispatch<React.SetStateAction<boolean>>
  handleRefresh: () => void

  // Storage
  storage: ReturnType<typeof createStorage>
  tgUserId: React.MutableRefObject<number | null>

  // Payment callbacks
  promptUnlock: ReturnType<typeof usePaymentUnlock>
  promptFilterUnlock: ReturnType<typeof usePaymentUnlock>
  promptUnlockProfile: ReturnType<typeof usePaymentUnlock>
  promptInvisiblePayment: ReturnType<typeof usePaymentUnlock>
  handleBuyRaffleTicket: () => void
  handleStartNextRaffle: () => void
  handleClaimChannelFollow: () => void
}

// ─── Hook ────────────────────────────────────────────────────────────

export function useDatingApp(config: DatingAppConfig): DatingAppState {
  const {
    storagePrefix,
    tableName,
    workerUrl,
    channelUrl,
    adminIds,
    adminUsernames,
    defaultProfile,
  } = config

  const storage = createStorage({ prefix: storagePrefix })
  const tgUserId = useRef<number | null>(null)

  // ── Navigation ──────────────────────────────────────────────────
  const [view, setView] = useState('MAIN')
  const [showSplash, setShowSplash] = useState(true)
  const [adminAction, setAdminAction] = useState<string | null>(null)

  // ── Profile ─────────────────────────────────────────────────────
  const [ownProfile, setOwnProfile] = useState<UserProfile>(defaultProfile)

  // ── Invisible mode ──────────────────────────────────────────────
  const [invisibleUntil, setInvisibleUntil] = useState<string | null>(null)
  const [invisibleActive, setInvisibleActive] = useState(false)
  const isInvisible = invisibleActive && (invisibleUntil ? new Date(invisibleUntil).getTime() > Date.now() : false)
  const hasPurchasedInvisible = invisibleUntil !== null

  // ── Photo / Location / Admin / Group ────────────────────────────
  const [photoOverlay, setPhotoOverlay] = useState<UserProfile | null>(null)
  const [locationGranted, setLocationGranted] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [groupCheck, setGroupCheck] = useState<'checking' | 'member' | 'not_member'>('checking')

  // ── Language / Payment / Unlock ─────────────────────────────────
  const [lang, setLang] = useState<Lang>(getDefaultLang())
  const [starsPaidFor, setStarsPaidFor] = useState<Set<string>>(new Set())
  const [filtersUnlocked, setFiltersUnlocked] = useState(false)
  const [editProfileUnlocked] = useState(false)
  const [gridRowsUnlocked, setGridRowsUnlocked] = useState(0)
  const [channelFollowUnlock, setChannelFollowUnlock] = useState(0)
  const [isPremium, setIsPremium] = useState(false)
  const [raffle, setRaffle] = useState<Raffle | null>(null)

  // ── Flying messages ─────────────────────────────────────────────
  const { flyingMessages, setFlyingMessages, lastFlyingSendRef } = useFlyingMessages()

  // ── Admin recheck ───────────────────────────────────────────────
  useAdminRecheck({ isAdmin, setIsAdmin, adminIds, adminUsernames })

  // ── Refresh cooldown ────────────────────────────────────────────
  const { canRefresh, remainingFormatted, markRefreshed } = useRefreshCooldown()

  // ── Nearby refresh ──────────────────────────────────────────────
  const { users, setUsers, isLoading: isLoadingUsers, setIsLoading: setIsLoadingUsers, refresh: handleRefresh } = useNearbyRefresh({
    tableName,
    lat: ownProfile.lat,
    lng: ownProfile.lng,
    getMyId: () => tgUserId.current,
    isInvisible,
    invisibleUntil,
  })

  // ── Heartbeat ───────────────────────────────────────────────────
  useHeartbeat({ tableName, getUserId: () => tgUserId.current, locationGranted })

  // ── Splash screen ───────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2500)
    return () => clearTimeout(timer)
  }, [])

  // ── Grid rows ref (for stale closure avoidance) ─────────────────
  const gridRowsUnlockedRef = useRef(gridRowsUnlocked)
  useEffect(() => { gridRowsUnlockedRef.current = gridRowsUnlocked }, [gridRowsUnlocked])

  // ── Payment: Grid unlock ────────────────────────────────────────
  const promptUnlock = usePaymentUnlock({
    isAdmin,
    workerUrl,
    amount: 1000,
    purpose: 'grid',
    onAdminUnlock: useCallback(() => {
      const newRows = gridRowsUnlockedRef.current + 1
      setGridRowsUnlocked(newRows)
      storage.set('grid_rows_unlocked', String(newRows))
      storage.set('grid_rows_unlocked_at', String(Date.now()))
      const uid = getUserId()
      if (uid) { apiSetGridRows(tableName, uid, newRows).catch(() => {}) }
    }, [tableName]),
    onPaymentSuccess: useCallback(() => {
      const newRows = gridRowsUnlockedRef.current + 1
      setGridRowsUnlocked(newRows)
      storage.set('grid_rows_unlocked', String(newRows))
      storage.set('grid_rows_unlocked_at', String(Date.now()))
      const uid = getUserId()
      if (uid) { apiSetGridRows(tableName, uid, newRows).catch(() => {}) }
    }, [tableName]),
  })

  // ── Payment: Filter unlock ──────────────────────────────────────
  const promptFilterUnlock = usePaymentUnlock({
    isAdmin,
    workerUrl,
    amount: 500,
    purpose: 'filters',
    onAdminUnlock: useCallback(() => {
      setFiltersUnlocked(true)
      const now = Date.now()
      const expiresAt = new Date(now + 30 * 86400000).toISOString()
      storage.set('filters_unlocked', 'true')
      storage.set('filters_unlocked_at', String(now))
      const uid = getUserId()
      if (uid) { apiSetFilters(tableName, uid, true, expiresAt).catch(() => {}) }
    }, [tableName]),
    onPaymentSuccess: useCallback(() => {
      setFiltersUnlocked(true)
      const now = Date.now()
      const expiresAt = new Date(now + 30 * 86400000).toISOString()
      storage.set('filters_unlocked', 'true')
      storage.set('filters_unlocked_at', String(now))
      const uid = getUserId()
      if (uid) { apiSetFilters(tableName, uid, true, expiresAt).catch(() => {}) }
    }, [tableName]),
  })

  // ── Payment: Profile unlock ─────────────────────────────────────
  const promptUnlockProfile = usePaymentUnlock({
    isAdmin,
    workerUrl,
    amount: 100,
    purpose: 'edit',
    onAdminUnlock: useCallback(() => {
      setAdminAction('release')
    }, []),
    onPaymentSuccess: useCallback(() => {
      storage.set('pref_locked_at', '0')
      alert('Profile lock released! Refresh to apply.')
      window.location.reload()
    }, []),
  })

  // ── Payment: Invisible mode ─────────────────────────────────────
  const promptInvisiblePayment = usePaymentUnlock({
    isAdmin: false,
    workerUrl,
    amount: 2000,
    purpose: 'invisible',
    onAdminUnlock: useCallback(() => {}, []),
    onPaymentSuccess: useCallback(() => {
      const until = new Date(Date.now() + 30 * 86400000).toISOString()
      setInvisibleUntil(until)
      setInvisibleActive(true)
      storage.set('invisible_active', 'true')
      const uid = getUserId()
      if (uid) updateInvisibleStatus(tableName, uid, until)
    }, [tableName]),
  })

  // ── Raffle ──────────────────────────────────────────────────────
  const { handleBuyRaffleTicket, handleStartNextRaffle } = useRaffleActions({
    tableName,
    workerUrl,
    isAdmin,
    raffle,
    setRaffle,
  })

  // ── Channel follow unlock ───────────────────────────────────────
  const handleClaimChannelFollow = useCallback(() => {
    if (channelFollowUnlock) return
    try {
      const tg = getTg()
      if (tg?.openTelegramLink) tg.openTelegramLink(channelUrl)
      else if (tg?.openLink) tg.openLink(channelUrl, { try_instant_view: false })
      else window.open(channelUrl, '_blank')
    } catch { /* ignore */ }
    setChannelFollowUnlock(1)
    storage.set('channel_followed', '1')
  }, [channelFollowUnlock, channelUrl])

  return {
    view, setView,
    showSplash, setShowSplash,
    ownProfile, setOwnProfile,
    photoOverlay, setPhotoOverlay,
    locationGranted, setLocationGranted,
    isAdmin, setIsAdmin,
    adminAction, setAdminAction,
    groupCheck, setGroupCheck,
    lang, setLang,
    starsPaidFor, setStarsPaidFor,
    filtersUnlocked, setFiltersUnlocked,
    editProfileUnlocked,
    gridRowsUnlocked, setGridRowsUnlocked,
    channelFollowUnlock, setChannelFollowUnlock,
    isPremium, setIsPremium,
    invisibleUntil, setInvisibleUntil,
    invisibleActive, setInvisibleActive,
    isInvisible,
    hasPurchasedInvisible,
    raffle, setRaffle,
    flyingMessages, setFlyingMessages,
    lastFlyingSendRef,
    canRefresh, remainingFormatted, markRefreshed,
    users, setUsers, isLoadingUsers, setIsLoadingUsers, handleRefresh,
    storage, tgUserId,
    promptUnlock,
    promptFilterUnlock,
    promptUnlockProfile,
    promptInvisiblePayment,
    handleBuyRaffleTicket,
    handleStartNextRaffle,
    handleClaimChannelFollow,
  }
}
