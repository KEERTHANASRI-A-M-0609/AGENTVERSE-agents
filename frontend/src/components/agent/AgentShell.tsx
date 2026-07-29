import { useState, useEffect, ReactNode, createContext, useContext } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, TrendingUp, BarChart3, Settings, RefreshCw,
  Download, Bell, ChevronRight, Store, Cpu, Zap,
  ChevronDown, X, Check, AlertTriangle, Info, User,
} from 'lucide-react'

export type MonthFilter = 'this_month' | 'last_month' | 'last_3m' | 'last_6m' | 'this_year'
export const MONTH_FILTERS: { value: MonthFilter; label: string; days: number }[] = [
  { value: 'this_month',  label: 'This Month',    days: 30  },
  { value: 'last_month',  label: 'Last Month',    days: 60  },
  { value: 'last_3m',     label: 'Last 3 Months', days: 90  },
  { value: 'last_6m',     label: 'Last 6 Months', days: 180 },
  { value: 'this_year',   label: 'This Year',     days: 365 },
]

const ThemeCtx = createContext<{ dark: boolean; toggle: () => void }>({ dark: false, toggle: () => {} })
export const useTheme = () => useContext(ThemeCtx)

interface Notif { id: string; type: 'alert' | 'info' | 'success'; text: string }

const NAV_ITEMS = [
  { id: 'mission',   label: 'Dashboard',    path: '/',          icon: LayoutDashboard, color: '#2563eb', desc: 'Overview & alerts' },
  { id: 'demand',    label: 'Demand',       path: '/forecast',  icon: TrendingUp,      color: '#2563eb', desc: 'Forecasting & reorders' },
  { id: 'analytics', label: 'Intelligence', path: '/analytics', icon: BarChart3,       color: '#2563eb', desc: 'Business intelligence' },
  { id: 'settings',  label: 'Settings',     path: '/settings',  icon: Settings,        color: '#2563eb', desc: 'Configuration' },
]

const AGENT_META: Record<string, { label: string; color: string }> = {
  demand:    { label: 'Demand Agent',    color: '#2563eb' },
  analytics: { label: 'BI Agent',        color: '#2563eb' },
  mission:   { label: 'Dashboard',       color: '#2563eb' },
  settings:  { label: 'Settings',        color: '#475569' },
}

interface Props {
  agent: 'demand' | 'analytics' | 'mission' | 'settings'
  shopName?: string
  onRefresh?: () => void
  refreshing?: boolean
  onExport?: () => void
  monthFilter?: MonthFilter
  onMonthFilterChange?: (f: MonthFilter) => void
  breadcrumb?: string
  notifications?: Notif[]
  horizonControls?: ReactNode
  children: ReactNode
}

