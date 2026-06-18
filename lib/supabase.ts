// LMN Supabase Client — thin wrapper, table name bound via factory
// DB types (DbUser, Raffle, FlyingMessage) imported directly from 'dating-core'
import {
  createSupabaseClient, hasValidKey, insertFlyingMessage, fetchFlyingMessages,
  getActiveRaffle, createRaffle, buyRaffleTicket, startRaffleCountdown,
  drawRaffleWinner, completeRaffle, setRaffleDrawToNextWednesday, checkRealPhoto,
} from 'dating-core'

export {
  hasValidKey, insertFlyingMessage, fetchFlyingMessages,
  getActiveRaffle, createRaffle, buyRaffleTicket, startRaffleCountdown,
  drawRaffleWinner, completeRaffle, setRaffleDrawToNextWednesday, checkRealPhoto,
}

const TABLE_NAME = 'lmn_users'
const client = createSupabaseClient(TABLE_NAME)

export const {
  upsertUser,
  fetchNearby,
  setOnlineStatus,
  fetchGlobalUnlock,
  fetchUserUnlockStatus,
  setGridRowsUnlocked,
  setFiltersUnlocked,
  updateInvisibleStatus,
  updateRealPhotoStatus,
  fetchUserPhotoStatus,
  relockUserFeatures,
  ensureFilterUnlock,
} = client
