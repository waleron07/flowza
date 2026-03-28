import { Box, CircularProgress } from '@mui/material'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '../../../../features/auth/model/useAuth'
import { LoginPage } from '../../../../pages/auth/login/LoginPage'

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

  return <LoginPage />
}

export function GuestRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route path="*" element={<Navigate replace to="/login" />} />
    </Routes>
  )
}
