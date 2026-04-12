import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { httpClient } from "./http";
import { getApiErrorMessage } from "./get-api-error-message";
import type { CreateOrderRequestDto, Order } from "../types/order";

export async function createOrderRequest(payload: CreateOrderRequestDto) {
  try {
    const response = await httpClient.post<Order>("/orders", payload);

    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Не удалось оформить заказ"));
  }
}

export async function getMyOrdersRequest() {
  try {
    const response = await httpClient.get<Order[]>("/orders/my");

    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Не удалось загрузить заказы"));
  }
}

export function useMyOrdersQuery(enabled = true) {
  return useQuery({
    queryKey: ["my-orders"],
    queryFn: getMyOrdersRequest,
    enabled,
    staleTime: 30_000,
  });
}

export function useCreateOrderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createOrderRequest,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["my-orders"] });
    },
  });
}
