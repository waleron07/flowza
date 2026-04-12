export type OrderItem = {
  id: number;
  productId: number;
  productName: string;
  variantName: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

export type Order = {
  id: number;
  orderNumber: string;
  tenantId: number;
  tenantName: string;
  tenantSlug: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  currency: string;
  deliveryAddress: string;
  subtotal: number;
  deliveryFee: number;
  discountAmount: number;
  finalAmount: number;
  createdAt: string;
  items: OrderItem[];
};

export type CreateOrderItemDto = {
  productId: number;
  quantity: number;
};

export type CreateOrderRequestDto = {
  tenantId: number;
  deliveryAddress: string;
  paymentMethod: "CARD" | "CASH" | "APPLE_PAY" | "GOOGLE_PAY";
  items: CreateOrderItemDto[];
};
