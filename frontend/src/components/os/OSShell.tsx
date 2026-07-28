import { ReactNode, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Moon, Sun, RefreshCw, Download, LayoutDashboard, TrendingUp, BarChart3, Cpu, User } from 'lucide-react'

interface Props {
  title?: string
  shopName?: string
  onRefresh?: () => void
  refreshing?: boolean
  onExport?: () => void
  controls?: ReactNode
  children: ReactNode
}

const NAV = [
  { label: 'Overview', path: '/',          exact: true,  icon: LayoutDashboard, color: '#10b981' },
  { label: 'Demand',   path: '/forecast',               icon: TrendingUp,      color: '#6366f1' },
  { label: 'BI',       path: '/analytics',              icon: BarChart3,       color: '#8b5cf6' },
]

export function OSShell({ title, shopName = 'shop_001', onRefresh, refreshing, onExport, controls, children }: Props) {
  const [dark, setDark] = useState(() => localStorage.getItem('shopmind-theme') !== 'light')
  const location = useLocation()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('shopmind-theme', dark ? 'dark' : 'light')
  }, [dark])

  const bg = dark ? '#05080f' : '#f0f2f7'
  const border = dark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.08)'
  const sidebarBg = dark ? '#080c15' : '#ffffff'

  return (
    <div className={dark ? 'dark' : ''}>
      <div className="min-h-screen flex font-sans" style={{ background: bg, color: dark ? '#e2e8f0' : '#0f172a' }}>

        {/* ── Sidebar ── */}
        <aside className="w-[52px] flex flex-col items-center py-4 gap-1 sticky top-0 h-screen z-30 shrink-0"
          style={{ background: sidebarBg, borderRight: `1px solid ${border}` }}>

          {/* Logo mark */}
          <div className="mb-4 h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 0 14px rgba(99,102,241,0.35)' }}>
            <Cpu className="w-4 h-4 text-white" />
          </div>

          {NAV.map(item => {
            const active = item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path)
            const Icon = item.icon
            return (
              <Link key={item.path} to={item.path} title={item.label}
                className="relative h-9 w-9 rounded-lg flex items-center justify-center transition-all duration-200"
                style={{
                  background: active ? `${item.color}14` : 'transparent',
                  border: active ? `1px solid ${item.color}25` : '1px solid transparent',
                }}>
                <Icon className="w-[15px] h-[15px]" style={{ color: active ? item.color : dark ? 'rgba(148,163,184,0.45)' : '#94a3b8' }} />
                {active && (
                  <motion.div layoutId="os-sidebar-dot"
                    className="absolute -right-0.5 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full"
                    style={{ background: item.color }}
                  />
                )}
              </Link>
            )
          })}

          <div className="mt-auto flex flex-col items-center gap-1">
            <button onClick={() => setDark(v => !v)}
              className="h-9 w-9 rounded-lg flex items-center justify-center transition-all"
              style={{ color: dark ? 'rgba(148,163,184,0.4)' : '#94a3b8' }}>
              {dark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
            <div className="h-7 w-7 rounded-full flex items-center justify-center"
              style={{ background: dark ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.07)', border: `1px solid ${border}` }}>
              <User className="w-3.5 h-3.5" style={{ color: dark ? '#64748b' : '#94a3b8' }} />
            </div>
          </div>
        </aside>

        {/* ── Main ── */}
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-[52px] flex items-center justify-between px-6 sticky top-0 z-20"
            style={{
              borderBottom: `1px solid ${border}`,
              background: dark ? 'rgba(8,12,21,0.92)' : 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(20px)',
            }}>
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full animate-pulseDot" style={{ background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
              <span className="text-[12px] font-semibold" style={{ color: '#10b981' }}>{title ?? 'Mission Control'}</span>
              <span className="text-[11px] font-medium" style={{ color: dark ? 'rgba(148,163,184,0.35)' : '#94a3b8' }}>· {shopName}</span>
            </div>
            <div className="flex items-center gap-2">
              {controls}
              {onRefresh && (
                <button onClick={onRefresh}
                  className="icon-btn">
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
              )}
              {onExport && (
                <button onClick={onExport}
                  className="hidden md:flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11px] font-medium transition-all"
                  style={{ border: `1px solid ${border}`, color: dark ? 'rgba(148,163,184,0.6)' : '#64748b' }}>
                  <Download className="w-3.5 h-3.5" /> Export
                </button>
              )}
            </div>
          </header>

          <main className="flex-1 p-7 overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}>
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  )
}
