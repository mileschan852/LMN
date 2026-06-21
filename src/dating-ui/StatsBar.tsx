import { type Lang } from '@dating/core'

// Core version — bump this in dating-core when shared code changes
export const CORE_VERSION = '18'

// Build version — injected by CI at build time via vite.define
// Falls back to 'dev' for local development
declare const __APP_VERSION__: string
const BUILD_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev'

export interface StatsBarProps {
  lang: Lang
  isPremium: boolean
  gridRowsUnlocked: number
  channelFollowUnlock: number
  hasRealPhoto?: boolean
  appVersion: string   // e.g. "1L" or "1H"
  children?: React.ReactNode
  // Unlock indicators (optional — LMN uses these)
  invisibleUnlocked?: boolean
  filtersUnlocked?: boolean
  hideAgeUnlocked?: boolean
  profileLocked?: boolean
  onPromptUnlockProfile?: () => void
}

export function StatsBar({
  lang,
  isPremium,
  gridRowsUnlocked,
  channelFollowUnlock,
  hasRealPhoto,
  appVersion,
  children,
  invisibleUnlocked,
  filtersUnlocked,
  hideAgeUnlocked,
  profileLocked,
  onPromptUnlockProfile,
}: StatsBarProps) {
  const totalRows = 2 + (isPremium ? 1 : 0) + gridRowsUnlocked + channelFollowUnlock + (hasRealPhoto ? 1 : 0)
  const rowsLabel = lang === 'tc' ? '已解鎖行數' : lang === 'sc' ? '已解锁行数' : 'Rows'
  const version = `v${CORE_VERSION}.${appVersion}.${BUILD_VERSION}`

  return (
    <div className="px-3 pt-1 flex flex-col gap-1">
      {/* Primary row: rows + version + children */}
      <div className="flex items-center gap-2 text-[10px] text-[#8E8E93]">
        <span className="text-[var(--app-primary)] font-bold whitespace-nowrap flex-shrink-0">
          {rowsLabel}: {totalRows}
        </span>
        <span className="text-[#2C2C2E]">|</span>
        <span className="text-[var(--app-primary)] whitespace-nowrap">{version}</span>
        {children && (
          <>
            <span className="text-[#2C2C2E]">|</span>
            {children}
          </>
        )}
      </div>

      {/* Unlock status row */}
      {(invisibleUnlocked !== undefined || filtersUnlocked !== undefined || hideAgeUnlocked !== undefined || profileLocked) && (
        <div className="flex items-center gap-2 flex-wrap">
          {invisibleUnlocked && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center gap-1">
              👁️‍🗨️ {lang === 'tc' ? '隱形' : lang === 'sc' ? '隐形' : lang === 'ru' ? 'Невидимый' : 'Invisible'}
            </span>
          )}
          {filtersUnlocked && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#5AC8FA]/10 text-[#5AC8FA] border border-[#5AC8FA]/20 flex items-center gap-1">
              🔓 {lang === 'tc' ? '篩選器' : lang === 'sc' ? '筛选器' : lang === 'ru' ? 'Фильтры' : 'Filters'}
            </span>
          )}
          {hideAgeUnlocked && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-pink-500/10 text-pink-400 border border-pink-500/20 flex items-center gap-1">
              🙈 {lang === 'tc' ? '隱藏年齡' : lang === 'sc' ? '隐藏年龄' : lang === 'ru' ? 'Скрыть возраст' : 'Hide Age'}
            </span>
          )}
          {profileLocked && onPromptUnlockProfile && (
            <button
              onClick={onPromptUnlockProfile}
              className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#FF6B35]/10 text-[#FF6B35] border border-[#FF6B35]/20 flex items-center gap-1 nav-press"
            >
              🔒 {lang === 'tc' ? '購買解鎖以編輯個人資料' : lang === 'sc' ? '购买解锁以编辑个人资料' : lang === 'ru' ? 'Купите разблокировку для редактирования' : 'Purchase unlock to change profile'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
