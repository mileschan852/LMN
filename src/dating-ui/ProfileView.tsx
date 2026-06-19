import { useState, useEffect, useRef, useCallback } from 'react'
import { X, ArrowLeft, MapPin, Lock, MessageCircle } from 'lucide-react'
import type { Lang } from 'dating-core/i18n'
import { t, getTimeAgo, formatDist, isUserActive, getZodiac, getZodiacEmoji } from 'dating-core'

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
  [key: string]: unknown  // Allow any additional fields from app-specific types
}

interface ProfileViewProps {
  user: any  // App-specific user type - passed through without validation
  lang: Lang
  logoUrl?: string
  // View mode (others or locked own)
  onClose?: () => void
  onMessage?: (user: any) => void
  ownProfile?: any
  // Edit mode (own, unlocked)
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

  // Photo handling
  const photos = isEdit
    ? (draft.tgPhotos?.length ? draft.tgPhotos : (draft.tgPhotoUrl?.trim()?.startsWith('http') ? [draft.tgPhotoUrl] : []))
    : (user.tgPhotos?.length ? user.tgPhotos : (user.tgPhotoUrl?.trim()?.startsWith('http') ? [user.tgPhotoUrl] : []))

  const displayPhotos = photos.length > 0 ? photos : (logoUrl ? [logoUrl] : [])

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

  // Stats display (shared between view and edit)
  const StatsRow = () => (
    <div className="flex gap-3 mt-3 text-xs flex-wrap">
      {user.height ? <span className="text-[#8E8E93]">{user.height}cm</span> : null}
      {user.weight ? <span className="text-[#8E8E93]">{user.weight}kg</span> : null}
      {user.gender ? <span className={`font-bold ${user.gender === 'Male' ? 'text-blue-400' : 'text-pink-400'}`}>{user.gender}</span> : null}
      {user.seekingGender ? <span className="text-[#8E8E93]">→ {user.seekingGender}</span> : null}
      {user.dob ? <span className="text-purple-400 font-bold">{getZodiacEmoji(getZodiac(user.dob))} {getZodiac(user.dob)}</span> : null}
      {user.seekingToday ? <span className="text-green-400 font-bold">{user.seekingToday}</span> : null}
      {user.meetupType ? <span className="text-cyan-400 font-bold">{user.meetupType}</span> : null}
      {user.openToMessages ? <span className="font-bold text-yellow-400">⭐ {t(lang, 'message')}</span> : null}
    </div>
  )

  // ─── EDIT MODE ─────────────────────────────────────────────────────
  if (isEdit) {
    const currentPhoto = displayPhotos[activeIdx] || logoUrl
    const isValidPhoto = currentPhoto?.startsWith('http') || currentPhoto === logoUrl

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
          <div className="relative w-full aspect-square bg-[#1A1A1A] overflow-hidden flex-shrink-0">
            {isValidPhoto && (
              <img
                src={currentPhoto}
                alt="You"
                className="absolute inset-0 w-full h-full object-cover z-10"
                draggable={false}
                loading="eager"
                decoding="async"
              />
            )}
            {(!isValidPhoto) && (
              <div className="absolute inset-0 flex items-center justify-center z-0">
                <div className="w-20 h-20 rounded-full bg-gradient-to-b from-[#2C2C2E] to-[#1A1A1A] flex items-center justify-center">
                  <span className="text-2xl font-bold text-[#8E8E93]">{draft.name.charAt(0)}</span>
                </div>
              </div>
            )}
            {displayPhotos.length > 1 && (
              <div className="absolute top-2 right-2 bg-black/60 rounded-full px-1.5 py-0.5 z-20">
                <span className="text-white text-[10px] font-bold">{activeIdx + 1}/{displayPhotos.length}</span>
              </div>
            )}
          </div>

          {/* Form fields */}
          <div className="px-4 py-4 space-y-4">
            {/* Gender */}
            <div>
              <FieldLabel label={t(lang, 'gender')} />
              <select value={draft.gender || 'Male'} onChange={e => updateDraft('gender', e.target.value)} className="w-full h-10 bg-[#1A1A1A] border border-[#2C2C2E] rounded-lg px-3 text-white text-sm">
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>

            {/* Seeking */}
            <div>
              <FieldLabel label={t(lang, 'seeking')} />
              <select value={draft.seekingGender || 'Women'} onChange={e => updateDraft('seekingGender', e.target.value)} className="w-full h-10 bg-[#1A1A1A] border border-[#2C2C2E] rounded-lg px-3 text-white text-sm">
                <option value="Men">Men</option>
                <option value="Women">Women</option>
                <option value="Both">Both</option>
              </select>
            </div>

            {/* DOB */}
            <div>
              <FieldLabel label={t(lang, 'dateOfBirth')} />
              <input type="date" value={draft.dob || ''} onChange={e => updateDraft('dob', e.target.value)} className="w-full h-10 bg-[#1A1A1A] border border-[#2C2C2E] rounded-lg px-3 text-white text-sm [color-scheme:dark]" />
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
      <div className="flex-1 flex items-center relative">
        {displayPhotos.length > 0 ? (
          <>
            <div ref={scrollRef} onScroll={handleScroll} className="w-full h-full flex overflow-x-auto snap-x snap-mandatory scrollbar-hide">
              {displayPhotos.map((photo, i) => (
                <div key={i} className="w-full h-full flex-shrink-0 snap-center flex items-center justify-center relative">
                  {!imgStates[i]?.failed && (
                    <img
                      src={photo}
                      alt={`${user.name} ${i + 1}`}
                      className={`max-w-full max-h-[65vh] object-contain transition-opacity duration-300 ${imgStates[i]?.loaded ? 'opacity-100' : 'opacity-0'}`}
                      draggable={false}
                      onLoad={() => setImgStates(prev => { const next = [...prev]; next[i] = { ...next[i], loaded: true }; return next })}
                      onError={() => setImgStates(prev => { const next = [...prev]; next[i] = { ...next[i], failed: true }; return next })}
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
            {displayPhotos.length > 1 && (
              <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-full">
                <span className="text-white text-xs font-medium">{activeIdx + 1} / {displayPhotos.length}</span>
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

      {/* Dot indicators */}
      {displayPhotos.length > 1 && (
        <div className="flex justify-center gap-1.5 pb-3">
          {displayPhotos.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all duration-200 ${i === activeIdx ? 'w-4 bg-[var(--app-primary)]' : 'w-1.5 bg-[#8E8E93]/40'}`} />
          ))}
        </div>
      )}

      {/* Profile info */}
      <div className="w-full px-4 pb-4 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-bold text-lg">{user.age ? `${user.name}, ${user.age}` : user.name}</p>
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

function FieldLabel({ label, locked }: { label: string; locked?: boolean }) {
  return (
    <span className="text-xs text-[#8E8E93] font-medium uppercase block mb-1.5 flex items-center gap-1">
      {label}
      {locked && <Lock className="w-3 h-3 text-[var(--app-primary)]" />}
    </span>
  )
}
