import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthContextValue {
  session: Session | null
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(supabase.from('users') as any).upsert({
          id: session.user.id,
          email: session.user.email ?? '',
          name: session.user.user_metadata?.full_name ?? null,
        }, { onConflict: 'id' }).then(() => {})
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  // Supabase fires TOKEN_REFRESHED when the tab regains visibility, which
  // mints a fresh session object — and a fresh session.user reference even
  // for the same logged-in user. Memoize by id so consumers' useEffect deps
  // don't re-fire on every token refresh (was unmounting in-flight forms
  // like the New Event modal when the user briefly switched tabs).
  const user = useMemo(() => session?.user ?? null, [session?.user?.id])

  return (
    <AuthContext.Provider value={{ session, user, loading, signIn, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
