import {
  getTg, isInTelegram, getTimeAgo, getDistance, formatDist,
  getDefaultLang, isAdminUser, createCloudKeys, createStorage,
  useAdminRecheck, useRaffleActions, useRefreshCooldown,
  useHeartbeat, useFlyingMessages,
  useFilterUnlock, useGridUnlock, useInvisibleMode,
  useProfileUnlock, useChannelFollow,
  type UserProfile, type Lang, type Raffle,
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
  updateInvisibleStatus, setGridRowsUnlocked as saveGridRowsUnlocked,
  setFiltersUnlocked as saveFiltersUnlocked, ensureFilterUnlock,
  type DbUser,
} from './lib/supabase'

// ─── Types ───────────────────────────────────────────────────────────

type View = 'MAIN' | 'OWN_PROFILE'

// ─── Admin Config ────────────────────────────────────────────────────

const ADMIN_IDS = [5202742795, 725368127]
const ADMIN_USERNAMES = ['mileschan852', 'MilesChan852']
const WORKER_URL = 'https://lmn-d.mileschan852.workers.dev/createinvoice'
const GROUP_CHAT_URL = 'https://t.me/LetsMeetNow'
const CHANNEL_URL = 'https://t.me/LetsMeetNowApp'
const TABLE_NAME = 'lmn_users'

// ─── Storage ─────────────────────────────────────────────────────────

const CLOUD = createCloudKeys('lmn')
const storage = createStorage({ prefix: 'lmn' })

// ─── Helpers ─────────────────────────────────────────────────────────

function dbToProfile(u: DbUser, myLat: number, myLng: number): UserProfile {
  const dist = u.lat && u.lng ? getDistance(myLat, myLng, u.lat, u.lng) : 0
  return {
    id: String(u.id),
    name: u.name,
    age: 0,
    height: u.height,
    weight: u.weight,
    position: u.position ?? 0,
    isSide: u.is_side ?? false,
    isOnline: u.is_online,
    distance: Math.round(dist),
    lat: u.lat,
    lng: u.lng,
    gender: (u as any).gender || undefined,
    seekingGender: (u as any).seeking_gender || undefined,
    seekingToday: (u as any).seeking_today || undefined,
    dob: (u as any).dob || undefined,
    hideAge: (u as any).hide_age || false,
    preference1: (u.preference1 as 'Safe' | 'Raw') || 'Raw',
    preference2: (u.preference2 as 'Clean' | 'Party' | 'Party✓') || 'Party',
    preference3: (u.preference3 as '1on1' | 'Group') || 'Group',
    preference4: (u.preference4 === 'Off' ? 'Travel' : u.preference4 as 'Host' | 'Travel' | 'Outdoor' | 'Sauna') || 'Travel',
    openToMessages: u.open_to_messages || false,
    tgUsername: u.tg_username || undefined,
    tgPhotoUrl: u.photo_url?.startsWith('http') ? u.photo_url : undefined,
    tgPhotos: u.photo_url?.startsWith('http') ? [u.photo_url] : [],
    updatedAt: u.updated_at,
    hasPhoto: !!(u.photo_url && u.photo_url.startsWith('http')),
    hasRealPhoto: u.has_real_photo ?? undefined,
    invisibleUntil: u.invisible_until ?? undefined,
    isInvisible: !!u.invisible_until && new Date(u.invisible_until).getTime() > Date.now(),
  } as UserProfile
}

// ─── Unlock Tip Cycle ────────────────────────────────────────────────

