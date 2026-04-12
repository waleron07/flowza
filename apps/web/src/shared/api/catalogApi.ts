import { useQuery } from "@tanstack/react-query";
import { httpClient } from "./http";
import { getApiErrorMessage } from "./get-api-error-message";
import type { Product, ProductCategory } from "../types/catalog";
import type { Organization } from "../types/organization";

const FALLBACK_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80";

type TenantsApiResponse = Array<{
  id: number;
  slug: string;
  name: string;
  description: string | null;
}>;

type TenantCatalogApiResponse = {
  tenant: {
    id: number;
    slug: string;
    name: string;
    description: string | null;
    heroTitle: string | null;
    heroSubtitle: string | null;
    heroDescription: string | null;
    heroImageUrl: string | null;
    seoTitle: string | null;
    seoDescription: string | null;
    phone: string | null;
    address: string | null;
    timezone: string;
    workingHours: Record<string, string> | null;
    deliveryFee: number;
    minOrderAmount: number;
  };
  categories: Array<{
    id: number;
    name: string;
    description: string | null;
    imageUrl: string | null;
    sortOrder: number;
  }>;
  products: Array<{
    id: number;
    categoryId: number;
    name: string;
    description: string | null;
    imageUrl: string | null;
    badgeText: string | null;
    price: number;
    currency: string;
  }>;
};

export type TenantCatalog = {
  organization: Organization;
  categories: ProductCategory[];
  products: Product[];
};

function toOrganization(
  input: TenantCatalogApiResponse["tenant"],
): Organization {
  return {
    id: input.slug,
    tenantId: input.id,
    slug: input.slug,
    name: input.name,
    description: input.description ?? "",
    heroTitle: input.heroTitle,
    heroSubtitle: input.heroSubtitle,
    heroDescription: input.heroDescription,
    heroImageUrl: input.heroImageUrl,
    seoTitle: input.seoTitle,
    seoDescription: input.seoDescription,
    address: input.address,
    phone: input.phone,
    timezone: input.timezone,
    deliveryFee: input.deliveryFee,
    minOrderAmount: input.minOrderAmount,
  };
}

export async function getOrganizationsRequest() {
  try {
    const response = await httpClient.get<TenantsApiResponse>("/tenants");

    return response.data.map((organization) => ({
      id: organization.slug,
      tenantId: organization.id,
      slug: organization.slug,
      name: organization.name,
      description: organization.description ?? "",
      heroTitle: null,
      heroSubtitle: null,
      heroDescription: null,
      heroImageUrl: null,
      seoTitle: null,
      seoDescription: null,
      address: null,
      phone: null,
      timezone: "UTC",
      deliveryFee: 0,
      minOrderAmount: 0,
    })) satisfies Organization[];
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "Не удалось загрузить список организаций"),
    );
  }
}

export async function getTenantCatalogRequest(
  slug: string,
): Promise<TenantCatalog> {
  try {
    const response = await httpClient.get<TenantCatalogApiResponse>(
      `/tenants/${slug}/catalog`,
    );

    return {
      organization: toOrganization(response.data.tenant),
      categories: response.data.categories.map((category) => ({
        id: String(category.id),
        organizationId: response.data.tenant.slug,
        name: category.name,
        description: category.description,
        imageUrl: category.imageUrl,
        sortOrder: category.sortOrder,
      })),
      products: response.data.products.map((product) => ({
        id: String(product.id),
        organizationId: response.data.tenant.slug,
        categoryId: String(product.categoryId),
        name: product.name,
        description: product.description ?? "",
        price: product.price,
        currency: product.currency,
        image: product.imageUrl ?? FALLBACK_PRODUCT_IMAGE,
        badgeText: product.badgeText,
      })),
    };
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "Не удалось загрузить каталог организации"),
    );
  }
}

export function useOrganizationsQuery() {
  return useQuery({
    queryKey: ["organizations"],
    queryFn: getOrganizationsRequest,
    staleTime: 60_000,
  });
}

export function useTenantCatalogQuery(slug: string) {
  return useQuery({
    queryKey: ["tenant-catalog", slug],
    queryFn: () => getTenantCatalogRequest(slug),
    enabled: slug.trim().length > 0,
    staleTime: 30_000,
  });
}
