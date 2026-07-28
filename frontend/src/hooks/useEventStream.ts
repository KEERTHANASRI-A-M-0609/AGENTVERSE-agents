import { useCallback, useEffect, useRef, useState } from 'react'
import type { RetailEvent } from '@/types/events'
import { SHOP_ID } from '@/lib/agents'

const MAX_EVENTS = 120
const SSE_URL = `/api/v1/events/stream/${SHOP_ID}`

export interface UseEventStreamReturn {
  events: RetailEvent[]
  connected: boolean
  reconnecting: boolean
  totalReceived: number
  clearEvents: () => void
}

export function useEventStream(): UseEventStreamReturn {
  const [events, setEvents] = useState<RetailEvent[]>([])
  const [connected, setConnected] = useState(false)
  const [reconnecting, setReconnecting] = useState(false)
  const [totalReceived, setTotalReceived] = useState(0)
  const esRef = useRef<EventSource | null>(null)
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryCount = useRef(0)

  const connect = useCallback(() => {
    if (esRef.current) {
      esRef.current.close()
    }

    const es = new EventSource(SSE_URL)
    esRef.current = es

    es.onopen = () => {
      setConnected(true)
      setReconnecting(false)
      retryCount.current = 0
    }

    es.onmessage = (e) => {
      try {
        const event: RetailEvent = JSON.parse(e.data)
        setEvents((prev) => {
          const next = [event, ...prev]
          return next.length > MAX_EVENTS ? next.slice(0, MAX_EVENTS) : next
        })
        setTotalReceived((n) => n + 1)
      } catch {
        // ignore malformed
      }
    }

    es.onerror = () => {
      setConnected(false)
      es.close()
      esRef.current = null
      // Exponential backoff: 2s, 4s, 8s, max 30s
      const delay = Math.min(2000 * Math.pow(2, retryCount.current), 30000)
      retryCount.current += 1
      setReconnecting(true)
      retryRef.current = setTimeout(connect, delay)
    }
  }, [])

  useEffect(() => {
    connect()
    return () => {
      esRef.current?.close()
      if (retryRef.current) clearTimeout(retryRef.current)
    }
  }, [connect])

  const clearEvents = useCallback(() => setEvents([]), [])

  return { events, connected, reconnecting, totalReceived, clearEvents }
}
