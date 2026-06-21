// ====================================================================
// APP BASE — Complete Dating App Template
//
// HOW TO CUSTOMIZE (5 things):
// 1. APP_CONFIG — which fields are visible, default gender values
// 2. PREFERENCE_CATEGORIES — your app's filter categories with colours
// 3. Admin constants (ADMIN_IDS, WORKER_URL, GROUP_CHAT_URL, etc.)
// 4. Branding (logo, appName, CSS colour)
// 5. renderTileBottom — what shows under each grid tile
//
// Everything else works out of the box.
// ====================================================================

import {
  getTg, isInTelegram, getTimeAgo, getDistance, formatDist,
  getDefaultLang, isAdminUser, createCloudKeys, createStorage,
  useAdminRecheck, useRaffleActions, useRefreshCooldown,
  useHeartbeat, useFlyingMessages,
  useFilterUnlock, useGridUnlock, useInvisibleMode,
  useProfileUnlock, useChannelFollow, useHideAge,
  type Lang, type UserProfile, type AppConfig, type PreferenceCategory,
} from '@dating/core'
import {
  LocationGate, FlyingMessagesOverlay, BottomNav,
  TopBar, StatsBar, ProfileGrid, ProfileView,
  FilterButton, ToggleButton,
} from '@dating/ui'
import { useState, useEffect, useRef, useCallback } from 'react'
import './App.css'
import logoImg from './assets/lmn-logo.svg'
import logoAnim from './assets/lmn-logo-animated.mp4'
import { t, getLangLabel } from './lib/i18n'
import { Lock } from 'lucide-react'
import {
  upsertUser, fetchNearby, hasValidKey,
  fetchUserUnlockStatus, insertFlyingMessage,
  updateInvisibleStatus, updateHideAgeStatus,
  setGridRowsUnlocked as saveGridRowsUnlocked,
  setFiltersUnlocked as saveFiltersUnlocked, ensureFilterUnlock,
  type DbUser, type Raffle, type UnlockStatus,
} from './lib/supabase'

// ═════════════════════════════════════════════════════════════════════
// 1. APP CONFIG — Which fields are visible, preferences, defaults
// ═════════════════════════════════════════════════════════════════════

