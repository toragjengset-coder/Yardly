import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Navbar from './components/Navbar'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import PlantDetail from './pages/PlantDetail'
import SeasonalCalendar from './pages/SeasonalCalendar'
import HarvestOverview from './pages/HarvestOverview'
import Profile from './pages/Profile'
import Naboer from './pages/Naboer'
import Admin from './pages/Admin'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/"                    element={<Landing />} />
          <Route path="/garden/:username"    element={<Profile />} />

          {/* Protected — wrapped in sidebar layout */}
          <Route element={<ProtectedLayout />}>
            <Route path="/dashboard"   element={<Dashboard />} />
            <Route path="/plant/:id"   element={<PlantDetail />} />
            <Route path="/calendar"    element={<SeasonalCalendar />} />
            <Route path="/harvest"     element={<HarvestOverview />} />
            <Route path="/naboer"      element={<Naboer />} />
            <Route path="/profile"     element={<Profile />} />
          </Route>

          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

function ProtectedLayout() {
  const { user, loading } = useAuth()

  if (loading) return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-sage-300 border-t-sage-600 rounded-full animate-spin" />
    </div>
  )

  if (!user) return <Navigate to="/" replace />

  return (
    <div className="min-h-screen bg-cream flex">
      <Navbar />
      <main className="yardly-main flex-1 ml-56 p-8 max-w-4xl" style={{minWidth:0}}>
        <Outlet />
      </main>
    </div>
  )
}
