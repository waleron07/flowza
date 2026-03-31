export interface UserRecord {
  id: number;
  tenantId: number | null;
  organizationIds: number[];
  email: string | null;
  phone: string;
  passwordHash: string;
  role: string;
  firstName: string;
  lastName: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
