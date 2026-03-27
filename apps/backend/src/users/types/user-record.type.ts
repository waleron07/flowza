export interface UserRecord {
  id: number;
  tenantId: number | null;
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
