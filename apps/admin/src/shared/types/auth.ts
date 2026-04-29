import type { UserRole } from './users'

export type AuthUser = {
  id: number
  phone: string
  login: string
  role: UserRole
  primaryTenantId: number | null
  organizationIds: number[]
  isActive?: boolean
}

export type LoginRequestDto = {
  identifier: string
  password: string
}

export type LoginResponseDto = {
  accessToken: string
  user: AuthUser
}
