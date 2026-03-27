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

export type LoginResponseDto = {
  accessToken: string
  user: AuthUser
}
