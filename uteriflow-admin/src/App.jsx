import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './hooks/useAuth'
import Sidebar from './components/Sidebar'
import AuthPage from './pages/AuthPage'
import AnalyticsPage from './pages/AnalyticsPage'
import UsersPage from './pages/UsersPage'
import ContentPage from './pages/ContentPage'
import NotificationsPage from './pages/NotificationsPage'
import SettingsPage from './pages/SettingsPage'

function Layout({ children }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main className="main-content">{children}</main>
      <style>{`
        .main-content { margin-left: var(--sidebar-w); flex: 1; padding: 36px 40px; min-height: 100vh; background: var(--gray-50); }
        @media(max-width: 768px) { .main-content { margin-left: 0; padding: 80px 16px 32px; } }
        @media(max-width: 480px) { .main-content { padding: 76px 12px 28px; } }
      `}</style>
    </div>
  )
}

function PrivateRoute({ children }) {
  const { token, loading } = useAuth()
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'var(--gray-50)' }}>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'16px' }}>
        <div style={{ width:'40px', height:'40px', border:'3px solid var(--gray-200)', borderTopColor:'var(--purple)', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
        <p style={{ color:'var(--gray-400)', fontSize:'14px' }}>Loading…</p>
      </div>
    </div>
  )
  return token ? children : <Navigate to="/login" replace />
}

function AppRoutes() {
  const { token, loading } = useAuth()
  if (loading) return null
  return (
    <Routes>
      <Route path="/login"         element={token ? <Navigate to="/analytics" replace /> : <AuthPage />} />
      <Route path="/analytics"     element={<PrivateRoute><Layout><AnalyticsPage /></Layout></PrivateRoute>} />
      <Route path="/users"         element={<PrivateRoute><Layout><UsersPage /></Layout></PrivateRoute>} />
      <Route path="/content"       element={<PrivateRoute><Layout><ContentPage /></Layout></PrivateRoute>} />
      <Route path="/notifications" element={<PrivateRoute><Layout><NotificationsPage /></Layout></PrivateRoute>} />
      <Route path="/settings"      element={<PrivateRoute><Layout><SettingsPage /></Layout></PrivateRoute>} />
      <Route path="*"              element={<Navigate to={token ? '/analytics' : '/login'} replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: { fontFamily:'DM Sans, sans-serif', fontSize:'14px', borderRadius:'10px', boxShadow:'0 8px 24px rgba(0,0,0,0.12)' },
          success: { iconTheme: { primary:'var(--green)', secondary:'white' } },
          error:   { iconTheme: { primary:'var(--red)',   secondary:'white' } },
        }}
      />
    </AuthProvider>
  )
}
