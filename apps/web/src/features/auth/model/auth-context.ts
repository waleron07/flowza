import { createContext } from 'react'
import type {
  AuthUser,
  LoginRequestDto,
  RegisterRequestDto,
} from '../../../shared/types/auth'

export type AuthStatus = 'loading' | 'guest' | 'authenticated'

export type AuthContextValue = {
  status: AuthStatus
  user: AuthUser | null
  login: (payload: LoginRequestDto) => Promise<void>
  register: (payload: RegisterRequestDto) => Promise<void>
  logout: () => void
  deleteAccount: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
