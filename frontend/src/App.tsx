import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Dashboard from '@/pages/Dashboard'
import BusinessAnalytics from '@/pages/BusinessAnalytics'
import MissionControl from '@/pages/MissionControl'
import Settings from '@/pages/Settings'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MissionControl />} />
        <Route path="/forecast" element={<Dashboard />} />
        <Route path="/agents/demand" element={<Dashboard />} />
        <Route path="/analytics" element={<BusinessAnalytics />} />
        <Route path="/agents/intelligence" element={<BusinessAnalytics />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
