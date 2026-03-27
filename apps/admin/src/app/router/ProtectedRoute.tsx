import { Box, CircularProgress } from '@mui/material'
import { Navigate } from 'react-router-dom'
import type { PropsWithChildren } from 'react'
import { useAuth } from '../../features/auth/model/useAuth'

export function ProtectedRoute({ children }: PropsWithChildren) {
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

  if (status === 'guest') {
    return <Navigate replace to="/login" />
  }

  return <>{children}</>
}
