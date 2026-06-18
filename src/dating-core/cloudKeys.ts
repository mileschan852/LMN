// ─── Storage Key Factory ─────────────────────────────────────────────
// Generates the standard CLOUD key map used by every dating app.
// Usage: const CLOUD = createCloudKeys('hk')  →  { age: 'hk_age', ... }

export interface CloudKeyMap {
  age: string
  dob: string
  hideAge: string
  height: string
  weight: string
  position: string
  isSide: string
  pref1: string
  pref2: string
  pref3: string
  pref4: string
  openMsg: string
  lat: string
  lng: string
  photoUrl: string
  name: string
  lang: string
  prefChangedAt: string
  prefLockedAt: string
  filtersUnlocked: string
  filtersUnlockedAt: string
  gridRowsUnlocked: string
  gridRowsUnlockedAt: string
  invisibleActive: string
  channelFollowed: string
  seekingTodayChangedAt: string
}

export function createCloudKeys(prefix: string): CloudKeyMap {
  return {
    age: `${prefix}_age`,
    dob: `${prefix}_dob`,
    hideAge: `${prefix}_hide_age`,
    height: `${prefix}_height`,
    weight: `${prefix}_weight`,
    position: `${prefix}_position`,
    isSide: `${prefix}_isSide`,
    pref1: `${prefix}_pref1`,
    pref2: `${prefix}_pref2`,
    pref3: `${prefix}_pref3`,
    pref4: `${prefix}_pref4`,
    openMsg: `${prefix}_open_msg`,
    lat: `${prefix}_lat`,
    lng: `${prefix}_lng`,
    photoUrl: `${prefix}_photo_url`,
    name: `${prefix}_name`,
    lang: `${prefix}_lang`,
    prefChangedAt: `${prefix}_pref_changed_at`,
    prefLockedAt: `${prefix}_pref_locked_at`,
    filtersUnlocked: `${prefix}_filters_unlocked`,
    filtersUnlockedAt: `${prefix}_filters_unlocked_at`,
    gridRowsUnlocked: `${prefix}_grid_rows_unlocked`,
    gridRowsUnlockedAt: `${prefix}_grid_rows_unlocked_at`,
    invisibleActive: `${prefix}_invisible_active`,
    channelFollowed: `${prefix}_channel_followed`,
    seekingTodayChangedAt: `${prefix}_seek_today_at`,
  }
}