// LMN: all fields visible, custom preferences (activity-based)
const APP_CONFIG: AppConfig = {
  showAge: true,
  showDob: false,
  showZodiac: true,
  showGender: true,
  showHeight: true,
  showWeight: true,
  showPosition: false,         // Position not used in LMN
  showDistance: true,
  defaultGender: 'Male',
  defaultSeekingGender: 'Women',
  preferences: [
    {
      key: 'activity',
      label: { en: 'Activity', tc: '活動', sc: '活动', ru: 'Активность' },
      defaultValue: 'Chat',
      options: [
        { value: 'Chat', label: { en: 'Chat', tc: '聊天', sc: '聊天', ru: 'Чат' }, colour: 'bg-green-500/20 text-green-400 border-green-500/30' },
        { value: 'C2C', label: { en: 'C2C', tc: '視訊', sc: '视讯', ru: 'C2C' }, colour: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
        { value: 'Meetup', label: { en: 'Meetup', tc: '見面', sc: '见面', ru: 'Встреча' }, colour: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
      ],
    },
    {
      key: 'type',
      label: { en: 'Type', tc: '類型', sc: '类型', ru: 'Тип' },
      defaultValue: 'Casual',
      options: [
        { value: 'Casual', label: { en: 'Casual', tc: '隨緣', sc: '随缘', ru: 'Casual' }, colour: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
        { value: 'Serious', label: { en: 'Serious', tc: '認真', sc: '认真', ru: 'Серьезно' }, colour: 'bg-pink-500/20 text-pink-400 border-pink-500/30' },
        { value: 'Friends', label: { en: 'Friends', tc: '朋友', sc: '朋友', ru: 'Друзья' }, colour: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
      ],
    },
  ],
}

// ═════════════════════════════════════════════════════════════════════
// 2. ADMIN CONFIG — Change these for your app
// ═════════════════════════════════════════════════════════════════════

const ADMIN_IDS = [5202742795, 725368127]
const ADMIN_USERNAMES = ['mileschan852', 'MilesChan852']
const WORKER_URL = 'https://lmn-d.mileschan852.workers.dev/createinvoice'
const GROUP_CHAT_URL = 'https://t.me/LetsMeetNow'
const CHANNEL_URL = 'https://t.me/LetsMeetNowApp'
const TABLE_NAME = 'users'

// ═════════════════════════════════════════════════════════════════════
// 3. TYPES & STORAGE
// ═════════════════════════════════════════════════════════════════════

type View = 'MAIN' | 'OWN_PROFILE'

const APP_PREFIX = 'lmn'
const CLOUD = createCloudKeys(APP_PREFIX)
const storage = createStorage({ prefix: APP_PREFIX })

// ═════════════════════════════════════════════════════════════════════
// 4. DB → PROFILE — Maps Supabase row to UserProfile
// ═════════════════════════════════════════════════════════════════════

import { getZodiac, getZodiacEmoji, getAge } from '@dating/core'

function dbToProfile(u: DbUser, myLat: number, myLng: number): UserProfile {
  const dist = u.lat && u.lng ? getDistance(myLat, myLng, u.lat, u.lng) : 0
  const dob = u.dob || undefined
  const preferences: Record<string, string> = {}
  if (u.preference1) preferences.activity = u.preference1
  if (u.preference2) preferences.type = u.preference2
  if (u.preference3) preferences.pref3 = u.preference3
  if (u.preference4) preferences.pref4 = u.preference4

  return {
    id: String(u.id), name: u.name,
    dob, age: getAge(dob), zodiac: getZodiac(dob),
    gender: (u.gender as 'Male' | 'Female' | 'Non-binary') || APP_CONFIG.defaultGender,
    height: u.height || 0, weight: u.weight || 0, position: u.position ?? 0.5,
    showAge: true, showDob: false, showZodiac: true, showGender: true,
    showHeight: true, showWeight: true, showPosition: true, showDistance: true,
    seekingGender: (u.seeking_gender as 'Men' | 'Women' | 'Everyone') || APP_CONFIG.defaultSeekingGender,
    seekingAgeMin: u.seeking_age_min ?? 18, seekingAgeMax: u.seeking_age_max ?? 99,
    preferences,
    tgUsername: u.tg_username || undefined,
    tgPhotoUrl: u.photo_url?.startsWith('http') ? u.photo_url : undefined,
    tgPhotos: u.photo_url?.startsWith('http') ? [u.photo_url] : [],
    hasPhoto: !!(u.photo_url && u.photo_url.startsWith('http')),
    hasRealPhoto: u.has_real_photo ?? undefined,
    isOnline: u.is_online ?? false, distance: Math.round(dist),
    lat: u.lat ?? undefined, lng: u.lng ?? undefined,
    openToMessages: u.open_to_messages ?? false, updatedAt: u.updated_at,
    isInvisible: !!u.invisible_until && new Date(u.invisible_until).getTime() > Date.now(),
    invisibleUntil: u.invisible_until ?? undefined,
    hideAge: !!u.hide_age,
    hideAgeUntil: u.hide_age_until ?? undefined,
    filtersUnlocked: u.filters_unlocked ?? false,
    filtersUnlockedUntil: u.filters_unlocked_expires_at ?? undefined,
    profileUnlocked: u.profile_unlocked ?? false,
  }
}

// ═════════════════════════════════════════════════════════════════════
// 5. PROFILE → DB — Maps UserProfile back to Supabase row
// ═════════════════════════════════════════════════════════════════════

function profileToDb(p: UserProfile): Partial<DbUser> {
  const prefs = APP_CONFIG.preferences
  return {
    name: p.name, dob: p.dob || null,
    gender: p.gender, height: p.height, weight: p.weight,
    position: p.position ?? null, photo_url: p.tgPhotoUrl || null,
    tg_username: p.tgUsername || null, open_to_messages: p.openToMessages,
    is_online: true, updated_at: new Date().toISOString(),
    seeking_gender: p.seekingGender, seeking_age_min: p.seekingAgeMin, seeking_age_max: p.seekingAgeMax,
    preference1: p.preferences.activity || null,
    preference2: p.preferences.type || null,
    preference3: p.preferences.pref3 || null,
    preference4: p.preferences.pref4 || null,
  }
}

// ═════════════════════════════════════════════════════════════════════
// 6. TIPS — Rotating tips below stats bar
// ═════════════════════════════════════════════════════════════════════

function UnlockTipCycle({ lang, isPremium, gridRowsUnlocked, channelFollowUnlock, onClaimChannelFollow }: { lang: Lang; isPremium: boolean; gridRowsUnlocked: number; channelFollowUnlock: number; onClaimChannelFollow: () => void }) {
  const [idx, setIdx] = useState(0)
  const tips: Record<Lang, string[]> = {
    en: [`Base: 2 rows free`, isPremium ? `Premium: +1 row` : `Premium: +1 row (inactive)`, `Purchased: ${gridRowsUnlocked} rows`, `Add a Telegram photo +1`, channelFollowUnlock ? `Channel: +1 row ✅` : `Join channel +1`, `Buy rows with ⭐ Stars`],
    tc: [`基礎: 2 行免費`, isPremium ? `Premium: +1 行` : `Premium: +1 行 (未激活)`, `已購: ${gridRowsUnlocked} 行`, `加入 Telegram 頭像 +1`, channelFollowUnlock ? `頻道: +1 行 ✅` : `加入頻道 +1`, `用 ⭐ 星星購買行數`],
    sc: [`基础: 2 行免费`, isPremium ? `Premium: +1 行` : `Premium: +1 行 (未激活)`, `已购: ${gridRowsUnlocked} 行`, `加入 Telegram 头像 +1`, channelFollowUnlock ? `频道: +1 行 ✅` : `加入频道 +1`, `用 ⭐ 星星购买行数`],
    ru: [`База: 2 строки бесплатно`, isPremium ? `Premium: +1 строка` : `Premium: +1 строка (не активен)`, `Куплено: ${gridRowsUnlocked} строк`, `Добавь фото в Telegram +1`, channelFollowUnlock ? `Канал: +1 строка ✅` : `Подпишись на канал +1`, `Купить строки за ⭐`],
  }
  const list = tips[lang] || tips.en
  useEffect(() => { const i = setInterval(() => setIdx(i => (i + 1) % list.length), 5000); return () => clearInterval(i) }, [list.length])
  const current = list[idx % list.length]
  const isChannelTip = idx % list.length === 4
  return (
    <button onClick={() => { if (isChannelTip && !channelFollowUnlock) onClaimChannelFollow(); else setIdx(i => (i + 1) % list.length) }} className="ml-auto flex items-center gap-1 text-[9px] text-[#8E8E93] nav-press">
      <span className="w-4 h-4 rounded-full bg-[#2C2C2E] flex items-center justify-center">💡</span>
      <span className={`truncate max-w-[140px] ${isChannelTip && !channelFollowUnlock ? 'text-[#5AC8FA]' : ''}`}>{current}</span>
    </button>
  )
}

// ═════════════════════════════════════════════════════════════════════
// 7. MAIN SCREEN — Grid + filters. CUSTOMIZE: filter buttons.
// ═════════════════════════════════════════════════════════════════════

function MainScreen({
  ownProfile, users, onViewOwnProfile, onViewPhoto,
  showDbWarning, isLoadingUsers, lang, setLang,
  onRefresh, isAdmin, filtersUnlocked, onPromptUnlock,
  onPromptFilterUnlock, onToggleInvisible, gridRowsUnlocked,
  lastRefreshTime, setLastRefreshTime, isInvisible,
  invisiblePurchased, raffle, onBuyRaffleTicket,
  onStartNextRaffle, onPromptUnlockProfile, isPremium,
  channelFollowUnlock, onClaimChannelFollow,
}: {
  ownProfile: UserProfile; users: UserProfile[]
  onViewOwnProfile: () => void; onViewPhoto: (u: UserProfile) => void
  showDbWarning: boolean; isLoadingUsers: boolean
  lang: Lang; setLang: (l: Lang) => void; onRefresh: () => void; isAdmin: boolean
  filtersUnlocked: boolean; onPromptUnlock: () => void; onPromptFilterUnlock: () => void
  onToggleInvisible: () => void; gridRowsUnlocked: number
  lastRefreshTime: number; setLastRefreshTime: (t: number) => void
  isInvisible: boolean; invisiblePurchased: boolean
  raffle: Raffle | null; onBuyRaffleTicket: () => void; onStartNextRaffle: () => void
  onPromptUnlockProfile: () => void; isPremium: boolean
  channelFollowUnlock: number; onClaimChannelFollow: () => void
}) {
  const [onlineOnly, setOnlineOnly] = useState(false)

  // Preference filter states — one per preference category
  const [prefFilters, setPrefFilters] = useState<Record<string, string>>(() => {
    const defaults: Record<string, string> = {}
    APP_CONFIG.preferences.forEach(cat => { defaults[cat.key] = 'All' })
    return defaults
  })

  const LANG_CYCLE: Lang[] = ['en', 'tc', 'sc', 'ru']
  const cycleLang = () => { const idx = LANG_CYCLE.indexOf(lang); const next = LANG_CYCLE[(idx + 1) % LANG_CYCLE.length]; setLang(next); storage.set(CLOUD.lang, next) }

  const cyclePref = (key: string) => {
    const cat = APP_CONFIG.preferences.find(c => c.key === key)
    if (!cat) return
    const values = ['All', ...cat.options.map(o => o.value)]
    const idx = values.indexOf(prefFilters[key] || 'All')
    setPrefFilters(prev => ({ ...prev, [key]: values[(idx + 1) % values.length] }))
  }

  // Online threshold
  const ONLINE_THRESHOLD_MS = 15 * 60 * 1000
  const isRecentlyActive = (u: UserProfile) => { if (u.isOwn) return true; if (!u.updatedAt) return false; return Date.now() - new Date(u.updatedAt).getTime() < ONLINE_THRESHOLD_MS }

  // Grid assembly
  const patchedOwn = { ...ownProfile, isOwn: true, isInvisible: isInvisible || false }
  const allGrid = [patchedOwn, ...users.filter(u => u.id !== ownProfile.id)]
  const visible = isAdmin ? allGrid : allGrid.filter(u => u.isOwn || !u.isInvisible)

  // Filter logic — CUSTOMIZE: add your filter conditions here
  const filtered = visible.filter((u) => {
    if (u.isOwn) return true
    if (onlineOnly && !isRecentlyActive(u)) return false
    if (u.tgUsername === '_test_') return false
    // Preference filters
    for (const cat of APP_CONFIG.preferences) {
      const selected = prefFilters[cat.key]
      if (selected && selected !== 'All' && u.preferences[cat.key] !== selected) return false
    }
    return true
  }).sort((a, b) => { if (a.isOwn) return -1; if (b.isOwn) return 1; return (a.distance || Infinity) - (b.distance || Infinity) })

  const matchingIds = new Set(filtered.map(u => u.id))
  const nonMatching = visible.filter(u => !matchingIds.has(u.id)).sort((a, b) => { if (a.isOwn) return -1; if (b.isOwn) return 1; return (a.distance || Infinity) - (b.distance || Infinity) })
  const sortedUsers = [...filtered, ...nonMatching]

  const effectiveRows = 2 + gridRowsUnlocked + (isPremium ? 1 : 0) + channelFollowUnlock
  const unlockedSlots = effectiveRows * 5
  const totalRealUsers = sortedUsers.length
  const hasMoreUsers = totalRealUsers > unlockedSlots

  return (
    <div className="flex-1 overflow-y-auto min-h-0 pb-20">
      <TopBar
        logo={<img src={logoImg} alt="App" className="w-8 h-8 rounded-full object-cover" />}
        appName="LMN" raffle={raffle} isAdmin={isAdmin}
        onBuyRaffleTicket={onBuyRaffleTicket} onStartNextRaffle={onStartNextRaffle}
        lang={lang} isInvisible={isInvisible} invisiblePurchased={invisiblePurchased}
        onToggleInvisible={onToggleInvisible} onPromptUnlockProfile={onPromptUnlockProfile}
        lastRefreshTime={lastRefreshTime} onRefresh={onRefresh}
        langLabel={getLangLabel(lang)} onCycleLang={cycleLang}
      />

      <StatsBar lang={lang} isPremium={isPremium} gridRowsUnlocked={gridRowsUnlocked}
        channelFollowUnlock={channelFollowUnlock} hasRealPhoto={ownProfile.hasRealPhoto} appVersion="1L">
        <UnlockTipCycle lang={lang} isPremium={isPremium} gridRowsUnlocked={gridRowsUnlocked}
          channelFollowUnlock={channelFollowUnlock} onClaimChannelFollow={onClaimChannelFollow} />
      </StatsBar>

      {showDbWarning && (
        <div className="mx-3 mt-2 bg-[var(--app-primary)]/10 border border-[var(--app-primary)]/30 rounded-lg px-3 py-2 flex items-start gap-2">
          <Lock className="w-4 h-4 text-[var(--app-primary)] flex-shrink-0 mt-0.5" />
          <div><p className="text-[var(--app-primary)] text-xs font-semibold">{t(lang, 'dbNotConfigured')}</p><p className="text-[#8E8E93] text-[10px]">{t(lang, 'dbConfigHint')}</p></div>
        </div>
      )}

      {/* ═══ FILTER BAR — CUSTOMIZE: add your filter buttons here ═══ */}
      <div className="px-3 py-2">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
          <ToggleButton active={onlineOnly} onClick={() => setOnlineOnly(!onlineOnly)}>
            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${onlineOnly ? 'bg-[#00D4AA]' : 'bg-[#8E8E93]'}`} />
            {onlineOnly ? t(lang, 'onlineStatus') : t(lang, 'offlineStatus')}
          </ToggleButton>

          <div className="w-px h-4 bg-[#2C2C2E] flex-shrink-0" />

          {/* Preference filter buttons — auto-generated from APP_CONFIG */}
          {APP_CONFIG.preferences.map(cat => {
            const selected = prefFilters[cat.key] || 'All'
            const opt = cat.options.find(o => o.value === selected)
            return (
              <FilterButton key={cat.key} active={selected !== 'All'}
                onClick={() => filtersUnlocked || isAdmin ? cyclePref(cat.key) : onPromptFilterUnlock()}
                colorClass={selected !== 'All' && opt ? opt.colour : undefined}
                locked={!(filtersUnlocked || isAdmin)}>
                {selected === 'All' ? (cat.label[lang] || cat.label['en']) : (opt?.label[lang] || opt?.label['en'] || selected)}
              </FilterButton>
            )
          })}
        </div>
      </div>

      {/* Grid */}
      <div className="px-3">
        {isLoadingUsers && users.length === 0 && (
          <div className="text-center py-8">
            <div className="w-6 h-6 border-2 border-[var(--app-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-[#8E8E93] text-xs">{t(lang, 'findingMembers')}</p>
          </div>
        )}
        <ProfileGrid
          users={sortedUsers.filter(u => u.id !== ownProfile.id) as any}
          ownProfile={{...ownProfile, isOwn: true} as any}
          unlockedSlots={unlockedSlots} totalRealUsers={totalRealUsers}
          hasMoreUsers={hasMoreUsers} onPromptUnlock={onPromptUnlock}
          onViewOwnProfile={onViewOwnProfile} onViewPhoto={onViewPhoto}
          isAdmin={isAdmin} isLoading={isLoadingUsers && users.length === 0}
          matchingIds={matchingIds} logoUrl={logoImg}
          renderTileBottom={(user: any) => {
            const genderLabel = user.gender?.charAt(0) || '?'
            return (
              <div className="flex items-center justify-between">
                <p className="text-[var(--app-primary)] text-[7px] font-medium">{formatDist(user.distance ?? 0)}</p>
                {!user.isOwn && <p className="text-[#8E8E93] text-[6px]">{getTimeAgo(user.updatedAt)}</p>}
                {user.gender && <p className={`text-[6px] font-bold ${user.gender === 'Male' ? 'text-blue-400' : 'text-pink-400'}`}>{genderLabel}</p>}
              </div>
            )
          }}
        />
      </div>

      <div className="px-3 pt-2 flex items-center justify-between text-[10px] text-[#8E8E93]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#00D4AA]" />{lang === 'en' ? 'Online' : lang === 'ru' ? 'Онлайн' : '在線'}</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#8E8E93]" />{t(lang, 'offlineStatus')}</span>
        </div>
        <span className="text-[var(--app-primary)]">{t(lang, 'youOrangeBorder')}</span>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════
// 8. APP — Root component. ALL HOOKS, EFFECTS, HANDLERS, VIEWS.
//    No changes needed below this line for a basic app.
// ═════════════════════════════════════════════════════════════════════

import { isProfileComplete, getMissingFields } from '@dating/core'

export default function App() {
  const [view, setView] = useState<View>('MAIN')
  const [showSplash, setShowSplash] = useState(true)
  const [ownProfile, setOwnProfile] = useState<UserProfile>({
    id: 'own', name: 'You', age: 0, height: 178, weight: 72,
    position: 0.5, isSide: false, isOnline: true, distance: 0, isOwn: true,
    preference1: 'Raw', preference2: 'Party', preference3: 'Group', preference4: 'Travel',
    openToMessages: false, tgUsername: '', tgPhotoUrl: '', tgPhotos: [],
    hasPhoto: false, hasRealPhoto: undefined,
    isInvisible: false,
    gender: APP_CONFIG.defaultGender,
    seekingGender: APP_CONFIG.defaultSeekingGender,
    preferences: { activity: 'Chat', type: 'Casual' },
    showAge: true, showDob: false, showZodiac: true, showGender: true,
    showHeight: true, showWeight: true, showPosition: true, showDistance: true,
    seekingAgeMin: 18, seekingAgeMax: 99,
    hideAge: false, filtersUnlocked: false, profileUnlocked: false,
  })
  const [users, setUsers] = useState<UserProfile[]>([])
  const [photoOverlay, setPhotoOverlay] = useState<UserProfile | null>(null)
  const [locationGranted, setLocationGranted] = useState(false)
  const [isLoadingUsers, setIsLoadingUsers] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [groupCheck, setGroupCheck] = useState<'checking' | 'member' | 'not_member'>('checking')
  const [lang, setLang] = useState<Lang>(getDefaultLang())
  const [starsPaidFor, setStarsPaidFor] = useState<Set<string>>(new Set())
  const [isPremium, setIsPremium] = useState(false)
  const [raffle, setRaffle] = useState<Raffle | null>(null)
  const [videoReady, setVideoReady] = useState(false)
  const [editProfileUnlocked, setEditProfileUnlocked] = useState(false)

  const tgUserId = useRef<number | null>(null)
  const splashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── All 11 hooks ───────────────────────────────────────────────────
  useAdminRecheck({ isAdmin, setIsAdmin, adminIds: ADMIN_IDS, adminUsernames: ADMIN_USERNAMES })

  const { handleBuyRaffleTicket, handleStartNextRaffle } = useRaffleActions({
    tableName: TABLE_NAME, workerUrl: WORKER_URL, isAdmin, raffle, setRaffle,
  })

  const { lastRefreshTime, setLastRefreshTime, markRefreshed } = useRefreshCooldown()
  useHeartbeat({ tableName: TABLE_NAME, getUserId: () => tgUserId.current, locationGranted })
  const { flyingMessages, setFlyingMessages, lastFlyingSendRef } = useFlyingMessages()

  const { filtersUnlocked, setFiltersUnlocked, unlockFilters, filtersUnlockedAt, setFiltersUnlockedAt } = useFilterUnlock({
    isAdmin, workerUrl: WORKER_URL, storageSet: (k, v) => storage.set(k, v),
    storageKeys: { unlocked: CLOUD.filtersUnlocked, unlockedAt: CLOUD.filtersUnlockedAt },
    saveToDb: (uid, unlocked, expires) => saveFiltersUnlocked(uid, unlocked, expires),
  })

  const { gridRowsUnlocked, setGridRowsUnlocked, unlockRow } = useGridUnlock({
    isAdmin, workerUrl: WORKER_URL, storageSet: (k, v) => storage.set(k, v),
    storageKeys: { rows: CLOUD.gridRowsUnlocked, rowsAt: CLOUD.gridRowsUnlockedAt },
    saveToDb: (uid, rows) => saveGridRowsUnlocked(uid, rows),
  })

  const { invisibleUntil, isInvisible, hasPurchasedInvisible, toggleInvisible, loadInvisibleState } = useInvisibleMode({
    isAdmin, workerUrl: WORKER_URL, storageSet: (k, v) => storage.set(k, v), storageGet: (k) => storage.get(k),
    storageKey: CLOUD.invisibleActive, updateDb: (uid, until) => updateInvisibleStatus(uid, until),
  })

  const { adminAction, setAdminAction, promptUnlockProfile, releaseLock } = useProfileUnlock({
    isAdmin, workerUrl: WORKER_URL, storageSet: (k, v) => storage.set(k, v), lockKey: CLOUD.prefLockedAt,
  })

  const { channelFollowUnlock, setChannelFollowUnlock, claimChannelFollow } = useChannelFollow({
    channelUrl: CHANNEL_URL, storageSet: (k, v) => storage.set(k, v), storageKey: CLOUD.channelFollowed,
    openLink: (url) => { const tg = getTg(); if (tg?.openTelegramLink) tg.openTelegramLink(url); else if (tg?.openLink) tg.openLink(url, { try_instant_view: false }); else window.open(url, '_blank') },
  })

  const { hideAgeActive, toggleHideAge } = useHideAge({
    workerUrl: WORKER_URL, storageSet: (k, v) => storage.set(k, v), storageKey: CLOUD.hideAge,
    updateDb: (until) => updateHideAgeStatus(tgUserId.current || 0, until),
  })

  // ── Splash ─────────────────────────────────────────────────────────
  useEffect(() => { splashTimerRef.current = setTimeout(() => setShowSplash(false), 3000); return () => { if (splashTimerRef.current) clearTimeout(splashTimerRef.current) } }, [])
  useEffect(() => { if (videoReady) { const t = setTimeout(() => setShowSplash(false), 1800); return () => clearTimeout(t) } }, [videoReady])

  // ── Group check ────────────────────────────────────────────────────
  useEffect(() => {
    const tg = getTg(); const inTg = isInTelegram(); const user = tg?.initDataUnsafe?.user
    if (isAdminUser(user, ADMIN_IDS, ADMIN_USERNAMES)) { setGroupCheck('member'); return }
    if (!inTg || !tg) { setGroupCheck('not_member'); return }
    setGroupCheck('member')
  }, [])

  // ── Init: load Telegram user + saved data + Supabase sync ──────────
  useEffect(() => {
    const tg = getTg(); const inTg = isInTelegram()
    if (!inTg) tgUserId.current = 999999

    if (tg) {
      tg.ready(); tg.expand(); tg.setHeaderColor('#0A0A0A')
      const user = tg.initDataUnsafe?.user
      if (user) {
        tgUserId.current = user.id
        setIsPremium(!!user.is_premium)
        setIsAdmin(isAdminUser(user, ADMIN_IDS, ADMIN_USERNAMES))
        const photoUrl = user.photo_url || ''
        setOwnProfile(prev => ({
          ...prev, id: String(user.id), name: user.first_name || prev.name,
          tgUsername: user.username || prev.tgUsername,
          tgPhotoUrl: photoUrl || prev.tgPhotoUrl,
          tgPhotos: photoUrl ? [photoUrl] : prev.tgPhotos,
          hasPhoto: (!!photoUrl && photoUrl.startsWith('http')) || prev.hasPhoto,
          hasRealPhoto: !!photoUrl,
          gender: APP_CONFIG.showGender ? (prev.gender) : APP_CONFIG.defaultGender,
          seekingGender: APP_CONFIG.showGender ? (prev.seekingGender) : APP_CONFIG.defaultSeekingGender,
        }))
        if (photoUrl) storage.set(CLOUD.photoUrl, photoUrl)
        if (user.first_name) storage.set(CLOUD.name, user.first_name)
      }
    }

    storage.getAll().then(result => {
      if (!result || Object.keys(result).length === 0) return

      const loaded: Partial<UserProfile> = {}
      if (result[CLOUD.photoUrl]?.trim()) { loaded.tgPhotoUrl = result[CLOUD.photoUrl]; loaded.tgPhotos = [result[CLOUD.photoUrl]] }
      if (result[CLOUD.name]?.trim()) loaded.name = result[CLOUD.name]

      const parseNum = (val: string | undefined) => { if (!val?.trim()) return undefined; const n = parseFloat(val); return isNaN(n) ? undefined : n }
      const h = parseNum(result[CLOUD.height]); if (h) loaded.height = h
      const w = parseNum(result[CLOUD.weight]); if (w) loaded.weight = w
      const p = parseNum(result[CLOUD.position]); if (p !== undefined) loaded.position = p

      if (result[CLOUD.pref1]) { const prefs = { ...(loaded.preferences || {}) }; prefs[APP_CONFIG.preferences[0]?.key || 'pref1'] = result[CLOUD.pref1]; loaded.preferences = prefs }
      if (result[CLOUD.pref2]) { const prefs = { ...(loaded.preferences || {}) }; prefs.pref2 = result[CLOUD.pref2]; loaded.preferences = prefs }
      if (result[CLOUD.pref3]) { const prefs = { ...(loaded.preferences || {}) }; prefs.pref3 = result[CLOUD.pref3]; loaded.preferences = prefs }

      loaded.openToMessages = result[CLOUD.openMsg] === 'true'
      if (result[CLOUD.lang]) setLang(result[CLOUD.lang] as Lang)

      // Filter unlock expiry
      const startParam = tg?.initDataUnsafe?.start_param
      const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000
      const unlockedAt = parseInt(result[CLOUD.filtersUnlockedAt] || '0')
      const now = Date.now()
      const expired = unlockedAt > 0 && (now - unlockedAt) > THIRTY_DAYS
      if (!expired && (startParam === 'unlocked' || result[CLOUD.filtersUnlocked] === 'true')) {
        setFiltersUnlocked(true)
        if (startParam === 'unlocked') { storage.set(CLOUD.filtersUnlocked, 'true'); storage.set(CLOUD.filtersUnlockedAt, String(now)); setFiltersUnlockedAt(now) }
        else setFiltersUnlockedAt(unlockedAt)
      } else if (expired) {
        storage.set(CLOUD.filtersUnlocked, ''); storage.set(CLOUD.filtersUnlockedAt, '')
        setFiltersUnlocked(false); setFiltersUnlockedAt(undefined)
      }

      if (result[CLOUD.gridRowsUnlocked]) { const n = parseInt(result[CLOUD.gridRowsUnlocked]); if (!isNaN(n) && n > 0) setGridRowsUnlocked(n) }
      if (result[CLOUD.channelFollowed] === '1') setChannelFollowUnlock(1)

      // Profile unlock check — if profile is incomplete, force edit mode
      const prefLockedAt = result[CLOUD.prefLockedAt]
      if (prefLockedAt) {
        const t = parseInt(prefLockedAt)
        if (!isNaN(t) && t === 0) { setEditProfileUnlocked(true) }
      }

      // Supabase sync
      const syncId = tgUserId.current
      if (syncId) {
        fetchUserUnlockStatus(syncId).then((status: UnlockStatus | null) => {
          if (!status) return
          const now = Date.now()
          const filtersExpired = status.filters_unlocked_expires_at ? new Date(status.filters_unlocked_expires_at).getTime() < now : !status.filters_unlocked
          if (!filtersExpired && status.filters_unlocked) {
            setFiltersUnlocked(true); storage.set(CLOUD.filtersUnlocked, 'true'); storage.set(CLOUD.filtersUnlockedAt, String(now)); setFiltersUnlockedAt(now)
          } else if (filtersExpired || !status.filters_unlocked) {
            setFiltersUnlocked(false); storage.set(CLOUD.filtersUnlocked, ''); storage.set(CLOUD.filtersUnlockedAt, ''); setFiltersUnlockedAt(undefined)
          }
          const dbRows = status.grid_rows_unlocked || 0
          if (dbRows >= 0) { setGridRowsUnlocked(dbRows); storage.set(CLOUD.gridRowsUnlocked, String(dbRows)) }
          setOwnProfile(prev => ({ ...prev, hasRealPhoto: !!status.has_real_photo }))
          loadInvisibleState(status.invisible_until)
        }).catch((err: Error) => console.error('sync error:', err))
      }

      // Location
      if (result[CLOUD.lat] && result[CLOUD.lng]) {
        const lat = parseFloat(result[CLOUD.lat]); const lng = parseFloat(result[CLOUD.lng])
        if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) { loaded.lat = lat; loaded.lng = lng; setLocationGranted(true) }
      }

      if (Object.keys(loaded).length > 0) {
        setOwnProfile(prev => {
          const merged = { ...prev, ...loaded }
          // Force defaults for hidden fields
          if (!APP_CONFIG.showGender) { merged.gender = APP_CONFIG.defaultGender; merged.seekingGender = APP_CONFIG.defaultSeekingGender }
          return merged
        })
      }
    })
  }, [])

  // ── Check profile completeness on init — open edit if incomplete ────
  useEffect(() => {
    // After all init data loaded, check if profile is complete
    const checkTimer = setTimeout(() => {
      setOwnProfile(prev => {
        if (!isProfileComplete(prev)) {
          setEditProfileUnlocked(true)
          setView('OWN_PROFILE')
        }
        return prev
      })
    }, 3500) // After splash screen + init effects
    return () => clearTimeout(checkTimer)
  }, [])

  // ── Auto upsert ────────────────────────────────────────────────────
  useEffect(() => {
    const uid = tgUserId.current; const lat = ownProfile.lat; const lng = ownProfile.lng
    if (!uid || !lat || !lng || !hasValidKey) return
    upsertUser({ ...profileToDb(ownProfile), id: uid }).then((result: DbUser | null) => {
      if (result && !result.filters_unlocked_expires_at) ensureFilterUnlock(result.id)
    }).catch((err: Error) => console.error('Upsert error:', String(err).substring(0, 200)))
  }, [ownProfile.lat, ownProfile.lng, ownProfile.name, ownProfile.tgPhotoUrl, ownProfile.height, ownProfile.weight, ownProfile.position, ownProfile.preference1, ownProfile.preference2, ownProfile.preference3, ownProfile.preference4, ownProfile.openToMessages, ownProfile.tgUsername, ownProfile.dob, ownProfile.gender, ownProfile.seekingGender])

  // ── Refresh ────────────────────────────────────────────────────────
  const handleRefresh = useCallback(() => {
    const lat = ownProfile.lat; const lng = ownProfile.lng
    if (!lat || !lng) return
    setIsLoadingUsers(true)
    fetchNearby(lat, lng).then((dbUsers: DbUser[]) => {
      const myId = tgUserId.current
      const mapped = dbUsers.filter((u: DbUser) => u.id !== myId).map((u: DbUser) => dbToProfile(u, lat, lng))
      setUsers(mapped); setIsLoadingUsers(false)
    }).catch((err: Error) => { console.error('Refresh error:', String(err).substring(0, 200)); setIsLoadingUsers(false) })
  }, [ownProfile.lat, ownProfile.lng])

  useEffect(() => {
    const lat = ownProfile.lat; const lng = ownProfile.lng
    if (!lat || !lng) return
    handleRefresh()
    const interval = setInterval(handleRefresh, 300000)
    return () => clearInterval(interval)
  }, [ownProfile.lat, ownProfile.lng, handleRefresh])

  // ── Location granted ───────────────────────────────────────────────
  const handleLocationGranted = useCallback((lat: number, lng: number) => {
    setLocationGranted(true); setIsLoadingUsers(true)
    setOwnProfile(prev => ({ ...prev, lat, lng }))
    storage.set(CLOUD.lat, String(lat)); storage.set(CLOUD.lng, String(lng))
  }, [])

  // ── Save profile — locks on save, returns to grid only if complete ──
  const handleSaveProfile = useCallback((updated: UserProfile) => {
    // Force defaults for hidden fields
    if (!APP_CONFIG.showGender) { updated.gender = APP_CONFIG.defaultGender; updated.seekingGender = APP_CONFIG.defaultSeekingGender }

    setOwnProfile(updated)

    // Only lock and return to grid if profile is complete
    if (isProfileComplete(updated)) {
      storage.set(CLOUD.prefLockedAt, String(Date.now()))
      setEditProfileUnlocked(false)
      setView('MAIN')
    } else {
      // Keep edit mode open, show what's missing
      const missing = getMissingFields(updated)
      alert(`Profile incomplete. Missing: ${missing.join(', ')}`)
    }

    const uid = tgUserId.current
    if (uid && updated.lat && updated.lng) {
      upsertUser({ ...profileToDb(updated), id: uid }).catch((err: Error) => console.error('Profile upsert error:', err))
    }
  }, [])

  // ── Message handler ────────────────────────────────────────────────
  const handleMessage = useCallback((user: UserProfile) => {
    if (user.openToMessages && !starsPaidFor.has(user.id)) {
      const tg = getTg()
      if (tg?.showPopup) {
        tg.showPopup({ title: '⭐ Send Stars to Chat', message: `${user.name} requires sending Telegram Stars to open chat. Send stars now?`,
          buttons: [{ id: 'pay', type: 'default', text: 'Send ⭐ 50' }, { type: 'cancel', text: 'Cancel' }]
        }, (btnId: string) => { if (btnId === 'pay') { setStarsPaidFor(prev => new Set(prev).add(user.id)); handleMessage(user) } })
      } else { if (confirm(`Send 50 ⭐ to ${user.name} to open chat?`)) { setStarsPaidFor(prev => new Set(prev).add(user.id)); handleMessage(user) } }
      return
    }
    const tgUrl = `https://t.me/${user.tgUsername || 'LetsMeetNow'}`
    const tg = getTg()
    if (tg?.openTelegramLink) { tg.openTelegramLink(tgUrl); return }
    if (tg?.openLink) { tg.openLink(tgUrl, { try_instant_view: false }); return }
    window.open(tgUrl, '_blank')
  }, [starsPaidFor])

  // ═════════════════════════════════════════════════════════════════════
  // RENDER — Views. NO CHANGES NEEDED.
  // ═════════════════════════════════════════════════════════════════════

  if (showSplash) {
    return (
      <div className="min-h-[100vh] bg-[#0A0A0A] flex items-center justify-center px-6">
        <div className="w-full max-w-[min(520px,100vw)] flex flex-col items-center justify-center gap-5">
          <video src={logoAnim} autoPlay loop muted playsInline onLoadedData={() => setVideoReady(true)} className="w-48 h-48 rounded-full object-cover" />
          <div className="text-center"><h1 className="text-2xl font-bold gradient-text tracking-tight">MyApp</h1><p className="text-[#8E8E93] text-xs mt-1">Your Dating App</p></div>
          <p className="text-[#8E8E93]/60 text-[9px] text-center leading-relaxed max-w-[320px]">By using this app, you confirm you are 18+.</p>
        </div>
      </div>
    )
  }

  if (groupCheck === 'checking') {
    return (<div className="min-h-[100vh] bg-neutral-950 flex justify-center"><div className="w-full max-w-[min(520px,100vw)] bg-[#0A0A0A] h-[100vh] flex items-center justify-center"><div className="w-8 h-8 border-2 border-[var(--app-primary)] border-t-transparent rounded-full animate-spin" /></div></div>)
  }

  if (groupCheck === 'not_member') {
    const tg = getTg(); const raw = tg ? JSON.stringify(tg.initDataUnsafe, null, 2) : 'no Telegram WebApp'
    return (
      <div className="min-h-[100vh] bg-neutral-950 flex justify-center">
        <div className="w-full max-w-[min(520px,100vw)] bg-[#0A0A0A] h-[100vh] relative flex flex-col px-6 pt-16 pb-6 overflow-y-auto">
          <div className="flex flex-col items-center text-center flex-shrink-0">
            <div className="w-16 h-16 rounded-full bg-[var(--app-primary)]/10 flex items-center justify-center mb-4"><Lock className="w-8 h-8 text-[var(--app-primary)]" /></div>
            <h1 className="text-2xl font-bold text-white mb-2">{t(lang, 'membersOnly')}</h1>
            <p className="text-[#8E8E93] text-sm mb-1">This app is exclusively for members of</p>
            <p className="text-[var(--app-primary)] font-semibold text-sm mb-4">@yourgroup</p>
            <button onClick={() => { const t = getTg(); if (t?.openTelegramLink) t.openTelegramLink(GROUP_CHAT_URL); else window.open(GROUP_CHAT_URL, '_blank') }} className="gradient-btn px-6 py-3 rounded-xl text-white font-semibold text-sm nav-press mb-4">{t(lang, 'openInGroup')}</button>
          </div>
          <div className="mt-4 flex-1 min-h-0 flex flex-col">
            <p className="text-[#8E8E93] text-[10px] text-center mb-2">{t(lang, 'openFromGroup')}</p>
            <details className="text-left"><summary className="text-[#8E8E93] text-[10px] cursor-pointer select-none text-center">{t(lang, 'showDebug')}</summary><pre className="mt-2 p-2 bg-[#1A1A1A] rounded-lg text-[9px] text-[#8E8E93] overflow-auto max-h-48 whitespace-pre-wrap break-all">{raw}</pre></details>
          </div>
        </div>
      </div>
    )
  }

  if (!locationGranted) {
    return (<div className="min-h-[100vh] bg-neutral-950 flex justify-center"><div className="w-full max-w-[min(520px,100vw)] bg-[#0A0A0A] h-[100vh] relative"><LocationGate onGranted={handleLocationGranted} lang={lang} /></div></div>)
  }

  return (
    <>
      <FlyingMessagesOverlay messages={flyingMessages} onDone={(id) => setFlyingMessages(prev => prev.filter(m => m.id !== id))} />
      <div className="min-h-screen bg-neutral-950 flex justify-center">
        <div className="w-full max-w-[min(520px,100vw)] bg-[#0A0A0A] h-screen relative flex flex-col">
          {view === 'MAIN' ? (
            <MainScreen ownProfile={ownProfile} users={users} onViewOwnProfile={() => setView('OWN_PROFILE')} onViewPhoto={(u) => setPhotoOverlay(u)}
              showDbWarning={!hasValidKey} isLoadingUsers={isLoadingUsers} lang={lang} setLang={setLang}
              onRefresh={handleRefresh} isAdmin={isAdmin} filtersUnlocked={isAdmin || filtersUnlocked}
              onPromptUnlock={unlockRow} onPromptFilterUnlock={unlockFilters}
              onToggleInvisible={() => { toggleInvisible(); handleRefresh() }} gridRowsUnlocked={gridRowsUnlocked}
              channelFollowUnlock={channelFollowUnlock} onClaimChannelFollow={claimChannelFollow}
              lastRefreshTime={lastRefreshTime} setLastRefreshTime={(t) => { setLastRefreshTime(t); markRefreshed() }}
              isInvisible={isInvisible} invisiblePurchased={hasPurchasedInvisible}
              raffle={raffle} onBuyRaffleTicket={handleBuyRaffleTicket} onStartNextRaffle={handleStartNextRaffle}
              onPromptUnlockProfile={promptUnlockProfile} isPremium={isPremium} />
          ) : (
            <ProfileView user={ownProfile} lang={lang} logoUrl={logoImg} appConfig={APP_CONFIG}
              onSave={handleSaveProfile} onBack={() => { if (isProfileComplete(ownProfile)) setView('MAIN') }} editProfileUnlocked={isAdmin || editProfileUnlocked} />
          )}
          {photoOverlay && (
            <ProfileView user={photoOverlay} lang={lang} logoUrl={logoImg} appConfig={APP_CONFIG}
              onClose={() => setPhotoOverlay(null)} onMessage={handleMessage} ownProfile={ownProfile} />
          )}
          {adminAction === 'release' && (
            <div className="fixed inset-0 z-[70] bg-black/70 flex items-center justify-center" onClick={() => setAdminAction(null)}>
              <div className="bg-[#1C1C1E] rounded-xl p-5 w-64 space-y-3" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-base font-bold text-white text-center">🔓 Release Profile Lock</h3>
                <p className="text-xs text-[#8E8E93] text-center">Release your own 30-day preference lock:</p>
                <button onClick={releaseLock} className="w-full py-2.5 rounded-lg bg-[#2C2C2E] text-white text-sm font-bold nav-press">Release My Lock</button>
                <button onClick={() => setAdminAction(null)} className="w-full py-1.5 text-[10px] text-[#8E8E93]">Cancel</button>
              </div>
            </div>
          )}
          {view === 'MAIN' && (
            <BottomNav lang={lang} cooldownRemaining={Math.max(0, 60000 - (Date.now() - lastFlyingSendRef.current))}
              onSend={(text) => {
                if (Date.now() - lastFlyingSendRef.current < 60000) return
                lastFlyingSendRef.current = Date.now()
                const top = 10 + Math.random() * 80
                const prefixed = `@${ownProfile.tgUsername || ownProfile.name || 'User'} said: ${text}`
                setFlyingMessages(prev => [...prev, { id: Date.now(), text: prefixed, top: `${top}vh` }])
                insertFlyingMessage({ text, username: ownProfile.tgUsername || ownProfile.name || 'User', user_id: tgUserId.current || 0, top_percent: Math.round(top) })
              }}
              groupChatUrl={GROUP_CHAT_URL} referShareUrl="https://t.me/share/url?url=https://t.me/LetsMeetNow?startapp&text=Check%20out%20LMN"
              walletUrl="https://t.me/wallet" />
          )}
        </div>
      </div>
    </>
  )
}
 </div>
      </div>
    </>
  )
}
