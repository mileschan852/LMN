// ─── Profile Draft Hook ──────────────────────────────────────────────
// Shared state management for OwnProfileScreen — eliminates ~30 lines
// of duplicated useState/useEffect/useCallback per app.
//
// Usage:
//   const { draft, setDraft, saved, setSaved, photoIndex, setPhotoIndex,
//           photoLoaded, setPhotoLoaded, updateDraft } = useProfileDraft(profile)

import { useState, useEffect, useCallback } from 'react'
import type { UserProfile } from './types'

export interface UseProfileDraftResult {
  draft: UserProfile
  setDraft: React.Dispatch<React.SetStateAction<UserProfile>>
  saved: boolean
  setSaved: React.Dispatch<React.SetStateAction<boolean>>
  photoIndex: number
  setPhotoIndex: React.Dispatch<React.SetStateAction<number>>
  photoLoaded: boolean
  setPhotoLoaded: React.Dispatch<React.SetStateAction<boolean>>
  updateDraft: (field: keyof UserProfile, value: unknown) => void
}

export function useProfileDraft(profile: UserProfile): UseProfileDraftResult {
  const [draft, setDraft] = useState<UserProfile>({ ...profile })
  const [saved, setSaved] = useState(false)
  const [photoIndex, setPhotoIndex] = useState(0)
  const [photoLoaded, setPhotoLoaded] = useState(false)

  // Sync when profile identity changes
  useEffect(() => {
    setDraft({ ...profile })
  }, [profile.id])

  // Sync photo updates from profile without resetting entire draft
  useEffect(() => {
    setDraft(prev => ({
      ...prev,
      tgPhotoUrl: profile.tgPhotoUrl,
      tgPhotos: profile.tgPhotos,
    }))
  }, [profile.tgPhotoUrl, profile.tgPhotos])

  // Reset photo state when photo URL changes
  useEffect(() => {
    setPhotoLoaded(false)
    setPhotoIndex(0)
  }, [draft.tgPhotoUrl])

  const updateDraft = useCallback(
    (field: keyof UserProfile, value: unknown) => {
      setDraft(prev => ({ ...prev, [field]: value }))
      setSaved(false)
    },
    [],
  )

  return {
    draft,
    setDraft,
    saved,
    setSaved,
    photoIndex,
    setPhotoIndex,
    photoLoaded,
    setPhotoLoaded,
    updateDraft,
  }
}
