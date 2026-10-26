import { flushPreferences } from '@/lib/preferences'
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { type RegisterInput, type LoginInput } from '@/services/auth'
import type { UserRecord, TutorProfileRecord } from '@/types/community'

interface AuthContextValue {
  user: UserRecord | null
  profile: TutorProfileRecord | null
  isAuthenticated: boolean
  loading: boolean
  login: (input: LoginInput) => Promise<void>
  register: (input: RegisterInput) => Promise<void>
  logout: () => void
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserRecord | null>(() => null)
  const [profile, setProfile] = useState<TutorProfileRecord | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshProfile = useCallback(async () => {
    try {
      const response = await fetch('/api/pilot/me', { credentials: 'same-origin' })
      if (!response.ok) throw new Error('Sessão encerrada')
      const account = await response.json()
      setUser({
        id: account.id,
        email: account.email,
        name: account.name,
        created: '',
        updated: '',
      })
      setProfile(null)
    } catch {
      setUser(null)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshProfile()
  }, [refreshProfile])

  const login = async (input: LoginInput) => {
    const response = await fetch('/api/pilot/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!response.ok) throw new Error('Credenciais inválidas')
    await refreshProfile()
  }
  const register = async (_input: RegisterInput) => {
    throw new Error('O acesso é por convite nesta etapa.')
  }
  const logout = () => {
    flushPreferences()
      .then(() => fetch('/api/pilot/logout', { method: 'POST' }))
      .finally(() => {sessionStorage.removeItem('mb_offline_session');sessionStorage.removeItem('mb_active_account');window.location.assign('/')})
    setUser(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isAuthenticated: Boolean(user),
        loading,
        login,
        register,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider')
  }
  return ctx
}
