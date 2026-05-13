export type ManageableOrganizationListItem = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
};

export type OrganizationCategory = {
  id: number;
  tenantId: number;
  name: string;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type OrganizationProduct = {
  id: number;
  tenantId: number;
  categoryId: number;
  name: string;
  description: string | null;
  imageUrl: string | null;
  badgeText: string | null;
  price: number;
  currency: string;
  isActive: boolean;
};

export type OrganizationDetails = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  heroTitle: string | null;
  heroSubtitle: string | null;
  heroDescription: string | null;
  heroImageUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  isActive: boolean;
  phone: string | null;
  address: string | null;
  timezone: string;
  workingHours: Record<string, unknown> | string | null;
  deliveryFee: string;
  minOrderAmount: string;
  subscription: string | null;
};

export type OrganizationWorkingHours = {
  from: string;
  to: string;
};

export type OrganizationManagementResponse = {
  tenant: OrganizationDetails;
  categories: OrganizationCategory[];
  products: OrganizationProduct[];
};

export type UpsertOrganizationDto = {
  adminUserId?: number;
  name?: string;
  slug?: string;
  description?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  heroDescription?: string;
  heroImageUrl?: string;
  seoTitle?: string;
  seoDescription?: string;
  phone?: string;
  address?: string;
  timezone?: string;
  workingHours?: OrganizationWorkingHours;
  deliveryFee?: string;
  minOrderAmount?: string;
  subscription?: string;
  isActive?: boolean;
};

export type UpsertCategoryDto = {
  tenantId: number;
  name: string;
  description?: string;
  imageUrl?: string;
  sortOrder?: number;
  isActive?: boolean;
};

export type UpsertProductDto = {
  tenantId: number;
  categoryId: number;
  name: string;
  description?: string;
  imageUrl?: string;
  badgeText?: string;
  price: number;
  currency?: string;
  isActive?: boolean;
};
