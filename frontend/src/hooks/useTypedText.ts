import { useEffect, useState } from 'react'

/** Subtle typewriter for AI narrative — calm, not flashy */
export function useTypedText(text: string, enabled = true, cps = 42) {
  const [shown, setShown] = useState(enabled ? '' : text)

  useEffect(() => {
    if (!enabled) {
      setShown(text)
      return
    }
    setShown('')
    if (!text) return
    let i = 0
    const id = window.setInterval(() => {
      i += 1
      setShown(text.slice(0, i))
      if (i >= text.length) window.clearInterval(id)
    }, Math.max(12, 1000 / cps))
    return () => window.clearInterval(id)
  }, [text, enabled, cps])

  return { text: shown, done: shown.length >= text.length }
}
