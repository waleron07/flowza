import { UserRole } from '../../common/enums/user-role.enum';

export interface TenantActor {
  role: UserRole;
  organizationIds: number[];
}
