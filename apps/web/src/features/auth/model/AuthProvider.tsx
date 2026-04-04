import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import {
  deleteMeRequest,
  getMeRequest,
  loginRequest,
  registerRequest,
} from '../api/authApi'
import {
  getAccessToken,
  removeAccessToken,
  setAccessToken,
} from '../../../shared/lib/token-storage'
import { normalizeAuthUser } from '../../../shared/lib/normalize-auth-user'
import type {
  AuthResponseDto,
  AuthUser,
  LoginRequestDto,
  RegisterRequestDto,
} from '../../../shared/types/auth'
import { AuthContext, type AuthStatus } from './auth-context'

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
        if (!active) {
          return
        }

        setUser(normalizeAuthUser(restoredUser))
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

    setAccessToken(result.accessToken)
    setUser(normalizeAuthUser(result.user))
    setStatus('authenticated')
  }, [])

  const register = useCallback(async (payload: RegisterRequestDto) => {
    const result = await registerRequest(payload)

    if (result.accessToken && result.user) {
      setAccessToken(result.accessToken)
      setUser(normalizeAuthUser(result.user))
      setStatus('authenticated')
      return result
    }

    setStatus('guest')
    return result
  }, [])

  const applyAuthSession = useCallback((result: AuthResponseDto) => {
    setAccessToken(result.accessToken)
    setUser(normalizeAuthUser(result.user))
    setStatus('authenticated')
  }, [])

  const logout = useCallback(() => {
    removeAccessToken()
    setUser(null)
    setStatus('guest')
  }, [])

  const deleteAccount = useCallback(async () => {
    await deleteMeRequest()
    removeAccessToken()
    setUser(null)
    setStatus('guest')
  }, [])

  const value = useMemo(
    () => ({
      status,
      user,
      login,
      register,
      applyAuthSession,
      logout,
      deleteAccount,
    }),
    [applyAuthSession, deleteAccount, login, logout, register, status, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
