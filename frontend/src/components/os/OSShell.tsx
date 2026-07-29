import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, Download, LayoutDashboard, TrendingUp, BarChart3, Cpu, User, Settings } from 'lucide-react'

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
  { label: 'Dashboard', path: '/',          exact: true,  icon: LayoutDashboard },
  { label: 'Demand',    path: '/forecast',               icon: TrendingUp      },
  { label: 'BI',        path: '/analytics',              icon: BarChart3       },
  { label: 'Settings',  path: '/settings',               icon: Settings        },
]

export function OSShell({ title, shopName = 'shop_001', onRefresh, refreshing, onExport, controls, children }: Props) {
  const location = useLocation()

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)', color: 'var(--text-1)', fontFamily: "'Times New Roman', Times, serif" }}>

      {/* ── Sidebar ── */}
      <aside className="w-[52px] flex flex-col items-center py-3 gap-1 sticky top-0 h-screen z-30 shrink-0"
        style={{ background: 'var(--sidebar-2)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>

        <div className="mb-3 h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: '#2563eb' }}>
          <Cpu className="w-4 h-4 text-white" />
        </div>

        {NAV.map(item => {
          const active = item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path)
          const Icon = item.icon
          return (
            <Link key={item.path} to={item.path} title={item.label}
              className="relative h-9 w-9 rounded-lg flex items-center justify-center transition-all duration-200"
              style={{
                background: active ? 'rgba(37,99,235,0.25)' : 'transparent',
                border: active ? '1px solid rgba(37,99,235,0.4)' : '1px solid transparent',
              }}>
              <Icon className="w-[15px] h-[15px]"
                style={{ color: active ? '#93c5fd' : 'rgba(255,255,255,0.35)' }} />
              {active && (
                <motion.div layoutId="os-sidebar-dot"
                  className="absolute -right-0.5 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full"
                  style={{ background: '#2563eb' }}
                />
              )}
            </Link>
          )
        })}

        <div className="mt-auto flex flex-col items-center gap-1">
          <div className="h-7 w-7 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <User className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.4)' }} />
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-[52px] flex items-center justify-between px-6 sticky top-0 z-20"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full animate-pulseDot" style={{ background: 'var(--green)' }} />
            <span className="text-[12px] font-semibold" style={{ color: 'var(--text-1)' }}>{title ?? 'Dashboard'}</span>
            <span className="text-[11px] font-medium" style={{ color: 'var(--text-3)' }}>· {shopName}</span>
          </div>
          <div className="flex items-center gap-2">
            {controls}
            {onRefresh && (
              <button onClick={onRefresh} className="icon-btn">
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            )}
            {onExport && (
              <button onClick={onExport}
                className="hidden md:flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11px] font-medium transition-all"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
                <Download className="w-3.5 h-3.5" /> Export
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 p-6 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}>
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
