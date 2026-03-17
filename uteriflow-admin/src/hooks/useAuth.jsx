import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [token, setToken]     = useState(() => localStorage.getItem('uf_token'))
  const [loading, setLoading] = useState(false)

  const saveToken = (t) => {
    setToken(t)
    localStorage.setItem('uf_token', t)
  }

  const login = async (email, password) => {
    const data = await api.login({ email, password })
    saveToken(data.session.accessToken)
    setUser(data.user)
    return data
  }

  const logout = async () => {
    try { await api.logout() } catch {}
    setToken(null)
    setUser(null)
    localStorage.removeItem('uf_token')
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, saveToken, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
