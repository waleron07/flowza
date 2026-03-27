export const userRoles = {
  superAdmin: 'superAdmin',
  admin: 'admin',
  moderator: 'moderator',
  operator: 'operator',
  user: 'user',
} as const

export type UserRole = (typeof userRoles)[keyof typeof userRoles]

export type CreateStaffUserDto = {
  phone: string
  firstName: string
  lastName?: string
  email?: string
  password: string
  role: UserRole
  tenantId?: number
}
