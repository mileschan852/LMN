import { useState, useEffect } from 'react'
import { type Lang } from '@dating/core/i18n'

export interface TipsRowProps {
  lang: Lang
  tips: string[]
  intervalMs?: number
}

export function TipsRow({ lang, tips, intervalMs = 6000 }: TipsRowProps) {
  const [idx, setIdx] = useState(0)
  const list = tips.length > 0 ? tips : ['💡 Tap to see tips']

  useEffect(() => {
    const i = setInterval(() => setIdx(i => (i + 1) % list.length), intervalMs)
    return () => clearInterval(i)
  }, [list.length, intervalMs])

  return (
    <div className="px-3 py-2">
      <button
        onClick={() => setIdx(i => (i + 1) % list.length)}
        className="w-full text-left text-[9px] text-[#8E8E93] bg-[#1A1A1A]/50 border border-[#2C2C2E]/50 rounded-lg px-3 py-1.5 nav-press"
      >
        {list[idx]}
      </button>
    </div>
  )
}
