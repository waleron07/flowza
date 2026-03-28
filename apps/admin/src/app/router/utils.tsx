import type { UserRole } from '../../shared/types/users'
import { userRoles } from '../../shared/types/users'

export const staffRoles: UserRole[] = [
  userRoles.superAdmin,
  userRoles.admin,
  userRoles.moderator,
  userRoles.operator,
]

export function isStaffRole(role: UserRole | undefined | null): role is UserRole {
  if (!role) {
    return false
  }

  return staffRoles.includes(role)
}

export function getRoleAreaLabel(role: UserRole | undefined | null) {
  switch (role) {
    case userRoles.superAdmin:
      return 'SuperAdmin'
    case userRoles.admin:
      return 'Admin'
    case userRoles.moderator:
      return 'Moderator'
    case userRoles.operator:
      return 'Operator'
    default:
      return 'Guest'
  }
}
