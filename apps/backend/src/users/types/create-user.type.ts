import { UserRole } from '../../common/enums/user-role.enum';

export interface CreateUserInput {
  tenantId?: number;
  organizationIds?: number[];
  email?: string;
  phone: string;
  passwordHash: string;
  role: UserRole;
  firstName: string;
  lastName?: string;
  isActive?: boolean;
}
