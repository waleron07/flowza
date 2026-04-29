import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/http'
import { getApiErrorMessage } from '../../../shared/api/get-api-error-message'
import type {
  Order,
  OrderAction,
  OrderComment,
  OrderQueueFilters,
  OrderStatus,
  OrderTimelineEntry,
  OrderTimelineType,
  PaymentStatus,
} from '../../../shared/types/orders'

export async function getOrderQueueRequest(filters: OrderQueueFilters) {
  try {
    const response = await httpClient.get<Order[]>('/orders/queue', {
      params: filters,
    })

    return response.data
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Не удалось загрузить очередь заказов'))
  }
}

export async function getTenantOrdersRequest(tenantId: number) {
  try {
    const response = await httpClient.get<Order[]>('/orders/tenant', {
      params: { tenantId },
    })

    return response.data
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Не удалось загрузить заказы организации'))
  }
}

export async function getOrderCommentsRequest(orderId: number) {
  try {
    const response = await httpClient.get<OrderComment[]>(`/orders/${orderId}/comments`)

    return response.data
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Не удалось загрузить комментарии заказа'))
  }
}

export async function getOrderTimelineRequest(orderId: number, type: OrderTimelineType = 'ALL') {
  try {
    const response = await httpClient.get<OrderTimelineEntry[]>(`/orders/${orderId}/timeline`, {
      params: { type },
    })

    return response.data
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Не удалось загрузить таймлайн заказа'))
  }
}

export async function updateOrderStatusRequest(orderId: number, status: OrderStatus) {
  try {
    const response = await httpClient.patch<Order>(`/orders/${orderId}/status`, {
      status,
    })

    return response.data
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Не удалось обновить статус заказа'))
  }
}

export async function updateOrderCommentRequest(orderId: number, comment?: string) {
  try {
    const response = await httpClient.patch<Order>(`/orders/${orderId}/comment`, {
      comment,
    })

    return response.data
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Не удалось обновить комментарий заказа'))
  }
}

export async function updateOrderPaymentStatusRequest(
  orderId: number,
  paymentStatus: PaymentStatus,
) {
  try {
    const response = await httpClient.patch<Order>(`/orders/${orderId}/payment-status`, {
      paymentStatus,
    })

    return response.data
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Не удалось обновить статус оплаты'))
  }
}

export async function applyOrderActionRequest(orderId: number, action: OrderAction) {
  try {
    const response = await httpClient.patch<Order>(`/orders/${orderId}/action`, {
      action,
    })

    return response.data
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Не удалось применить действие заказа'))
  }
}

export function useOrderQueueQuery(filters: OrderQueueFilters, enabled = true) {
  return useQuery({
    queryKey: ['orders', 'queue', filters],
    queryFn: () => getOrderQueueRequest(filters),
    enabled,
    staleTime: 10_000,
  })
}

export function useTenantOrdersQuery(tenantId: number | null) {
  return useQuery({
    queryKey: ['orders', 'tenant', tenantId],
    queryFn: () => getTenantOrdersRequest(tenantId as number),
    enabled: tenantId !== null,
    staleTime: 10_000,
  })
}

export function useOrderCommentsQuery(orderId: number | null) {
  return useQuery({
    queryKey: ['orders', 'comments', orderId],
    queryFn: () => getOrderCommentsRequest(orderId as number),
    enabled: orderId !== null,
    staleTime: 10_000,
  })
}

export function useOrderTimelineQuery(orderId: number | null, type: OrderTimelineType = 'ALL') {
  return useQuery({
    queryKey: ['orders', 'timeline', orderId, type],
    queryFn: () => getOrderTimelineRequest(orderId as number, type),
    enabled: orderId !== null,
    staleTime: 10_000,
  })
}

export function useUpdateOrderStatusMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ orderId, status }: { orderId: number; status: OrderStatus }) =>
      updateOrderStatusRequest(orderId, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

export function useUpdateOrderCommentMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ orderId, comment }: { orderId: number; comment?: string }) =>
      updateOrderCommentRequest(orderId, comment),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

export function useUpdateOrderPaymentStatusMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      orderId,
      paymentStatus,
    }: {
      orderId: number
      paymentStatus: PaymentStatus
    }) => updateOrderPaymentStatusRequest(orderId, paymentStatus),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

export function useApplyOrderActionMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ orderId, action }: { orderId: number; action: OrderAction }) =>
      applyOrderActionRequest(orderId, action),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}
