import { Navigate, Route, Routes } from 'react-router-dom'
import { AdminLayout } from '../../../layouts/AdminLayout'
import { DashboardPage } from '../../../../pages/dashboard/DashboardPage'
import { OrdersPage } from '../../../../pages/orders/OrdersPage'
import { StaffPage } from '../../../../pages/staff/StaffPage'
import { adminToolpad } from './toolpad'

export function AdminRouter() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <AdminLayout
            navigationItems={adminToolpad.navigationItems}
            subtitle={adminToolpad.subtitle}
            title={adminToolpad.title}
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
