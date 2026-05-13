import type { Product, ProductCategory } from "../types/catalog";
import type { Organization } from "../types/organization";

export const organizations: Organization[] = [
  {
    id: "roma-pizza",
    tenantId: 1,
    slug: "roma-pizza",
    name: "Roma Pizza",
    description: "Итальянская пицца, паста и десерты.",
    heroTitle: "Пицца из дровяной печи",
    heroSubtitle: "Доставка за 30 минут",
    heroDescription:
      "Большие борта, свежие ингредиенты и спокойная итальянская подача.",
    heroImageUrl:
      "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1400&q=80",
    seoTitle: "Roma Pizza",
    seoDescription: "Итальянская пицца, паста и десерты.",
    address: "Москва",
    phone: null,
    timezone: "Europe/Moscow",
    deliveryFee: "199",
    minOrderAmount: "1000",
  },
  {
    id: "tokyo-roll",
    tenantId: 2,
    slug: "tokyo-roll",
    name: "Tokyo Roll",
    description: "Роллы, поке и авторские азиатские сеты.",
    heroTitle: "Свежие роллы и поке",
    heroSubtitle: "Сборка по заказу",
    heroDescription:
      "Минималистичное меню с акцентом на рыбу, рис и чистые соусы.",
    heroImageUrl:
      "https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=1400&q=80",
    seoTitle: "Tokyo Roll",
    seoDescription: "Роллы, поке и авторские азиатские сеты.",
    address: "Москва",
    phone: null,
    timezone: "Europe/Moscow",
    deliveryFee: "249",
    minOrderAmount: "1200",
  },
];

export const productCategories: ProductCategory[] = [
  {
    id: "roma-pizza-pizza",
    organizationId: "roma-pizza",
    name: "Пицца",
    description: "Главные позиции с пышным бортом и яркими топпингами.",
    imageUrl:
      "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "roma-pizza-dessert",
    organizationId: "roma-pizza",
    name: "Десерты",
    description: "Небольшие сладкие финалы к пицце и кофе.",
    imageUrl:
      "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "tokyo-roll-rolls",
    organizationId: "tokyo-roll",
    name: "Роллы",
    description: "Классические и фирменные роллы на каждый день.",
    imageUrl:
      "https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "tokyo-roll-poke",
    organizationId: "tokyo-roll",
    name: "Поке",
    description: "Собранные миски с рыбой, рисом и свежими овощами.",
    imageUrl:
      "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80",
  },
];

export const products: Product[] = [
  {
    id: "margherita",
    organizationId: "roma-pizza",
    categoryId: "roma-pizza-pizza",
    name: "Маргарита",
    description:
      "Классическая пицца с моцареллой, томатным соусом и базиликом.",
    price: 520,
    currency: "RUB",
    image:
      "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80",
    badgeText: "Хит",
  },
  {
    id: "pepperoni",
    organizationId: "roma-pizza",
    categoryId: "roma-pizza-pizza",
    name: "Пепперони",
    description: "Острая колбаса пепперони, сыр и фирменный соус.",
    price: 690,
    currency: "RUB",
    image:
      "https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=1200&q=80",
    badgeText: "Острое",
  },
  {
    id: "tiramisu",
    organizationId: "roma-pizza",
    categoryId: "roma-pizza-dessert",
    name: "Тирамису",
    description: "Нежный десерт с маскарпоне, кофе и какао.",
    price: 340,
    currency: "RUB",
    image:
      "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=1200&q=80",
    badgeText: "Десерт",
  },
  {
    id: "philadelphia",
    organizationId: "tokyo-roll",
    categoryId: "tokyo-roll-rolls",
    name: "Филадельфия",
    description: "Лосось, сливочный сыр, огурец и рис.",
    price: 720,
    currency: "RUB",
    image:
      "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=1200&q=80",
    badgeText: "Премиум",
  },
  {
    id: "california",
    organizationId: "tokyo-roll",
    categoryId: "tokyo-roll-rolls",
    name: "Калифорния",
    description: "Краб, авокадо, огурец и икра тобико.",
    price: 660,
    currency: "RUB",
    image:
      "https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=1200&q=80",
    badgeText: "Классика",
  },
  {
    id: "salmon-poke",
    organizationId: "tokyo-roll",
    categoryId: "tokyo-roll-poke",
    name: "Поке с лососем",
    description: "Лосось, рис, авокадо, огурец и соус понзу.",
    price: 790,
    currency: "RUB",
    image:
      "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=80",
    badgeText: "Боул",
  },
];

export function getOrganizationById(organizationId: string) {
  return (
    organizations.find((organization) => organization.id === organizationId) ??
    organizations[0]
  );
}

export function getCategoriesForOrganization(organizationId: string) {
  return productCategories.filter(
    (category) => category.organizationId === organizationId,
  );
}

export function getProductsForOrganization(organizationId: string) {
  return products.filter(
    (product) => product.organizationId === organizationId,
  );
}
