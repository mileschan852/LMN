import {
  getTg, isInTelegram, getUserId, getTimeAgo, getDistance, formatDist, isUserActive, isPrefLocked, getDefaultLang, isAdminUser, dbToProfile, formatRole, getGridRoleLabel, getFilterColor, createCloudKeys, createStorage, getZodiac, getZodiacEmoji, useRaffleActions,
  type UserProfile, type RoleFilterMode, type DbUser, type Raffle,
} from 'dating-core'
import { BottomNav, StatsBar, ProfileGrid, TopBar } from 'dating-ui'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import './App.css'
import logoImg from './assets/lmn-logo.svg'
import logoAnim from './assets/lmn-logo-animated.mp4'
import { t, type Lang, getLangLabel } from './lib/i18n'
import {
  Grid3X3,
  Users,
  ArrowLeft,
  Check,
  MapPin,
  X,
  MessageCircle,
  LocateFixed,
  AlertTriangle,
  Lock,
  Gift,
  Wallet,
  Send,
} from 'lucide-react'
import { upsertUser, fetchNearby, setOnlineStatus, fetchGlobalUnlock, hasValidKey, fetchUserUnlockStatus, insertFlyingMessage, fetchFlyingMessages, updateInvisibleStatus, getActiveRaffle, createRaffle, buyRaffleTicket, startRaffleCountdown, drawRaffleWinner, completeRaffle, setRaffleDrawToNextWednesday, ensureFilterUnlock, setGridRowsUnlocked as saveGridRowsUnlocked, setFiltersUnlocked as saveFiltersUnlocked } from './lib/supabase'


// ─── Types ───────────────────────────────────────────────────────────

type View = 'MAIN' | 'OWN_PROFILE'

// ─── Telegram API ────────────────────────────────────────────────────

interface TgWebApp {
  ready: () => void
  expand: () => void
  setHeaderColor: (color: string) => void
  openTelegramLink: (url: string) => void
  openLink: (url: string, options?: { try_instant_view?: boolean }) => void
  initData: string
  initDataUnsafe: {
    user?: {
      id: number
      first_name: string
      last_name?: string
      username?: string
      photo_url?: string
      is_premium?: boolean
    }
    chat?: {
      id: number
      type: 'private' | 'group' | 'supergroup' | 'channel'
      title?: string
      username?: string
    }
    chat_type?: 'sender' | 'private' | 'group' | 'supergroup' | 'channel'
    chat_instance?: string
    start_param?: string
  }
  version: string
  platform: string
  openInvoice: (url: string, callback?: (status: string) => void) => void
  requestLocation: (callback: (location: { latitude: number; longitude: number } | null) => void) => void
  showPopup: (params: { title?: string; message: string; buttons?: Array<{ id?: string; type?: 'default' | 'ok' | 'close' | 'cancel' | 'destructive'; text: string }> }, callback?: (buttonId: string) => void) => void
  CloudStorage: {
    setItem: (key: string, value: string, cb?: (err: string | null, done: boolean) => void) => void
    getItems: (keys: string[], cb: (err: string | null, result: Record<string, string>) => void) => void
  }
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TgWebApp }
  }
}

// ─── Admin Config ────────────────────────────────────────────────────

// Only these Telegram usernames / IDs are admins. Bot owner is always included.
// Add more here when requested.
const ADMIN_IDS = [5202742795, 725368127]
const ADMIN_USERNAMES = ['mileschan852', 'MilesChan852']


// ─── Storage ─────────────────────────────────────────────────────────

const CLOUD = createCloudKeys('lmn')
const storage = createStorage({ prefix: 'lmn' })

// ─── Role / Filter helpers imported from dating-core ────────────────

// ─── dbToProfile imported from dating-core ──────────────────────────

// ─── Zodiac helpers imported from dating-core ───────────────────────

// ─── Photo Overlay ────────────────────────────────────────────────────

