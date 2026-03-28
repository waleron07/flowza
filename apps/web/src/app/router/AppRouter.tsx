import { useAuth } from '../../features/auth/model/useAuth'
import { FullscreenLoader } from '../../shared/ui/FullscreenLoader'
import { GuestRouter } from './ProtectedRouter/Guest/router'
import { UserRouter } from './ProtectedRouter/User/router'

export function AppRouter() {
  const { status } = useAuth()

  if (status === 'loading') {
    return <FullscreenLoader />
  }

  if (status === 'authenticated') {
    return <UserRouter />
  }

  return (
    <GuestRouter />
  )
}