export function AgentShell({
  agent, shopName = 'shop_001', onRefresh, refreshing, onExport,
  monthFilter, onMonthFilterChange, breadcrumb, notifications = [],
  horizonControls, children,
}: Props) {
  const location = useLocation()
  const [filterOpen, setFilterOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    const handler = () => { setFilterOpen(false); setNotifOpen(false) }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  const meta = AGENT_META[agent]
  const activeFilter = MONTH_FILTERS.find(f => f.value === monthFilter) ?? MONTH_FILTERS[0]
  const navItem = NAV_ITEMS.find(n => n.id === agent)

  return (
    <ThemeCtx.Provider value={{ dark: false, toggle: () => {} }}>
      <div className="min-h-screen flex" style={{ background: 'var(--bg)', color: 'var(--text-1)', fontFamily: "'Times New Roman', Times, serif" }}>

        {/* ── Sidebar ── */}
        <aside className="sticky top-0 h-screen flex flex-col shrink-0 z-40 transition-all duration-300"
          style={{ width: sidebarCollapsed ? 56 : 220, background: 'var(--sidebar-2)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>

          {/* Logo */}
          <div className="flex items-center gap-3 px-3.5 h-[52px] shrink-0"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: '#2563eb' }}>
              <Cpu className="w-3.5 h-3.5 text-white" />
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <p className="text-[13px] font-bold tracking-tight text-white" style={{ letterSpacing: '-0.02em' }}>ShopMind</p>
                <p className="text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>AI Platform</p>
              </div>
            )}
          </div>

          {/* Shop badge */}
          {!sidebarCollapsed && (
            <div className="mx-3 mt-3 px-3 py-2 rounded-lg flex items-center gap-2.5"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <Store className="w-3 h-3 shrink-0" style={{ color: 'rgba(255,255,255,0.35)' }} />
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>Active Store</p>
                <p className="text-[11px] font-semibold truncate mt-0.5 text-white">{shopName}</p>
              </div>
              <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: '#16a34a' }} />
            </div>
          )}

          {!sidebarCollapsed && (
            <p className="px-4 pt-5 pb-1.5 text-[9px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.2)' }}>
              Navigation
            </p>
          )}

          {/* Nav */}
          <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto py-1">
            {NAV_ITEMS.map(item => {
              const active = item.id === 'mission'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path) && item.path !== '/'
              const Icon = item.icon
              return (
                <Link key={item.id} to={item.path}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all duration-150 group relative"
                  style={{
                    background: active ? 'rgba(37,99,235,0.25)' : 'transparent',
                    color: active ? '#93c5fd' : 'rgba(255,255,255,0.45)',
                  }}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon className="w-[15px] h-[15px] shrink-0" />
                  {!sidebarCollapsed && (
                    <>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-semibold leading-none">{item.label}</p>
                        {!active && <p className="text-[10px] mt-0.5 opacity-40 truncate">{item.desc}</p>}
                      </div>
                      {active && <div className="w-1 h-1 rounded-full shrink-0" style={{ background: '#93c5fd' }} />}
                    </>
                  )}
                  {active && (
                    <motion.div layoutId="nav-active"
                      className="absolute inset-0 rounded-lg pointer-events-none"
                      style={{ border: '1px solid rgba(37,99,235,0.4)' }}
                    />
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="p-2 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <button onClick={() => setSidebarCollapsed(v => !v)}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all text-[11px]"
              style={{ color: 'rgba(255,255,255,0.25)' }}>
              <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${sidebarCollapsed ? '' : 'rotate-180'}`} />
              {!sidebarCollapsed && <span className="font-medium">Collapse</span>}
            </button>
          </div>
        </aside>

        {/* ── Main ── */}
        <div className="flex-1 flex flex-col min-w-0 min-h-screen">

          {/* Topbar */}
          <header className="h-[52px] flex items-center justify-between px-5 shrink-0 sticky top-0 z-30"
            style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>

            {/* Left */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-3)' }}>
                <span className="font-semibold" style={{ color: 'var(--text-2)' }}>{navItem?.label}</span>
                {breadcrumb && (
                  <>
                    <ChevronRight className="w-3 h-3 opacity-40" />
                    <span style={{ color: 'var(--text-1)' }} className="font-semibold">{breadcrumb}</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md"
                style={{ background: 'var(--green-lt)', border: '1px solid var(--green-bd)' }}>
                <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: 'var(--green)' }} />
                <span className="text-[10px] font-semibold" style={{ color: 'var(--green)' }}>Live</span>
              </div>
            </div>

            {/* Right */}
            <div className="flex items-center gap-1.5">

              {horizonControls && <div className="mr-1">{horizonControls}</div>}

              {/* Month filter */}
              {onMonthFilterChange && (
                <div className="relative" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setFilterOpen(v => !v)}
                    className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11px] font-medium transition-all"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--blue)' }} />
                    {activeFilter.label}
                    <ChevronDown className={`w-3 h-3 opacity-40 transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {filterOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.97 }}
                        transition={{ duration: 0.1 }}
                        className="absolute right-0 top-10 z-50 rounded-xl overflow-hidden shadow-lg min-w-[176px]"
                        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                        <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                          <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Time Period</p>
                        </div>
                        {MONTH_FILTERS.map(f => (
                          <button key={f.value}
                            onClick={() => { onMonthFilterChange(f.value); setFilterOpen(false) }}
                            className="w-full text-left px-3 py-2 text-[11px] transition-colors flex items-center justify-between gap-3"
                            style={{
                              color: f.value === monthFilter ? 'var(--blue)' : 'var(--text-2)',
                              background: f.value === monthFilter ? 'var(--blue-lt)' : 'transparent',
                            }}>
                            <span className="font-medium">{f.label}</span>
                            {f.value === monthFilter && <Check className="w-3 h-3" />}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Notifications */}
              <div className="relative" onClick={e => e.stopPropagation()}>
                <button onClick={() => setNotifOpen(v => !v)} className="icon-btn relative">
                  <Bell className="w-3.5 h-3.5" />
                  {notifications.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full text-[8px] font-bold text-white flex items-center justify-center"
                      style={{ background: 'var(--red)' }}>
                      {notifications.length}
                    </span>
                  )}
                </button>
                <AnimatePresence>
                  {notifOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.97 }}
                      transition={{ duration: 0.1 }}
                      className="absolute right-0 top-10 z-50 rounded-xl overflow-hidden shadow-lg w-72"
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
                        <p className="text-[11px] font-semibold" style={{ color: 'var(--text-1)' }}>Notifications</p>
                        <button onClick={() => setNotifOpen(false)}><X className="w-3.5 h-3.5" style={{ color: 'var(--text-3)' }} /></button>
                      </div>
                      {notifications.length === 0 ? (
                        <div className="px-4 py-6 text-center">
                          <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>No new notifications</p>
                        </div>
                      ) : (
                        <div>
                          {notifications.map(n => (
                            <div key={n.id} className="px-4 py-3 flex items-start gap-3" style={{ borderBottom: '1px solid var(--border-2)' }}>
                              {n.type === 'alert' && <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: 'var(--red)' }} />}
                              {n.type === 'info' && <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: 'var(--blue)' }} />}
                              {n.type === 'success' && <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: 'var(--green)' }} />}
                              <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-2)' }}>{n.text}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {onRefresh && (
                <button onClick={onRefresh} className="icon-btn">
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
              )}

              {onExport && (
                <button onClick={onExport}
                  className="hidden sm:flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11px] font-medium transition-all"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
                  <Download className="w-3.5 h-3.5" /> Export
                </button>
              )}

              {/* Agent badge */}
              <div className="hidden md:flex items-center gap-1.5 h-8 px-2.5 rounded-lg"
                style={{ background: 'var(--blue-lt)', border: '1px solid var(--blue-bd)' }}>
                <Zap className="w-3 h-3" style={{ color: 'var(--blue)' }} />
                <span className="text-[11px] font-semibold" style={{ color: 'var(--blue)' }}>{meta.label}</span>
              </div>

              {/* User avatar */}
              <div className="h-7 w-7 rounded-full flex items-center justify-center ml-1 shrink-0"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <User className="w-3.5 h-3.5" style={{ color: 'var(--text-3)' }} />
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div key={location.pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}>
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </ThemeCtx.Provider>
  )
}
