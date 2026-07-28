/** Agent registry */
export type AgentId = 'demand' | 'intelligence' | 'manager'

export interface AgentDefinition {
  id: AgentId
  name: string
  shortName: string
  role: string
  path: string
  accent: 'intel' | 'healthy' | 'opportunity' | 'warn'
  defaultStatus: string
  defaultMission: string
  color: string
  description: string
}

export const AGENTS: Record<Exclude<AgentId, 'manager'>, AgentDefinition> = {
  demand: {
    id: 'demand',
    name: 'Demand Prediction Agent',
    shortName: 'Demand',
    role: 'Predicts demand and recommends restocks before stockouts',
    path: '/forecast',
    accent: 'intel',
    defaultStatus: 'Monitoring sales',
    defaultMission: 'Predicting next week demand',
    color: 'blue',
    description: 'ML-powered demand forecasting with reorder intelligence. Prevents stockouts before they happen.',
  },
  intelligence: {
    id: 'intelligence',
    name: 'Business Intelligence Agent',
    shortName: 'BI',
    role: 'Explains performance and produces executive decisions',
    path: '/analytics',
    accent: 'opportunity',
    defaultStatus: 'Generating executive report',
    defaultMission: 'Analyzing store performance',
    color: 'purple',
    description: 'Revenue analytics, health scoring, and executive insights. Turns raw data into decisions.',
  },
}

export const MANAGER_AGENT: AgentDefinition = {
  id: 'manager',
  name: 'Manager Agent',
  shortName: 'Manager',
  role: 'Orchestrates agent collaboration into decisions',
  path: '/',
  accent: 'healthy',
  defaultStatus: 'Standing by',
  defaultMission: 'Coordinate agent recommendations',
  color: 'emerald',
  description: 'Orchestrates all agents and surfaces the most critical actions.',
}

export const SHOP_ID = 'shop_001'
