import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api/axios'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)


  useEffect(() => {
    const stored = localStorage.getItem('dms_user')
    if (stored) {
      const parsed = JSON.parse(stored)
      setUser(parsed)
      api.defaults.headers.common['Authorization'] = `Bearer ${parsed.token}`
    }
    setLoading(false)
  }, [])

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    const userData = data.data
    setUser(userData)
    localStorage.setItem('dms_user', JSON.stringify(userData))
    api.defaults.headers.common['Authorization'] = `Bearer ${userData.token}`
    return userData
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('dms_user')
    delete api.defaults.headers.common['Authorization']
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
