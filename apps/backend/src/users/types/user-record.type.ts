export interface UserRecord {
  id: number;
  primaryTenantId: number | null;
  organizationIds: number[];
  email: string;
  emailVerifiedAt: Date | null;
  phone: string;
  passwordHash: string;
  role: string;
  login: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
