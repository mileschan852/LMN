// dating-core — minimal barrel exports (only what apps actually use)

// ─── Types ───────────────────────────────────────────────────────────
export type { Lang } from './i18n'
export type { UserProfile, FilterOption, FilterConfig } from './types'

// ─── Hooks ───────────────────────────────────────────────────────────
export {
  useAdminRecheck,
  useRaffleActions,
  useRefreshCooldown,
  useNearbyRefresh,
  useHeartbeat,
  useFlyingMessages,
  useGridUsers,
  useFilterUnlock,
  useGridUnlock,
  useInvisibleMode,
  useProfileUnlock,
  useChannelFollow,
  useSyncUnlockStatus,
  type UseAdminRecheckOptions,
  type UseRaffleActionsOptions,
  type UseRefreshCooldownOptions,
  type UseNearbyRefreshOptions,
  type UseHeartbeatOptions,
  type UseFlyingMessagesOptions,
  type UseGridUsersOptions,
  type UseFilterUnlockOptions,
  type UseGridUnlockOptions,
  type UseInvisibleModeOptions,
  type UseProfileUnlockOptions,
  type UseChannelFollowOptions,
  type UseSyncUnlockStatusOptions,
  type FlyingMessageItem,
} from './hooks'

// ─── Telegram / Storage ──────────────────────────────────────────────
export { getTg, isInTelegram, getUserId, createStorage } from './storage'
export { createCloudKeys } from './cloudKeys'

// ─── i18n ────────────────────────────────────────────────────────────
export { t, getLangLabel, mergeDict, getDefaultLang } from './i18n'

// ─── i18n Factory (LMN uses createAppT) ──────────────────────────────
export { createAppT, type AppTResult } from './i18nFactory'

// ─── Supabase ────────────────────────────────────────────────────────
export {
  hasValidKey,
  // User ops
  upsertUser, fetchNearby, setOnlineStatus, deleteUser, clearAllUsers,
  // Unlock / status
  fetchUserUnlockStatus, updateInvisibleStatus,
  updateRealPhotoStatus, fetchUserPhotoStatus,
  setGridRowsUnlocked, setFiltersUnlocked,
  ensureFilterUnlock, updateUnlockCount, setUnlockCount,
  relockUserFeatures, fetchGlobalUnlock, setGlobalUnlock,
  // Raffles
  getActiveRaffle, createRaffle, buyRaffleTicket,
  startRaffleCountdown, drawRaffleWinner, completeRaffle,
  getRaffleTickets, setRaffleDrawToNextWednesday,
  // Flying messages
  insertFlyingMessage, fetchFlyingMessages,
  // Photo
  checkRealPhoto, checkPhotoGate,
  // Client builder
  createSupabaseClient,
} from './supabase'

export type {
  DbUser, Raffle, UnlockStatus, FlyingMessage,
} from './supabase'

// ─── Utils ───────────────────────────────────────────────────────────
export {
  isAdminUser,
  getTimeAgo, getDistance, formatDist,
  getZodiac, getZodiacEmoji, getAge,
  isUserActive, isPrefLocked,
  detectRealPhoto,
  dbToProfile, formatRole, getGridRoleLabel, getFilterColor,
} from './utils'

export type { RoleFilterMode } from './utils'

// ─── Payments ────────────────────────────────────────────────────────
export { requestPayment, openInvoice } from './payments'
