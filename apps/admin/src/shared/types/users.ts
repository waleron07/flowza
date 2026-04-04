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
  login: string
  email: string
  password: string
  role: UserRole
  tenantId?: number
}
