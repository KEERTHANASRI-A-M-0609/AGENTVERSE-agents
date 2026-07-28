import { useState, useEffect, ReactNode, createContext, useContext } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, TrendingUp, BarChart3, Settings, RefreshCw,
  Download, Sun, Moon, Bell, ChevronRight, Store, Cpu, Zap,
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

const ThemeCtx = createContext<{ dark: boolean; toggle: () => void }>({ dark: true, toggle: () => {} })
export const useTheme = () => useContext(ThemeCtx)

interface Notif { id: string; type: 'alert' | 'info' | 'success'; text: string }

const NAV_ITEMS = [
  { id: 'mission',   label: 'Overview',     path: '/',          icon: LayoutDashboard, color: '#10b981', desc: 'Mission Control' },
  { id: 'demand',    label: 'Demand',       path: '/forecast',  icon: TrendingUp,      color: '#6366f1', desc: 'Forecasting & reorders' },
  { id: 'analytics', label: 'Intelligence', path: '/analytics', icon: BarChart3,       color: '#8b5cf6', desc: 'Business intelligence' },
  { id: 'settings',  label: 'Settings',     path: '/settings',  icon: Settings,        color: '#475569', desc: 'Configuration' },
]

const AGENT_META: Record<string, { label: string; color: string }> = {
  demand:    { label: 'Demand Agent',    color: '#6366f1' },
  analytics: { label: 'BI Agent',        color: '#8b5cf6' },
  mission:   { label: 'Mission Control', color: '#10b981' },
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
  const [dark, setDark] = useState(() => localStorage.getItem('shopmind-theme') !== 'light')
  const [filterOpen, setFilterOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('shopmind-theme', dark ? 'dark' : 'light')
  }, [dark])

  useEffect(() => {
    const handler = () => { setFilterOpen(false); setNotifOpen(false) }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  const meta = AGENT_META[agent]
  const activeFilter = MONTH_FILTERS.find(f => f.value === monthFilter) ?? MONTH_FILTERS[0]
  const navItem = NAV_ITEMS.find(n => n.id === agent)

  const bg = dark ? '#05080f' : '#f0f2f7'
  const sidebarBg = dark ? '#080c15' : '#ffffff'
  const border = dark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.08)'
  const topbarBg = dark ? 'rgba(8,12,21,0.92)' : 'rgba(255,255,255,0.92)'

  return (
    <ThemeCtx.Provider value={{ dark, toggle: () => setDark(v => !v) }}>
      <div className={dark ? 'dark' : ''}>
        <div className="min-h-screen flex" style={{ background: bg, color: dark ? '#e2e8f0' : '#1e293b', fontFamily: "'Inter', system-ui, sans-serif" }}>

          {/* ── Sidebar ── */}
          <aside className="sticky top-0 h-screen flex flex-col shrink-0 z-40 transition-all duration-300"
            style={{ width: sidebarCollapsed ? 56 : 216, background: sidebarBg, borderRight: `1px solid ${border}` }}>

            {/* Logo */}
            <div className="flex items-center gap-3 px-3.5 h-[52px] shrink-0" style={{ borderBottom: `1px solid ${border}` }}>
              <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 0 14px rgba(99,102,241,0.35)' }}>
                <Cpu className="w-3.5 h-3.5 text-white" />
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0">
                  <p className="text-[13px] font-bold tracking-tight" style={{ color: dark ? '#f1f5f9' : '#0f172a', letterSpacing: '-0.02em' }}>ShopMind</p>
                  <p className="text-[10px] font-medium" style={{ color: dark ? 'rgba(148,163,184,0.5)' : '#94a3b8' }}>AI Platform</p>
                </div>
              )}
            </div>

            {/* Shop badge */}
            {!sidebarCollapsed && (
              <div className="mx-3 mt-3 px-3 py-2 rounded-lg flex items-center gap-2.5"
                style={{ background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.04)', border: `1px solid ${border}` }}>
                <Store className="w-3 h-3 shrink-0" style={{ color: dark ? 'rgba(148,163,184,0.5)' : '#94a3b8' }} />
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: dark ? 'rgba(148,163,184,0.45)' : '#94a3b8' }}>Active Store</p>
                  <p className="text-[11px] font-semibold truncate mt-0.5" style={{ color: dark ? '#cbd5e1' : '#334155' }}>{shopName}</p>
                </div>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
              </div>
            )}

            {/* Nav label */}
            {!sidebarCollapsed && (
              <p className="px-4 pt-5 pb-1.5 text-[9px] font-bold uppercase tracking-widest" style={{ color: dark ? 'rgba(148,163,184,0.35)' : '#94a3b8' }}>
                Agents
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
                      background: active ? (dark ? `${item.color}14` : `${item.color}10`) : 'transparent',
                      color: active ? item.color : dark ? 'rgba(148,163,184,0.6)' : '#64748b',
                    }}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <Icon className="w-[15px] h-[15px] shrink-0" />
                    {!sidebarCollapsed && (
                      <>
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] font-semibold leading-none">{item.label}</p>
                          {!active && <p className="text-[10px] mt-0.5 opacity-50 truncate">{item.desc}</p>}
                        </div>
                        {active && <div className="w-1 h-1 rounded-full shrink-0" style={{ background: item.color }} />}
                      </>
                    )}
                    {active && (
                      <motion.div layoutId="nav-active"
                        className="absolute inset-0 rounded-lg pointer-events-none"
                        style={{ border: `1px solid ${item.color}25` }}
                      />
                    )}
                  </Link>
                )
              })}
            </nav>

            {/* Footer */}
            <div className="p-2 shrink-0" style={{ borderTop: `1px solid ${border}` }}>
              <button onClick={() => setSidebarCollapsed(v => !v)}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all text-[11px]"
                style={{ color: dark ? 'rgba(148,163,184,0.4)' : '#94a3b8' }}>
                <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${sidebarCollapsed ? '' : 'rotate-180'}`} />
                {!sidebarCollapsed && <span className="font-medium">Collapse</span>}
              </button>
            </div>
          </aside>

          {/* ── Main ── */}
          <div className="flex-1 flex flex-col min-w-0 min-h-screen">

            {/* Topbar */}
            <header className="h-[52px] flex items-center justify-between px-5 shrink-0 sticky top-0 z-30"
              style={{ background: topbarBg, backdropFilter: 'blur(20px)', borderBottom: `1px solid ${border}` }}>

              {/* Left */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex items-center gap-1.5 text-[11px]" style={{ color: dark ? 'rgba(148,163,184,0.5)' : '#94a3b8' }}>
                  <span className="font-medium">{navItem?.label}</span>
                  {breadcrumb && (
                    <>
                      <ChevronRight className="w-3 h-3 opacity-40" />
                      <span style={{ color: dark ? '#94a3b8' : '#475569' }} className="font-semibold">{breadcrumb}</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md"
                  style={{ background: dark ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.15)' }}>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Live</span>
                </div>
              </div>

              {/* Right */}
              <div className="flex items-center gap-1.5">

                {/* Horizon controls (demand page) */}
                {horizonControls && <div className="mr-1">{horizonControls}</div>}

                {/* Month filter */}
                {onMonthFilterChange && (
                  <div className="relative" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setFilterOpen(v => !v)}
                      className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11px] font-medium transition-all"
                      style={{
                        background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.04)',
                        border: `1px solid ${border}`,
                        color: dark ? '#94a3b8' : '#475569',
                      }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />
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
                          className="absolute right-0 top-10 z-50 rounded-xl overflow-hidden shadow-2xl min-w-[176px]"
                          style={{ background: dark ? '#0d1220' : '#fff', border: `1px solid ${border}` }}>
                          <div className="px-3 py-2" style={{ borderBottom: `1px solid ${border}` }}>
                            <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: dark ? 'rgba(148,163,184,0.4)' : '#94a3b8' }}>Time Period</p>
                          </div>
                          {MONTH_FILTERS.map(f => (
                            <button key={f.value}
                              onClick={() => { onMonthFilterChange(f.value); setFilterOpen(false) }}
                              className="w-full text-left px-3 py-2 text-[11px] transition-colors flex items-center justify-between gap-3"
                              style={{
                                color: f.value === monthFilter ? meta.color : dark ? '#94a3b8' : '#475569',
                                background: f.value === monthFilter ? (dark ? `${meta.color}0d` : `${meta.color}08`) : 'transparent',
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
                  <button onClick={() => setNotifOpen(v => !v)}
                    className="icon-btn relative">
                    <Bell className="w-3.5 h-3.5" />
                    {notifications.length > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-red-500 text-[8px] font-bold text-white flex items-center justify-center">
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
                        className="absolute right-0 top-10 z-50 rounded-xl overflow-hidden shadow-2xl w-72"
                        style={{ background: dark ? '#0d1220' : '#fff', border: `1px solid ${border}` }}>
                        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${border}` }}>
                          <p className="text-[11px] font-semibold" style={{ color: dark ? '#e2e8f0' : '#1e293b' }}>Notifications</p>
                          <button onClick={() => setNotifOpen(false)}><X className="w-3.5 h-3.5 text-gray-400" /></button>
                        </div>
                        {notifications.length === 0 ? (
                          <div className="px-4 py-6 text-center">
                            <p className="text-[11px] text-gray-400">No new notifications</p>
                          </div>
                        ) : (
                          <div className="divide-y" style={{ borderColor: dark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.05)' }}>
                            {notifications.map(n => (
                              <div key={n.id} className="px-4 py-3 flex items-start gap-3">
                                {n.type === 'alert' && <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />}
                                {n.type === 'info' && <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />}
                                {n.type === 'success' && <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />}
                                <p className="text-[11px] leading-relaxed" style={{ color: dark ? '#94a3b8' : '#475569' }}>{n.text}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Refresh */}
                {onRefresh && (
                  <button onClick={onRefresh} className="icon-btn">
                    <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                  </button>
                )}

                {/* Export */}
                {onExport && (
                  <button onClick={onExport}
                    className="hidden sm:flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11px] font-medium transition-all"
                    style={{ background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.04)', border: `1px solid ${border}`, color: dark ? '#94a3b8' : '#475569' }}>
                    <Download className="w-3.5 h-3.5" /> Export
                  </button>
                )}

                {/* Theme */}
                <button onClick={() => setDark(v => !v)} className="icon-btn">
                  {dark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                </button>

                {/* Agent badge */}
                <div className="hidden md:flex items-center gap-1.5 h-8 px-2.5 rounded-lg"
                  style={{ background: `${meta.color}0f`, border: `1px solid ${meta.color}20` }}>
                  <Zap className="w-3 h-3" style={{ color: meta.color }} />
                  <span className="text-[11px] font-semibold" style={{ color: meta.color }}>{meta.label}</span>
                </div>

                {/* User avatar */}
                <div className="h-7 w-7 rounded-full flex items-center justify-center ml-1 shrink-0"
                  style={{ background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)', border: `1px solid ${border}` }}>
                  <User className="w-3.5 h-3.5" style={{ color: dark ? '#94a3b8' : '#64748b' }} />
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
      </div>
    </ThemeCtx.Provider>
  )
}
