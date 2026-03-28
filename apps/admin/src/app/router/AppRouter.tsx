import { Box, CircularProgress } from '@mui/material'
import { useAuth } from '../../features/auth/model/useAuth'
import { userRoles } from '../../shared/types/users'
import { GuestRouter } from './ProtectedRouter/Guest/router'
import { SuperAdminRouter } from './ProtectedRouter/SuperAdmin/router'
import { AdminRouter } from './ProtectedRouter/Admin/router'
import { ModeratorRouter } from './ProtectedRouter/Moderator/router'
import { OperatorRouter } from './ProtectedRouter/Operator/router'

export function AppRouter() {
  const { status, user } = useAuth()

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

  if (status === 'guest' || !user) {
    return <GuestRouter />
  }

  switch (user.role) {
    case userRoles.superAdmin:
      return <SuperAdminRouter />
    case userRoles.admin:
      return <AdminRouter />
    case userRoles.moderator:
      return <ModeratorRouter />
    case userRoles.operator:
      return <OperatorRouter />
    default:
      return <GuestRouter />
  }
}
