import { RefreshCw } from 'lucide-react'
import { RaffleStatusDisplay } from './RaffleStatusDisplay'
import { RaffleButton } from './RaffleButton'
import type { Raffle } from '@dating/core'
import type { Lang } from '@dating/core/i18n'
import { useMemo } from 'react'

interface TopBarProps {
  // Logo area (app-specific)
  logo: React.ReactNode
  appName: string

  // Raffle section
  raffle: Raffle | null
  isAdmin: boolean
  onBuyRaffleTicket: () => void
  onStartNextRaffle: () => void
  lang: Lang

  // Invisible mode
  isInvisible: boolean
  invisiblePurchased: boolean
  onToggleInvisible: () => void

  // Unlock
  onPromptUnlockProfile: () => void

  // Refresh
  lastRefreshTime: number
  onRefresh: () => void

  // Language
  langLabel: string
  onCycleLang: () => void
}

export function TopBar({
  logo,
  appName,
  raffle,
  isAdmin,
  onBuyRaffleTicket,
  onStartNextRaffle,
  lang,
  isInvisible,
  invisiblePurchased,
  onToggleInvisible,
  onPromptUnlockProfile,
  lastRefreshTime,
  onRefresh,
  langLabel,
  onCycleLang,
}: TopBarProps) {
  const refreshDisabled = useMemo(
    () => Date.now() - lastRefreshTime < 5 * 60 * 1000,
    [lastRefreshTime]
  )

  return (
    <div className="sticky top-0 z-40 bg-[#0A0A0A]/95 backdrop-blur-md border-b border-[#2C2C2E] px-3 py-2 flex items-center justify-between">
      {/* LEFT: Logo + App Name + Raffle + Dot Matrix Timer */}
      <div className="flex items-center gap-2">
        {logo}
        <h1 className="text-xl font-bold gradient-text tracking-tight">{appName}</h1>
        <div className="w-px h-5 bg-[#2C2C2E] mx-0.5" />
        <RaffleButton
          raffle={raffle}
          isAdmin={isAdmin}
          onBuyTicket={onBuyRaffleTicket}
          onStartNextRaffle={onStartNextRaffle}
          lang={lang}
        />
        <RaffleStatusDisplay raffle={raffle} lang={lang} />
      </div>

      {/* RIGHT: Invisible | Unlock | Refresh | Language */}
      <div className="flex items-center gap-2">
        {/* Invisible mode toggle — open eye when OFF, closed eye when ON */}
        <button
          onClick={onToggleInvisible}
          className={`w-7 h-7 rounded-full flex items-center justify-center nav-press text-[10px] border ${
            isInvisible
              ? 'bg-purple-500/30 text-purple-400 border-purple-500/40'
              : invisiblePurchased
              ? 'bg-purple-500/10 text-purple-500/60 border-purple-500/20'
              : 'bg-[#1A1A1A] text-[#8E8E93] border-[#2C2C2E]'
          }`}
          title={
            isAdmin
              ? isInvisible
                ? 'Invisible ON (admin)'
                : 'Toggle Invisible (admin)'
              : isInvisible
              ? 'Invisible ON'
              : invisiblePurchased
              ? 'Invisible purchased — click to toggle'
              : 'Purchase Invisible Mode (2000 \u2B50)'
          }
        >
          {isInvisible ? '\uD83D\uDC41\u200D\uD83D\uDDE8\uFE0F' : '\uD83D\uDC41'}
        </button>

        {/* Unlock profile lock */}
        <button
          onClick={onPromptUnlockProfile}
          className="w-7 h-7 rounded-full bg-[var(--app-primary)]/20 border border-[var(--app-primary)]/30 flex items-center justify-center nav-press"
          title={isAdmin ? 'Release Locks (Free)' : 'Unlock Profile (100 \u2B50)'}
        >
          <span className="text-[10px]">{'\uD83D\uDD13'}</span>
        </button>

        {/* Refresh */}
        <button
          onClick={() => {
            if (refreshDisabled) return
            onRefresh()
          }}
          className="w-7 h-7 rounded-full bg-[#1A1A1A] border border-[#2C2C2E] flex items-center justify-center nav-press"
          title="Refresh"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#8E8E93]" />
        </button>

        {/* Language */}
        <button
          onClick={onCycleLang}
          className="text-[10px] font-bold text-[var(--app-primary)] px-2 py-1 rounded-full bg-[var(--app-primary)]/10 border border-[var(--app-primary)]/30 nav-press"
        >
          {langLabel}
        </button>
      </div>
    </div>
  )
}
