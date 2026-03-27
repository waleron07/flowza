export type UserRole = 'admin' | 'moderator' | 'operator'

export interface JwtPayloadDto {
  userId: number
  tenantId: number
  role: UserRole
}
