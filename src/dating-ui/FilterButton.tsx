import React from 'react'

interface FilterButtonProps {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  colorClass?: string   // e.g. "bg-green-500/20 text-green-400" when active
  locked?: boolean
  title?: string
}

/** Shared filter button used by all dating apps.
 *  Same size, same border radius, same press feedback.
 *  Apps only provide the label, colour, and click handler.
 */
export function FilterButton({
  active,
  onClick,
  children,
  colorClass,
  locked = false,
  title,
}: FilterButtonProps) {
  const base = 'text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0 nav-press transition-all duration-150'

  if (locked) {
    return (
      <button
        onClick={onClick}
        className={`${base} bg-[#1A1A1A] text-[#8E8E93] border border-[#2C2C2E]`}
        title={title || 'Purchase filters to unlock'}
      >
        <span className="opacity-60 mr-0.5">🔒</span>
        {children}
      </button>
    )
  }

  if (active && colorClass) {
    return (
      <button
        onClick={onClick}
        className={`${base} ${colorClass}`}
        title={title}
      >
        {children}
      </button>
    )
  }

  // Inactive (no colour)
  return (
    <button
      onClick={onClick}
      className={`${base} bg-[#1A1A1A] text-[#8E8E93] border border-[#2C2C2E]`}
      title={title}
    >
      {children}
    </button>
  )
}

/** Toggle button variant (e.g. Online/Offline, Photo/No Photo).
 *  Uses gradient when active, muted when inactive.
 */
export function ToggleButton({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  title?: string
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`px-2 py-1 rounded-full text-[11px] font-medium transition-all nav-press flex-shrink-0 ${
        active
          ? 'gradient-btn text-white'
          : 'bg-[#1A1A1A] text-[#8E8E93] border border-[#2C2C2E]'
      }`}
    >
      {children}
    </button>
  )
}
