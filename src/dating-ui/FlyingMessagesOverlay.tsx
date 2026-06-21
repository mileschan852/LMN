import { useEffect } from 'react'

export interface FlyingMessageItem {
  id: number
  text: string
  top: string
}

export interface FlyingMessagesOverlayProps {
  messages: FlyingMessageItem[]
  onDone: (id: number) => void
  durationMs?: number
}

export function FlyingMessagesOverlay({ messages, onDone, durationMs = 60000 }: FlyingMessagesOverlayProps) {
  useEffect(() => {
    messages.forEach(m => {
      const timer = setTimeout(() => onDone(m.id), durationMs)
      return () => clearTimeout(timer)
    })
  }, [messages, onDone, durationMs])

  return (
    <div className="fixed inset-0 z-[90] pointer-events-none overflow-hidden" aria-hidden="true">
      {messages.map(m => (
        <div
          key={m.id}
          className="flying-message absolute text-xs font-bold text-white/90 drop-shadow-lg max-w-[85vw] break-words leading-tight"
          style={{ top: m.top }}
        >
          {m.text}
        </div>
      ))}
    </div>
  )
}
