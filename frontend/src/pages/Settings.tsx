import { useState } from 'react'
import { AgentShell } from '@/components/agent/AgentShell'
import { Store, Bell, Key, RefreshCw, Check, Eye, EyeOff, Save } from 'lucide-react'

const SHOP_ID = 'shop_001'

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-3.5 flex items-center gap-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
        <span style={{ color: 'var(--blue)' }}>{icon}</span>
        <span className="text-[13px] font-semibold" style={{ color: 'var(--text-1)' }}>{title}</span>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12px] font-semibold" style={{ color: 'var(--text-1)' }}>{label}</label>
      {hint && <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>{hint}</p>}
      {children}
    </div>
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-[12px] font-medium" style={{ color: 'var(--text-2)' }}>{label}</span>
      <button
        onClick={() => onChange(!checked)}
        className="relative w-9 h-5 rounded-full transition-colors"
        style={{ background: checked ? 'var(--blue)' : 'var(--border)' }}>
        <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform"
          style={{ transform: checked ? 'translateX(16px)' : 'translateX(0)' }} />
      </button>
    </div>
  )
}

export default function Settings() {
  const [shopName, setShopName] = useState('My Retail Store')
  const [shopId] = useState(SHOP_ID)
  const [refreshInterval, setRefreshInterval] = useState('5')
  const [forecastHorizon] = useState('30')
  const [geminiEnabled, setGeminiEnabled] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [notifStockout, setNotifStockout] = useState(true)
  const [notifReorder, setNotifReorder] = useState(true)
  const [notifRevenue, setNotifRevenue] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    // Persist to localStorage for demo
    localStorage.setItem('shopmind-settings', JSON.stringify({
      shopName, refreshInterval, geminiEnabled,
      notifStockout, notifReorder, notifRevenue,
    }))
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <AgentShell agent="settings" shopName={shopId}>
      <div className="p-5 max-w-2xl space-y-5">

        {/* Header */}
        <div>
          <h2 className="text-[18px] font-bold" style={{ color: 'var(--text-1)', letterSpacing: '-0.02em' }}>Settings</h2>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-3)' }}>Configure your ShopMind AI platform preferences.</p>
        </div>

        {/* Store */}
        <Section title="Store Configuration" icon={<Store className="w-4 h-4" />}>
          <Field label="Store Display Name">
            <input
              value={shopName}
              onChange={e => setShopName(e.target.value)}
              className="w-full h-9 px-3 rounded-lg text-[12px] outline-none transition-all"
              style={{
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                color: 'var(--text-1)', fontFamily: 'inherit',
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--blue)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
          </Field>
          <Field label="Store ID" hint="Read-only — set during dataset load">
            <input value={shopId} readOnly
              className="w-full h-9 px-3 rounded-lg text-[12px]"
              style={{
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                color: 'var(--text-3)', fontFamily: 'inherit', cursor: 'not-allowed',
              }} />
          </Field>
          <Field label="Dashboard Refresh Interval" hint="How often the dashboard auto-refreshes (minutes)">
            <select
              value={refreshInterval}
              onChange={e => setRefreshInterval(e.target.value)}
              className="w-full h-9 px-3 rounded-lg text-[12px] outline-none"
              style={{
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                color: 'var(--text-1)', fontFamily: 'inherit',
              }}>
              <option value="1">Every 1 minute</option>
              <option value="5">Every 5 minutes</option>
              <option value="15">Every 15 minutes</option>
              <option value="30">Every 30 minutes</option>
            </select>
          </Field>
          <Field label="Forecast Horizon" hint="Fixed at 30 days for optimal accuracy">
            <input value={`${forecastHorizon} days`} readOnly
              className="w-full h-9 px-3 rounded-lg text-[12px]"
              style={{
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                color: 'var(--text-3)', fontFamily: 'inherit', cursor: 'not-allowed',
              }} />
          </Field>
        </Section>

        {/* Gemini AI */}
        <Section title="Gemini AI Integration" icon={<Key className="w-4 h-4" />}>
          <Toggle checked={geminiEnabled} onChange={setGeminiEnabled} label="Enable Gemini AI explanations" />
          {geminiEnabled && (
            <Field label="Gemini API Key" hint="Used only for on-demand AI explanations via the Explain button">
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="AIza..."
                  className="w-full h-9 px-3 pr-9 rounded-lg text-[12px] outline-none transition-all"
                  style={{
                    background: 'var(--surface-2)', border: '1px solid var(--border)',
                    color: 'var(--text-1)', fontFamily: 'inherit',
                  }}
                  onFocus={e => (e.target.style.borderColor = 'var(--blue)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                />
                <button onClick={() => setShowKey(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-3)' }}>
                  {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </Field>
          )}
          <div className="rounded-lg p-3 text-[11px]" style={{ background: 'var(--blue-lt)', border: '1px solid var(--blue-bd)', color: 'var(--blue)' }}>
            Gemini is only called when you click <strong>Explain with AI</strong>. Auto-refresh and bulk forecasts never use Gemini.
          </div>
        </Section>

        {/* Notifications */}
        <Section title="Notifications" icon={<Bell className="w-4 h-4" />}>
          <Toggle checked={notifStockout} onChange={setNotifStockout} label="Stockout alerts" />
          <Toggle checked={notifReorder} onChange={setNotifReorder} label="Reorder recommendations" />
          <Toggle checked={notifRevenue} onChange={setNotifRevenue} label="Revenue milestone alerts" />
        </Section>

        {/* Data */}
        <Section title="Data & Sync" icon={<RefreshCw className="w-4 h-4" />}>
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-[12px] font-medium" style={{ color: 'var(--text-1)' }}>Dataset</p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-3)' }}>shopmind_ai_multi_agent_dataset.csv · SQLite</p>
            </div>
            <span className="badge-healthy">Loaded</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-[12px] font-medium" style={{ color: 'var(--text-1)' }}>SSE Event Stream</p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-3)' }}>Real-time events every 8 seconds</p>
            </div>
            <span className="badge-healthy">Active</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-[12px] font-medium" style={{ color: 'var(--text-1)' }}>API Endpoint</p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-3)' }}>http://localhost:8000</p>
            </div>
            <span className="badge-healthy">Connected</span>
          </div>
        </Section>

        {/* Save */}
        <div className="flex justify-end">
          <button onClick={handleSave}
            className="flex items-center gap-2 h-9 px-5 rounded-lg text-[12px] font-semibold transition-all"
            style={{ background: saved ? 'var(--green)' : 'var(--blue)', color: '#fff' }}>
            {saved ? <><Check className="w-3.5 h-3.5" /> Saved</> : <><Save className="w-3.5 h-3.5" /> Save Changes</>}
          </button>
        </div>
      </div>
    </AgentShell>
  )
}
