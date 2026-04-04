import { createContext } from 'react'
import type {
  AuthResponseDto,
  AuthUser,
  LoginRequestDto,
  RegisterRequestDto,
  RegisterResponseDto,
} from '../../../shared/types/auth'

export type AuthStatus = 'loading' | 'guest' | 'authenticated'

export type AuthContextValue = {
  status: AuthStatus
  user: AuthUser | null
  login: (payload: LoginRequestDto) => Promise<void>
  register: (payload: RegisterRequestDto) => Promise<RegisterResponseDto>
  /** Установить сессию из ответа verify-email (например после показа экрана успеха при регистрации). */
  applyAuthSession: (result: AuthResponseDto) => void
  logout: () => void
  deleteAccount: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
