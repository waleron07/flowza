import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { httpClient } from "../../../shared/api/http";
import { getApiErrorMessage } from "../../../shared/api/get-api-error-message";
import type {
  ManageableOrganizationListItem,
  OrganizationManagementResponse,
  UpsertCategoryDto,
  UpsertOrganizationDto,
  UpsertProductDto,
} from "../../../shared/types/organizations";
import type { AdminUserCandidate } from "../../../shared/types/users";

export async function getManageableOrganizationsRequest() {
  try {
    const response = await httpClient.get<ManageableOrganizationListItem[]>(
      "/tenants/manageable",
    );

    return response.data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "Не удалось загрузить организации"),
    );
  }
}

export async function getOrganizationManagementRequest(tenantId: number) {
  try {
    const response = await httpClient.get<OrganizationManagementResponse>(
      `/tenants/${tenantId}/management`,
    );

    return response.data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "Не удалось загрузить данные организации"),
    );
  }
}

export async function getAdminUserCandidatesRequest() {
  try {
    const response = await httpClient.get<AdminUserCandidate[]>(
      "/users/admin-candidates",
    );

    return response.data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "Не удалось загрузить администраторов"),
    );
  }
}

export async function createOrganizationRequest(
  payload: UpsertOrganizationDto,
) {
  try {
    const response = await httpClient.post("/tenants", payload);

    return response.data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "Не удалось создать организацию"),
    );
  }
}

export async function updateOrganizationRequest(
  tenantId: number,
  payload: UpsertOrganizationDto,
) {
  try {
    const response = await httpClient.patch(`/tenants/${tenantId}`, payload);

    return response.data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "Не удалось обновить организацию"),
    );
  }
}

export async function deleteOrganizationRequest(tenantId: number) {
  try {
    const response = await httpClient.delete(`/tenants/${tenantId}`);

    return response.data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "Не удалось удалить организацию"),
    );
  }
}

export async function createCategoryRequest(payload: UpsertCategoryDto) {
  try {
    const response = await httpClient.post("/categories", payload);

    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Не удалось создать категорию"));
  }
}

export async function updateCategoryRequest(
  categoryId: number,
  payload: UpsertCategoryDto,
) {
  try {
    const response = await httpClient.patch(
      `/categories/${categoryId}`,
      payload,
    );

    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Не удалось обновить категорию"));
  }
}

export async function createProductRequest(payload: UpsertProductDto) {
  try {
    const response = await httpClient.post("/products", payload);

    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Не удалось создать товар"));
  }
}

export async function updateProductRequest(
  productId: number,
  payload: UpsertProductDto,
) {
  try {
    const response = await httpClient.patch(`/products/${productId}`, payload);

    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Не удалось обновить товар"));
  }
}

export function useManageableOrganizationsQuery() {
  return useQuery({
    queryKey: ["manageable-organizations"],
    queryFn: getManageableOrganizationsRequest,
    staleTime: 30_000,
  });
}

export function useOrganizationManagementQuery(tenantId: number | null) {
  return useQuery({
    queryKey: ["organization-management", tenantId],
    queryFn: () => getOrganizationManagementRequest(tenantId as number),
    enabled: tenantId !== null,
    staleTime: 10_000,
  });
}

export function useAdminUserCandidatesQuery(enabled: boolean) {
  return useQuery({
    queryKey: ["admin-user-candidates"],
    queryFn: getAdminUserCandidatesRequest,
    enabled,
    staleTime: 30_000,
  });
}

export function useCreateOrganizationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createOrganizationRequest,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["manageable-organizations"],
      });
    },
  });
}

export function useUpdateOrganizationMutation(tenantId: number | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpsertOrganizationDto) =>
      updateOrganizationRequest(tenantId as number, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["manageable-organizations"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["organization-management", tenantId],
        }),
      ]);
    },
  });
}

export function useDeleteOrganizationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteOrganizationRequest,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["manageable-organizations"],
      });
    },
  });
}

export function useCreateCategoryMutation(tenantId: number | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCategoryRequest,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["organization-management", tenantId],
      });
    },
  });
}

export function useUpdateCategoryMutation(tenantId: number | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      categoryId,
      payload,
    }: {
      categoryId: number;
      payload: UpsertCategoryDto;
    }) => updateCategoryRequest(categoryId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["organization-management", tenantId],
      });
    },
  });
}

export function useCreateProductMutation(tenantId: number | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProductRequest,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["organization-management", tenantId],
      });
    },
  });
}

export function useUpdateProductMutation(tenantId: number | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      payload,
    }: {
      productId: number;
      payload: UpsertProductDto;
    }) => updateProductRequest(productId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["organization-management", tenantId],
      });
    },
  });
}
