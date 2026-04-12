export type ProductCategory = {
  id: string;
  organizationId: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  sortOrder?: number;
};

export type Product = {
  id: string;
  organizationId: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  image: string;
  badgeText?: string | null;
};