function UnlockTipCycle({ lang, isPremium, gridRowsUnlocked, channelFollowUnlock, onClaimChannelFollow }: { lang: Lang; isPremium: boolean; gridRowsUnlocked: number; channelFollowUnlock: number; onClaimChannelFollow: () => void }) {
  const [idx, setIdx] = useState(0)
  const tips: Record<Lang, string[]> = {
    en: [
      `Base: 2 rows free`,
      isPremium ? `Premium: +1 row` : `Premium: +1 row (not active)`,
      `Purchased: ${gridRowsUnlocked} rows`,
      `Add a Telegram photo +1`,
      `⭐ = charge stars per message`,
      channelFollowUnlock ? `Group: +1 row ✅` : `Join LMN Channel +1`,
      `Buy rows with ⭐ Stars`,
    ],
    tc: [
      `基礎: 2 行免費`,
      isPremium ? `Premium: +1 行` : `Premium: +1 行 (未激活)`,
      `已購: ${gridRowsUnlocked} 行`,
      `加入 Telegram 頭像 +1`,
      `⭐ = 按訊息收費`,
      channelFollowUnlock ? `群組: +1 行 ✅` : `加入 LMN Channel +1`,
      `用 ⭐ 星星購買行數`,
    ],
    sc: [
      `基础: 2 行免费`,
      isPremium ? `Premium: +1 行` : `Premium: +1 行 (未激活)`,
      `已购: ${gridRowsUnlocked} 行`,
      `加入 Telegram 头像 +1`,
      `⭐ = 按消息收费`,
      channelFollowUnlock ? `群组: +1 行 ✅` : `加入 LMN Channel +1`,
      `用 ⭐ 星星购买行数`,
    ],
    ru: [
      `База: 2 строки бесплатно`,
      isPremium ? `Premium: +1 строка` : `Premium: +1 строка (не активен)`,
      `Куплено: ${gridRowsUnlocked} строк`,
      `Добавь фото в Telegram +1`,
      `⭐ = плата за сообщение`,
      channelFollowUnlock ? `Группа: +1 строка ✅` : `Вступи в LMN Channel +1`,
      `Купить строки за ⭐`,
    ],
  }
  const list = tips[lang] || tips.en

  useEffect(() => {
    const i = setInterval(() => setIdx(i => (i + 1) % list.length), 5000)
    return () => clearInterval(i)
  }, [list.length])

  const current = list[idx % list.length]
  const isChannelTip = idx % list.length === 5

  return (
    <button
      onClick={() => { if (isChannelTip && !channelFollowUnlock) onClaimChannelFollow(); else setIdx(i => (i + 1) % list.length) }}
      className="ml-auto flex items-center gap-1 text-[9px] text-[#8E8E93] nav-press"
    >
      <span className="w-4 h-4 rounded-full bg-[#2C2C2E] flex items-center justify-center">💡</span>
      <span key={idx} className={`truncate max-w-[140px] animate-fadeIn ${isChannelTip && !channelFollowUnlock ? 'text-[#5AC8FA]' : ''}`}>{current}</span>
    </button>
  )
}

