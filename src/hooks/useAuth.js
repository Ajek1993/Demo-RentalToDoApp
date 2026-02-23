import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const PRODUCTION_URL = 'https://to-do-app-abacus.vercel.app/'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [passwordRecovery, setPasswordRecovery] = useState(false)
  const [needsProfileSetup, setNeedsProfileSetup] = useState(() =>
    sessionStorage.getItem('pendingProfileSetup') === 'true'
  )

  useEffect(() => {
    // Wykryj zaproszenie (type=invite w hash URL)
    const hash = window.location.hash
    if (hash.includes('type=invite')) {
      sessionStorage.setItem('pendingProfileSetup', 'true')
      setNeedsProfileSetup(true)
    }

    // Pobierz aktualną sesję
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Nasłuchuj zmian w auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true)
      }
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      setProfile(data)
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  async function signUp(email, password, name) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name
          },
          emailRedirectTo: PRODUCTION_URL
        }
      })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  async function signIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  async function signOut() {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  async function resetPassword(email) {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: PRODUCTION_URL
      })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  async function updatePassword(newPassword) {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error
      setPasswordRecovery(false)
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  async function completeProfile(name, password) {
    try {
      const { error: passwordError } = await supabase.auth.updateUser({ password })
      if (passwordError) throw passwordError

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ name })
        .eq('id', user.id)
      if (profileError) throw profileError

      sessionStorage.removeItem('pendingProfileSetup')
      setNeedsProfileSetup(false)
      await fetchProfile(user.id)
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const isAdmin = profile?.role === 'admin'

  return {
    user,
    profile,
    loading,
    passwordRecovery,
    needsProfileSetup,
    isAdmin,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    completeProfile
  }
}
