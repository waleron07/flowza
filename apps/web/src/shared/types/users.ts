export const userRoles = {
  superAdmin: 'superAdmin',
  admin: 'admin',
  moderator: 'moderator',
  operator: 'operator',
  user: 'user',
} as const

export type UserRole = (typeof userRoles)[keyof typeof userRoles]
