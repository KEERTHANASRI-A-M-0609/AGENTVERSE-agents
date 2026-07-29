/**
 * AgentChatbot — floating chatbot panel for both Demand and BI agents.
 * Wraps BusinessAIAssistant in a slide-up overlay triggered by a FAB button.
 */
import { useState } from 'react'
import { MessageSquare, X, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { BusinessAIAssistant } from './BusinessAIAssistant'
import type { AnalyticsBundle } from '@/hooks/useAnalyticsDashboard'
import type { DashboardResponse } from '@/types'

interface Props {
  mode: 'demand' | 'analytics'
  shopId: string
  analytics?: AnalyticsBundle | null
  demand?: DashboardResponse | null
  horizon?: number
}

export function AgentChatbot({ mode, shopId, analytics, demand, horizon }: Props) {
  const [open, setOpen] = useState(false)
  const accentColor = mode === 'demand' ? '#6366f1' : '#8b5cf6'
  const label = mode === 'demand' ? 'Demand Co-Pilot' : 'BI Co-Pilot'

  return (
    <>
      {/* FAB */}
      <motion.button
        onClick={() => setOpen(v => !v)}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-2xl font-semibold text-[12px] text-white"
        style={{
          background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
          boxShadow: `0 8px 32px ${accentColor}50`,
        }}
      >
        {open ? <X className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
        {open ? 'Close' : label}
        {!open && <Sparkles className="w-3 h-3 opacity-70" />}
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-20 right-6 z-50 w-[360px] rounded-2xl overflow-hidden shadow-2xl"
            style={{
              background: '#0d1220',
              border: `1px solid ${accentColor}30`,
              boxShadow: `0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px ${accentColor}20`,
              height: 520,
            }}
          >
            <BusinessAIAssistant
              mode={mode}
              shopId={shopId}
              analytics={analytics}
              demand={demand}
              horizon={horizon}
              inline
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
