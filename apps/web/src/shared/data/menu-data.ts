import type { Product, ProductCategory } from '../types/catalog'
import type { Organization } from '../types/organization'

export const organizations: Organization[] = [
  {
    id: 'roma-pizza',
    slug: 'roma-pizza',
    name: 'Roma Pizza',
    description: 'Итальянская пицца, паста и десерты.',
    deliveryTime: '35-45 мин',
  },
  {
    id: 'tokyo-roll',
    slug: 'tokyo-roll',
    name: 'Tokyo Roll',
    description: 'Роллы, поке и авторские азиатские сеты.',
    deliveryTime: '45-55 мин',
  },
]

export const productCategories: ProductCategory[] = [
  { id: 'roma-pizza-pizza', organizationId: 'roma-pizza', name: 'Пицца' },
  { id: 'roma-pizza-dessert', organizationId: 'roma-pizza', name: 'Десерты' },
  { id: 'tokyo-roll-rolls', organizationId: 'tokyo-roll', name: 'Роллы' },
  { id: 'tokyo-roll-poke', organizationId: 'tokyo-roll', name: 'Поке' },
]

export const products: Product[] = [
  {
    id: 'margherita',
    organizationId: 'roma-pizza',
    categoryId: 'roma-pizza-pizza',
    name: 'Маргарита',
    description: 'Классическая пицца с моцареллой, томатным соусом и базиликом.',
    price: 520,
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'pepperoni',
    organizationId: 'roma-pizza',
    categoryId: 'roma-pizza-pizza',
    name: 'Пепперони',
    description: 'Острая колбаса пепперони, сыр и фирменный соус.',
    price: 690,
    image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'tiramisu',
    organizationId: 'roma-pizza',
    categoryId: 'roma-pizza-dessert',
    name: 'Тирамису',
    description: 'Нежный десерт с маскарпоне, кофе и какао.',
    price: 340,
    image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'philadelphia',
    organizationId: 'tokyo-roll',
    categoryId: 'tokyo-roll-rolls',
    name: 'Филадельфия',
    description: 'Лосось, сливочный сыр, огурец и рис.',
    price: 720,
    image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'california',
    organizationId: 'tokyo-roll',
    categoryId: 'tokyo-roll-rolls',
    name: 'Калифорния',
    description: 'Краб, авокадо, огурец и икра тобико.',
    price: 660,
    image: 'https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'salmon-poke',
    organizationId: 'tokyo-roll',
    categoryId: 'tokyo-roll-poke',
    name: 'Поке с лососем',
    description: 'Лосось, рис, авокадо, огурец и соус понзу.',
    price: 790,
    image: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=80',
  },
]

export function getOrganizationById(organizationId: string) {
  return organizations.find((organization) => organization.id === organizationId) ?? organizations[0]
}

export function getCategoriesForOrganization(organizationId: string) {
  return productCategories.filter((category) => category.organizationId === organizationId)
}

export function getProductsForOrganization(organizationId: string) {
  return products.filter((product) => product.organizationId === organizationId)
}
