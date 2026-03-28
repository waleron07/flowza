import type { AdminNavigationItem } from '../../../layouts/AdminLayout'

export const operatorToolpad: {
  navigationItems: AdminNavigationItem[]
  subtitle: string
  title: string
} = {
  title: 'Flowza Operator',
  subtitle: 'Рабочий контур обработки заказов',
  navigationItems: [
    { to: '/', label: 'Dashboard' },
    { to: '/orders', label: 'Заказы' },
  ],
}
