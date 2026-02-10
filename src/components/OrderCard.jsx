import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { AssignmentHistory } from './AssignmentHistory'

export function OrderCard({ order, currentUserId, onEdit, onComplete, onDelete, onRestore, onAssign, onUnassign, fetchAssignments }) {
  const [assignments, setAssignments] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [showAssignDropdown, setShowAssignDropdown] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showActionsModal, setShowActionsModal] = useState(false)

  useEffect(() => {
    loadAssignments()
    loadAllUsers()
  }, [order.id])

  async function loadAssignments() {
    const { data } = await fetchAssignments(order.id)
    setAssignments(data)
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

  const handleUnassignSelf = async () => {
    await onUnassign(order.id, currentUserId, currentUserId)
    await loadAssignments()
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
        {activeAssignments.length > 0 && activeAssignments[0] && (
          <div className="order-assigned-first">
            <span className="first-assigned-badge">
              {activeAssignments[0].user_profile?.name || 'Nieznany'}
            </span>
          </div>
        )}

        <div className="order-main-row">
        <div className="order-info">
          <span className="order-plate">{order.plate}</span>
          <span className="order-separator">•</span>
          <span className="order-date">{formatDate(order.date)}</span>
          <span className="order-time">{formatTime(order.time)}</span>
          <span className="order-separator">•</span>
          <span className="order-location">{order.location}</span>
        </div>

        <div className="order-actions">
          {order.status === 'active' && (
            <>
              <button onClick={() => onComplete(order.id)} className="btn-complete btn-success">
                Zakończ
              </button>
              <button onClick={() => onEdit(order)} className="btn-icon btn-secondary" title="Edytuj">
                ✏️
              </button>
              <button onClick={() => onDelete(order.id)} className="btn-icon btn-danger" title="Usuń">
                ✕
              </button>
            </>
          )}

          {order.status === 'completed' && (
            <>
              <button onClick={() => onRestore(order.id)} className="btn-icon btn-primary" title="Przywróć">
                ↶
              </button>
              <button onClick={() => onDelete(order.id)} className="btn-icon btn-danger" title="Usuń">
                ✕
              </button>
            </>
          )}

          {order.status === 'deleted' && (
            <button onClick={() => onRestore(order.id)} className="btn-icon btn-primary" title="Przywróć">
              ↶
            </button>
          )}
        </div>
      </div>

      {order.notes && (
        <div className="order-notes">{order.notes}</div>
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
              disabled={isMaxAssignmentsReached}
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
              disabled={availableUsers.length === 0 || isMaxAssignmentsReached}
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

          {activeAssignments.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowHistory(!showHistory)
              }}
              className="btn-compact btn-secondary"
            >
              Historia ({activeAssignments.length})
            </button>
          )}
        </div>

        {showHistory && (
          <AssignmentHistory
            assignments={assignments}
            currentUserId={currentUserId}
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
                >
                  ✓ Zakończ zlecenie
                </button>
                <button
                  onClick={() => handleActionClick(() => onEdit(order))}
                  className="modal-action-item btn-secondary"
                >
                  ✏️ Edytuj
                </button>
                <button
                  onClick={() => handleActionClick(() => onDelete(order.id))}
                  className="modal-action-item btn-danger"
                >
                  ✕ Usuń
                </button>
              </>
            )}

            {order.status === 'completed' && (
              <>
                <button
                  onClick={() => handleActionClick(() => onRestore(order.id))}
                  className="modal-action-item btn-primary"
                >
                  ↶ Przywróć do aktywnych
                </button>
                <button
                  onClick={() => handleActionClick(() => onDelete(order.id))}
                  className="modal-action-item btn-danger"
                >
                  ✕ Usuń
                </button>
              </>
            )}

            {order.status === 'deleted' && (
              <button
                onClick={() => handleActionClick(() => onRestore(order.id))}
                className="modal-action-item btn-primary"
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
    </>
  )
}
