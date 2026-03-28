export type ProductCategory = {
  id: string
  organizationId: string
  name: string
}

export type Product = {
  id: string
  organizationId: string
  categoryId: string
  name: string
  description: string
  price: number
  image: string
}
