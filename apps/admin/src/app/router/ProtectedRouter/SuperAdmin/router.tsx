import { Navigate, Route, Routes } from 'react-router-dom'
import { AdminLayout } from '../../../layouts/AdminLayout'
import { DashboardPage } from '../../../../pages/dashboard/DashboardPage'
import { OrdersPage } from '../../../../pages/orders/OrdersPage'
import { StaffPage } from '../../../../pages/staff/StaffPage'
import { superAdminToolpad } from './toolpad'

export function SuperAdminRouter() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <AdminLayout
            navigationItems={superAdminToolpad.navigationItems}
            subtitle={superAdminToolpad.subtitle}
            title={superAdminToolpad.title}
          />
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="staff" element={<StaffPage />} />
        <Route path="orders" element={<OrdersPage />} />
      </Route>
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  )
}
