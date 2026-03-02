import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { toast } from 'react-hot-toast'
import { useScrollLock } from '../hooks/useScrollLock'

export function AdminUserManagement({ onClose }) {
  useScrollLock()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'list-users' },
      })
      if (error) throw error
      setUsers(data.users ?? [])
    } catch (err) {
      console.error('Błąd ładowania użytkowników:', err)
      toast.error('Nie udało się pobrać listy użytkowników')
    } finally {
      setLoading(false)
    }
  }

  async function handleInvite(e) {
    e.preventDefault()
    const email = inviteEmail.trim()
    if (!email) return

    setInviteLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'invite', email },
      })
      if (error || data?.error) {
        let msg = data?.error || error.message
        if (!data?.error && error.context?.json) {
          try { const body = await error.context.json(); if (body?.error) msg = body.error } catch {}
        }
        throw new Error(msg)
      }

      toast.success(`Link zaproszeniowy wysłany na ${email}`)
      setInviteEmail('')
      await loadUsers()
    } catch (err) {
      console.error('Błąd zaproszenia:', err)
      toast.error(err.message || 'Nie udało się wysłać zaproszenia')
    } finally {
      setInviteLoading(false)
    }
  }

  async function handleDeleteConfirmed() {
    if (!deleteConfirmId) return
    setDeleteLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'delete-user', userId: deleteConfirmId },
      })
      if (error || data?.error) {
        let msg = data?.error || error.message
        if (!data?.error && error.context?.json) {
          try { const body = await error.context.json(); if (body?.error) msg = body.error } catch {}
        }
        throw new Error(msg)
      }

      toast.success('Użytkownik został usunięty')
      setDeleteConfirmId(null)
      setUsers(prev => prev.filter(u => u.id !== deleteConfirmId))
    } catch (err) {
      console.error('Błąd usuwania użytkownika:', err)
      toast.error(err.message || 'Nie udało się usunąć użytkownika')
    } finally {
      setDeleteLoading(false)
    }
  }

  const userToDelete = users.find(u => u.id === deleteConfirmId)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        role="dialog"
        aria-modal="true"
        aria-label="Zarządzanie użytkownikami"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 540, width: '95%' }}
      >
        <button className="modal-close-btn" onClick={onClose} aria-label="Zamknij">✕</button>
        <h2>Zarządzanie użytkownikami</h2>

        {/* Formularz zaproszenia */}
        <div className="admin-invite-section">
          <h3 className="admin-invite-title">Wyślij zaproszenie</h3>
          <form onSubmit={handleInvite} className="admin-invite-form">
            <label htmlFor="invite-email" className="sr-only">Adres email zaproszenia</label>
            <input
              id="invite-email"
              type="email"
              placeholder="adres@email.com"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              required
              disabled={inviteLoading}
            />
            <button
              type="submit"
              className="btn-primary"
              disabled={!inviteEmail.trim() || inviteLoading}
            >
              {inviteLoading ? 'Wysyłanie...' : 'Wyślij link'}
            </button>
          </form>
          <p className="admin-invite-hint">
            Użytkownik otrzyma magiczny link do utworzenia konta.
          </p>
        </div>

        <div className="admin-users-section">
          <h3 className="admin-invite-title">
            Użytkownicy ({users.length})
          </h3>

          {loading ? (
            <div className="admin-users-empty">
              Ładowanie...
            </div>
          ) : users.length === 0 ? (
            <div className="admin-users-empty">
              Brak użytkowników
            </div>
          ) : (
            <div className="admin-users-list">
              {users.map(u => (
                <div key={u.id} className="admin-user-row">
                  <div className="admin-user-info">
                    <div className="admin-user-name">
                      {u.name || <span style={{ opacity: 0.6, fontStyle: 'italic' }}>brak nazwy</span>}
                      {u.role === 'admin' && (
                        <span className="admin-badge">admin</span>
                      )}
                      {!u.confirmed && (
                        <span className="pending-badge">oczekuje</span>
                      )}
                    </div>
                    <div className="admin-user-email">{u.email}</div>
                  </div>
                  <button
                    className="btn-danger-small"
                    onClick={() => setDeleteConfirmId(u.id)}
                    title="Usuń użytkownika"
                  >
                    Usuń
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dialog potwierdzenia usunięcia */}
        {deleteConfirmId && (
          <div className="modal-overlay" onClick={() => !deleteLoading && setDeleteConfirmId(null)}>
            <div
              className="modal-content"
              role="dialog"
              aria-modal="true"
              aria-label="Potwierdzenie usunięcia użytkownika"
              onClick={e => e.stopPropagation()}
              style={{ maxWidth: 360 }}
            >
              <h3 style={{ marginTop: 0 }}>Potwierdź usunięcie</h3>
              <p>
                Czy na pewno chcesz usunąć użytkownika{' '}
                <strong>{userToDelete?.name || userToDelete?.email}</strong>?
                <br />
                <span style={{ fontSize: '0.85rem', opacity: 0.7 }}>
                  Wszystkie dane tego użytkownika zostaną trwale usunięte.
                </span>
              </p>
              <div className="form-actions">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  disabled={deleteLoading}
                >
                  Anuluj
                </button>
                <button
                  className="btn-danger"
                  onClick={handleDeleteConfirmed}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? 'Usuwanie...' : 'Usuń'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
