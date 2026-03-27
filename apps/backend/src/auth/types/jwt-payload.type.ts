import { UserRole } from '../../common/enums/user-role.enum';

export interface JwtPayload {
  userId: number;
  tenantId: number | null;
  role: UserRole;
}
