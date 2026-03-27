import { Box, CircularProgress } from '@mui/material'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '../../features/auth/model/useAuth'
import { AdminLayout } from '../layouts/AdminLayout'
import { LoginPage } from '../../pages/auth/login/LoginPage'
import { DashboardPage } from '../../pages/dashboard/DashboardPage'
import { OrdersPage } from '../../pages/orders/OrdersPage'
import { StaffPage } from '../../pages/staff/StaffPage'
import { ProtectedRoute } from './ProtectedRoute'

function LoginRoute() {
  const { status } = useAuth()

  if (status === 'loading') {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    )
  }

  if (status === 'authenticated') {
    return <Navigate replace to="/" />
  }

  return <LoginPage />
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
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
