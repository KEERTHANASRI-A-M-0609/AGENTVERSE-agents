import { useState, useEffect, useCallback } from 'react'
import { Bell, Send, Trash2, Clock, CheckCircle2, MessageSquare, Plus, X, Package, User, Tag } from 'lucide-react'

export interface Reminder {
  id: string
  productName: string
  productId: string
  type: 'reorder' | 'stockout' | 'review' | 'custom'
  message: string
  dueAt: string
  createdAt: string
  done: boolean
  urgency: 'high' | 'medium' | 'low'
}

export interface TeamMessage {
  id: string
  from: string
  to: string
  productName: string
  productId: string
  body: string
  sentAt: string
  read: boolean
  tag: 'reorder' | 'alert' | 'note'
}

const STORAGE_KEY_R = 'shopmind_reminders'
const STORAGE_KEY_M = 'shopmind_messages'

function load<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) ?? '') } catch { return fallback }
}
function save<T>(key: string, val: T) { localStorage.setItem(key, JSON.stringify(val)) }

const TYPE_LABELS = { reorder: 'Reorder', stockout: 'Stockout', review: 'Review', custom: 'Custom' }
const TAG_LABELS  = { reorder: 'Reorder', alert: 'Alert', note: 'Note' }

const URGENCY_CFG = {
  high:   { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.25)',   label: 'High',   dot: '#ef4444' },
  medium: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.25)',  label: 'Medium', dot: '#f59e0b' },
  low:    { color: '#10b981', bg: 'rgba(16,185,129,0.10)',  border: 'rgba(16,185,129,0.22)',  label: 'Low',    dot: '#10b981' },
}

const TAG_CFG = {
  alert:   { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.22)'  },
  reorder: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.22)' },
  note:    { color: '#6366f1', bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.22)' },
}

function timeLeft(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now()
  if (diff <= 0) return 'Overdue'
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

// ── Glassmorphism field ──────────────────────────────────────────────────────
const fieldStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.13)',
  borderRadius: 10,
  padding: '8px 12px',
  fontSize: 12,
  color: '#e2e8f0',
  outline: 'none',
  width: '100%',
  fontFamily: 'inherit',
  backdropFilter: 'blur(4px)',
}

function GlassField({ as: As = 'input', ...props }: any) {
  return <As style={fieldStyle} {...props} />
}

interface Props {
  products: { id: string; name: string }[]
}

