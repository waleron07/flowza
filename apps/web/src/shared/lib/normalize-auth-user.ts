import type { AuthApiUser, AuthUser } from '../types/auth'

export function normalizeAuthUser(raw: AuthApiUser): AuthUser {
  return {
    id: raw.id,
    phone: raw.phone,
    login: raw.login,
    role: raw.role,
    email: raw.email,
    tenantId: raw.tenantId ?? raw.primaryTenantId ?? null,
    isActive: raw.isActive,
  }
}
