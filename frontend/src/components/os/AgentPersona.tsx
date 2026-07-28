import { AgentDefinition } from '@/lib/agents'
import { BrainCircuit, LineChart, UserCog } from 'lucide-react'

const ICONS = {
  demand: BrainCircuit,
  intelligence: LineChart,
  manager: UserCog,
}

const ACCENT = {
  intel: 'bg-intel-soft text-intel dark:bg-blue-500/15 dark:text-blue-300',
  healthy: 'bg-healthy-soft text-healthy dark:bg-emerald-500/15 dark:text-emerald-300',
  opportunity: 'bg-opportunity-soft text-opportunity dark:bg-violet-500/15 dark:text-violet-300',
}

interface Props {
  agent: AgentDefinition
  status: string
  mission: string
  confidence?: number
  lastUpdated?: string
  nextAction?: string
  compact?: boolean
}

export function AgentPersona({
  agent,
  status,
  mission,
  confidence,
  lastUpdated,
  nextAction,
  compact,
}: Props) {
  const Icon = ICONS[agent.id] ?? BrainCircuit

  return (
    <div className={`panel ${compact ? 'p-4' : 'p-5'}`}>
      <div className="flex items-start gap-3">
        <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${ACCENT[agent.accent]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-ink-900 dark:text-white">{agent.name}</h3>
            <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-600 dark:text-gray-300 bg-ink-50 dark:bg-white/5 border border-ink-100 dark:border-white/8 rounded-full px-2 py-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-healthy animate-pulseDot" />
              {status}
            </span>
          </div>
          <p className="text-xs text-ink-500 mt-1">{agent.role}</p>
        </div>
      </div>

      <div className={`mt-4 grid gap-3 ${compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
        <div>
          <p className="label-caps mb-1">Current mission</p>
          <p className="text-sm text-ink-800 dark:text-gray-200">{mission}</p>
        </div>
        {typeof confidence === 'number' && (
          <div>
            <p className="label-caps mb-1">Confidence</p>
            <p className="font-mono text-sm font-medium">{Math.round(confidence)}%</p>
          </div>
        )}
        {lastUpdated && (
          <div>
            <p className="label-caps mb-1">Last updated</p>
            <p className="text-sm text-ink-700 dark:text-gray-300">{lastUpdated}</p>
          </div>
        )}
        {nextAction && (
          <div>
            <p className="label-caps mb-1">Next action</p>
            <p className="text-sm text-ink-700 dark:text-gray-300">{nextAction}</p>
          </div>
        )}
      </div>
    </div>
  )
}
