import React, { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import type { Role, User } from '../types/pos'
import { posApi } from '../services/api'

interface AuthContextType {
  currentUser: User | null
  isLoadingAuth: boolean
  loginWithPin: (pin: string) => Promise<User>
  loginWithCredentials: (username: string, password: string) => Promise<User>
  logout: () => Promise<void>
  hasRole: (allowedRoles: Role[]) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isLoadingAuth, setIsLoadingAuth] = useState(true)

  useEffect(() => {
    async function initAuth() {
      if (posApi.getToken()) {
        try {
          const user = await posApi.getMe()
          setCurrentUser(user)
        } catch {
          posApi.clearToken()
          setCurrentUser(null)
        }
      }
      setIsLoadingAuth(false)
    }
    initAuth()
  }, [])

  const loginWithPin = async (pin: string): Promise<User> => {
    const res = await posApi.login({ pin })
    setCurrentUser(res.user)
    return res.user
  }

  const loginWithCredentials = async (username: string, password: string): Promise<User> => {
    const res = await posApi.login({ username, password })
    setCurrentUser(res.user)
    return res.user
  }

  const logout = async () => {
    await posApi.logout()
    setCurrentUser(null)
  }

  const hasRole = (allowedRoles: Role[]): boolean => {
    if (!currentUser) return false
    return allowedRoles.includes(currentUser.role)
  }

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isLoadingAuth,
        loginWithPin,
        loginWithCredentials,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
