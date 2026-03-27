import { createContext } from 'react'
import type { AuthUser, LoginRequestDto } from '../../../shared/types/auth'

export type AuthStatus = 'loading' | 'authenticated' | 'guest'

export type AuthContextValue = {
  status: AuthStatus
  user: AuthUser | null
  login: (payload: LoginRequestDto) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