export function ReminderPanel({ products }: Props) {
  const [tab, setTab]           = useState<'reminders' | 'messages'>('reminders')
  const [reminders, setReminders] = useState<Reminder[]>(() => load(STORAGE_KEY_R, []))
  const [messages, setMessages]   = useState<TeamMessage[]>(() => load(STORAGE_KEY_M, []))
  const [showForm, setShowForm]   = useState(false)

  const [rProduct, setRProduct] = useState(products[0]?.id ?? '')
  const [rType, setRType]       = useState<Reminder['type']>('reorder')
  const [rMsg, setRMsg]         = useState('')
  const [rDue, setRDue]         = useState('')
  const [rUrgency, setRUrgency] = useState<Reminder['urgency']>('medium')

  const [mProduct, setMProduct] = useState(products[0]?.id ?? '')
  const [mTo, setMTo]           = useState('')
  const [mBody, setMBody]       = useState('')
  const [mTag, setMTag]         = useState<TeamMessage['tag']>('note')

  useEffect(() => { save(STORAGE_KEY_R, reminders) }, [reminders])
  useEffect(() => { save(STORAGE_KEY_M, messages)  }, [messages])

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default')
      Notification.requestPermission()
  }, [])

  useEffect(() => {
    const id = setInterval(() => {
      setReminders(prev => prev.map(r => {
        if (!r.done && new Date(r.dueAt) <= new Date() && 'Notification' in window && Notification.permission === 'granted')
          new Notification(`⚠ ${r.productName}`, { body: r.message, icon: '/vite.svg' })
        return r
      }))
    }, 30_000)
    return () => clearInterval(id)
  }, [])

  const addReminder = useCallback(() => {
    if (!rProduct || !rDue) return
    const prod = products.find(p => p.id === rProduct)
    setReminders(p => [{
      id: `r_${Date.now()}`, productId: rProduct,
      productName: prod?.name ?? rProduct, type: rType,
      message: rMsg || `${TYPE_LABELS[rType]} reminder for ${prod?.name}`,
      dueAt: new Date(rDue).toISOString(), createdAt: new Date().toISOString(),
      done: false, urgency: rUrgency,
    }, ...p])
    setRMsg(''); setRDue(''); setShowForm(false)
  }, [rProduct, rType, rMsg, rDue, rUrgency, products])

  const sendMessage = useCallback(() => {
    if (!mBody.trim()) return
    const prod = products.find(p => p.id === mProduct)
    setMessages(p => [{
      id: `m_${Date.now()}`, from: 'You', to: mTo.trim() || 'Team',
      productId: mProduct, productName: prod?.name ?? mProduct,
      body: mBody.trim(), sentAt: new Date().toISOString(), read: false, tag: mTag,
    }, ...p])
    setMBody(''); setMTo('')
  }, [mProduct, mTo, mBody, mTag, products])

  const toggleDone    = (id: string) => setReminders(p => p.map(r => r.id === id ? { ...r, done: !r.done } : r))
  const deleteReminder = (id: string) => setReminders(p => p.filter(r => r.id !== id))
  const deleteMessage  = (id: string) => setMessages(p => p.filter(m => m.id !== id))

  const pendingCount = reminders.filter(r => !r.done).length
  const unreadCount  = messages.filter(m => !m.read).length

  return (
    <div className="flex flex-col overflow-hidden" style={{
      height: 560,
      background: 'linear-gradient(145deg, rgba(15,20,40,0.85) 0%, rgba(20,15,45,0.9) 100%)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 20,
      backdropFilter: 'blur(24px)',
      boxShadow: '0 8px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)',
    }}>

      {/* ── Header ── */}
      <div className="px-5 pt-4 pb-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 14px rgba(99,102,241,0.4)' }}>
            <Bell className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: '#f1f5f9', letterSpacing: '-0.01em' }}>Reminders</p>
            <p className="text-[10px]" style={{ color: 'rgba(148,163,184,0.6)' }}>
              {pendingCount} pending · {unreadCount} unread
            </p>
          </div>
        </div>
        <button onClick={() => setShowForm(v => !v)}
          className="h-8 w-8 rounded-xl flex items-center justify-center transition-all"
          style={{
            background: showForm ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.07)',
            border: `1px solid ${showForm ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.1)'}`,
            color: showForm ? '#a5b4fc' : 'rgba(148,163,184,0.7)',
          }}>
          {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* ── Tabs ── */}
      <div className="flex shrink-0 px-5 gap-2 pb-3">
        {(['reminders', 'messages'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all capitalize"
            style={{
              background: tab === t
                ? 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.2))'
                : 'rgba(255,255,255,0.05)',
              border: `1px solid ${tab === t ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)'}`,
              color: tab === t ? '#c4b5fd' : 'rgba(148,163,184,0.6)',
              boxShadow: tab === t ? '0 2px 12px rgba(99,102,241,0.2)' : 'none',
            }}>
            {t === 'reminders' ? <Bell className="w-3 h-3" /> : <MessageSquare className="w-3 h-3" />}
            {t}
            {t === 'reminders' && pendingCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                style={{ background: '#ef444430', color: '#fca5a5' }}>{pendingCount}</span>
            )}
            {t === 'messages' && unreadCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                style={{ background: '#6366f130', color: '#a5b4fc' }}>{unreadCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Form ── */}
      {showForm && (
        <div className="mx-4 mb-3 p-4 rounded-2xl shrink-0 space-y-2.5"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(8px)',
          }}>

          {tab === 'reminders' ? (
            <>
              <p className="text-xs font-bold" style={{ color: '#a5b4fc' }}>+ New Reminder</p>
              <div className="grid grid-cols-2 gap-2">
                <select value={rProduct} onChange={e => setRProduct(e.target.value)} style={fieldStyle}>
                  {products.map(p => <option key={p.id} value={p.id} style={{ background: '#1e1b4b' }}>{p.name}</option>)}
                </select>
                <select value={rType} onChange={e => setRType(e.target.value as Reminder['type'])} style={fieldStyle}>
                  {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v} style={{ background: '#1e1b4b' }}>{l}</option>)}
                </select>
              </div>
              <input value={rMsg} onChange={e => setRMsg(e.target.value)}
                placeholder="Note (optional)" style={fieldStyle} />
              <div className="grid grid-cols-2 gap-2">
                <input type="datetime-local" value={rDue} onChange={e => setRDue(e.target.value)} style={fieldStyle} />
                <select value={rUrgency} onChange={e => setRUrgency(e.target.value as Reminder['urgency'])} style={fieldStyle}>
                  <option value="high" style={{ background: '#1e1b4b' }}>🔴 High</option>
                  <option value="medium" style={{ background: '#1e1b4b' }}>🟡 Medium</option>
                  <option value="low" style={{ background: '#1e1b4b' }}>🟢 Low</option>
                </select>
              </div>
              <button onClick={addReminder} disabled={!rProduct || !rDue}
                className="w-full py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-40"
                style={{
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: '#fff',
                  boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
                }}>
                Set Reminder
              </button>
            </>
          ) : (
            <>
              <p className="text-xs font-bold" style={{ color: '#a5b4fc' }}>+ New Message</p>
              <div className="grid grid-cols-2 gap-2">
                <select value={mProduct} onChange={e => setMProduct(e.target.value)} style={fieldStyle}>
                  {products.map(p => <option key={p.id} value={p.id} style={{ background: '#1e1b4b' }}>{p.name}</option>)}
                </select>
                <select value={mTag} onChange={e => setMTag(e.target.value as TeamMessage['tag'])} style={fieldStyle}>
                  {Object.entries(TAG_LABELS).map(([v, l]) => <option key={v} value={v} style={{ background: '#1e1b4b' }}>{l}</option>)}
                </select>
              </div>
              <input value={mTo} onChange={e => setMTo(e.target.value)}
                placeholder="To (e.g. Supplier, Manager)" style={fieldStyle} />
              <textarea value={mBody} onChange={e => setMBody(e.target.value)}
                placeholder="Write your message…" rows={2}
                style={{ ...fieldStyle, resize: 'none' }} />
              <button onClick={sendMessage} disabled={!mBody.trim()}
                className="w-full py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: '#fff',
                  boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
                }}>
                <Send className="w-3.5 h-3.5" /> Send Message
              </button>
            </>
          )}
        </div>
      )}

      {/* ── List ── */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2.5">

        {tab === 'reminders' && (
          <>
            {reminders.length === 0 && (
              <div className="flex flex-col items-center justify-center h-36 gap-3">
                <div className="h-12 w-12 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
                  <Bell className="w-5 h-5" style={{ color: 'rgba(165,180,252,0.5)' }} />
                </div>
                <p className="text-xs font-medium" style={{ color: 'rgba(148,163,184,0.5)' }}>No reminders yet</p>
                <p className="text-[10px]" style={{ color: 'rgba(148,163,184,0.35)' }}>Tap + to add one</p>
              </div>
            )}
            {reminders.map(r => {
              const overdue = !r.done && new Date(r.dueAt) <= new Date()
              const cfg = URGENCY_CFG[r.urgency]
              return (
                <div key={r.id} className="rounded-2xl p-3.5 flex items-start gap-3 transition-all"
                  style={{
                    background: r.done
                      ? 'rgba(255,255,255,0.02)'
                      : overdue
                        ? 'rgba(239,68,68,0.08)'
                        : cfg.bg,
                    border: `1px solid ${r.done ? 'rgba(255,255,255,0.06)' : overdue ? 'rgba(239,68,68,0.3)' : cfg.border}`,
                    opacity: r.done ? 0.5 : 1,
                    backdropFilter: 'blur(8px)',
                  }}>

                  {/* Checkbox */}
                  <button onClick={() => toggleDone(r.id)} className="mt-0.5 shrink-0">
                    {r.done
                      ? <CheckCircle2 className="w-4.5 h-4.5" style={{ color: '#10b981', width: 18, height: 18 }} />
                      : <div className="w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center"
                          style={{ borderColor: overdue ? '#ef4444' : cfg.color }}>
                          {overdue && <div className="w-2 h-2 rounded-full" style={{ background: '#ef4444' }} />}
                        </div>
                    }
                  </button>

                  <div className="flex-1 min-w-0">
                    {/* Product + type pill */}
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <div className="flex items-center gap-1">
                        <Package className="w-3 h-3" style={{ color: 'rgba(148,163,184,0.5)' }} />
                        <span className="text-xs font-bold truncate" style={{ color: '#f1f5f9' }}>{r.productName}</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                        {TYPE_LABELS[r.type]}
                      </span>
                      {overdue && !r.done && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse"
                          style={{ background: 'rgba(239,68,68,0.2)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.35)' }}>
                          Overdue
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(203,213,225,0.8)' }}>{r.message}</p>

                    {/* Time left */}
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <Clock className="w-3 h-3" style={{ color: 'rgba(148,163,184,0.4)' }} />
                      <span className="text-[10px] font-mono font-semibold"
                        style={{ color: r.done ? 'rgba(148,163,184,0.4)' : overdue ? '#fca5a5' : cfg.color }}>
                        {r.done ? 'Done' : timeLeft(r.dueAt)}
                      </span>
                      {/* Urgency dot */}
                      <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: `${cfg.color}15`, color: cfg.color }}>
                        {cfg.label}
                      </span>
                    </div>
                  </div>

                  <button onClick={() => deleteReminder(r.id)}
                    className="shrink-0 p-1.5 rounded-xl transition-all hover:bg-red-500/15">
                    <Trash2 className="w-3.5 h-3.5" style={{ color: 'rgba(148,163,184,0.35)' }} />
                  </button>
                </div>
              )
            })}
          </>
        )}

        {tab === 'messages' && (
          <>
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-36 gap-3">
                <div className="h-12 w-12 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
                  <MessageSquare className="w-5 h-5" style={{ color: 'rgba(165,180,252,0.5)' }} />
                </div>
                <p className="text-xs font-medium" style={{ color: 'rgba(148,163,184,0.5)' }}>No messages yet</p>
                <p className="text-[10px]" style={{ color: 'rgba(148,163,184,0.35)' }}>Tap + to send one</p>
              </div>
            )}
            {messages.map(m => {
              const cfg = TAG_CFG[m.tag]
              return (
                <div key={m.id} className="rounded-2xl p-3.5 flex items-start gap-3"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.09)',
                    backdropFilter: 'blur(8px)',
                  }}>

                  {/* Avatar */}
                  <div className="h-9 w-9 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                    <MessageSquare className="w-4 h-4" style={{ color: cfg.color }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-bold" style={{ color: '#f1f5f9' }}>{m.productName}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                        {TAG_LABELS[m.tag]}
                      </span>
                      <div className="flex items-center gap-1 ml-auto">
                        <User className="w-2.5 h-2.5" style={{ color: 'rgba(148,163,184,0.4)' }} />
                        <span className="text-[10px]" style={{ color: 'rgba(148,163,184,0.55)' }}>{m.to}</span>
                      </div>
                    </div>

                    <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(203,213,225,0.85)' }}>{m.body}</p>

                    <p className="text-[10px] mt-1.5 font-mono" style={{ color: 'rgba(148,163,184,0.4)' }}>
                      {new Date(m.sentAt).toLocaleString()}
                    </p>
                  </div>

                  <button onClick={() => deleteMessage(m.id)}
                    className="shrink-0 p-1.5 rounded-xl hover:bg-red-500/15 transition-all">
                    <Trash2 className="w-3.5 h-3.5" style={{ color: 'rgba(148,163,184,0.35)' }} />
                  </button>
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
