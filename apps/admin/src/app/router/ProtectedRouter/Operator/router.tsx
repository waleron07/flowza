import { Navigate, Route, Routes } from 'react-router-dom'
import { AdminLayout } from '../../../layouts/AdminLayout'
import { DashboardPage } from '../../../../pages/dashboard/DashboardPage'
import { OrdersPage } from '../../../../pages/orders/OrdersPage'
import { operatorToolpad } from './toolpad'

export function OperatorRouter() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <AdminLayout
            navigationItems={operatorToolpad.navigationItems}
            subtitle={operatorToolpad.subtitle}
            title={operatorToolpad.title}
          />
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="staff" element={<Navigate replace to="/" />} />
      </Route>
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  )
}
