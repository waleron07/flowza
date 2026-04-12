import { Navigate, Route, Routes } from "react-router-dom";
import { AdminLayout } from "../../../layouts/AdminLayout";
import { DashboardPage } from "../../../../pages/dashboard/DashboardPage";
import { OrganizationsPage } from "../../../../pages/organizations/OrganizationsPage";
import { OrdersPage } from "../../../../pages/orders/OrdersPage";
import { moderatorToolpad } from "./toolpad";

export function ModeratorRouter() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <AdminLayout
            navigationItems={moderatorToolpad.navigationItems}
            subtitle={moderatorToolpad.subtitle}
            title={moderatorToolpad.title}
          />
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="organizations" element={<OrganizationsPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="staff" element={<Navigate replace to="/" />} />
      </Route>
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  );
}
