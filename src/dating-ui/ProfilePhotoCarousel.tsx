import { useState, useEffect, useRef } from 'react'

interface ProfilePhotoCarouselProps {
  name: string
  photos: string[]
  logoUrl?: string
  editable?: boolean
  onPhotoClick?: () => void
  size?: 'small' | 'large'
}

/**
 * Shared photo carousel for profile views.
 * Shows photos with carousel dots, falls back to initial placeholder.
 * Used by both PhotoOverlay (other users) and OwnProfileScreen (self).
 */
export function ProfilePhotoCarousel({
  name,
  photos,
  logoUrl,
  editable = false,
  onPhotoClick,
  size = 'large',
}: ProfilePhotoCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeIdx, setActiveIdx] = useState(0)
  const [imgStates, setImgStates] = useState<{ loaded: boolean; failed: boolean }[]>([])

  // Filter valid photos, fallback to logo if none
  const validPhotos = photos.filter(p => p?.startsWith('http'))
  const displayPhotos = validPhotos.length > 0 ? validPhotos : (logoUrl ? [logoUrl] : [])
  const hasPhotos = displayPhotos.length > 0

  useEffect(() => {
    setImgStates(displayPhotos.map(() => ({ loaded: false, failed: false })))
    setActiveIdx(0)
  }, [displayPhotos.join(',')])

  const handleScroll = () => {
    if (!scrollRef.current) return
    setActiveIdx(Math.round(scrollRef.current.scrollLeft / scrollRef.current.clientWidth))
  }

  const containerClass = size === 'large'
    ? 'w-full h-full flex-shrink-0 snap-center flex items-center justify-center relative'
    : 'relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-b from-[#2C2C2E] to-[#1A1A1A]'

  const imgClass = size === 'large'
    ? 'max-w-full max-h-[65vh] object-contain transition-opacity duration-300'
    : 'absolute inset-0 w-full h-full object-cover z-10 transition-opacity duration-300 active:opacity-70'

  const placeholderClass = size === 'large'
    ? 'w-32 h-32 rounded-full bg-[#1A1A1A] flex items-center justify-center'
    : 'absolute inset-0 flex items-center justify-center z-0'

  const placeholderText = size === 'large' ? 'text-4xl' : 'text-2xl'

  return (
    <div className={size === 'large' ? 'flex-1 flex items-center relative' : ''}>
      {hasPhotos ? (
        <>
          <div
            ref={scrollRef}
            onScroll={size === 'large' ? handleScroll : undefined}
            className={size === 'large' ? 'w-full h-full flex overflow-x-auto snap-x snap-mandatory scrollbar-hide' : 'w-full h-full'}
            style={size === 'small' ? {} : undefined}
          >
            {displayPhotos.map((photo, i) => (
              <div key={i} className={containerClass} onClick={editable ? onPhotoClick : undefined}>
                {!imgStates[i]?.failed && (
                  <img
                    src={photo}
                    alt={`${name} ${i + 1}`}
                    className={`${imgClass} ${imgStates[i]?.loaded ? 'opacity-100' : 'opacity-0'}`}
                    draggable={false}
                    loading="eager"
                    decoding="async"
                    onLoad={() => setImgStates(prev => {
                      const next = [...prev]; next[i] = { ...next[i], loaded: true }; return next
                    })}
                    onError={() => setImgStates(prev => {
                      const next = [...prev]; next[i] = { ...next[i], failed: true }; return next
                    })}
                  />
                )}
                {(!imgStates[i]?.loaded || imgStates[i]?.failed) && (
                  <div className={size === 'large' ? 'absolute inset-0 flex items-center justify-center' : ''}>
                    <div className={placeholderClass}>
                      <span className={`font-bold text-[#8E8E93] ${placeholderText}`}>{name.charAt(0)}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Photo counter */}
          {displayPhotos.length > 1 && size === 'large' && (
            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-full">
              <span className="text-white text-xs font-medium">{activeIdx + 1} / {displayPhotos.length}</span>
            </div>
          )}
          {displayPhotos.length > 1 && size === 'small' && (
            <div className="absolute top-0.5 right-0.5 bg-black/60 rounded-full px-1 py-0 z-20">
              <span className="text-white text-[8px] font-bold">{activeIdx + 1}/{displayPhotos.length}</span>
            </div>
          )}
        </>
      ) : (
        <div className={size === 'large' ? 'w-full flex items-center justify-center' : 'w-full h-full'}>
          <div className={placeholderClass}>
            <span className={`font-bold text-[#8E8E93] ${placeholderText}`}>{name.charAt(0)}</span>
          </div>
        </div>
      )}

      {/* Dot indicators */}
      {displayPhotos.length > 1 && size === 'large' && (
        <div className="flex justify-center gap-1.5 pb-3">
          {displayPhotos.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all duration-200 ${i === activeIdx ? 'w-4 bg-[var(--app-primary)]' : 'w-1.5 bg-[#8E8E93]/40'}`} />
          ))}
        </div>
      )}
    </div>
  )
}
