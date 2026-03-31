import { UserRole } from '../../common/enums/user-role.enum';

export interface JwtPayload {
  userId: number;
  primaryTenantId: number | null;
  organizationIds: number[];
  role: UserRole;
}
