import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import { getMeRequest, loginRequest } from '../api/authApi'
import { getAccessToken, removeAccessToken, setAccessToken } from '../../../shared/lib/token-storage'
import type { AuthUser, LoginRequestDto } from '../../../shared/types/auth'
import { AuthContext, type AuthStatus } from './auth-context'
import { isStaffRole } from '../../../app/router/utils'

export function AuthProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AuthStatus>(() =>
    getAccessToken() ? 'loading' : 'guest',
  )
  const [user, setUser] = useState<AuthUser | null>(null)

  useEffect(() => {
    const token = getAccessToken()

    if (!token) {
      return
    }

    let active = true

    void getMeRequest(token)
      .then((restoredUser) => {
        if (!isStaffRole(restoredUser.role)) {
          removeAccessToken()

          if (!active) {
            return
          }

          setUser(null)
          setStatus('guest')
          return
        }

        if (!active) {
          return
        }

        setUser(restoredUser)
        setStatus('authenticated')
      })
      .catch(() => {
        removeAccessToken()

        if (!active) {
          return
        }

        setUser(null)
        setStatus('guest')
      })

    return () => {
      active = false
    }
  }, [])

  const login = useCallback(async (payload: LoginRequestDto) => {
    const result = await loginRequest(payload)

    if (!isStaffRole(result.user.role)) {
      removeAccessToken()
      throw new Error('Роль user не имеет доступа к админке')
    }

    setAccessToken(result.accessToken)
    setUser(result.user)
    setStatus('authenticated')
  }, [])

  const logout = useCallback(() => {
    removeAccessToken()
    setUser(null)
    setStatus('guest')
  }, [])

  const value = useMemo(
    () => ({
      status,
      user,
      login,
      logout,
    }),
    [login, logout, status, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
