import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const DEMO_BANNER_HIDDEN_KEY = 'demo_banner_hidden'

export function DemoBanner() {
  const [isHidden, setIsHidden] = useState(() =>
    sessionStorage.getItem(DEMO_BANNER_HIDDEN_KEY) === 'true'
  )
  const [currentRole, setCurrentRole] = useState('admin')

  useEffect(() => {
    // Get current user role from profiles
    const getCurrentRole = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        if (profile) {
          setCurrentRole(profile.role)
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
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      // Update role in profiles (demo only - allows role switching)
      await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', user.id)

      setCurrentRole(newRole)
      // Reload the page to reflect role change
      window.location.reload()
    }
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
            Admin
          </button>
          <button
            className={`demo-role-btn ${currentRole === 'user' ? 'active' : ''}`}
            onClick={() => handleRoleSwitch('user')}
            aria-pressed={currentRole === 'user'}
          >
            User
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
