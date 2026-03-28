import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { getProductsForOrganization } from '../data/menu-data'

export type CartItem = {
  productId: string
  quantity: number
}

type CartStore = {
  cartsByOrganization: Record<string, CartItem[]>
  addItem: (organizationId: string, productId: string) => void
  decrementItem: (organizationId: string, productId: string) => void
  removeItem: (organizationId: string, productId: string) => void
  clearCart: (organizationId: string) => void
}

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      cartsByOrganization: {},
      addItem: (organizationId, productId) =>
        set((state) => {
          const items = state.cartsByOrganization[organizationId] ?? []
          const existingItem = items.find((item) => item.productId === productId)

          if (existingItem) {
            return {
              cartsByOrganization: {
                ...state.cartsByOrganization,
                [organizationId]: items.map((item) =>
                  item.productId === productId
                    ? { ...item, quantity: item.quantity + 1 }
                    : item,
                ),
              },
            }
          }

          return {
            cartsByOrganization: {
              ...state.cartsByOrganization,
              [organizationId]: [...items, { productId, quantity: 1 }],
            },
          }
        }),
      decrementItem: (organizationId, productId) =>
        set((state) => ({
          cartsByOrganization: {
            ...state.cartsByOrganization,
            [organizationId]: (state.cartsByOrganization[organizationId] ?? [])
              .map((item) =>
                item.productId === productId ? { ...item, quantity: item.quantity - 1 } : item,
              )
              .filter((item) => item.quantity > 0),
          },
        })),
      removeItem: (organizationId, productId) =>
        set((state) => ({
          cartsByOrganization: {
            ...state.cartsByOrganization,
            [organizationId]: (state.cartsByOrganization[organizationId] ?? []).filter(
              (item) => item.productId !== productId,
            ),
          },
        })),
      clearCart: (organizationId) =>
        set((state) => ({
          cartsByOrganization: {
            ...state.cartsByOrganization,
            [organizationId]: [],
          },
        })),
    }),
    {
      name: 'flowza.web.cart',
      storage: createJSONStorage(() => window.localStorage),
    },
  ),
)

export function getOrganizationCartItems(
  cartsByOrganization: Record<string, CartItem[]>,
  organizationId: string,
) {
  return cartsByOrganization[organizationId] ?? []
}

export function getCartLineItems(items: CartItem[], organizationId: string) {
  const products = getProductsForOrganization(organizationId)

  return items
    .map((item) => {
      const product = products.find((entry) => entry.id === item.productId)

      if (!product) {
        return null
      }

      return {
        ...item,
        product,
        lineTotal: product.price * item.quantity,
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
}

export function getCartItemsCount(items: CartItem[]) {
  return items.reduce((total, item) => total + item.quantity, 0)
}

export function getCartTotal(items: CartItem[], organizationId: string) {
  return getCartLineItems(items, organizationId).reduce((total, item) => total + item.lineTotal, 0)
}
