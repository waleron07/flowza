import type { UserRole } from './users'

export type AuthUser = {
  id: number
  phone: string
  firstName: string
  lastName?: string | null
  role: UserRole
  tenantId: number | null
  isActive?: boolean
}

export type LoginRequestDto = {
  phone: string
  password: string
}

export type RegisterRequestDto = {
  phone: string
  firstName: string
  password: string
  consentToPrivacyPolicy: boolean
}

export type AuthResponseDto = {
  accessToken: string
  user: AuthUser
}