function PhotoOverlay({ user, onClose, onMessage, lang, ownProfile }: { user: UserProfile; onClose: () => void; onMessage: (u: UserProfile) => void; lang: Lang; ownProfile: UserProfile }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeIdx, setActiveIdx] = useState(0)
  const [imgStates, setImgStates] = useState<{ loaded: boolean; failed: boolean }[]>([])
  const photos = user.tgPhotos?.length ? user.tgPhotos : (user.tgPhotoUrl ? [user.tgPhotoUrl] : [])

  // Initialize image states when photos change
  useEffect(() => {
    setImgStates(photos.map(() => ({ loaded: false, failed: false })))
  }, [photos.join(',')])

  const handleScroll = () => {
    if (!scrollRef.current) return
    setActiveIdx(Math.round(scrollRef.current.scrollLeft / scrollRef.current.clientWidth))
  }

  return (
    <div className="fixed top-0 left-0 right-0 bottom-0 z-[60] bg-black/95 flex flex-col animate-in fade-in duration-200" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
      <button onClick={onClose} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-[#1A1A1A]/80 flex items-center justify-center z-20 nav-press">
        <X className="w-5 h-5 text-white" />
      </button>

      <div className="flex-1 flex items-center relative">
        {photos.length > 0 ? (
          <>
            <div ref={scrollRef} onScroll={handleScroll} className="w-full h-full flex overflow-x-auto snap-x snap-mandatory scrollbar-hide">
              {photos.map((photo, i) => (
                <div key={i} className="w-full h-full flex-shrink-0 snap-center flex items-center justify-center relative">
                  {!imgStates[i]?.failed && (
                    <img
                      src={photo}
                      alt={`${user.name} ${i + 1}`}
                      className={`max-w-full max-h-[65vh] object-contain transition-opacity duration-300 ${imgStates[i]?.loaded ? 'opacity-100' : 'opacity-0'}`}
                      draggable={false}
                      onLoad={() => setImgStates(prev => {
                        const next = [...prev]
                        next[i] = { ...next[i], loaded: true }
                        return next
                      })}
                      onError={() => setImgStates(prev => {
                        const next = [...prev]
                        next[i] = { ...next[i], failed: true }
                        return next
                      })}
                    />
                  )}
                  {(!imgStates[i]?.loaded || imgStates[i]?.failed) && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-32 h-32 rounded-full bg-[#1A1A1A] flex items-center justify-center">
                        <span className="text-4xl font-bold text-[#8E8E93]">{user.name.charAt(0)}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {photos.length > 1 && (
              <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-full">
                <span className="text-white text-xs font-medium">{activeIdx + 1} / {photos.length}</span>
              </div>
            )}
          </>
        ) : (
          <div className="w-full flex items-center justify-center">
            <div className="w-32 h-32 rounded-full bg-[#1A1A1A] flex items-center justify-center">
              <span className="text-4xl font-bold text-[#8E8E93]">{user.name.charAt(0)}</span>
            </div>
          </div>
        )}
      </div>

      {photos.length > 1 && (
        <div className="flex justify-center gap-1.5 pb-3">
          {photos.map((_, i) => <div key={i} className={`h-1.5 rounded-full transition-all duration-200 ${i === activeIdx ? 'w-4 bg-[#5AC8FA]' : 'w-1.5 bg-[#8E8E93]/40'}`} />)}
        </div>
      )}

      <div className="w-full px-4 pb-4 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-bold text-lg">{user.age ? `${user.name}, ${user.age}` : user.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-[#5AC8FA]" />
              <span className="text-[#8E8E93] text-xs">{formatDist(user.distance)}</span>
              {isUserActive(user) && <span className="ml-2 px-1.5 py-0.5 bg-[#00D4AA]/20 text-[#00D4AA] text-[10px] font-bold rounded-full">{t(lang, 'online').toUpperCase()}</span>}
            </div>
          </div>
          {!user.isOwn && ownProfile.seekingToday !== 'Just Browsing' && user.seekingToday !== 'Just Browsing' && (
            <button onClick={() => onMessage(user)} className="h-10 gradient-btn rounded-xl text-white font-semibold text-sm nav-press flex items-center gap-2 px-5">
              <MessageCircle className="w-4 h-4" />
              {user.openToMessages ? '⭐ ' + t(lang, 'message') : t(lang, 'message')}
            </button>
          )}
        </div>
        <div className="flex gap-3 mt-3 text-xs">
          <span className="text-[#8E8E93]">{user.height}cm</span>
          <span className="text-[#8E8E93]">{user.weight}kg</span>
          <span className={`font-bold ${user.gender === 'Male' ? 'text-blue-400' : 'text-pink-400'}`}>{user.gender}</span>
          <span className="text-[#8E8E93]">→ {user.seekingGender}</span>
          {user.dob && <span className="text-purple-400 font-bold">{getZodiacEmoji(getZodiac(user.dob))} {getZodiac(user.dob)}</span>}
          {user.seekingToday && <span className="text-green-400 font-bold">{user.seekingToday}</span>}
          {user.meetupType && <span className="text-cyan-400 font-bold">{user.meetupType}</span>}
          {user.openToMessages && <span className="font-bold text-yellow-400">⭐ {t(lang, 'message')}</span>}
        </div>
      </div>
    </div>
  )
}

// ─── Location Gate ────────────────────────────────────────────────────

function LocationGate({ onGranted, lang }: { onGranted: (lat: number, lng: number) => void; lang: Lang }) {
  const [status, setStatus] = useState<'checking' | 'needed' | 'requesting' | 'denied'>('checking')

  const requestLocation = () => {
    setStatus('requesting')
    navigator.geolocation.getCurrentPosition(
      (pos) => { onGranted(pos.coords.latitude, pos.coords.longitude) },
      () => { setStatus('denied') },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  }

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => onGranted(pos.coords.latitude, pos.coords.longitude),
      () => setStatus('needed'),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
    )
  }, [onGranted])

  if (status === 'checking') {
    return (
      <div className="fixed top-0 left-0 right-0 bottom-0 z-[70] bg-[#0A0A0A] flex flex-col items-center justify-center" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
        <LocateFixed className="w-12 h-12 text-[#5AC8FA] animate-pulse mb-4" />
        <p className="text-white font-semibold">{t(lang, 'checkingLoc')}</p>
      </div>
    )
  }

  return (
    <div className="fixed top-0 left-0 right-0 bottom-0 z-[70] bg-[#0A0A0A] flex flex-col items-center justify-center px-6" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
      <div className="w-16 h-16 rounded-full bg-[#5AC8FA]/10 flex items-center justify-center mb-4">
        <LocateFixed className="w-8 h-8 text-[#5AC8FA]" />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">{t('en', 'locationRequired')}</h2>
      <p className="text-[#8E8E93] text-sm text-center mb-6">
        {t(lang, 'locationDesc')}
      </p>
      {status === 'denied' && (
        <div className="bg-[#1A1A1A] border border-[#2C2C2E] rounded-xl p-4 mb-4 w-full max-w-sm">
          <p className="text-[#5AC8FA] text-sm font-semibold mb-1">{t(lang, 'permissionDenied')}</p>
          <p className="text-[#8E8E93] text-xs">{t(lang, 'enableLocation')}</p>
        </div>
      )}
      <button onClick={requestLocation} disabled={status === 'requesting'} className="w-full max-w-sm h-12 gradient-btn rounded-xl text-white font-semibold text-sm nav-press flex items-center justify-center gap-2">
        <LocateFixed className="w-4 h-4" />
        {status === 'requesting' ? t(lang, 'checkingLoc') : t(lang, 'tapToRetry')}
      </button>
    </div>
  )
}

// ─── Unlock Tip Cycle — cycles through ways to unlock more rows ──────

function UnlockTipCycle({ lang, isPremium, gridRowsUnlocked, channelFollowUnlock, onClaimChannelFollow }: { lang: Lang; isPremium: boolean; gridRowsUnlocked: number; channelFollowUnlock: number; onClaimChannelFollow: () => void }) {
  const [idx, setIdx] = useState(0)
  const tips: Record<Lang, string[]> = {
    en: [
      `Base: 2 rows free`,
      isPremium ? `Premium: +1 row` : `Premium: +1 row (not active)`,
      `Purchased: ${gridRowsUnlocked} rows`,
      `Add a Telegram photo +1`,
      `Boost LMN Channel +1~4`,
      `⭐ = charge stars per message`,
      channelFollowUnlock ? `Group: +1 row ✅` : `Join LMN Channel +1`,
      `Buy rows with ⭐ Stars`,
    ],
    tc: [
      `基礎: 2 行免費`,
      isPremium ? `Premium: +1 行` : `Premium: +1 行 (未激活)`,
      `已購: ${gridRowsUnlocked} 行`,
      `加入 Telegram 頭像 +1`,
      `Boost LMN Channel +1~4`,
      `⭐ = 按訊息收費`,
      channelFollowUnlock ? `群組: +1 行 ✅` : `加入 LMN Channel +1`,
      `用 ⭐ 星星購買行數`,
    ],
    sc: [
      `基础: 2 行免费`,
      isPremium ? `Premium: +1 行` : `Premium: +1 行 (未激活)`,
      `已购: ${gridRowsUnlocked} 行`,
      `加入 Telegram 头像 +1`,
      `Boost LMN Channel +1~4`,
      `⭐ = 按消息收费`,
      channelFollowUnlock ? `群组: +1 行 ✅` : `加入 LMN Channel +1`,
      `用 ⭐ 星星购买行数`,
    ],
    ru: [
      `База: 2 строки бесплатно`,
      isPremium ? `Premium: +1 строка` : `Premium: +1 строка (не активен)`,
      `Куплено: ${gridRowsUnlocked} строк`,
      `Добавь фото в Telegram +1`,
      `Boost LMN Channel +1~4`,
      `⭐ = плата за сообщение`,
      channelFollowUnlock ? `Группа: +1 строка ✅` : `Вступи в LMN Channel +1`,
      `Купить строки за ⭐`,
    ],
  }
  const list = tips[lang] || tips.en

  // Auto-rotate every 5 seconds
  useEffect(() => {
    const i = setInterval(() => setIdx(i => (i + 1) % list.length), 5000)
    return () => clearInterval(i)
  }, [list.length])

  const current = list[idx % list.length]
  const isChannelTip = idx % list.length === 6

  return (
    <button
      onClick={() => {
        if (isChannelTip && !channelFollowUnlock) {
          onClaimChannelFollow()
        } else {
          setIdx((i) => i + 1)
        }
      }}
      className="ml-auto flex items-center gap-1 text-[9px] text-[#8E8E93] nav-press"
    >
      <span className="w-4 h-4 rounded-full bg-[#2C2C2E] flex items-center justify-center">💡</span>
      <span key={idx} className={`truncate max-w-[140px] animate-fadeIn ${isChannelTip && !channelFollowUnlock ? 'text-[#5AC8FA]' : ''}`}>{current}</span>
    </button>
  )
}

// ─── Profile Grid Tile ───────────────────────────────────────────────


// ─── Main Screen ──────────────────────────────────────────────────────

function MainScreen({ ownProfile, users, onViewOwnProfile, onViewPhoto, showDbWarning, isLoadingUsers, lang, setLang, onRefresh, isAdmin, filtersUnlocked, onPromptUnlock, onPromptFilterUnlock, onToggleInvisible, gridRowsUnlocked, lastRefreshTime, setLastRefreshTime, isInvisible, invisiblePurchased, raffle, onBuyRaffleTicket, onStartNextRaffle, onPromptUnlockProfile, isPremium, channelFollowUnlock, onClaimChannelFollow }: {
  ownProfile: UserProfile
  users: UserProfile[]
  onViewOwnProfile: () => void
  onViewPhoto: (u: UserProfile) => void
  showDbWarning: boolean
  isLoadingUsers: boolean
  lang: Lang
  setLang: (l: Lang) => void
  onRefresh: () => void
  isAdmin: boolean
  filtersUnlocked: boolean
  onPromptUnlock: () => void
  onPromptFilterUnlock: () => void
  onToggleInvisible: () => void
  gridRowsUnlocked: number
  lastRefreshTime: number
  setLastRefreshTime: (t: number) => void
  isInvisible: boolean
  invisiblePurchased: boolean
  raffle: Raffle | null
  onBuyRaffleTicket: () => void
  onStartNextRaffle: () => void
  onPromptUnlockProfile: () => void
  isPremium: boolean
  channelFollowUnlock: number
  onClaimChannelFollow: () => void
}) {
  const [onlineOnly, setOnlineOnly] = useState(false)
  // LMN filters: Gender, Seeking, Photo
  const [genderFilter, setGenderFilter] = useState<'All' | 'Male' | 'Female'>('All')
  const [seekingFilter, setSeekingFilter] = useState<'All' | 'Men' | 'Women' | 'Both'>('All')
  const [photoFilter, setPhotoFilter] = useState<'All' | 'Has Photo' | 'No Photo'>('All')
  // Admin: hidden test users removed
  // const [showTestUsers, setShowTestUsers] = useState(false)

  const LANG_CYCLE: Lang[] = ['en', 'tc', 'sc', 'ru']
  const cycleLang = () => {
    const idx = LANG_CYCLE.indexOf(lang)
    const next = LANG_CYCLE[(idx + 1) % LANG_CYCLE.length]
    setLang(next)
    storage.set(CLOUD.lang, next)
  }

  const cycleGenderFilter = () => {
    const order: Array<'All' | 'Male' | 'Female'> = ['All', 'Male', 'Female']
    setGenderFilter(order[(order.indexOf(genderFilter) + 1) % order.length])
  }
  const cycleSeekingFilter = () => {
    const order: Array<'All' | 'Men' | 'Women' | 'Both'> = ['All', 'Men', 'Women', 'Both']
    setSeekingFilter(order[(order.indexOf(seekingFilter) + 1) % order.length])
  }
  const cyclePhotoFilter = () => {
    const order: Array<'All' | 'Has Photo' | 'No Photo'> = ['All', 'Has Photo', 'No Photo']
    setPhotoFilter(order[(order.indexOf(photoFilter) + 1) % order.length])
  }

  // Online = updated within 1 hour. Own profile always counts as active.
  const ONE_HOUR = 60 * 60 * 1000
  const isRecentlyActive = (u: UserProfile) => {
    if (u.isOwn) return true
    if (!u.updatedAt) return false
    return Date.now() - new Date(u.updatedAt).getTime() < ONE_HOUR
  }

  // Patch own profile with current invisible state (toggle may have changed it)
  const patchedOwnProfile = { ...ownProfile, isOwn: true, isInvisible: isInvisible || false }
  const allGridUsers: UserProfile[] = [patchedOwnProfile, ...users.filter(u => u.id !== ownProfile.id)]
  
  // Invisible users: completely hidden from non-admins (not even greyed out)
  const visibleGridUsers = isAdmin ? allGridUsers : allGridUsers.filter(u => u.isOwn || !u.isInvisible)
  
  const filteredGrid = visibleGridUsers.filter((u) => {
    if (u.isOwn) return true
    if (onlineOnly && !isRecentlyActive(u)) return false
    // Test users: hidden by default, admin can show
    // When shown, test users go through SAME filters as real users
    if (u.tgUsername === '_test_') return false
    
    // LMN filters
    if (genderFilter !== 'All' && u.gender !== genderFilter) return false
    if (seekingFilter !== 'All' && u.seekingGender !== seekingFilter) return false
    if (photoFilter === 'Has Photo' && !u.hasPhoto) return false
    if (photoFilter === 'No Photo' && u.hasPhoto) return false
    return true
  }).sort((a, b) => {
    // Own profile always first, then sort by distance (closest first)
    if (a.isOwn) return -1
    if (b.isOwn) return 1
    return (a.distance || Infinity) - (b.distance || Infinity)
  })

  // New: matching users first, then fill remaining slots with closest non-matching (greyed out)
  const matchingIds = new Set(filteredGrid.map(u => u.id))
  const nonMatchingGrid = visibleGridUsers.filter(u => !matchingIds.has(u.id)).sort((a, b) => {
    if (a.isOwn) return -1
    if (b.isOwn) return 1
    return (a.distance || Infinity) - (b.distance || Infinity)
  })
  const sortedUsers = [...filteredGrid, ...nonMatchingGrid]

  // Debug count (include own profile)
  // const nearbyCount = users.filter(u => u.id !== ownProfile.id).length
  // const onlineCount = users.filter(u => u.id !== ownProfile.id && u.tgUsername !== '_test_' && isRecentlyActive(u)).length + 1 // +1 for self, exclude test users

  return (
    <div className="flex-1 overflow-y-auto min-h-0 pb-20">
      <TopBar
        logo={<img src={logoImg} alt="LMN" className="w-8 h-8 rounded-full object-cover" />}
        appName="LMN"
        raffle={raffle}
        isAdmin={isAdmin}
        onBuyRaffleTicket={onBuyRaffleTicket}
        onStartNextRaffle={onStartNextRaffle}
        lang={lang}
        isInvisible={isInvisible}
        invisiblePurchased={invisiblePurchased}
        onToggleInvisible={onToggleInvisible}
        onPromptUnlockProfile={onPromptUnlockProfile}
        lastRefreshTime={lastRefreshTime}
        onRefresh={onRefresh}
        langLabel={getLangLabel(lang)}
        onCycleLang={cycleLang}
      />

      {/* User stats bar — shared component */}
      <StatsBar
        lang={lang}
        isPremium={isPremium}
        gridRowsUnlocked={gridRowsUnlocked}
        channelFollowUnlock={channelFollowUnlock}
        hasRealPhoto={ownProfile.hasRealPhoto}
        appVersion="1L"
      >
        <UnlockTipCycle lang={lang} isPremium={isPremium} gridRowsUnlocked={gridRowsUnlocked} channelFollowUnlock={channelFollowUnlock} onClaimChannelFollow={onClaimChannelFollow} />
      </StatsBar>

      {showDbWarning && (
        <div className="mx-3 mt-2 bg-[#5AC8FA]/10 border border-[#5AC8FA]/30 rounded-lg px-3 py-2 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-[#5AC8FA] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[#5AC8FA] text-xs font-semibold">{t(lang, 'dbNotConfigured')}</p>
            <p className="text-[#8E8E93] text-[10px]">{t(lang, 'dbConfigHint')}</p>
          </div>
        </div>
      )}

      {/* Filter bar: 4 buttons — 1.online 2.photo 3.gender 4.seeking */}
      <div className="px-3 py-2">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
          {/* 1. Offline/Online toggle */}
          <button
            onClick={() => setOnlineOnly(!onlineOnly)}
            className={`px-2 py-1 rounded-full text-[11px] font-medium transition-all nav-press flex-shrink-0 ${onlineOnly ? 'gradient-btn text-white' : 'bg-[#1A1A1A] text-[#8E8E93] border border-[#2C2C2E]'}`}
          >
            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${onlineOnly ? 'bg-[#00D4AA]' : 'bg-[#8E8E93]'}`} />
            {onlineOnly ? t(lang, 'onlineStatus') : t(lang, 'offlineStatus')}
          </button>

          {/* 2. Photo filter */}
          <button
            onClick={cyclePhotoFilter}
            className={`px-2 py-1 rounded-full text-[11px] font-medium transition-all nav-press flex-shrink-0 ${photoFilter === 'Has Photo' ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30' : photoFilter === 'No Photo' ? 'bg-[#1A1A1A] text-[#8E8E93] border border-[#2C2C2E]' : 'bg-[#1A1A1A] text-[#8E8E93] border border-[#2C2C2E]'}`}
          >
            {photoFilter === 'All' ? 'Photo' : photoFilter === 'Has Photo' ? '✅ Photo' : '❌ Photo'}
          </button>

          {/* Divider */}
          <div className="w-px h-4 bg-[#2C2C2E] flex-shrink-0" />

          {/* 3. Gender filter */}
          <button onClick={cycleGenderFilter}
            className={`text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0 nav-press ${genderFilter === 'All' ? 'bg-[#1A1A1A] text-[#8E8E93] border border-[#2C2C2E]' : genderFilter === 'Male' ? 'bg-blue-500/20 text-blue-400' : 'bg-pink-500/20 text-pink-400'}`}
          >
            {genderFilter === 'All' ? 'All' : genderFilter}
          </button>

          {/* 4. Seeking filter */}
          <button onClick={cycleSeekingFilter}
            className={`text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0 nav-press ${seekingFilter === 'All' ? 'bg-[#1A1A1A] text-[#8E8E93] border border-[#2C2C2E]' : seekingFilter === 'Men' ? 'bg-blue-500/20 text-blue-400' : seekingFilter === 'Women' ? 'bg-pink-500/20 text-pink-400' : 'bg-purple-500/20 text-purple-400'}`}
          >
            {seekingFilter === 'All' ? 'Seeking' : seekingFilter}
          </button>
        </div>
      </div>

      <div className="px-3">
        {isLoadingUsers && users.length === 0 && (
          <div className="text-center py-8">
            <div className="w-6 h-6 border-2 border-[#5AC8FA] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-[#8E8E93] text-xs">{t(lang, 'findingMembers')}</p>
          </div>
        )}

{(() => {
          const effectiveRows = 2 + gridRowsUnlocked + (isPremium ? 1 : 0) + channelFollowUnlock
          const unlockedSlots = effectiveRows * 5
          const totalRealUsers = sortedUsers.length
          const hasMoreUsers = totalRealUsers > unlockedSlots
          
          return (
            <>
              <ProfileGrid
                users={sortedUsers.filter((u) => u.id !== ownProfile.id) as any}
                ownProfile={{...ownProfile, isOwn: true} as any}
                unlockedSlots={unlockedSlots}
                totalRealUsers={totalRealUsers}
                hasMoreUsers={hasMoreUsers}
                onPromptUnlock={onPromptUnlock}
                onViewOwnProfile={onViewOwnProfile}
                onViewPhoto={onViewPhoto}
                isAdmin={isAdmin}
                isLoading={isLoadingUsers && users.length === 0}
                matchingIds={matchingIds}
                logoUrl={logoImg}
                renderTileBottom={(user) => {
                  const genderLabel = user.gender?.charAt(0) || '?'
                  return (
                    <div className="flex items-center justify-between">
                      <p className="text-[#5AC8FA] text-[7px] font-medium">{user.age} • {formatDist(user.distance ?? 0)}</p>
                      {!user.isOwn && <p className="text-[#8E8E93] text-[6px]">{getTimeAgo(user.updatedAt)}</p>}
                      <p className={`text-[6px] font-bold ${user.gender === 'Male' ? 'text-blue-400' : 'text-pink-400'}`}>{genderLabel}</p>
                    </div>
                  )
                }}
              />
            </>
          )
        })()}
      </div>

      <div className="px-3 pt-2 flex items-center justify-between text-[10px] text-[#8E8E93]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#00D4AA]" />{lang === 'en' ? 'Online' : lang === 'ru' ? 'Онлайн' : '在線'}</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#8E8E93]" />{t(lang, 'offlineStatus')}</span>
        </div>
        <span className="text-[#5AC8FA]">{t(lang, 'youOrangeBorder')}</span>
      </div>

    </div>
  )
}

// ─── Own Profile Screen with SAVE button ──────────────────────────────

function OwnProfileScreen({ profile, onSave, onBack, lang, editProfileUnlocked }: {
  profile: UserProfile
  onSave: (updated: UserProfile) => void
  onBack: () => void
  lang: Lang
  editProfileUnlocked: boolean
}) {
  const [draft, setDraft] = useState<UserProfile>({ ...profile })
  const [saved, setSaved] = useState(false)
  const [photoIndex, setPhotoIndex] = useState(0)
  const [photoLoaded, setPhotoLoaded] = useState(false)

  useEffect(() => { setDraft({ ...profile }) }, [profile.id])

  // Sync photo updates from profile without resetting entire draft
  useEffect(() => {
    setDraft(prev => ({ ...prev, tgPhotoUrl: profile.tgPhotoUrl, tgPhotos: profile.tgPhotos }))
  }, [profile.tgPhotoUrl, profile.tgPhotos])

  useEffect(() => {
    setPhotoLoaded(false)
    setPhotoIndex(0)
  }, [draft.tgPhotoUrl])

  const updateDraft = (field: keyof UserProfile, value: unknown) => {
    setDraft(prev => ({ ...prev, [field]: value }))
    setSaved(false)
  }

  // Profile is considered "saved" when DOB, height, and weight are all set
  const hasSavedProfile = !!profile.dob && profile.height > 0 && profile.weight > 0

  // Helper to render a field label with lock indicator
  const FieldLabel = ({ label, locked }: { label: string, locked?: boolean }) => (
    <span className="text-xs text-[#8E8E93] font-medium uppercase block mb-1.5 flex items-center gap-1">
      {label}
      {locked && <Lock className="w-3 h-3 text-[#5AC8FA]" />}
    </span>
  )

  const handleSave = async () => {
    if (!draft.height || draft.height <= 0 || !draft.weight || draft.weight <= 0) {
      alert('Please enter height and weight')
      return
    }
    if (!draft.dob) {
      alert('Please enter date of birth')
      return
    }

    // Build confirmation message
    const changes: string[] = []
    if (draft.gender !== profile.gender) changes.push('Gender: ' + draft.gender)
    if (draft.seekingGender !== profile.seekingGender) changes.push('Seeking: ' + draft.seekingGender)
    if (draft.dob !== profile.dob) changes.push('Date of Birth: ' + draft.dob)
    if (draft.height !== profile.height) changes.push('Height: ' + draft.height + 'cm')
    if (draft.weight !== profile.weight) changes.push('Weight: ' + draft.weight + 'kg')
    if (draft.hideAge !== profile.hideAge) changes.push('Hide Age: ' + (draft.hideAge ? 'On' : 'Off'))
    if (draft.seekingToday !== profile.seekingToday) changes.push('Seeking Today: ' + draft.seekingToday)

    const hasPermanent = changes.some(c => !c.startsWith('Seeking Today:'))
    const justBrowsingWarning = draft.seekingToday === 'Just Browsing' ? '\n\n⚠️ Just Browsing: You will NOT be able to send or receive messages while in this status.' : ''
    if (changes.length > 0) {
      const msg = changes.join('\\n') + '\\n\\n' + (hasPermanent ? '⚠️ Personal info is PERMANENT and cannot be changed later.\\n\\n' : '') + justBrowsingWarning + 'Save these changes?'
      if (!window.confirm(msg)) return
    } else {
      onBack()
      return
    }

    // 12-hour cooldown for seekingToday
    if (draft.seekingToday !== profile.seekingToday) {
      const lastStr = await storage.get(CLOUD.seekingTodayChangedAt)
      const lastTs = lastStr ? parseInt(lastStr) : 0
      const hoursSince = (Date.now() - lastTs) / (1000 * 60 * 60)
      if (lastTs > 0 && hoursSince < 12) {
        const minsLeft = Math.ceil((12 * 60 * 60 * 1000 - (Date.now() - lastTs)) / (1000 * 60))
        alert('Seeking Today can only be changed every 12 hours. ' + Math.floor(minsLeft / 60) + 'h ' + (minsLeft % 60) + 'm remaining.')
        return
      }
      await storage.set(CLOUD.seekingTodayChangedAt, String(Date.now()))
    }

    await storage.set(CLOUD.dob, draft.dob || '')
    await storage.set(CLOUD.height, String(draft.height))
    await storage.set(CLOUD.weight, String(draft.weight))
    await storage.set(CLOUD.pref1, draft.gender || 'Male')
    await storage.set(CLOUD.pref2, draft.seekingGender || 'Women')
    await storage.set(CLOUD.pref3, draft.seekingToday || 'Just Browsing')
    await storage.set(CLOUD.hideAge, String(!!draft.hideAge))
    onSave(draft)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const photos = draft.tgPhotos?.length ? draft.tgPhotos : (draft.tgPhotoUrl?.trim() ? [draft.tgPhotoUrl] : [logoImg])
  const currentPhoto = photos[photoIndex % photos.length]
  const hasMultiplePhotos = photos.length > 1

  return (
    <div className="view-enter h-full flex flex-col">
      <div className="shrink-0 bg-[#0A0A0A]/95 backdrop-blur-md border-b border-[#2C2C2E] px-3 py-2.5 flex items-center justify-between z-10">
        <button onClick={onBack} className="w-8 h-8 rounded-full bg-[#1A1A1A] flex items-center justify-center nav-press">
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <h2 className="text-base font-semibold text-white">{t(lang, 'editProfile')}</h2>
        <div className="w-8" />
      </div>

      <div className="flex-1 overflow-y-auto px-3 pt-3 pb-4">
        {/* Photo + Name */}
        <div className="flex gap-3 mb-3">
          <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-b from-[#2C2C2E] to-[#1A1A1A]">
            <div className="absolute inset-0 flex items-center justify-center z-0">
              <span className="text-2xl font-bold text-[#8E8E93]">{draft.name.charAt(0)}</span>
            </div>
            {currentPhoto && (
              <img
                src={currentPhoto} alt="You"
                className={`absolute inset-0 w-full h-full object-cover z-10 ${photoLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300 active:opacity-70`}
                draggable={false} loading="eager" decoding="async"
                onLoad={() => setPhotoLoaded(true)} onError={() => setPhotoLoaded(false)}
                onClick={() => hasMultiplePhotos && setPhotoIndex((prev) => (prev + 1) % photos.length)}
              />
            )}
            {hasMultiplePhotos && (
              <div className="absolute top-0.5 right-0.5 bg-black/60 rounded-full px-1 py-0 z-20">
                <span className="text-white text-[8px] font-bold">{photoIndex + 1}/{photos.length}</span>
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-[#0088CC]/70 text-center py-0.5 z-20">
              <span className="text-white text-[7px] font-bold uppercase">TG</span>
            </div>
          </div>
          <div className="flex-1 flex flex-col justify-center gap-1">
            <span className="text-white font-bold text-base">{draft.name}</span>
            <div className="flex items-center gap-2 text-xs text-[#8E8E93]">
              <span>{draft.height}cm</span><span className="text-[#2C2C2E]">|</span><span>{draft.weight}kg</span>
            </div>
            {draft.dob && (
              <span className="text-purple-400 text-xs font-bold">
                {getZodiacEmoji(getZodiac(draft.dob))} {getZodiac(draft.dob)} · {new Date().getFullYear() - new Date(draft.dob).getFullYear()}yo
              </span>
            )}
          </div>
        </div>

        <div className="h-px bg-[#2C2C2E] mb-3" />

        {/* Gender */}
        <div className={`mb-3 ${hasSavedProfile ? 'opacity-60' : ''}`}>
          <FieldLabel label="Gender" locked={hasSavedProfile} />
          <div className="flex gap-2">
            <button disabled={hasSavedProfile} onClick={() => updateDraft('gender', 'Male')} className={`flex-1 h-10 rounded-lg text-xs font-bold transition-all nav-press ${draft.gender === 'Male' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-[#1A1A1A] text-[#8E8E93] border border-[#2C2C2E]'} ${hasSavedProfile ? 'cursor-not-allowed' : ''}`}>Male</button>
            <button disabled={hasSavedProfile} onClick={() => updateDraft('gender', 'Female')} className={`flex-1 h-10 rounded-lg text-xs font-bold transition-all nav-press ${draft.gender === 'Female' ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30' : 'bg-[#1A1A1A] text-[#8E8E93] border border-[#2C2C2E]'} ${hasSavedProfile ? 'cursor-not-allowed' : ''}`}>Female</button>
          </div>
        </div>

        {/* Seeking Gender */}
        <div className={`mb-3 ${hasSavedProfile ? 'opacity-60' : ''}`}>
          <FieldLabel label="Seeking" locked={hasSavedProfile} />
          <div className="flex gap-2">
            {(['Men','Women','Both'] as const).map(g => (
              <button key={g} disabled={hasSavedProfile} onClick={() => updateDraft('seekingGender', g)} className={`flex-1 h-10 rounded-lg text-xs font-bold transition-all nav-press ${draft.seekingGender === g ? 'gradient-btn text-white' : 'bg-[#1A1A1A] text-[#8E8E93] border border-[#2C2C2E]'} ${hasSavedProfile ? 'cursor-not-allowed' : ''}`}>
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Date of Birth + Hide Age */}
        <div className={`mb-3 ${hasSavedProfile ? 'opacity-60' : ''}`}>
          <FieldLabel label="Date of Birth" locked={hasSavedProfile} />
          <input
            type="date"
            value={draft.dob || ''}
            readOnly={hasSavedProfile}
            onChange={(e) => !hasSavedProfile && updateDraft('dob', e.target.value)}
            className={`w-full h-10 px-3 bg-[#1A1A1A] rounded-lg text-white text-sm outline-none border border-[#2C2C2E] focus:border-[#5AC8FA]/50 ${hasSavedProfile ? 'cursor-not-allowed' : ''}`}
          />
          <label className="flex items-center gap-2 cursor-pointer mt-2">
            <input type="checkbox" checked={!!draft.hideAge}
              onChange={(e) => updateDraft('hideAge', e.target.checked)}
              className="w-4 h-4 accent-[#5AC8FA]"
            />
            <span className="text-sm text-white">🙈 Hide my age on profile</span>
          </label>
        </div>

        {/* Height & Weight */}
        <div className={`mb-3 ${hasSavedProfile ? 'opacity-60' : ''}`}>
          <FieldLabel label="Height / Weight" locked={hasSavedProfile} />
          <div className="flex gap-2">
            <div className="flex-1 flex items-center justify-between px-3 py-2.5 bg-[#1A1A1A] rounded-lg">
              <span className="text-xs text-[#8E8E93] font-medium uppercase">Height</span>
              <input type="number" value={draft.height || ''} placeholder="0"
                readOnly={hasSavedProfile}
                onChange={(e) => !hasSavedProfile && updateDraft('height', parseInt(e.target.value) || 0)}
                className={`bg-transparent text-white text-sm font-medium text-right outline-none w-16 ${hasSavedProfile ? 'cursor-not-allowed' : ''}`} />
            </div>
            <div className="flex-1 flex items-center justify-between px-3 py-2.5 bg-[#1A1A1A] rounded-lg">
              <span className="text-xs text-[#8E8E93] font-medium uppercase">Weight</span>
              <input type="number" value={draft.weight || ''} placeholder="0"
                readOnly={hasSavedProfile}
                onChange={(e) => !hasSavedProfile && updateDraft('weight', parseInt(e.target.value) || 0)}
                className={`bg-transparent text-white text-sm font-medium text-right outline-none w-16 ${hasSavedProfile ? 'cursor-not-allowed' : ''}`} />
            </div>
          </div>
        </div>

        {/* Seeking Today — dropdown, 12h cooldown */}
        <div className="mb-3">
          <span className="text-xs text-[#8E8E93] font-medium uppercase block mb-1.5">Seeking Today</span>
          <select
            value={draft.seekingToday || 'Just Browsing'}
            onChange={(e) => updateDraft('seekingToday', e.target.value)}
            className="w-full h-10 px-3 bg-[#1A1A1A] rounded-lg text-white text-sm outline-none border border-[#2C2C2E] focus:border-[#5AC8FA]/50 appearance-none"
          >
            {['Just Browsing', 'Chat Only', 'Video Call', 'Meet Up'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <p className="text-[10px] text-[#8E8E93] mt-1">Can only be changed every 12 hours</p>
        </div>
      </div>

      {/* Save Bar */}
      <div className="shrink-0 bg-[#0A0A0A]/95 backdrop-blur-xl border-t border-[#2C2C2E] px-3 pt-3 pb-5 z-20">
        {saved && (
          <div className="text-center text-[#00D4AA] text-xs font-semibold mb-2 animate-pulse">Saved!</div>
        )}
        <button onClick={handleSave} className="w-full h-14 gradient-btn rounded-xl text-white font-bold text-lg nav-press flex items-center justify-center gap-2">
          <Check className="w-6 h-6" />Save Profile
        </button>
      </div>
    </div>
  )
}

// ─── Flying Messages Overlay ─────────────────────────────────────────

function FlyingMessagesOverlay({ messages, onDone }: { messages: {id: number; text: string; top: string}[]; onDone: (id: number) => void }) {
  useEffect(() => {
    messages.forEach(m => {
      setTimeout(() => onDone(m.id), 60000) // remove after 60s
    })
  }, [messages, onDone])

  return (
    <div className="fixed inset-0 z-[90] pointer-events-none overflow-hidden" aria-hidden="true">
      {messages.map(m => (
        <div
          key={m.id}
          className="flying-message absolute whitespace-nowrap text-sm font-bold text-white/90 drop-shadow-lg"
          style={{ top: m.top }}
        >
          {m.text}
        </div>
      ))}
    </div>
  )
}

// ─── Bottom Nav ──────────────────────────────────────────────────────

// ─── Bottom Nav ─────────────────────────────────────────────────────-

// ─── App Component ───────────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState<View>('MAIN')
  const [showSplash, setShowSplash] = useState(true)
  const [adminAction, setAdminAction] = useState<'release' | null>(null)
  const [ownProfile, setOwnProfile] = useState<UserProfile>({
    id: 'own', name: 'You', age: 0, height: 178, weight: 72,
    position: 0.5, isSide: false, isOnline: true, distance: 0, isOwn: true,
    preference1: 'Raw', preference2: 'Party', preference3: 'Group', preference4: 'Travel',
    openToMessages: false, tgUsername: '', tgPhotoUrl: '', tgPhotos: [],
    hasPhoto: false, hasRealPhoto: undefined,
    isInvisible: false,
    // LMN defaults
    gender: 'Male', seekingGender: 'Women', seekingToday: 'Just Browsing', hideAge: false,
  })
  const [users, setUsers] = useState<UserProfile[]>([])
  const [photoOverlay, setPhotoOverlay] = useState<UserProfile | null>(null)
  const [locationGranted, setLocationGranted] = useState(false)
  const [isLoadingUsers, setIsLoadingUsers] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [groupCheck, setGroupCheck] = useState<'checking' | 'member' | 'not_member'>('checking')
  // Default language from Telegram, fallback to English

  const [lang, setLang] = useState<Lang>(getDefaultLang())
  const [starsPaidFor, setStarsPaidFor] = useState<Set<string>>(new Set())
  const [filtersUnlocked, setFiltersUnlocked] = useState(false)
  const [editProfileUnlocked] = useState(false)
  const [gridRowsUnlocked, setGridRowsUnlocked] = useState(0)
  const [channelFollowUnlock, setChannelFollowUnlock] = useState(0)
  const [isPremium, setIsPremium] = useState(false)
  const [invisibleUntil, setInvisibleUntil] = useState<string | null>(null)
  const [invisibleActive, setInvisibleActive] = useState(false)
  const isInvisible = invisibleActive && (invisibleUntil ? new Date(invisibleUntil).getTime() > Date.now() : false)
  const hasPurchasedInvisible = invisibleUntil !== null
  const [raffle, setRaffle] = useState<Raffle | null>(null)

  // Raffle handlers — shared hook from dating-core
  const { handleBuyRaffleTicket, handleStartNextRaffle } = useRaffleActions({
    tableName: 'lmn_users',
    workerUrl: 'https://lmn-d.mileschan852.workers.dev/createinvoice',
    isAdmin,
    raffle,
    setRaffle: (r) => setRaffle(r as any),
  })

  // Flying messages: shared across all users via Supabase
  const [flyingMessages, setFlyingMessages] = useState<{id: number; text: string; top: string}[]>([])
  const lastFlyingSendRef = useRef(0) // 1 min cooldown per user


  // "Show More Users" button → unlock +1 grid row (5 users)
  // Admin skips payment, regular users pay 1000 Stars

  // Admin re-check: if user data arrives late (e.g. bot menu open), re-check admin status
  useEffect(() => {
    const interval = setInterval(() => {
      const tg = getTg()
      const user = tg?.initDataUnsafe?.user
      if (user && user.id) {
        const adminCheck = isAdminUser(user, ADMIN_IDS, ADMIN_USERNAMES)
        if (adminCheck !== isAdmin) {
          console.log(`Admin re-check: id=${user.id}, username=${user.username}, admin=${adminCheck}`)
          setIsAdmin(adminCheck)
        }
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [isAdmin])

  // ─── Filter unlock: purchase 30-day filter access ──────────────────
  const promptFilterUnlock = async () => {
    const tg = getTg()
    const userId = tg?.initDataUnsafe?.user?.id
    // Admin bypass: skip Stars payment, unlock directly
    if (isAdmin) {
      setFiltersUnlocked(true)
      const now = Date.now()
      const expiresAt = new Date(now + 30 * 86400000).toISOString()
      storage.set(CLOUD.filtersUnlocked, 'true')
      storage.set(CLOUD.filtersUnlockedAt, String(now))
      if (userId) {
        saveFiltersUnlocked(userId, true, expiresAt)
      }
      return
    }
    if (!userId) return
    try {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 8000)
      const res = await fetch('https://lmn-d.mileschan852.workers.dev/createinvoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, amount: 500, purpose: 'filters' }),
        signal: ctrl.signal,
      })
      clearTimeout(timer)
      const data = await res.json()
      if (data.ok && data.invoice_url && tg?.openInvoice) {
        tg.openInvoice(data.invoice_url, async (status) => {
          if (status === 'paid') {
            setFiltersUnlocked(true)
            const now = Date.now()
            const expiresAt = new Date(now + 30 * 86400000).toISOString()
            storage.set(CLOUD.filtersUnlocked, 'true')
            storage.set(CLOUD.filtersUnlockedAt, String(now))
            saveFiltersUnlocked(userId, true, expiresAt)
          }
        })
      }
    } catch { /* Worker failed, silently ignore */ }
  }

  // Admin re-check: if user data arrives late (e.g. bot menu open), re-check admin status
  useEffect(() => {
    const interval = setInterval(() => {
      const tg = getTg()
      const user = tg?.initDataUnsafe?.user
      if (user && user.id) {
        const adminCheck = isAdminUser(user, ADMIN_IDS, ADMIN_USERNAMES)
        if (adminCheck !== isAdmin) {
          console.log(`Admin re-check: id=${user.id}, username=${user.username}, admin=${adminCheck}`)
          setIsAdmin(adminCheck)
        }
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [isAdmin])


  const promptUnlockProfile = useCallback(async () => {
    if (isAdmin) {
      setAdminAction('release')
      return
    }
    const tg = getTg()
    const userId = tg?.initDataUnsafe?.user?.id
    if (!userId) return
    try {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 8000)
      const res = await fetch('https://lmn-d.mileschan852.workers.dev/createinvoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, amount: 100, purpose: 'edit' }),
        signal: ctrl.signal,
      })
      clearTimeout(timer)
      const data = await res.json()
      if (data.ok && data.invoice_url && tg?.openInvoice) {
        tg.openInvoice(data.invoice_url, async (status) => {
          if (status === 'paid') {
            await storage.set(CLOUD.prefLockedAt, '0')
            alert('Profile lock released! Refresh to apply.')
            window.location.reload()
          }
        })
      }
    } catch { /* Worker failed */ }
  }, [isAdmin])

  const promptUnlock = async () => {
    const tg = getTg()
    const userId = tg?.initDataUnsafe?.user?.id
    // Admin bypass: skip Stars payment, unlock directly
    if (isAdmin) {
      const newRows = gridRowsUnlocked + 1
      setGridRowsUnlocked(newRows)
      storage.set(CLOUD.gridRowsUnlocked, String(newRows))
      storage.set(CLOUD.gridRowsUnlockedAt, String(Date.now()))
      if (userId) {
        await saveGridRowsUnlocked(userId, newRows)
      }
      return
    }
    if (!userId) return
    try {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 8000)
      const res = await fetch('https://lmn-d.mileschan852.workers.dev/createinvoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, amount: 1000, purpose: 'grid' }),
        signal: ctrl.signal,
      })
      clearTimeout(timer)
      const data = await res.json()
      if (data.ok && data.invoice_url && tg?.openInvoice) {
        tg.openInvoice(data.invoice_url, async (status) => {
          if (status === 'paid') {
            const newRows = gridRowsUnlocked + 1
            setGridRowsUnlocked(newRows)
            storage.set(CLOUD.gridRowsUnlocked, String(newRows))
            storage.set(CLOUD.gridRowsUnlockedAt, String(Date.now()))
            await saveGridRowsUnlocked(userId, newRows)
          }
        })
      }
    } catch { /* Worker failed, silently ignore */ }
  }

  // ─── Channel Follow Unlock — +1 row for following @LetsMsetNow_Bot ─────────
  const handleClaimChannelFollow = useCallback(async () => {
    if (channelFollowUnlock) return
    // Open the channel
    const url = 'https://t.me/LetsMeetNowApp'
    try {
      const tg = getTg()
      if (tg?.openTelegramLink) { tg.openTelegramLink(url) }
      else if (tg?.openLink) { tg.openLink(url, { try_instant_view: false }) }
      else { window.open(url, '_blank') }
    } catch {}
    // Give the unlock immediately (we trust the user - it's a one-time thing)
    setChannelFollowUnlock(1)
    storage.set(CLOUD.channelFollowed, '1')
  }, [channelFollowUnlock])

  // Invisible mode payment — 2000 Stars for 30 days
  // Admin gets it free
  const promptInvisiblePayment = async () => {
    const tg = getTg()
    const userId = tg?.initDataUnsafe?.user?.id
    if (!userId) return
    try {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 8000)
      const res = await fetch('https://lmn-d.mileschan852.workers.dev/createinvoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, amount: 2000, purpose: 'invisible' }),
        signal: ctrl.signal,
      })
      clearTimeout(timer)
      const data = await res.json()
      if (data.ok && data.invoice_url && tg?.openInvoice) {
        tg.openInvoice(data.invoice_url, (status) => {
          if (status === 'paid') {
            const until = new Date(Date.now() + 30 * 86400000).toISOString()
            setInvisibleUntil(until)
            setInvisibleActive(true)
            storage.set(CLOUD.invisibleActive, 'true')
            updateInvisibleStatus(userId, until)
          }
        })
      }
    } catch { /* Worker failed, silently ignore */ }
  }

  const tgUserId = useRef<number | null>(null)
  const [videoReady, setVideoReady] = useState(false)

  // Splash screen: dismiss when video loads or after max 3s
  useEffect(() => {
    const maxWait = setTimeout(() => setShowSplash(false), 3000)
    return () => clearTimeout(maxWait)
  }, [])
  useEffect(() => {
    if (videoReady) {
      const minDisplay = setTimeout(() => setShowSplash(false), 1800)
      return () => clearTimeout(minDisplay)
    }
  }, [videoReady])
  // ─── Group membership check ───────────────────────────────────────
  useEffect(() => {
    const tg = getTg()
    const inTg = isInTelegram()
    const user = tg?.initDataUnsafe?.user

    console.log('=== LMN Check === inTelegram:', inTg)

    // Admin bypass FIRST — always allow admins even outside Telegram
    if (isAdminUser(user, ADMIN_IDS, ADMIN_USERNAMES)) {
      console.log('  result: ADMIN BYPASS')
      setGroupCheck('member')
      return
    }

    // Must be inside Telegram WebApp (profiles need Telegram user data)
    if (!inTg || !tg) {
      console.log('  result: NOT in Telegram')
      setGroupCheck('not_member')
      return
    }

    // Any Telegram user can access (app is shared in group)
    console.log('  result: PASSED - Telegram user')
    setGroupCheck('member')
  }, [])

  // ─── Init: Load Telegram user + saved data ─────────────────────────
  useEffect(() => {
    const tg = getTg()
    const inTg = isInTelegram()
    console.log('=== LMN Init === inTelegram:', inTg, 'WebApp:', !!tg)

    // Browser fallback: generate a test user ID so storage keys are consistent
    if (!inTg) {
      tgUserId.current = 999999
      console.log('Browser mode: using test user ID', tgUserId.current)
    }

    if (tg) {
      tg.ready()
      tg.expand()
      tg.setHeaderColor('#0A0A0A')

      const user = tg.initDataUnsafe?.user
      console.log('TG user:', user ? { id: user.id, name: user.first_name, photo_url: user.photo_url?.substring(0, 50) } : 'none')

      if (user) {
        tgUserId.current = user.id
        setIsPremium(!!user.is_premium)
        const adminCheck = isAdminUser(user, ADMIN_IDS, ADMIN_USERNAMES)
        console.log(`Admin check: id=${user.id}, username=${user.username}, admin=${adminCheck}`)
        setIsAdmin(adminCheck)
        const photoUrl = user.photo_url || ''
        setOwnProfile(prev => ({
          ...prev,
          id: String(user.id),
          name: user.first_name || prev.name,
          tgUsername: user.username || prev.tgUsername,
          tgPhotoUrl: photoUrl || prev.tgPhotoUrl,
          tgPhotos: photoUrl ? [photoUrl] : prev.tgPhotos,
          hasPhoto: (!!photoUrl && photoUrl.startsWith('http')) || prev.hasPhoto,
        }))
        // Save photo_url to CloudStorage (it expires after ~1hr!)
        if (photoUrl) {
          storage.set(CLOUD.photoUrl, photoUrl)
        }
        // User has a real photo if Telegram provided a photo URL
        setOwnProfile(prev => ({ ...prev, hasRealPhoto: !!photoUrl }))
        if (user.first_name) {
          storage.set(CLOUD.name, user.first_name)
        }
      }
    }

    // Load saved data (including backup photo_url)
    storage.getAll().then(result => {
      if (!result || Object.keys(result).length === 0) return
      console.log('Storage loaded keys:', Object.keys(result))

      const loaded: Partial<UserProfile> = {}
      // Load photo_url backup ONLY if we don't already have a fresh one from initData
      const savedPhoto = result[CLOUD.photoUrl]
      if (savedPhoto && savedPhoto.trim() !== '' && !loaded.tgPhotoUrl) {
        loaded.tgPhotoUrl = savedPhoto
        loaded.tgPhotos = [savedPhoto]
      }
      // Load name backup
      const savedName = result[CLOUD.name]
      if (savedName && savedName.trim() !== '') loaded.name = savedName

      const hVal = result[CLOUD.height]
      if (hVal && hVal.trim() !== '') { const p = parseInt(hVal); if (!isNaN(p) && p > 0) loaded.height = p }
      const wVal = result[CLOUD.weight]
      if (wVal && wVal.trim() !== '') { const p = parseInt(wVal); if (!isNaN(p) && p > 0) loaded.weight = p }
      const pVal = result[CLOUD.position]
      if (pVal && pVal.trim() !== '') { const p = parseFloat(pVal); if (!isNaN(p)) loaded.position = p }
      loaded.isSide = result[CLOUD.isSide] === 'true'
      if (result[CLOUD.pref1]) loaded.preference1 = result[CLOUD.pref1] as 'Safe' | 'Raw'
      if (result[CLOUD.pref2]) loaded.preference2 = result[CLOUD.pref2] as 'Clean' | 'Party' | 'Party✓'
      if (result[CLOUD.pref3]) loaded.preference3 = result[CLOUD.pref3] as '1on1' | 'Group'
      if (result[CLOUD.pref4]) {
        const p4 = result[CLOUD.pref4]
        // Migrate old 'Off' value to 'Travel'
        loaded.preference4 = (p4 === 'Off' ? 'Travel' : p4) as 'Host' | 'Travel' | 'Outdoor' | 'Sauna'
      }
      loaded.openToMessages = result[CLOUD.openMsg] === 'true'
      // LMN fields
      if (result[CLOUD.pref1]) loaded.gender = result[CLOUD.pref1]
      if (result[CLOUD.pref2]) loaded.seekingGender = result[CLOUD.pref2]
      if (result[CLOUD.pref3]) loaded.seekingToday = result[CLOUD.pref3]
      if (result[CLOUD.dob]) loaded.dob = result[CLOUD.dob]
      loaded.hideAge = result[CLOUD.hideAge] === 'true'
      if (result[CLOUD.lang]) setLang(result[CLOUD.lang] as Lang)

      // Check if grid filters are unlocked (from gift/deep link), with 30-day expiry
      const tg2 = getTg()
      const startParam = tg2?.initDataUnsafe?.start_param
      const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000
      const unlockedAt = parseInt(result[CLOUD.filtersUnlockedAt] || '0')
      const now = Date.now()
      const isExpired = unlockedAt > 0 && (now - unlockedAt) > THIRTY_DAYS_MS
      
      if (!isExpired && (startParam === 'unlocked' || result[CLOUD.filtersUnlocked] === 'true')) {
        setFiltersUnlocked(true)
        if (startParam === 'unlocked') {
          storage.set(CLOUD.filtersUnlocked, 'true')
          storage.set(CLOUD.filtersUnlockedAt, String(now))
        }
      } else if (isExpired) {
        // Expired — clear unlock
        storage.set(CLOUD.filtersUnlocked, '')
        storage.set(CLOUD.filtersUnlockedAt, '')
        setFiltersUnlocked(false)
      }
      // Load saved grid rows unlocked
      const savedGridRows = result[CLOUD.gridRowsUnlocked]
      if (savedGridRows) {
        const parsed = parseInt(savedGridRows)
        if (!isNaN(parsed) && parsed > 0) {
          setGridRowsUnlocked(parsed)
        }
      }
      // Load channel follow unlock
      if (result[CLOUD.channelFollowed] === '1') {
        setChannelFollowUnlock(1)
      }

      // Sync unlock status from Supabase (handles refunds + cross-device)
      const syncUserId = tgUserId.current
      if (syncUserId) {
        fetchUserUnlockStatus(syncUserId).then(status => {
          if (!status) return
          const now = Date.now()
          // Sync filters_unlocked
          const filtersExpired = status.filters_unlocked_expires_at
            ? new Date(status.filters_unlocked_expires_at).getTime() < now
            : !status.filters_unlocked
          if (!filtersExpired && status.filters_unlocked) {
            setFiltersUnlocked(true)
            storage.set(CLOUD.filtersUnlocked, 'true')
            storage.set(CLOUD.filtersUnlockedAt, String(now))
          } else if (filtersExpired || !status.filters_unlocked) {
            setFiltersUnlocked(false)
            storage.set(CLOUD.filtersUnlocked, '')
            storage.set(CLOUD.filtersUnlockedAt, '')
          }
          // Sync grid_rows_unlocked
          const dbRows = status.grid_rows_unlocked || 0
          if (dbRows >= 0) {
            setGridRowsUnlocked(dbRows)
            storage.set(CLOUD.gridRowsUnlocked, String(dbRows))
          }
          // Sync has_real_photo
          setOwnProfile(prev => ({ ...prev, hasRealPhoto: !!status.has_real_photo }))
          // Sync invisible_until — check timer expiry on login
          const dbInvisible = status.invisible_until
          if (dbInvisible) {
            const expired = new Date(dbInvisible).getTime() < now
            if (!expired) {
              setInvisibleUntil(dbInvisible)
              // Load saved active state, default to on
              storage.get(CLOUD.invisibleActive).then(saved => {
                setInvisibleActive(saved === 'false' ? false : true)
              }).catch(() => setInvisibleActive(true))
            } else {
              // Timer expired — make user visible (clear DB + local state)
              setInvisibleUntil(null)
              setInvisibleActive(false)
              storage.set(CLOUD.invisibleActive, 'false')
              updateInvisibleStatus(syncUserId, null)
            }
          }
        }).catch(err => console.error('fetchUserUnlockStatus error:', err))

        // Load active raffle
        getActiveRaffle().then(r => {
          if (r) setRaffle(r as any)
        })
      }

      // Restore lat/lng from CloudStorage
      const savedLat = result[CLOUD.lat]
      const savedLng = result[CLOUD.lng]
      if (savedLat && savedLng) {
        const lat = parseFloat(savedLat)
        const lng = parseFloat(savedLng)
        if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
          loaded.lat = lat
          loaded.lng = lng
          setLocationGranted(true)
        }
      }

      if (Object.keys(loaded).length > 0) {
        setOwnProfile(prev => {
          const merged = { ...prev, ...loaded }
          console.log('Profile merged from storage:', { name: merged.name, photoUrl: merged.tgPhotoUrl?.substring(0,30), height: merged.height, weight: merged.weight })
          return merged
        })
      }
    })
  }, [])

  // ─── Auto upsert when user+location ready ─────────────────────────
  useEffect(() => {
    const uid = tgUserId.current
    const lat = ownProfile.lat
    const lng = ownProfile.lng
    if (!uid || !lat || !lng || !hasValidKey) return

    console.log('Auto upsert for user', uid, 'at', lat, lng)
    upsertUser({
      id: uid,
      name: ownProfile.name,
      photo_url: ownProfile.tgPhotoUrl || null,
      height: ownProfile.height,
      weight: ownProfile.weight,
      position: ownProfile.position,
      is_side: ownProfile.isSide,
      preference1: ownProfile.preference1 || 'Raw',
      preference2: ownProfile.preference2 || 'Party',
      preference3: ownProfile.preference3 || 'Group',
      preference4: ownProfile.preference4 || 'Travel',
      open_to_messages: ownProfile.openToMessages || false,
      tg_username: ownProfile.tgUsername || null,
      lat,
      lng,
      is_online: true,
      updated_at: new Date().toISOString(),
      // LMN fields
      dob: ownProfile.dob || null,
      gender: ownProfile.gender || 'Male',
      seeking_gender: ownProfile.seekingGender || 'Women',
      seeking_today: ownProfile.seekingToday || 'Just Browsing',
      hide_age: ownProfile.hideAge || false,
    }).then(result => {
      console.log('Upsert result:', result ? `success id=${result.id}` : 'null')
      // Auto 7-day filter unlock for new users
      if (result && !result.filters_unlocked_expires_at) {
        ensureFilterUnlock(result.id).then(ok => {
          console.log('Auto filter unlock:', ok ? 'set 7 days' : 'failed')
        })
      }
    }).catch(err => {
      console.error('Upsert error:', String(err).substring(0, 200))
    })
  }, [ownProfile.lat, ownProfile.lng, ownProfile.name, ownProfile.tgPhotoUrl, ownProfile.height, ownProfile.weight, ownProfile.position, ownProfile.isSide, ownProfile.preference1, ownProfile.preference2, ownProfile.preference3, ownProfile.preference4, ownProfile.openToMessages, ownProfile.tgUsername, ownProfile.dob, ownProfile.gender, ownProfile.seekingGender, ownProfile.seekingToday, ownProfile.hideAge])

  // ─── Heartbeat: update timestamp every 30s ────────────────────────
  useEffect(() => {
    if (!locationGranted) return
    const uid = tgUserId.current
    if (!uid) return

    const ping = () => {
      setOnlineStatus(uid, true).catch(console.error)
    }
    ping()
    const heartbeat = setInterval(ping, 30000)
    return () => clearInterval(heartbeat)
  }, [locationGranted])

  // ─── Refresh nearby users (manual + auto) ─────────────────────────
  // Initialize to -120s so first refresh is allowed immediately
  // Shared 5-min cooldown between top refresh and bottom button
  const [lastRefreshTime, setLastRefreshTime] = useState(Date.now() - 300000)

  const handleRefresh = useCallback(() => {
    const lat = ownProfile.lat
    const lng = ownProfile.lng
    if (!lat || !lng) return
    setIsLoadingUsers(true)
    fetchNearby(lat, lng).then(dbUsers => {
      const myId = tgUserId.current
      const mapped = dbUsers.filter(u => u.id !== myId).map(u => dbToProfile(u, lat, lng))
      // Override own invisible status with local state (in case DB column missing)
      const ownIdx = mapped.findIndex(u => u.isOwn)
      if (ownIdx >= 0) {
        mapped[ownIdx] = { ...mapped[ownIdx], isInvisible: isInvisible, invisibleUntil: invisibleUntil || undefined }
      }
      console.log('Nearby refresh:', mapped.length, 'users')
      setUsers(mapped)
      setIsLoadingUsers(false)
    }).catch(err => {
      console.error('Refresh error:', String(err).substring(0, 200))
      setIsLoadingUsers(false)
    })
  }, [ownProfile.lat, ownProfile.lng])

  // Auto refresh every 5 minutes — triggers when lat/lng available
  useEffect(() => {
    const lat = ownProfile.lat
    const lng = ownProfile.lng
    if (!lat || !lng) return
    handleRefresh()
    const interval = setInterval(handleRefresh, 300000)
    return () => clearInterval(interval)
  }, [ownProfile.lat, ownProfile.lng, handleRefresh])

  // ─── Poll flying messages from Supabase (shared across all users) ────
  useEffect(() => {
    const poll = () => {
      const oneMinAgo = new Date(Date.now() - 65000).toISOString()
      fetchFlyingMessages(oneMinAgo).then(msgs => {
        if (!msgs.length) return
        // Deduplicate by Supabase id
        setFlyingMessages(prev => {
          const existingIds = new Set(prev.map(p => p.id))
          const newItems = msgs
            .filter(m => !existingIds.has(m.id))
            .map(m => ({
              id: m.id,
              text: `@${m.username} said: ${m.text}`,
              top: `${m.top_percent}vh`,
            }))
          if (newItems.length === 0) return prev
          return [...prev, ...newItems]
        })
      })
    }
    poll()
    const interval = setInterval(poll, 8000)
    return () => clearInterval(interval)
  }, [])

  // ─── Location granted ──────────────────────────────────────────────
  const handleLocationGranted = useCallback((lat: number, lng: number) => {
    console.log('Location granted:', lat.toFixed(6), lng.toFixed(6))
    setLocationGranted(true)
    setIsLoadingUsers(true)
    setOwnProfile(prev => ({ ...prev, lat, lng }))
    storage.set(CLOUD.lat, String(lat))
    storage.set(CLOUD.lng, String(lng))
  }, [])

  // ─── Save profile handler ──────────────────────────────────────────
  const handleSaveProfile = useCallback((updated: UserProfile) => {
    console.log('Saving profile:', { age: updated.age, height: updated.height, weight: updated.weight, position: updated.position, isSide: updated.isSide })
    setOwnProfile(updated)
    // Sync to Supabase
    const uid = tgUserId.current
    if (uid && updated.lat && updated.lng) {
      upsertUser( {
        id: uid,
        name: updated.name,
        photo_url: updated.tgPhotoUrl || null,
        height: updated.height,
        weight: updated.weight,
        position: updated.position,
        is_side: updated.isSide,
        preference1: updated.preference1 || 'Raw',
        preference2: updated.preference2 || 'Party',
        preference3: updated.preference3 || 'Group',
        preference4: updated.preference4 || 'Travel',
        open_to_messages: updated.openToMessages || false,
        tg_username: updated.tgUsername || null,
        lat: updated.lat,
        lng: updated.lng,
        is_online: true,
        updated_at: new Date().toISOString(),
        // LMN fields
        dob: updated.dob || null,
        gender: updated.gender || 'Male',
        seeking_gender: updated.seekingGender || 'Women',
        seeking_today: updated.seekingToday || 'Just Browsing',
        hide_age: updated.hideAge || false,
      }).then(result => {
        console.log('Profile upsert result:', result ? 'success' : 'failed')
      }).catch(err => {
        console.error('Profile upsert error:', err)
      })
    }
  }, [])

  // ─── Message handler ──────────────────────────────────────────────
  // ─── Message handler with stars gate ──────────────────────────────
  const handleMessage = useCallback((user: UserProfile) => {
    // Just Browsing gate: neither user can send/receive
    if (ownProfile.seekingToday === 'Just Browsing') {
      alert('You are in Just Browsing mode. Change your status to send messages.')
      return
    }
    if (user.seekingToday === 'Just Browsing') {
      alert('This user is in Just Browsing mode and not accepting messages.')
      return
    }

    // Stars gate: user requires payment first
    if (user.openToMessages && !starsPaidFor.has(user.id)) {
      const tg = getTg()
      if (tg?.showPopup) {
        tg.showPopup({
          title: '⭐ Send Stars to Chat',
          message: `${user.name} requires sending Telegram Stars to open chat. Send stars now?`,
          buttons: [
            { id: 'pay', type: 'default', text: 'Send ⭐ 50' },
            { type: 'cancel', text: 'Cancel' }
          ]
        }, (btnId: string) => {
          if (btnId === 'pay') {
            setStarsPaidFor(prev => new Set(prev).add(user.id))
            handleMessage(user)
          }
        })
      } else {
        if (confirm(`Send 50 ⭐ to ${user.name} to open chat?`)) {
          setStarsPaidFor(prev => new Set(prev).add(user.id))
          handleMessage(user)
        }
      }
      return
    }

    // Open Telegram DM directly
    const tgUrl = `https://t.me/${user.tgUsername || 'LetsMsetNow'}`
    const tg = getTg()
    if (tg?.openTelegramLink) { tg.openTelegramLink(tgUrl); return }
    if (tg?.openLink) { tg.openLink(tgUrl, { try_instant_view: false }); return }
    window.open(tgUrl, '_blank')
  }, [starsPaidFor, lang, ownProfile.seekingToday])

  // ─── Render ───────────────────────────────────────────────────────
  // Splash screen
  if (showSplash) {
    return (
      <div className="min-h-[100vh] bg-[#0A0A0A] flex items-center justify-center px-6">
        <div className="w-full max-w-[min(520px,100vw)] flex flex-col items-center justify-center gap-5">
          <video
            src={logoAnim}
            autoPlay
            loop
            muted
            playsInline
            onLoadedData={() => setVideoReady(true)}
            className="w-48 h-48 rounded-full object-cover"
          />
          <div className="text-center">
            <h1 className="text-2xl font-bold gradient-text tracking-tight">LMN</h1>
            <p className="text-[#8E8E93] text-xs mt-1">Let's Meet Now — Dating App</p>
          </div>
          <p className="text-[#8E8E93]/60 text-[9px] text-center leading-relaxed max-w-[320px]">
            By using this app, you confirm you are 18+. LMN only connects users via Telegram.
            We do not store messages. All chat happens in Telegram. You are responsible for your own safety when meeting others.
            We collect: Telegram profile, preferences, and approximate location (to show nearby users only).
            We do not share data with third parties.
          </p>
          <p className="text-[#8E8E93]/50 text-[8px] text-center leading-relaxed max-w-[320px] mt-2">
            Features: Gender matching, Seeking preferences, Zodiac filters, Photo filters, Location-based discovery,
            Profile editing, Stars payments for unlocks, Admin tools.
          </p>
        </div>
      </div>
    )
  }

  // Debug overlay removed — now inline in JSX below

  if (groupCheck === 'checking') {
    return (
      <div className="min-h-[100vh] bg-neutral-950 flex justify-center">
        <div className="w-full max-w-[min(520px,100vw)] bg-[#0A0A0A] h-[100vh] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#5AC8FA] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (groupCheck === 'not_member') {
    const tg = getTg()
    const raw = tg ? JSON.stringify(tg.initDataUnsafe, null, 2) : 'no Telegram WebApp'

    return (
      <div className="min-h-[100vh] bg-neutral-950 flex justify-center">
        <div className="w-full max-w-[min(520px,100vw)] bg-[#0A0A0A] h-[100vh] relative flex flex-col px-6 pt-16 pb-6 overflow-y-auto">
          <div className="flex flex-col items-center text-center flex-shrink-0">
            <div className="w-16 h-16 rounded-full bg-[#5AC8FA]/10 flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-[#5AC8FA]" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">{t(lang, 'membersOnly')}</h1>
            <p className="text-[#8E8E93] text-sm mb-1">
              This app is exclusively for members of
            </p>
            <p className="text-[#5AC8FA] font-semibold text-sm mb-4">@LetsMsetNow</p>
            <button
              onClick={() => {
                const tg2 = getTg()
                const url = 'https://t.me/LetsMsetNow'
                if (tg2?.openTelegramLink) {
                  tg2.openTelegramLink(url)
                } else if (tg2?.openLink) {
                  tg2.openLink(url)
                } else {
                  window.open(url, '_blank')
                }
              }}
              className="gradient-btn px-6 py-3 rounded-xl text-white font-semibold text-sm nav-press mb-4"
            >
              {t(lang, 'openInGroup')}
            </button>
          </div>

          {/* Debug info */}
          <div className="mt-4 flex-1 min-h-0 flex flex-col">
            <p className="text-[#8E8E93] text-[10px] text-center mb-2">
              {t(lang, 'openFromGroup')}
            </p>
            <details className="text-left">
              <summary className="text-[#8E8E93] text-[10px] cursor-pointer select-none text-center">
                {t(lang, 'showDebug')}
              </summary>
              <pre className="mt-2 p-2 bg-[#1A1A1A] rounded-lg text-[9px] text-[#8E8E93] overflow-auto max-h-48 whitespace-pre-wrap break-all">
                {raw}
              </pre>
            </details>
          </div>
        </div>
      </div>
    )
  }

  if (!locationGranted) {
    return (
      <div className="min-h-[100vh] bg-neutral-950 flex justify-center">
        <div className="w-full max-w-[min(520px,100vw)] bg-[#0A0A0A] h-[100vh] relative">
          <LocationGate onGranted={handleLocationGranted} lang={lang} />
        </div>
      </div>
    )
  }

  return (
    <>
      <FlyingMessagesOverlay
        messages={flyingMessages}
        onDone={(id) => setFlyingMessages(prev => prev.filter(m => m.id !== id))}
      />
      <div className="min-h-screen bg-neutral-950 flex justify-center">
        <div className="w-full max-w-[min(520px,100vw)] bg-[#0A0A0A] h-screen relative flex flex-col">
        {view === 'MAIN' ? (
          <MainScreen
            ownProfile={ownProfile}
            users={users}
            onViewOwnProfile={() => setView('OWN_PROFILE')}
            onViewPhoto={(u) => setPhotoOverlay(u)}
            showDbWarning={!hasValidKey}
            isLoadingUsers={isLoadingUsers}
            lang={lang}
            setLang={setLang}
            onRefresh={handleRefresh}
            isAdmin={isAdmin}
            filtersUnlocked={isAdmin || filtersUnlocked}
            onPromptUnlock={promptUnlock}
            onPromptFilterUnlock={promptFilterUnlock}
            gridRowsUnlocked={gridRowsUnlocked}
            channelFollowUnlock={channelFollowUnlock}
            onClaimChannelFollow={handleClaimChannelFollow}
            onToggleInvisible={() => {
              if (isAdmin) {
                // Admin: toggle on/off (free, controls invisible_until directly)
                if (isInvisible) {
                  setInvisibleUntil(null)
                  setInvisibleActive(false)
                  storage.set(CLOUD.invisibleActive, 'false')
                  if (tgUserId.current) updateInvisibleStatus(tgUserId.current, null)
                } else {
                  const until = new Date(Date.now() + 30 * 86400000).toISOString()
                  setInvisibleUntil(until)
                  setInvisibleActive(true)
                  storage.set(CLOUD.invisibleActive, 'true')
                  if (tgUserId.current) updateInvisibleStatus(tgUserId.current, until)
                }
              } else if (hasPurchasedInvisible) {
                // Non-admin + purchased: toggle active state only
                const newActive = !invisibleActive
                setInvisibleActive(newActive)
                storage.set(CLOUD.invisibleActive, String(newActive))
              } else {
                // Non-admin + not purchased: prompt payment
                promptInvisiblePayment()
              }
              handleRefresh()
            }}
            lastRefreshTime={lastRefreshTime}
            setLastRefreshTime={setLastRefreshTime}
            isInvisible={isInvisible}
            invisiblePurchased={hasPurchasedInvisible}
            raffle={raffle}
            onBuyRaffleTicket={handleBuyRaffleTicket}
            onStartNextRaffle={handleStartNextRaffle}
            onPromptUnlockProfile={promptUnlockProfile}
            isPremium={isPremium}
          />
        ) : (
          <OwnProfileScreen
            profile={ownProfile}
            onSave={handleSaveProfile}
            onBack={() => setView('MAIN')}
            lang={lang}
            editProfileUnlocked={isAdmin || editProfileUnlocked}
          />
        )}
        {photoOverlay && (
          <PhotoOverlay user={photoOverlay} onClose={() => setPhotoOverlay(null)} onMessage={handleMessage} lang={lang} ownProfile={ownProfile} />
        )}
        {/* Admin popup — Release own lock only */}
        {adminAction === 'release' && (
          <div className="fixed top-0 left-0 right-0 bottom-0 z-[70] bg-black/70 flex items-center justify-center" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }} onClick={() => setAdminAction(null)}>
            <div className="bg-[#1C1C1E] rounded-xl p-5 w-64 space-y-3" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-base font-bold text-white text-center">
                🔓 Release Profile Lock
              </h3>
              <p className="text-xs text-[#8E8E93] text-center">
                Release your own 30-day preference lock:
              </p>
              <button
                onClick={async () => {
                  await storage.set(CLOUD.prefLockedAt, '0')
                  alert('Your profile lock has been released! Refresh to apply.')
                  window.location.reload()
                  setAdminAction(null)
                }}
                className="w-full py-2.5 rounded-lg bg-[#2C2C2E] text-white text-sm font-bold nav-press"
              >
                Release My Lock
              </button>
              <button onClick={() => setAdminAction(null)} className="w-full py-1.5 text-[10px] text-[#8E8E93]">Cancel</button>
            </div>
          </div>
        )}
        {/* Only show BottomNav on MAIN view */}
        {view === 'MAIN' && (
          <BottomNav
            lang={lang}
            cooldownRemaining={Math.max(0, 60000 - (Date.now() - lastFlyingSendRef.current))}
            onSend={(text) => {
              // 1 min cooldown check
              if (Date.now() - lastFlyingSendRef.current < 60000) return
              lastFlyingSendRef.current = Date.now()
              const top = 10 + Math.random() * 80 // 10% - 90% of viewport height
              const prefixed = `@${ownProfile.tgUsername || ownProfile.name || 'User'} said: ${text}`
              // Show locally immediately
              setFlyingMessages(prev => [...prev, { id: Date.now(), text: prefixed, top: `${top}vh` }])
              // Store in Supabase so all users see it
              insertFlyingMessage({
                text,
                username: ownProfile.tgUsername || ownProfile.name || 'User',
                user_id: tgUserId.current || 0,
                top_percent: Math.round(top),
              })
            }}
            groupChatUrl="https://t.me/LetsMeetNow"
            referShareUrl="https://t.me/share/url?url=https://t.me/LetsMeetNow?startapp&text=Check%20out%20LMN%20-%20Lets%20Meet%20Now!"
            walletUrl="https://t.me/wallet?startattach=transfer_UQD9Irrhhpj2aAa48W-XaL5q9vPD9Zf5UjXhC7aHcYcSnYo4"
          />
        )}
      </div>
    </div>
    </>
  )
}