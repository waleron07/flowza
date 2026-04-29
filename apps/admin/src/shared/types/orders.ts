export const orderStatuses = {
  new: 'NEW',
  confirmed: 'CONFIRMED',
  cooking: 'COOKING',
  ready: 'READY',
  delivering: 'DELIVERING',
  completed: 'COMPLETED',
  cancelled: 'CANCELLED',
} as const

export const paymentMethods = {
  card: 'CARD',
  cash: 'CASH',
  applePay: 'APPLE_PAY',
  googlePay: 'GOOGLE_PAY',
} as const

export const paymentStatuses = {
  pending: 'PENDING',
  paid: 'PAID',
  failed: 'FAILED',
} as const

export const orderActions = {
  startCooking: 'START_COOKING',
  markReady: 'MARK_READY',
  startDelivery: 'START_DELIVERY',
  completeDelivery: 'COMPLETE_DELIVERY',
  cancelOrder: 'CANCEL_ORDER',
} as const

export type OrderStatus = (typeof orderStatuses)[keyof typeof orderStatuses]
export type PaymentMethod = (typeof paymentMethods)[keyof typeof paymentMethods]
export type PaymentStatus = (typeof paymentStatuses)[keyof typeof paymentStatuses]
export type OrderAction = (typeof orderActions)[keyof typeof orderActions]
export type OrderTimelineType = 'ALL' | 'EVENT' | 'COMMENT'

export type OrderItem = {
  id: number
  productId: number
  productName: string
  variantName: string | null
  quantity: number
  unitPrice: number
  totalPrice: number
}

export type Order = {
  id: number
  orderNumber: string
  tenantId: number
  tenantName: string
  tenantSlug: string
  status: OrderStatus
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  currency: string
  deliveryAddress: string
  staffComment: string | null
  subtotal: number
  deliveryFee: number
  discountAmount: number
  finalAmount: number
  createdAt: string
  items: OrderItem[]
}

export type OrderQueueFilters = {
  tenantId: number
  status?: OrderStatus
  paymentMethod?: PaymentMethod
  paymentStatus?: PaymentStatus
  search?: string
}

export type OrderCommentAuthor = {
  id: number
  login: string
  email: string
  role: string
} | null

export type OrderComment = {
  id: number
  comment: string
  createdAt: string
  author: OrderCommentAuthor
}

export type OrderTimelineEntry = {
  id: number
  type: 'EVENT' | 'COMMENT'
  message: string
  createdAt: string
  author: OrderCommentAuthor
}
