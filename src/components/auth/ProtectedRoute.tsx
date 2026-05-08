import type { ReactNode } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { LoginPage } from './LoginPage'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F5EDD6',
      }} />
    )
  }

  if (!session) return <LoginPage />

  return <>{children}</>
}
