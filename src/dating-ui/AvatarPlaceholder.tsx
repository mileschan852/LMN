/**
 * Shared avatar placeholder — shows user's first initial when no photo is available.
 * Used by both apps for profile grids, overlays, and profile screens.
 */
export function AvatarPlaceholder({ name, className = '' }: { name: string; className?: string }) {
  return (
    <span className={`font-bold text-[#8E8E93] select-none ${className}`}>
      {name?.charAt(0)?.toUpperCase() || '?'}
    </span>
  )
}
