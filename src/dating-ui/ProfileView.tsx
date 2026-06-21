import { useState, useEffect, useRef, useCallback } from 'react'
import { X, ArrowLeft, MapPin, MessageCircle } from 'lucide-react'
import type { Lang } from '@dating/core/i18n'
import { t, getTimeAgo, formatDist, isUserActive, getZodiac, getZodiacEmoji } from '@dating/core'

export interface ProfileViewUser {
  id: string | number
  name: string
  tgPhotoUrl: string
  tgPhotos?: string[]
  distance: number
  updatedAt: string
  age: number
  gender?: string
  seekingGender?: string
  seekingToday?: string
  meetupType?: string
  openToMessages?: boolean
  height?: number
  weight?: number
  dob?: string
  hideAge?: boolean
  isOwn?: boolean
  isInvisible?: boolean
  isOnline?: boolean
  [key: string]: unknown
}

interface ProfileViewProps {
  user: any
  lang: Lang
  logoUrl?: string
  onClose?: () => void
  onMessage?: (user: any) => void
  ownProfile?: any
  onSave?: (updated: any) => void
  onBack?: () => void
  editProfileUnlocked?: boolean
}

export function ProfileView({
  user,
  lang,
  logoUrl,
  onClose,
  onMessage,
  ownProfile,
  onSave,
  onBack,
  editProfileUnlocked = false,
}: ProfileViewProps) {
  const isEdit = !!onSave && user.isOwn === true && editProfileUnlocked

  // Photo carousel state
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeIdx, setActiveIdx] = useState(0)
  const [imgStates, setImgStates] = useState<{ loaded: boolean; failed: boolean }[]>([])

  // Edit mode state
  const [draft, setDraft] = useState<ProfileViewUser>({ ...user })
  const [saved, setSaved] = useState(false)

  // Sync draft when user changes
  useEffect(() => {
    setDraft({ ...user })
  }, [user.id])

  // Photo handling - always show first Telegram profile photo
  const firstPhoto = isEdit
    ? (draft.tgPhotoUrl?.trim()?.startsWith('http') ? draft.tgPhotoUrl : '')
    : (user.tgPhotoUrl?.trim()?.startsWith('http') ? user.tgPhotoUrl : '')

  const allPhotos = isEdit
    ? (draft.tgPhotos?.length ? [firstPhoto, ...draft.tgPhotos.filter((p: string) => p !== firstPhoto)] : (firstPhoto ? [firstPhoto] : []))
    : (user.tgPhotos?.length ? [firstPhoto, ...user.tgPhotos.filter((p: string) => p !== firstPhoto)] : (firstPhoto ? [firstPhoto] : []))

  const displayPhotos = allPhotos.length > 0 ? allPhotos : (logoUrl ? [logoUrl] : [])

  useEffect(() => {
    setImgStates(displayPhotos.map(() => ({ loaded: false, failed: false })))
    setActiveIdx(0)
  }, [displayPhotos.join(',')])

  const handleScroll = () => {
    if (!scrollRef.current) return
    setActiveIdx(Math.round(scrollRef.current.scrollLeft / scrollRef.current.clientWidth))
  }

  const updateDraft = useCallback((field: keyof ProfileViewUser, value: unknown) => {
    setDraft(prev => ({ ...prev, [field]: value }))
    setSaved(false)
  }, [])

  const handleSave = () => {
    if (!onSave) return
    if (!draft.height || draft.height <= 0 || !draft.weight || draft.weight <= 0) {
      alert('Please enter height and weight')
      return
    }
    if (!draft.dob) {
      alert('Please enter date of birth')
      return
    }
    onSave(draft)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // ─── Age + Zodiac display (view mode) ──────────────────────────────
  const showAge = user.age && !user.hideAge
  const zodiacSign = user.dob ? getZodiac(user.dob) : null
  const zodiacEmoji = zodiacSign ? getZodiacEmoji(zodiacSign) : null

  // ─── Shared Photo Section ──────────────────────────────────────────
  const PhotoSection = ({ size = 'large' }: { size?: 'large' | 'small' }) => (
    <div className={size === 'large' ? 'flex-1 flex items-center relative' : 'relative w-full aspect-square bg-[#1A1A1A] overflow-hidden flex-shrink-0'}>
      {displayPhotos.length > 0 ? (
        <>
          <div ref={scrollRef} onScroll={handleScroll} className={size === 'large' ? 'w-full h-full flex overflow-x-auto snap-x snap-mandatory scrollbar-hide' : 'w-full h-full'}>
            {displayPhotos.map((photo: string, i: number) => (
              <div key={i} className={size === 'large' ? 'w-full h-full flex-shrink-0 snap-center flex items-center justify-center relative' : 'w-full h-full flex items-center justify-center relative'}>
                {!imgStates[i]?.failed && (
                  <img
                    src={photo}
                    alt={`${user.name} ${i + 1}`}
                    className={size === 'large'
                      ? `max-w-full max-h-[65vh] object-contain transition-opacity duration-300 ${imgStates[i]?.loaded ? 'opacity-100' : 'opacity-0'}`
                      : `absolute inset-0 w-full h-full object-cover z-10 transition-opacity duration-300 ${imgStates[i]?.loaded ? 'opacity-100' : 'opacity-0'}`
                    }
                    draggable={false}
                    loading="eager"
                    decoding="async"
                    onLoad={() => setImgStates(prev => { const next = [...prev]; next[i] = { ...next[i], loaded: true }; return next })}
                    onError={() => setImgStates(prev => { const next = [...prev]; next[i] = { ...next[i], failed: true }; return next })}
                  />
                )}
                {(!imgStates[i]?.loaded || imgStates[i]?.failed) && (
                  <div className={size === 'large' ? 'absolute inset-0 flex items-center justify-center' : 'absolute inset-0 flex items-center justify-center z-0'}>
                    <div className={size === 'large' ? 'w-32 h-32 rounded-full bg-[#1A1A1A] flex items-center justify-center' : 'w-20 h-20 rounded-full bg-gradient-to-b from-[#2C2C2E] to-[#1A1A1A] flex items-center justify-center'}>
                      <span className={`font-bold text-[#8E8E93] ${size === 'large' ? 'text-4xl' : 'text-2xl'}`}>{user.name.charAt(0)}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          {displayPhotos.length > 1 && (
            <div className={`absolute bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-full z-20 ${size === 'large' ? 'top-4 left-4' : 'top-2 right-2'}`}>
              <span className="text-white text-xs font-medium">{activeIdx + 1} / {displayPhotos.length}</span>
            </div>
          )}
        </>
      ) : (
        <div className={size === 'large' ? 'w-full flex items-center justify-center' : 'w-full h-full flex items-center justify-center'}>
          <div className={size === 'large' ? 'w-32 h-32 rounded-full bg-[#1A1A1A] flex items-center justify-center' : 'w-20 h-20 rounded-full bg-gradient-to-b from-[#2C2C2E] to-[#1A1A1A] flex items-center justify-center'}>
            <span className={`font-bold text-[#8E8E93] ${size === 'large' ? 'text-4xl' : 'text-2xl'}`}>{user.name.charAt(0)}</span>
          </div>
        </div>
      )}

      {/* Dot indicators */}
      {displayPhotos.length > 1 && size === 'large' && (
        <div className="flex justify-center gap-1.5 pb-3 absolute bottom-4 left-0 right-0">
          {displayPhotos.map((_p: string, i: number) => (
            <div key={i} className={`h-1.5 rounded-full transition-all duration-200 ${i === activeIdx ? 'w-4 bg-[var(--app-primary)]' : 'w-1.5 bg-[#8E8E93]/40'}`} />
          ))}
        </div>
      )}
    </div>
  )

  // ─── Stats Row (view mode, above the line) ─────────────────────────
  const StatsRow = () => (
    <div className="flex gap-3 mt-3 text-xs flex-wrap items-center">
      {/* Age (if not hidden) + Zodiac */}
      {showAge && (
        <span className="text-white font-bold">{user.age} years</span>
      )}
      {zodiacSign && (
        <span className="text-purple-400 font-bold">{zodiacEmoji} {zodiacSign}</span>
      )}
      {user.gender && (
        <span className={`font-bold ${user.gender === 'Male' ? 'text-blue-400' : 'text-pink-400'}`}>
          {user.gender === 'Male' ? '♂ Man' : '♀ Woman'}
        </span>
      )}
      {user.seekingGender && (
        <span className="text-[#8E8E93]">seeking {user.seekingGender === 'Men' ? '♂ Men' : user.seekingGender === 'Women' ? '♀ Women' : '⚤ Both'}</span>
      )}
      {/* Divider */}
      {(showAge || zodiacSign || user.gender) && (user.height || user.weight) && (
        <span className="text-[#2C2C2E]">|</span>
      )}
      {/* Height & Weight */}
      {user.height ? <span className="text-[#8E8E93]">{user.height}cm</span> : null}
      {user.weight ? <span className="text-[#8E8E93]">{user.weight}kg</span> : null}
      {/* Other stats */}
      {user.seekingToday ? <span className="text-green-400 font-bold">{user.seekingToday}</span> : null}
      {user.meetupType ? <span className="text-cyan-400 font-bold">{user.meetupType}</span> : null}
      {user.openToMessages ? <span className="font-bold text-yellow-400">⭐ {t(lang, 'message')}</span> : null}
    </div>
  )

  // ─── EDIT MODE ─────────────────────────────────────────────────────
  if (isEdit) {
    const heShe = draft.gender === 'Female' ? 'woman' : 'man'
    const seekingLabel = draft.seekingGender === 'Women' ? 'woman' : draft.seekingGender === 'Men' ? 'man' : 'man or woman'

    return (
      <div className="view-enter h-full flex flex-col">
        {/* Header */}
        <div className="shrink-0 bg-[#0A0A0A]/95 backdrop-blur-md border-b border-[#2C2C2E] px-3 py-2.5 flex items-center justify-between z-10">
          <button onClick={onBack} className="w-8 h-8 rounded-full bg-[#1A1A1A] flex items-center justify-center nav-press">
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          <h2 className="text-base font-semibold text-white">{t(lang, 'editProfile')}</h2>
          <div className="w-8" />
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {/* Photo */}
          <PhotoSection size="small" />

          {/* Form fields */}
          <div className="px-4 py-4 space-y-4">

            {/* "I'm a [man/woman] seeking [man/woman]" */}
            <div className="bg-[#1A1A1A] border border-[#2C2C2E] rounded-lg p-3">
              <p className="text-white text-sm mb-2">
                I'm a{' '}
                <select
                  value={draft.gender || 'Male'}
                  onChange={e => updateDraft('gender', e.target.value)}
                  className="bg-[#2C2C2E] border border-[#3A3A3C] rounded px-2 py-1 text-white text-sm inline-block w-28"
                >
                  <option value="Male">man</option>
                  <option value="Female">woman</option>
                </select>
                {' '}seeking{' '}
                <select
                  value={draft.seekingGender || 'Women'}
                  onChange={e => updateDraft('seekingGender', e.target.value)}
                  className="bg-[#2C2C2E] border border-[#3A3A3C] rounded px-2 py-1 text-white text-sm inline-block w-36"
                >
                  <option value="Men">a man</option>
                  <option value="Women">a woman</option>
                  <option value="Both">men or women</option>
                </select>
              </p>
            </div>

            {/* DOB + Hide Age (same line) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-[#8E8E93] font-medium uppercase">{t(lang, 'dateOfBirth')}</span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!draft.hideAge}
                    onChange={e => updateDraft('hideAge', e.target.checked)}
                    className="w-3.5 h-3.5 rounded accent-[var(--app-primary)]"
                  />
                  <span className="text-xs text-[#8E8E93]">Hide Age</span>
                </label>
              </div>
              <input
                type="date"
                value={draft.dob || ''}
                onChange={e => updateDraft('dob', e.target.value)}
                className="w-full h-10 bg-[#1A1A1A] border border-[#2C2C2E] rounded-lg px-3 text-white text-sm [color-scheme:dark]"
              />
            </div>

            {/* Height & Weight */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel label={t(lang, 'height') + ' (cm)'} />
                <input type="number" value={draft.height || ''} onChange={e => updateDraft('height', Number(e.target.value))} className="w-full h-10 bg-[#1A1A1A] border border-[#2C2C2E] rounded-lg px-3 text-white text-sm" />
              </div>
              <div>
                <FieldLabel label={t(lang, 'weight') + ' (kg)'} />
                <input type="number" value={draft.weight || ''} onChange={e => updateDraft('weight', Number(e.target.value))} className="w-full h-10 bg-[#1A1A1A] border border-[#2C2C2E] rounded-lg px-3 text-white text-sm" />
              </div>
            </div>

            {/* Seeking Today */}
            <div>
              <FieldLabel label={t(lang, 'seekingToday')} />
              <select value={draft.seekingToday || 'Just Browsing'} onChange={e => updateDraft('seekingToday', e.target.value)} className="w-full h-10 bg-[#1A1A1A] border border-[#2C2C2E] rounded-lg px-3 text-white text-sm">
                <option value="Just Browsing">Just Browsing</option>
                <option value="Date">Date</option>
                <option value="Meetup">Meetup</option>
                <option value="NSA">NSA</option>
              </select>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="shrink-0 px-4 py-3 border-t border-[#2C2C2E] bg-[#0A0A0A]">
          <button onClick={handleSave} className="w-full h-12 gradient-btn rounded-xl text-white font-semibold text-sm nav-press">
            {saved ? '✓ Saved' : t(lang, 'save')}
          </button>
        </div>
      </div>
    )
  }

  // ─── VIEW MODE ─────────────────────────────────────────────────────
  return (
    <div className="fixed top-0 left-0 right-0 bottom-0 z-[60] bg-black/95 flex flex-col animate-in fade-in duration-200" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
      {/* Close button */}
      <button onClick={onClose} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-[#1A1A1A]/80 flex items-center justify-center z-20 nav-press">
        <X className="w-5 h-5 text-white" />
      </button>

      {/* Photo carousel */}
      <PhotoSection size="large" />

      {/* Profile info */}
      <div className="w-full px-4 pb-4 pt-2">
        <div className="flex items-center justify-between">
          <div>
            {/* Name + Age (if not hidden) */}
            <p className="text-white font-bold text-lg">
              {user.name}{showAge ? `, ${user.age}` : ''}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-[var(--app-primary)]" />
              <span className="text-[#8E8E93] text-xs">{formatDist(user.distance)}</span>
              {isUserActive(user) && <span className="ml-2 px-1.5 py-0.5 bg-[#00D4AA]/20 text-[#00D4AA] text-[10px] font-bold rounded-full">{t(lang, 'online').toUpperCase()}</span>}
            </div>
          </div>
          {/* Message button — only for others */}
          {!user.isOwn && ownProfile?.seekingToday !== 'Just Browsing' && user.seekingToday !== 'Just Browsing' && onMessage && (
            <button onClick={() => onMessage(user)} className="h-10 gradient-btn rounded-xl text-white font-semibold text-sm nav-press flex items-center gap-2 px-5">
              <MessageCircle className="w-4 h-4" />
              {user.openToMessages ? '⭐ ' + t(lang, 'message') : t(lang, 'message')}
            </button>
          )}
        </div>
        <StatsRow />
      </div>
    </div>
  )
}

// ─── Helper ──────────────────────────────────────────────────────────

function FieldLabel({ label }: { label: string }) {
  return (
    <span className="text-xs text-[#8E8E93] font-medium uppercase block mb-1.5">
      {label}
    </span>
  )
}
