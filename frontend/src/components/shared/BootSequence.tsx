import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Terminal, Shield, CheckCircle, Loader2 } from 'lucide-react'

interface BootSequenceProps {
  onComplete: () => void
}

export function BootSequence({ onComplete }: BootSequenceProps) {
  const [step, setStep] = useState(0)
  const [dots, setDots] = useState('')

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'))
    }, 300)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    // Step timings
    const timers = [
      setTimeout(() => setStep(1), 800),    // Connect Forecast AI
      setTimeout(() => setStep(2), 1600),   // BI Load
      setTimeout(() => setStep(3), 2400),   // Store Analysis
      setTimeout(() => setStep(4), 3200),   // Briefing Generate
      setTimeout(() => setStep(5), 4100),   // Welcome Card
      setTimeout(() => onComplete(), 5200), // Finish
    ]
    return () => timers.forEach(clearTimeout)
  }, [onComplete])

  const stepsList = [
    { label: 'Connecting Forecast AI Engine', done: step > 1 },
    { label: 'Loading Business Intelligence Services', done: step > 2 },
    { label: 'Running Assortment & Stock Auditing', done: step > 3 },
    { label: 'Generating Executive Action Summaries', done: step > 4 }
  ]

  return (
    <div className="fixed inset-0 z-50 bg-[#0b0f14] flex items-center justify-center font-mono text-gray-300 select-none">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md p-6 bg-[#161b22] border border-white/10 rounded-lg shadow-2xl relative overflow-hidden"
      >
        {/* Shimmer light effect */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-pulse" />

        {/* Welcome Reveal */}
        <AnimatePresence mode="wait">
          {step < 5 ? (
            <motion.div 
              key="boot-log"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2 text-blue-400 border-b border-white/5 pb-2">
                <Terminal className="w-4 h-4 animate-pulse" />
                <span className="text-[11px] font-bold uppercase tracking-wider">ShopMind AI Boot Core</span>
              </div>
              
              <div className="space-y-2 text-xs">
                {stepsList.map((st, i) => {
                  const active = step === i + 1
                  const notStarted = step <= i
                  
                  return (
                    <div key={i} className="flex justify-between items-center h-5">
                      <span className={notStarted ? 'text-gray-600' : active ? 'text-blue-400 font-bold' : 'text-gray-400'}>
                        {st.label}
                        {active && dots}
                      </span>
                      {st.done ? (
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      ) : active ? (
                        <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin shrink-0" />
                      ) : (
                        <span className="h-1.5 w-1.5 rounded-full bg-gray-700 shrink-0 mr-1" />
                      )}
                    </div>
                  )
                })}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="welcome-card"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-4 py-3"
            >
              <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                <Shield className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Welcome Back, Operator</h3>
                <p className="text-[10px] text-gray-500 mt-1">ShopMind OS is online & calibrated.</p>
              </div>
              <div className="inline-block px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded text-emerald-400 text-xs font-bold font-mono">
                Store Health: 92%
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
