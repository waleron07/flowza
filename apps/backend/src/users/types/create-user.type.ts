import { UserRole } from '../../common/enums/user-role.enum';

export interface CreateUserInput {
  primaryTenantId?: number;
  organizationIds?: number[];
  email: string;
  emailVerifiedAt?: Date | null;
  phone: string;
  passwordHash: string;
  role: UserRole;
  login: string;
  isActive?: boolean;
}