// ─── Main Screen ─────────────────────────────────────────────────────

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
  const [genderFilter, setGenderFilter] = useState<'All' | 'Male' | 'Female'>('All')
  const [seekingFilter, setSeekingFilter] = useState<'All' | 'Men' | 'Women' | 'Both'>('All')
  const [photoFilter, setPhotoFilter] = useState<'All' | 'Has Photo' | 'No Photo'>('All')

  const LANG_CYCLE: Lang[] = ['en', 'tc', 'sc', 'ru']
  const cycleLang = () => {
    const idx = LANG_CYCLE.indexOf(lang)
    const next = LANG_CYCLE[(idx + 1) % LANG_CYCLE.length]
    setLang(next)
    storage.set(CLOUD.lang, next)
  }

  const cycleGenderFilter = () => {
    const order: Array<'All' | 'Male' | 'Female'> = ['All', 'Male', 'Female']
    setGenderFilter(f => order[(order.indexOf(f) + 1) % order.length])
  }
  const cycleSeekingFilter = () => {
    const order: Array<'All' | 'Men' | 'Women' | 'Both'> = ['All', 'Men', 'Women', 'Both']
    setSeekingFilter(f => order[(order.indexOf(f) + 1) % order.length])
  }
  const cyclePhotoFilter = () => {
    const order: Array<'All' | 'Has Photo' | 'No Photo'> = ['All', 'Has Photo', 'No Photo']
    setPhotoFilter(f => order[(order.indexOf(f) + 1) % order.length])
  }

  // Online = updated within 15 min
  const ONLINE_THRESHOLD_MS = 15 * 60 * 1000
  const isRecentlyActive = (u: UserProfile) => {
    if (u.isOwn) return true
    if (!u.updatedAt) return false
    return Date.now() - new Date(u.updatedAt).getTime() < ONLINE_THRESHOLD_MS
  }

  const patchedOwnProfile = { ...ownProfile, isOwn: true, isInvisible: isInvisible || false }
  const allGridUsers: UserProfile[] = [patchedOwnProfile, ...users.filter(u => u.id !== ownProfile.id)]
  const visibleGridUsers = isAdmin ? allGridUsers : allGridUsers.filter(u => u.isOwn || !u.isInvisible)

  const filteredGrid = visibleGridUsers.filter((u) => {
    if (u.isOwn) return true
    if (onlineOnly && !isRecentlyActive(u)) return false
    if (u.tgUsername === '_test_') return false
    if (genderFilter !== 'All' && u.gender !== genderFilter) return false
    if (seekingFilter !== 'All' && u.seekingGender !== seekingFilter) return false
    if (photoFilter === 'Has Photo' && !u.hasPhoto) return false
    if (photoFilter === 'No Photo' && u.hasPhoto) return false
    return true
  }).sort((a, b) => {
    if (a.isOwn) return -1
    if (b.isOwn) return 1
    return (a.distance || Infinity) - (b.distance || Infinity)
  })

  const matchingIds = new Set(filteredGrid.map(u => u.id))
  const nonMatchingGrid = visibleGridUsers.filter(u => !matchingIds.has(u.id)).sort((a, b) => {
    if (a.isOwn) return -1
    if (b.isOwn) return 1
    return (a.distance || Infinity) - (b.distance || Infinity)
  })
  const sortedUsers = [...filteredGrid, ...nonMatchingGrid]

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
          <Lock className="w-4 h-4 text-[#5AC8FA] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[#5AC8FA] text-xs font-semibold">{t(lang, 'dbNotConfigured')}</p>
            <p className="text-[#8E8E93] text-[10px]">{t(lang, 'dbConfigHint')}</p>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="px-3 py-2">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
          <ToggleButton active={onlineOnly} onClick={() => setOnlineOnly(!onlineOnly)}>
            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${onlineOnly ? 'bg-[#00D4AA]' : 'bg-[#8E8E93]'}`} />
            {onlineOnly ? t(lang, 'onlineStatus') : t(lang, 'offlineStatus')}
          </ToggleButton>

          <ToggleButton
            active={photoFilter === 'Has Photo'}
            onClick={cyclePhotoFilter}
          >
            {photoFilter === 'All' ? 'Photo' : photoFilter === 'Has Photo' ? '✅ Photo' : '❌ Photo'}
          </ToggleButton>

          <div className="w-px h-4 bg-[#2C2C2E] flex-shrink-0" />

          {/* Gender */}
          <FilterButton
            active={genderFilter !== 'All'}
            onClick={cycleGenderFilter}
            colorClass={genderFilter === 'All' ? undefined : genderFilter === 'Male' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-pink-500/20 text-pink-400 border-pink-500/30'}
          >
            {genderFilter}
          </FilterButton>

          {/* Seeking */}
          <FilterButton
            active={seekingFilter !== 'All'}
            onClick={cycleSeekingFilter}
            colorClass={seekingFilter === 'All' ? undefined : seekingFilter === 'Men' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : seekingFilter === 'Women' ? 'bg-pink-500/20 text-pink-400 border-pink-500/30' : 'bg-purple-500/20 text-purple-400 border-purple-500/30'}
          >
            {seekingFilter === 'All' ? 'Seeking' : seekingFilter}
          </FilterButton>
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
                users={sortedUsers.filter(u => u.id !== ownProfile.id) as any}
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
                renderTileBottom={(user: any) => {
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

// ─── App Component ───────────────────────────────────────────────────

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
    gender: 'Male', seekingGender: 'Women', seekingToday: 'Just Browsing', hideAge: false,
  } as UserProfile)
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

  // ─── Shared Hooks ──────────────────────────────────────────────────

  useAdminRecheck({ isAdmin, setIsAdmin, adminIds: ADMIN_IDS, adminUsernames: ADMIN_USERNAMES })

  const { handleBuyRaffleTicket, handleStartNextRaffle } = useRaffleActions({
    tableName: TABLE_NAME,
    workerUrl: WORKER_URL,
    isAdmin,
    raffle,
    setRaffle,
  })

  const { lastRefreshTime, setLastRefreshTime, markRefreshed } = useRefreshCooldown()

  useHeartbeat({
    tableName: TABLE_NAME,
    getUserId: () => tgUserId.current,
    locationGranted,
  })

  const { flyingMessages, setFlyingMessages, lastFlyingSendRef } = useFlyingMessages()

  const { filtersUnlocked, setFiltersUnlocked, unlockFilters, filtersUnlockedAt, setFiltersUnlockedAt } = useFilterUnlock({
    isAdmin,
    workerUrl: WORKER_URL,
    storageSet: (k, v) => storage.set(k, v),
    storageKeys: { unlocked: CLOUD.filtersUnlocked, unlockedAt: CLOUD.filtersUnlockedAt },
    saveToDb: (uid, unlocked, expires) => saveFiltersUnlocked(uid, unlocked, expires),
  })

  const { gridRowsUnlocked, setGridRowsUnlocked, unlockRow } = useGridUnlock({
    isAdmin,
    workerUrl: WORKER_URL,
    storageSet: (k, v) => storage.set(k, v),
    storageKeys: { rows: CLOUD.gridRowsUnlocked, rowsAt: CLOUD.gridRowsUnlockedAt },
    saveToDb: (uid, rows) => saveGridRowsUnlocked(uid, rows),
  })

  const { invisibleUntil, invisibleActive, isInvisible, hasPurchasedInvisible, toggleInvisible, loadInvisibleState } = useInvisibleMode({
    isAdmin,
    workerUrl: WORKER_URL,
    storageSet: (k, v) => storage.set(k, v),
    storageGet: (k) => storage.get(k),
    storageKey: CLOUD.invisibleActive,
    updateDb: (uid, until) => updateInvisibleStatus(uid, until),
  })

  const { adminAction, setAdminAction, promptUnlockProfile, releaseLock } = useProfileUnlock({
    isAdmin,
    workerUrl: WORKER_URL,
    storageSet: (k, v) => storage.set(k, v),
    lockKey: CLOUD.prefLockedAt,
  })

  const { channelFollowUnlock, setChannelFollowUnlock, claimChannelFollow } = useChannelFollow({
    channelUrl: CHANNEL_URL,
    storageSet: (k, v) => storage.set(k, v),
    storageKey: CLOUD.channelFollowed,
    openLink: (url) => {
      const tg = getTg()
      if (tg?.openTelegramLink) tg.openTelegramLink(url)
      else if (tg?.openLink) tg.openLink(url, { try_instant_view: false })
      else window.open(url, '_blank')
    },
  })

  // ─── Splash Screen ─────────────────────────────────────────────────
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

  // ─── Group Membership Check ────────────────────────────────────────
  useEffect(() => {
    const tg = getTg()
    const inTg = isInTelegram()
    const user = tg?.initDataUnsafe?.user
    if (isAdminUser(user, ADMIN_IDS, ADMIN_USERNAMES)) { setGroupCheck('member'); return }
    if (!inTg || !tg) { setGroupCheck('not_member'); return }
    setGroupCheck('member')
  }, [])

  // ─── Init: Load Telegram user + saved data ─────────────────────────
  useEffect(() => {
    const tg = getTg()
    const inTg = isInTelegram()
    if (!inTg) tgUserId.current = 999999

    if (tg) {
      tg.ready(); tg.expand(); tg.setHeaderColor('#0A0A0A')
      const user = tg.initDataUnsafe?.user
      if (user) {
        tgUserId.current = user.id
        setIsPremium(!!user.is_premium)
        const adminCheck = isAdminUser(user, ADMIN_IDS, ADMIN_USERNAMES)
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
          hasRealPhoto: !!photoUrl,
        }))
        if (photoUrl) storage.set(CLOUD.photoUrl, photoUrl)
        if (user.first_name) storage.set(CLOUD.name, user.first_name)
      }
    }

    storage.getAll().then(result => {
      if (!result || Object.keys(result).length === 0) return

      const loaded: Partial<UserProfile> = {}
      const savedPhoto = result[CLOUD.photoUrl]
      if (savedPhoto && savedPhoto.trim() !== '') { loaded.tgPhotoUrl = savedPhoto; loaded.tgPhotos = [savedPhoto] }
      const savedName = result[CLOUD.name]
      if (savedName && savedName.trim() !== '') loaded.name = savedName
      const hVal = result[CLOUD.height]
      if (hVal && hVal.trim() !== '') { const p = parseInt(hVal); if (!isNaN(p) && p > 0) loaded.height = p }
      const wVal = result[CLOUD.weight]
      if (wVal && wVal.trim() !== '') { const p = parseInt(wVal); if (!isNaN(p) && p > 0) loaded.weight = p }
      if (result[CLOUD.pref1]) loaded.gender = result[CLOUD.pref1]
      if (result[CLOUD.pref2]) loaded.seekingGender = result[CLOUD.pref2]
      if (result[CLOUD.pref3]) loaded.seekingToday = result[CLOUD.pref3]
      if (result[CLOUD.dob]) loaded.dob = result[CLOUD.dob]
      loaded.hideAge = result[CLOUD.hideAge] === 'true'
      if (result[CLOUD.lang]) setLang(result[CLOUD.lang] as Lang)

      // Filter unlock expiry
      const startParam = tg?.initDataUnsafe?.start_param
      const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000
      const unlockedAt = parseInt(result[CLOUD.filtersUnlockedAt] || '0')
      const now = Date.now()
      const isExpired = unlockedAt > 0 && (now - unlockedAt) > THIRTY_DAYS_MS
      if (!isExpired && (startParam === 'unlocked' || result[CLOUD.filtersUnlocked] === 'true')) {
        setFiltersUnlocked(true)
        if (startParam === 'unlocked') {
          storage.set(CLOUD.filtersUnlocked, 'true')
          storage.set(CLOUD.filtersUnlockedAt, String(now))
          setFiltersUnlockedAt(now)
        } else { setFiltersUnlockedAt(unlockedAt) }
      } else if (isExpired) {
        storage.set(CLOUD.filtersUnlocked, '')
        storage.set(CLOUD.filtersUnlockedAt, '')
        setFiltersUnlocked(false)
        setFiltersUnlockedAt(undefined)
      }

      const savedGridRows = result[CLOUD.gridRowsUnlocked]
      if (savedGridRows) { const parsed = parseInt(savedGridRows); if (!isNaN(parsed) && parsed > 0) setGridRowsUnlocked(parsed) }
      if (result[CLOUD.channelFollowed] === '1') setChannelFollowUnlock(1)

      // Profile unlock check
      const prefLockedAt = result[CLOUD.prefLockedAt]
      if (prefLockedAt) {
        const lockedTime = parseInt(prefLockedAt)
        if (!isNaN(lockedTime) && lockedTime === 0) {
          setEditProfileUnlocked(true)
          setView('OWN_PROFILE')
        }
      }

      // Sync from Supabase
      const syncUserId = tgUserId.current
      if (syncUserId) {
        fetchUserUnlockStatus(syncUserId).then(status => {
          if (!status) return
          const now = Date.now()
          const filtersExpired = status.filters_unlocked_expires_at
            ? new Date(status.filters_unlocked_expires_at).getTime() < now
            : !status.filters_unlocked
          if (!filtersExpired && status.filters_unlocked) {
            setFiltersUnlocked(true)
            storage.set(CLOUD.filtersUnlocked, 'true')
            storage.set(CLOUD.filtersUnlockedAt, String(now))
            setFiltersUnlockedAt(now)
          } else if (filtersExpired || !status.filters_unlocked) {
            setFiltersUnlocked(false)
            storage.set(CLOUD.filtersUnlocked, '')
            storage.set(CLOUD.filtersUnlockedAt, '')
            setFiltersUnlockedAt(undefined)
          }
          const dbRows = status.grid_rows_unlocked || 0
          if (dbRows >= 0) { setGridRowsUnlocked(dbRows); storage.set(CLOUD.gridRowsUnlocked, String(dbRows)) }
          setOwnProfile(prev => ({ ...prev, hasRealPhoto: !!status.has_real_photo }))
          loadInvisibleState(status.invisible_until)
        }).catch(err => console.error('fetchUserUnlockStatus error:', err))
      }

      const savedLat = result[CLOUD.lat]
      const savedLng = result[CLOUD.lng]
      if (savedLat && savedLng) {
        const lat = parseFloat(savedLat)
        const lng = parseFloat(savedLng)
        if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
          loaded.lat = lat; loaded.lng = lng
          setLocationGranted(true)
        }
      }

      if (Object.keys(loaded).length > 0) {
        setOwnProfile(prev => ({ ...prev, ...loaded }))
      }
    })
  }, [])

  // ─── Auto upsert ───────────────────────────────────────────────────
  useEffect(() => {
    const uid = tgUserId.current
    const lat = ownProfile.lat
    const lng = ownProfile.lng
    if (!uid || !lat || !lng || !hasValidKey) return

    upsertUser({
      id: uid, name: ownProfile.name,
      photo_url: ownProfile.tgPhotoUrl || null,
      height: ownProfile.height, weight: ownProfile.weight,
      position: ownProfile.position, is_side: ownProfile.isSide,
      preference1: ownProfile.preference1 || 'Raw',
      preference2: ownProfile.preference2 || 'Party',
      preference3: ownProfile.preference3 || 'Group',
      preference4: ownProfile.preference4 || 'Travel',
      open_to_messages: ownProfile.openToMessages || false,
      tg_username: ownProfile.tgUsername || null,
      lat, lng, is_online: true,
      updated_at: new Date().toISOString(),
      dob: ownProfile.dob || null,
      gender: ownProfile.gender || 'Male',
      seeking_gender: ownProfile.seekingGender || 'Women',
      seeking_today: ownProfile.seekingToday || 'Just Browsing',
      hide_age: ownProfile.hideAge || false,
    }).then(result => {
      if (result && !result.filters_unlocked_expires_at) ensureFilterUnlock(result.id)
    }).catch(err => console.error('Upsert error:', String(err).substring(0, 200)))
  }, [ownProfile.lat, ownProfile.lng, ownProfile.name, ownProfile.tgPhotoUrl, ownProfile.height, ownProfile.weight, ownProfile.position, ownProfile.isSide, ownProfile.preference1, ownProfile.preference2, ownProfile.preference3, ownProfile.preference4, ownProfile.openToMessages, ownProfile.tgUsername, ownProfile.dob, ownProfile.gender, ownProfile.seekingGender, ownProfile.seekingToday, ownProfile.hideAge])

  // ─── Refresh ───────────────────────────────────────────────────────
  const handleRefresh = useCallback(() => {
    const lat = ownProfile.lat
    const lng = ownProfile.lng
    if (!lat || !lng) return
    setIsLoadingUsers(true)
    fetchNearby(lat, lng).then(dbUsers => {
      const myId = tgUserId.current
      const mapped = dbUsers.filter(u => u.id !== myId).map(u => dbToProfile(u, lat, lng))
      const ownIdx = mapped.findIndex(u => u.isOwn)
      if (ownIdx >= 0) {
        mapped[ownIdx] = { ...mapped[ownIdx], isInvisible: isInvisible, invisibleUntil: invisibleUntil || undefined }
      }
      setUsers(mapped)
      setIsLoadingUsers(false)
    }).catch(err => { console.error('Refresh error:', String(err).substring(0, 200)); setIsLoadingUsers(false) })
  }, [ownProfile.lat, ownProfile.lng, isInvisible, invisibleUntil])

  useEffect(() => {
    const lat = ownProfile.lat
    const lng = ownProfile.lng
    if (!lat || !lng) return
    handleRefresh()
    const interval = setInterval(handleRefresh, 300000)
    return () => clearInterval(interval)
  }, [ownProfile.lat, ownProfile.lng, handleRefresh])

  // ─── Location granted ──────────────────────────────────────────────
  const handleLocationGranted = useCallback((lat: number, lng: number) => {
    setLocationGranted(true)
    setIsLoadingUsers(true)
    setOwnProfile(prev => ({ ...prev, lat, lng }))
    storage.set(CLOUD.lat, String(lat))
    storage.set(CLOUD.lng, String(lng))
  }, [])

  // ─── Save profile — locks on save, returns to grid ─────────────────
  const handleSaveProfile = useCallback((updated: UserProfile) => {
    setOwnProfile(updated)
    storage.set(CLOUD.prefLockedAt, String(Date.now()))
    setEditProfileUnlocked(false)
    setView('MAIN')
    const uid = tgUserId.current
    if (uid && updated.lat && updated.lng) {
      upsertUser({
        id: uid, name: updated.name,
        photo_url: updated.tgPhotoUrl || null,
        height: updated.height, weight: updated.weight,
        position: updated.position, is_side: updated.isSide,
        preference1: updated.preference1 || 'Raw',
        preference2: updated.preference2 || 'Party',
        preference3: updated.preference3 || 'Group',
        preference4: updated.preference4 || 'Travel',
        open_to_messages: updated.openToMessages || false,
        tg_username: updated.tgUsername || null,
        lat: updated.lat, lng: updated.lng, is_online: true,
        updated_at: new Date().toISOString(),
        dob: updated.dob || null,
        gender: updated.gender || 'Male',
        seeking_gender: updated.seekingGender || 'Women',
        seeking_today: updated.seekingToday || 'Just Browsing',
        hide_age: updated.hideAge || false,
      }).catch(err => console.error('Profile upsert error:', err))
    }
  }, [])

  // ─── Message handler ──────────────────────────────────────────────
  const handleMessage = useCallback((user: UserProfile) => {
    if (ownProfile.seekingToday === 'Just Browsing') {
      alert('You are in Just Browsing mode. Change your status to send messages.')
      return
    }
    if (user.seekingToday === 'Just Browsing') {
      alert('This user is in Just Browsing mode and not accepting messages.')
      return
    }
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
          if (btnId === 'pay') { setStarsPaidFor(prev => new Set(prev).add(user.id)); handleMessage(user) }
        })
      } else {
        if (confirm(`Send 50 ⭐ to ${user.name} to open chat?`)) {
          setStarsPaidFor(prev => new Set(prev).add(user.id))
          handleMessage(user)
        }
      }
      return
    }
    const tgUrl = `https://t.me/${user.tgUsername || 'LetsMsetNow'}`
    const tg = getTg()
    if (tg?.openTelegramLink) { tg.openTelegramLink(tgUrl); return }
    if (tg?.openLink) { tg.openLink(tgUrl, { try_instant_view: false }); return }
    window.open(tgUrl, '_blank')
  }, [starsPaidFor, ownProfile.seekingToday])

  // ─── Render ───────────────────────────────────────────────────────

  if (showSplash) {
    return (
      <div className="min-h-[100vh] bg-[#0A0A0A] flex items-center justify-center px-6">
        <div className="w-full max-w-[min(520px,100vw)] flex flex-col items-center justify-center gap-5">
          <video src={logoAnim} autoPlay loop muted playsInline onLoadedData={() => setVideoReady(true)} className="w-48 h-48 rounded-full object-cover" />
          <div className="text-center">
            <h1 className="text-2xl font-bold gradient-text tracking-tight">LMN</h1>
            <p className="text-[#8E8E93] text-xs mt-1">Let's Meet Now — Dating App</p>
          </div>
          <p className="text-[#8E8E93]/60 text-[9px] text-center leading-relaxed max-w-[320px]">
            By using this app, you confirm you are 18+. LMN only connects users via Telegram.
            We do not store messages. All chat happens in Telegram. You are responsible for your own safety when meeting others.
          </p>
        </div>
      </div>
    )
  }

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
            <p className="text-[#8E8E93] text-sm mb-1">This app is exclusively for members of</p>
            <p className="text-[#5AC8FA] font-semibold text-sm mb-4">@LetsMsetNow</p>
            <button
              onClick={() => {
                const tg2 = getTg()
                const url = 'https://t.me/LetsMsetNow'
                if (tg2?.openTelegramLink) tg2.openTelegramLink(url)
                else if (tg2?.openLink) tg2.openLink(url)
                else window.open(url, '_blank')
              }}
              className="gradient-btn px-6 py-3 rounded-xl text-white font-semibold text-sm nav-press mb-4"
            >
              {t(lang, 'openInGroup')}
            </button>
          </div>
          <div className="mt-4 flex-1 min-h-0 flex flex-col">
            <p className="text-[#8E8E93] text-[10px] text-center mb-2">{t(lang, 'openFromGroup')}</p>
            <details className="text-left">
              <summary className="text-[#8E8E93] text-[10px] cursor-pointer select-none text-center">{t(lang, 'showDebug')}</summary>
              <pre className="mt-2 p-2 bg-[#1A1A1A] rounded-lg text-[9px] text-[#8E8E93] overflow-auto max-h-48 whitespace-pre-wrap break-all">{raw}</pre>
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
              onPromptUnlock={unlockRow}
              onPromptFilterUnlock={unlockFilters}
              onToggleInvisible={() => { toggleInvisible(); handleRefresh() }}
              gridRowsUnlocked={gridRowsUnlocked}
              channelFollowUnlock={channelFollowUnlock}
              onClaimChannelFollow={claimChannelFollow}
              lastRefreshTime={lastRefreshTime}
              setLastRefreshTime={(t) => { setLastRefreshTime(t); markRefreshed() }}
              isInvisible={isInvisible}
              invisiblePurchased={hasPurchasedInvisible}
              raffle={raffle}
              onBuyRaffleTicket={handleBuyRaffleTicket}
              onStartNextRaffle={handleStartNextRaffle}
              onPromptUnlockProfile={promptUnlockProfile}
              isPremium={isPremium}
            />
          ) : (
            <ProfileView
              user={ownProfile}
              lang={lang}
              logoUrl={logoImg}
              onSave={handleSaveProfile}
              onBack={() => setView('MAIN')}
              editProfileUnlocked={isAdmin || editProfileUnlocked}
            />
          )}
          {photoOverlay && (
            <ProfileView
              user={photoOverlay}
              lang={lang}
              logoUrl={logoImg}
              onClose={() => setPhotoOverlay(null)}
              onMessage={handleMessage}
              ownProfile={ownProfile}
            />
          )}
          {adminAction === 'release' && (
            <div className="fixed top-0 left-0 right-0 bottom-0 z-[70] bg-black/70 flex items-center justify-center" onClick={() => setAdminAction(null)}>
              <div className="bg-[#1C1C1E] rounded-xl p-5 w-64 space-y-3" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-base font-bold text-white text-center">🔓 Release Profile Lock</h3>
                <p className="text-xs text-[#8E8E93] text-center">Release your own 30-day preference lock:</p>
                <button onClick={releaseLock} className="w-full py-2.5 rounded-lg bg-[#2C2C2E] text-white text-sm font-bold nav-press">Release My Lock</button>
                <button onClick={() => setAdminAction(null)} className="w-full py-1.5 text-[10px] text-[#8E8E93]">Cancel</button>
              </div>
            </div>
          )}
          {view === 'MAIN' && (
            <BottomNav
              lang={lang}
              cooldownRemaining={Math.max(0, 60000 - (Date.now() - lastFlyingSendRef.current))}
              onSend={(text) => {
                if (Date.now() - lastFlyingSendRef.current < 60000) return
                lastFlyingSendRef.current = Date.now()
                const top = 10 + Math.random() * 80
                const prefixed = `@${ownProfile.tgUsername || ownProfile.name || 'User'} said: ${text}`
                setFlyingMessages(prev => [...prev, { id: Date.now(), text: prefixed, top: `${top}vh` }])
                insertFlyingMessage({
                  text,
                  username: ownProfile.tgUsername || ownProfile.name || 'User',
                  user_id: tgUserId.current || 0,
                  top_percent: Math.round(top),
                })
              }}
              groupChatUrl={GROUP_CHAT_URL}
              referShareUrl="https://t.me/share/url?url=https://t.me/LetsMeetNow?startapp&text=Check%20out%20LMN%20-%20Lets%20Meet%20Now!"
              walletUrl="https://t.me/wallet"
            />
          )}
        </div>
      </div>
    </>
  )
}
