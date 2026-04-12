import type { AdminNavigationItem } from "../../../layouts/AdminLayout";

export const superAdminToolpad: {
  navigationItems: AdminNavigationItem[];
  subtitle: string;
  title: string;
} = {
  title: "Flowza SuperAdmin",
  subtitle: "Платформенный контур и управление организациями",
  navigationItems: [
    { to: "/", label: "Dashboard" },
    { to: "/organizations", label: "Организации" },
    { to: "/staff", label: "Сотрудники" },
    { to: "/orders", label: "Заказы" },
  ],
};
