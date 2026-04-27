import { createContext, useContext, useState, useEffect, useRef } from 'react'
import api from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null)
  const [token, setToken]   = useState(() => localStorage.getItem('uf_token'))
  const [loading, setLoading] = useState(true) // start true — check stored token first
  const refreshTimer        = useRef(null)

  const saveSession = (accessToken, refreshToken, expiresAt) => {
    setToken(accessToken)
    localStorage.setItem('uf_token',         accessToken)
    localStorage.setItem('uf_refresh_token', refreshToken || '')
    localStorage.setItem('uf_expires_at',    expiresAt   || '')
  }

  const clearSession = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('uf_token')
    localStorage.removeItem('uf_refresh_token')
    localStorage.removeItem('uf_expires_at')
    if (refreshTimer.current) clearTimeout(refreshTimer.current)
  }

  const scheduleRefresh = (expiresAt) => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current)
    if (!expiresAt) return

    const expiresMs  = Number(expiresAt) * 1000       
    const nowMs      = Date.now()
    const refreshIn  = expiresMs - nowMs - 2 * 60 * 1000  

    if (refreshIn <= 0) {
      doRefresh()
      return
    }

    refreshTimer.current = setTimeout(doRefresh, refreshIn)
  }

  const doRefresh = async () => {
    const refreshToken = localStorage.getItem('uf_refresh_token')
    if (!refreshToken) { clearSession(); return }

    try {
      const payload = await api.refreshToken(refreshToken)
      const s = payload.session
      if (!s?.accessToken) { clearSession(); return }
      saveSession(s.accessToken, s.refreshToken, s.expiresAt)
      scheduleRefresh(s.expiresAt)
    } catch {
      clearSession()
    }
  }

  useEffect(() => {
    const storedToken   = localStorage.getItem('uf_token')
    const expiresAt     = localStorage.getItem('uf_expires_at')

    if (!storedToken) { setLoading(false); return }

    if (expiresAt && Number(expiresAt) * 1000 < Date.now()) {
      doRefresh().finally(() => setLoading(false))
    } else {
      scheduleRefresh(expiresAt)
      setLoading(false)
    }

    return () => { if (refreshTimer.current) clearTimeout(refreshTimer.current) }
  }, [])

  const login = async (email, password) => {
    // Interceptor now returns the inner data directly: { session, user }
    const payload = await api.login({ email, password })
    const s = payload.session
    if (!s?.accessToken) throw new Error('Login failed: no session returned')
    saveSession(s.accessToken, s.refreshToken, s.expiresAt)
    setUser(payload.user)
    scheduleRefresh(s.expiresAt)
    return payload
  }

  const logout = async () => {
    try { await api.logout() } catch {}
    clearSession()
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, saveSession, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
