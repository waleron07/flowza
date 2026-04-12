import type { AdminNavigationItem } from "../../../layouts/AdminLayout";

export const adminToolpad: {
  navigationItems: AdminNavigationItem[];
  subtitle: string;
  title: string;
} = {
  title: "Flowza Admin",
  subtitle: "Управление организацией и staff-пользователями",
  navigationItems: [
    { to: "/", label: "Dashboard" },
    { to: "/organizations", label: "Организации" },
    { to: "/staff", label: "Сотрудники" },
    { to: "/orders", label: "Заказы" },
  ],
};
