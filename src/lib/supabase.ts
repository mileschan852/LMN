// ─── LMN Supabase Thin Wrapper ───────────────────────────────────────
// Wraps dating-core functions with TABLE='lmn_users' bound as first arg.
// All DB logic lives in dating-core; this file is just binding + custom adapters.

import * as db from 'dating-core'

const TABLE = 'lmn_users'

export const hasValidKey = db.hasValidKey

export type DbUser = db.DbUser
export type Raffle = db.Raffle

// ─── User ops (table-bound) ──────────────────────────────────────────

export const upsertUser = (user: Partial<db.DbUser>) =>
  db.upsertUser(TABLE, user)

export const fetchNearby = (lat: number, lng: number) =>
  db.fetchNearby(TABLE, lat, lng)

export const setOnlineStatus = (userId: number, isOnline: boolean) =>
  db.setOnlineStatus(TABLE, userId, isOnline)

export const fetchGlobalUnlock = () => db.fetchGlobalUnlock(TABLE)

export const fetchUserUnlockStatus = (userId: number) =>
  db.fetchUserUnlockStatus(TABLE, userId)

export const updateInvisibleStatus = (userId: number, until: string | null) =>
  db.updateInvisibleStatus(TABLE, userId, until)

export const updateRealPhotoStatus = (userId: number, hasRealPhoto: boolean) =>
  db.updateRealPhotoStatus(TABLE, userId, hasRealPhoto)

export const fetchUserPhotoStatus = (userId: number) =>
  db.fetchUserPhotoStatus(TABLE, userId)

export const relockUserFeatures = (userId: number) =>
  db.relockUserFeatures(TABLE, userId)

export const ensureFilterUnlock = (userId: number) =>
  db.ensureFilterUnlock(TABLE, userId)

export const setGridRowsUnlocked = (userId: number, value: number) =>
  db.setGridRowsUnlocked(TABLE, userId, value)

export const setFiltersUnlocked = (userId: number, unlocked: boolean, expiresAt: string | null) =>
  db.setFiltersUnlocked(TABLE, userId, unlocked, expiresAt)

// ─── Raffles (table-agnostic, re-export directly) ────────────────────

export const getActiveRaffle = db.getActiveRaffle
export const createRaffle = db.createRaffle
export const buyRaffleTicket = db.buyRaffleTicket
export const startRaffleCountdown = db.startRaffleCountdown
export const drawRaffleWinner = db.drawRaffleWinner
export const completeRaffle = db.completeRaffle
export const setRaffleDrawToNextWednesday = db.setRaffleDrawToNextWednesday

// ─── Photo (pure function, re-export directly) ───────────────────────

export const checkRealPhoto = db.checkRealPhoto

// ─── Flying Messages (custom adapter for object signature) ───────────

export interface FlyingMessage {
  id: number
  text: string
  username: string
  user_id: number
  top_percent: number
  created_at: string
}

const SUPABASE_URL = 'https://fngcjkclxxodjaiqkfkm.supabase.co'
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuZ2Nqa2NseHhvZGphaXFrZmttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5OTE4NzUsImV4cCI6MjA5MjU2Nzg3NX0.dpoNP8EO7iZCFP7dzjD33mCdiJ0gxl5lTl6-hPY0HH4'

const headers = {
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
}

export async function insertFlyingMessage(msg: {
  text: string
  username: string
  user_id: number
  top_percent: number
}): Promise<boolean> {
  if (!hasValidKey) return false
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/lmn_flying_messages`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'return=minimal' },
      body: JSON.stringify(msg),
    })
    return res.ok
  } catch (err) {
    console.error('insertFlyingMessage failed:', err)
    return false
  }
}

export async function fetchFlyingMessages(since: string): Promise<FlyingMessage[]> {
  if (!hasValidKey) return []
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/lmn_flying_messages?created_at=gte.${encodeURIComponent(since)}&order=created_at.desc&limit=50`,
      { headers }
    )
    if (!res.ok) return []
    const data = await res.json()
    return (data || []).map((m: any) => ({
      id: m.id,
      text: m.text,
      username: m.username || m.user_name || '',
      user_id: m.user_id,
      top_percent: m.top_percent || 0,
      created_at: m.created_at,
    }))
  } catch (err) {
    console.error('fetchFlyingMessages failed:', err)
    return []
  }
}
