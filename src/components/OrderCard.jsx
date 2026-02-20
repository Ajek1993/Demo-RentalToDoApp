import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { AssignmentHistory } from './AssignmentHistory'
import { useOnlineStatus } from './OfflineBanner'

export function OrderCard({ order, currentUserId, onEdit, onComplete, onDelete, onRestore, onAssign, onUnassign, fetchAssignments, fetchOrderEdits }) {
  const isOnline = useOnlineStatus()
  const [assignments, setAssignments] = useState([])
  const [edits, setEdits] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [showAssignDropdown, setShowAssignDropdown] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showActionsModal, setShowActionsModal] = useState(false)
  const [showNotesPopup, setShowNotesPopup] = useState(false)
  const [showUnassignConfirm, setShowUnassignConfirm] = useState(false)

  useEffect(() => {
    loadAssignments()
    loadEdits()
    loadAllUsers()

    // Real-time subscription dla assignments tego zlecenia
    const channel = supabase
      .channel(`assignments-${order.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'assignments',
          filter: `order_id=eq.${order.id}`
        },
        () => {
          loadAssignments()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_edits',
          filter: `order_id=eq.${order.id}`
        },
        () => {
          loadEdits()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [order.id])

  async function loadAssignments() {
    const { data } = await fetchAssignments(order.id)
    setAssignments(data)
  }

  async function loadEdits() {
    const { data } = await fetchOrderEdits(order.id)
    setEdits(data)
  }

  async function loadAllUsers() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name')
        .order('name')

      if (error) throw error
      setAllUsers(data || [])
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  // Filtruj tylko aktywne przypisania (nie wypisane)
  const activeAssignments = assignments.filter(a => a.unassigned_at === null)

  const isCurrentUserAssigned = activeAssignments.some(a => a.user_id === currentUserId)

  const handleAssignSelf = async () => {
    // Sprawdź czy nie przekroczono limitu 10 osób
    if (activeAssignments.length >= 10) {
      alert('Maksymalna liczba przypisanych osób to 10')
      return
    }
    await onAssign(order.id, currentUserId, currentUserId)
    await loadAssignments()
  }

  const handleUnassignSelf = () => {
    setShowUnassignConfirm(true)
  }

  const handleConfirmUnassign = async () => {
    await onUnassign(order.id, currentUserId, currentUserId)
    await loadAssignments()
    setShowUnassignConfirm(false)
  }

  const handleCancelUnassign = () => {
    setShowUnassignConfirm(false)
  }

  const handleAssignOther = async (userId) => {
    // Sprawdź czy nie przekroczono limitu 10 osób
    if (activeAssignments.length >= 10) {
      alert('Maksymalna liczba przypisanych osób to 10')
      return
    }
    await onAssign(order.id, userId, currentUserId)
    await loadAssignments()
    setShowAssignDropdown(false)
  }

  const availableUsers = allUsers.filter(
    user => !activeAssignments.some(a => a.user_id === user.id)
  )

  const isMaxAssignmentsReached = activeAssignments.length >= 10

  const handleCardClick = (e) => {
    // Nie otwieraj modalu na desktop (>= 640px)
    if (window.innerWidth >= 640) {
      return
    }

    // Nie otwieraj modalu jeśli kliknięto w przycisk lub dropdown
    if (e.target.closest('button') || e.target.closest('.assign-other-dropdown')) {
      return
    }
    setShowActionsModal(true)
  }

  const handleActionClick = (action) => {
    setShowActionsModal(false)
    action()
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const formatTime = (time) => {
    return time.substring(0, 5)
  }

  return (
    <>
      <div className={`order-card status-${order.status}`} onClick={handleCardClick}>
        <div className="order-top-row">
            {activeAssignments.length > 0 && activeAssignments[0] ? (
              <span className="first-assigned-badge">
                {activeAssignments[0].user_profile?.name || 'Nieznany'}
              </span>
            ) : order.status === 'active' ? (
              <span className="unassigned-badge">Nieprzydzielone</span>
            ) : null}
            <div className="top-row-icons">
              {(assignments.length > 0 || edits.length > 0) && (
                <button
                  className="btn-history-icon"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowHistory(!showHistory)
                  }}
                  title="Historia"
                >
                  📜
                  {activeAssignments.length > 0 && (
                    <span className="history-badge">{activeAssignments.length}</span>
                  )}
                </button>
              )}
              {order.notes && (
                <button
                  className="btn-notes-info"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowNotesPopup(!showNotesPopup)
                  }}
                  title="Notatki"
                >
                  i
                </button>
              )}
            </div>
          </div>

        <div className="order-main-row">
        <div className="order-info">
          <span className="order-date">{formatDate(order.date)}</span>
          <span className="order-time">{formatTime(order.time)}</span>
          <span className="order-separator">•</span>
          <span className="order-plate">{order.plate}</span>
          {order.insurance_company && (
            <span className="insurance-badge">{order.insurance_company}</span>
          )}
          <span className="order-separator">•</span>
          <span className="order-location">{order.location}</span>
        </div>

        <div className="order-actions">
          {order.insurance_company && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                window.open(`/insurance/${order.insurance_company}.pdf`, '_blank')
              }}
              className="btn-icon btn-print-oc"
              title={`Drukuj OC - ${order.insurance_company}`}
            >
              🖨️
            </button>
          )}
          {order.status === 'active' && (
            <>
              <button onClick={() => onComplete(order.id)} className="btn-complete btn-success" disabled={!isOnline}>
                Zakończ
              </button>
              <button onClick={() => onEdit(order)} className="btn-icon btn-secondary" title="Edytuj" disabled={!isOnline}>
                ✏️
              </button>
              <button onClick={() => onDelete(order.id)} className="btn-icon btn-danger" title="Usuń" disabled={!isOnline}>
                ✕
              </button>
            </>
          )}

          {order.status === 'completed' && (
            <>
              <button onClick={() => onRestore(order.id)} className="btn-icon btn-primary" title="Przywróć" disabled={!isOnline}>
                ↶
              </button>
              <button onClick={() => onDelete(order.id)} className="btn-icon btn-danger" title="Usuń" disabled={!isOnline}>
                ✕
              </button>
            </>
          )}

          {order.status === 'deleted' && (
            <button onClick={() => onRestore(order.id)} className="btn-icon btn-primary" title="Przywróć" disabled={!isOnline}>
              ↶
            </button>
          )}
        </div>
      </div>

      {order.notes && (
        <>
          <div className="order-notes order-notes-desktop">{order.notes}</div>
          {showNotesPopup && (
            <div className="notes-popup" onClick={(e) => e.stopPropagation()}>
              <div className="notes-popup-content">
                {order.notes}
              </div>
            </div>
          )}
        </>
      )}

      <div className="assignment-section" onClick={(e) => e.stopPropagation()}>
        <div className="assignment-actions-compact">
          {isCurrentUserAssigned ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleUnassignSelf()
              }}
              className="btn-compact btn-secondary"
              disabled={!isOnline}
            >
              Wypisz się
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleAssignSelf()
              }}
              className="btn-compact btn-primary"
              disabled={isMaxAssignmentsReached || !isOnline}
            >
              Zapisz się
            </button>
          )}

          <div className="assign-other-dropdown">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowAssignDropdown(!showAssignDropdown)
              }}
              className="btn-compact btn-secondary"
              disabled={availableUsers.length === 0 || isMaxAssignmentsReached || !isOnline}
              title={isMaxAssignmentsReached ? 'Osiągnięto maksymalną liczbę przypisanych (10)' : ''}
            >
              Przypisz
            </button>

            {showAssignDropdown && availableUsers.length > 0 && (
              <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
                {availableUsers.map(user => (
                  <button
                    key={user.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleAssignOther(user.id)
                    }}
                    className="dropdown-item"
                  >
                    {user.name}
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>

        {showHistory && (
          <AssignmentHistory
            assignments={assignments}
            currentUserId={currentUserId}
            edits={edits}
          />
        )}
      </div>
    </div>

    {showActionsModal && (
      <div className="modal-overlay" onClick={() => setShowActionsModal(false)}>
        <div className="modal-content modal-actions-menu" onClick={(e) => e.stopPropagation()}>
          <h3 className="modal-title">{order.plate}</h3>
          <div className="modal-actions-list">
            {order.status === 'active' && (
              <>
                <button
                  onClick={() => handleActionClick(() => onComplete(order.id))}
                  className="modal-action-item btn-success"
                  disabled={!isOnline}
                >
                  ✓ Zakończ zlecenie
                </button>
                <button
                  onClick={() => handleActionClick(() => onEdit(order))}
                  className="modal-action-item btn-secondary"
                  disabled={!isOnline}
                >
                  ✏️ Edytuj
                </button>
                <button
                  onClick={() => handleActionClick(() => onDelete(order.id))}
                  className="modal-action-item btn-danger"
                  disabled={!isOnline}
                >
                  ✕ Usuń
                </button>
              </>
            )}
            {order.insurance_company && (
              <button
                onClick={() => handleActionClick(() => window.open(`/insurance/${order.insurance_company}.pdf`, '_blank'))}
                className="modal-action-item btn-print-oc-modal"
              >
                🖨️ Drukuj OC ({order.insurance_company})
              </button>
            )}

            {order.status === 'completed' && (
              <>
                <button
                  onClick={() => handleActionClick(() => onRestore(order.id))}
                  className="modal-action-item btn-primary"
                  disabled={!isOnline}
                >
                  ↶ Przywróć do aktywnych
                </button>
                <button
                  onClick={() => handleActionClick(() => onDelete(order.id))}
                  className="modal-action-item btn-danger"
                  disabled={!isOnline}
                >
                  ✕ Usuń
                </button>
              </>
            )}

            {order.status === 'deleted' && (
              <button
                onClick={() => handleActionClick(() => onRestore(order.id))}
                className="modal-action-item btn-primary"
                disabled={!isOnline}
              >
                ↶ Przywróć do aktywnych
              </button>
            )}

            <button
              onClick={() => setShowActionsModal(false)}
              className="modal-action-item btn-secondary"
            >
              Anuluj
            </button>
          </div>
        </div>
      </div>
    )}

    {showUnassignConfirm && (
      <div className="modal-overlay" onClick={handleCancelUnassign}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <h2>Potwierdzenie wypisania</h2>
          <p>Czy na pewno chcesz wypisać się z tego zlecenia?</p>
          <div className="modal-actions">
            <button onClick={handleCancelUnassign} className="btn-secondary">
              Anuluj
            </button>
            <button onClick={handleConfirmUnassign} className="btn-danger">
              Wypisz się
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
