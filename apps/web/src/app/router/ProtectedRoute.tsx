import type { PropsWithChildren } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/model/useAuth'
import { FullscreenLoader } from '../../shared/ui/FullscreenLoader'

export function ProtectedRoute({ children }: PropsWithChildren) {
  const { status } = useAuth()

  if (status === 'loading') {
    return <FullscreenLoader />
  }

  if (status !== 'authenticated') {
    return <Navigate replace to="/login" />
  }

  return children
}
