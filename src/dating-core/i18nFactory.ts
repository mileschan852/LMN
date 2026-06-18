// ─── i18n Factory ────────────────────────────────────────────────────
// Eliminates the boilerplate every app repeats for app-specific overrides.
//
// Before (every app):
//   export type { Lang } from 'dating-core/i18n'
//   export { getLangLabel } from 'dating-core/i18n'
//   import { t as coreT, mergeDict, type Lang } from './i18n'
//   const OVERRIDES = { en: { title: '...', ... }, tc: { ... } }
//   export function t(lang: Lang, key: string): string { return coreT(lang, key, OVERRIDES) }
//
// After:
//   export const { t, getDict, tPref, tZodiac, tRole } = createAppT(OVERRIDES)

import { t as coreT, mergeDict, type Lang } from './i18n'

export interface AppTResult {
  t: (lang: Lang, key: string) => string
  getDict: (lang: Lang) => Record<string, string>
  tPref: (lang: Lang, value: string) => string
  tZodiac: (_lang: Lang, sign: string) => string
  tRole: (_lang: Lang, role: string) => string
}

export function createAppT(
  overrides: Partial<Record<Lang, Record<string, string>>>,
  prefKeyMap?: Record<string, string>,
): AppTResult {
  function t(lang: Lang, key: string): string {
    return coreT(lang, key, overrides)
  }

  function getDict(lang: Lang): Record<string, string> {
    return mergeDict(lang, overrides)
  }

  // Default preference mapping
  const defaultPrefMap: Record<string, string> = {
    Safe: 'safe',
    Raw: 'raw',
    Clean: 'clean',
    Party: 'party',
    'Party✓': 'partyCheck',
    '1on1': 'oneOnOne',
    Group: 'group',
    Host: 'host',
    Travel: 'travel',
    Outdoor: 'outdoor',
    Sauna: 'sauna',
    All: 'all',
  }

  const pMap = prefKeyMap || defaultPrefMap

  function tPref(lang: Lang, value: string): string {
    const key = pMap[value]
    if (!key) return value
    return t(lang, key)
  }

  function tZodiac(_lang: Lang, sign: string): string {
    return sign
  }

  function tRole(_lang: Lang, role: string): string {
    return role
  }

  return { t, getDict, tPref, tZodiac, tRole }
}
