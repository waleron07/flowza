export type Organization = {
  id: string;
  tenantId: number;
  slug: string;
  name: string;
  description: string;
  heroTitle?: string | null;
  heroSubtitle?: string | null;
  heroDescription?: string | null;
  heroImageUrl?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  address: string | null;
  phone: string | null;
  timezone: string;
  deliveryFee: number;
  minOrderAmount: number;
};
