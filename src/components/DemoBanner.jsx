import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const DEMO_BANNER_HIDDEN_KEY = 'demo_banner_hidden'

export function DemoBanner() {
  const [isHidden, setIsHidden] = useState(() =>
    sessionStorage.getItem(DEMO_BANNER_HIDDEN_KEY) === 'true'
  )
  const [currentRole, setCurrentRole] = useState('admin')
  const [currentName, setCurrentName] = useState('Anna Nowak')

  useEffect(() => {
    // Get current user role from profiles
    const getCurrentRole = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, name')
          .eq('id', user.id)
          .single()
        if (profile) {
          setCurrentRole(profile.role)
          setCurrentName(profile.name || 'Anna Nowak')
        }
      }
    }
    getCurrentRole()
  }, [])

  const handleClose = () => {
    sessionStorage.setItem(DEMO_BANNER_HIDDEN_KEY, 'true')
    setIsHidden(true)
  }

  const handleRoleSwitch = async (newRole) => {
    // Switch identity based on role
    const targetUser = newRole === 'admin'
      ? { id: 'demo-admin-id', name: 'Anna Nowak', email: 'admin@rentalapp.demo' }
      : { id: 'demo-user-1', name: 'Jan Kowalski', email: 'user@rentalapp.demo' }

    // Update sessionStorage auth user
    const authUser = {
      id: targetUser.id,
      email: targetUser.email,
      user_metadata: { name: targetUser.name },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    }
    sessionStorage.setItem('demo_auth_user', JSON.stringify(authUser))

    setCurrentRole(newRole)
    setCurrentName(targetUser.name)
    // Reload the page to reflect identity change
    window.location.reload()
  }

  if (isHidden) {
    return null
  }

  return (
    <div className="demo-banner" role="alert" aria-live="polite">
      <div className="demo-banner-content">
        <span className="demo-banner-text">
          🎭 Tryb demo — dane są fikcyjne
        </span>
        <div className="demo-banner-controls">
          <span className="demo-role-label">Rola:</span>
          <button
            className={`demo-role-btn ${currentRole === 'admin' ? 'active' : ''}`}
            onClick={() => handleRoleSwitch('admin')}
            aria-pressed={currentRole === 'admin'}
          >
            Admin (Anna Nowak)
          </button>
          <button
            className={`demo-role-btn ${currentRole === 'user' ? 'active' : ''}`}
            onClick={() => handleRoleSwitch('user')}
            aria-pressed={currentRole === 'user'}
          >
            User (Jan Kowalski)
          </button>
        </div>
      </div>
      <button
        className="demo-banner-close"
        onClick={handleClose}
        aria-label="Ukryj baner demo"
      >
        ✕
      </button>
    </div>
  )
}
