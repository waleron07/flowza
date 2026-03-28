import type { AdminNavigationItem } from '../../../layouts/AdminLayout'

export const moderatorToolpad: {
  navigationItems: AdminNavigationItem[]
  subtitle: string
  title: string
} = {
  title: 'Flowza Moderator',
  subtitle: 'Контроль заказов и операционных сценариев',
  navigationItems: [
    { to: '/', label: 'Dashboard' },
    { to: '/orders', label: 'Заказы' },
  ],
}
