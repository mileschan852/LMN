import { useEffect, useRef } from 'react'
import { getTg } from '../utils'

export interface PhotoInitResult {
  photoUrl: string
  hasPhoto: boolean
}

/**
 * Shared hook: Extracts the user's Telegram profile photo on app start.
 * Returns the photo URL and a boolean indicating if a photo was found.
 * Apps should save the photo URL to their own storage.
 * 
 * Usage:
 *   const { photoUrl, hasPhoto } = usePhotoInit()
 *   useEffect(() => {
 *     if (photoUrl) {
 *       storage.set(CLOUD.photoUrl, photoUrl)
 *       setOwnProfile(prev => ({ ...prev, tgPhotoUrl: photoUrl, hasPhoto, hasRealPhoto: true }))
 *     }
 *   }, [photoUrl])
 */
export function usePhotoInit(): PhotoInitResult {
  const resultRef = useRef<PhotoInitResult>({ photoUrl: '', hasPhoto: false })

  useEffect(() => {
    const tg = getTg()
    if (!tg) return

    const user = tg.initDataUnsafe?.user
    if (!user) return

    const photoUrl = user.photo_url || ''
    resultRef.current = {
      photoUrl,
      hasPhoto: !!photoUrl && photoUrl.startsWith('http'),
    }
  }, [])

  return resultRef.current
}
