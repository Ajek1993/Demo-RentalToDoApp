import { useState, useEffect, useRef, memo, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { AssignmentHistory } from './AssignmentHistory'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { useScrollLock } from '../hooks/useScrollLock'

export const OrderCard = memo(function OrderCard({ order, currentUserId, isAdmin, onEdit, onComplete, onDelete, onRestore, onPermanentlyDelete, onAssign, onUnassign, fetchAssignments, fetchOrderEdits, allUsers, autoOpen = false }) {
  const isOnline = useOnlineStatus()
  const [assignments, setAssignments] = useState([])
  const [edits, setEdits] = useState([])
  const [showAssignDropdown, setShowAssignDropdown] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showActionsModal, setShowActionsModal] = useState(false)
  const [showNotesPopup, setShowNotesPopup] = useState(false)
  const [showUnassignConfirm, setShowUnassignConfirm] = useState(false)
  const [showUnassignOtherConfirm, setShowUnassignOtherConfirm] = useState(false)
  const [unassignOtherTarget, setUnassignOtherTarget] = useState(null)
  const [showPermanentDeleteConfirm, setShowPermanentDeleteConfirm] = useState(false)
  const mouseDownOnOverlay = useRef(false)

  useScrollLock(showActionsModal || showUnassignConfirm || showUnassignOtherConfirm || showPermanentDeleteConfirm)

  const loadAssignments = useCallback(async () => {
    const { data } = await fetchAssignments(order.id)
    setAssignments(data)
  }, [order.id, fetchAssignments])

  const loadEdits = useCallback(async () => {
    const { data } = await fetchOrderEdits(order.id)
    setEdits(data)
  }, [order.id, fetchOrderEdits])

  useEffect(() => {
    loadAssignments()
    loadEdits()

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
  }, [order.id, loadAssignments, loadEdits])

  // Deep link: auto-otwórz modal akcji gdy autoOpen=true
  useEffect(() => {
    if (autoOpen) setShowActionsModal(true)
  }, [autoOpen])

  // Lazy load edits only when history is opened
  // eslint-disable react-hooks/exhaustive-deps
  useEffect(() => {
    if (showHistory && edits.length === 0) {
      loadEdits()
    }
  }, [showHistory, loadEdits])

  // Filtruj tylko aktywne przypisania (nie wypisane)
  const activeAssignments = assignments.filter(a => !a.unassigned_at)

  const isCurrentUserAssigned = activeAssignments.some(a => a.user_id === currentUserId)

  const handleAssignSelf = async () => {
    // Sprawdź czy nie przekroczono limitu 10 osób
    if (activeAssignments.length >= 10) {
      alert('Maksymalna liczba przypisanych osób to 10')
      return
    }
    await onAssign(order.id, currentUserId, currentUserId)
    await loadAssignments()
    setShowActionsModal(false)
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

  const handleUnassignOther = (userId, userName) => {
    setUnassignOtherTarget({ userId, userName })
    setShowUnassignOtherConfirm(true)
  }

  const handleConfirmUnassignOther = async () => {
    if (unassignOtherTarget) {
      await onUnassign(order.id, unassignOtherTarget.userId, currentUserId)
      await loadAssignments()
    }
    setShowUnassignOtherConfirm(false)
    setUnassignOtherTarget(null)
  }

  const handleCancelUnassignOther = () => {
    setShowUnassignOtherConfirm(false)
    setUnassignOtherTarget(null)
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
    setShowActionsModal(false)
  }

  const availableUsers = allUsers
    .filter(user => !activeAssignments.some(a => a.user_id === user.id))
    .sort((a, b) => {
      const surnameA = (a.name || '').split(' ').slice(1).join(' ') || a.name || ''
      const surnameB = (b.name || '').split(' ').slice(1).join(' ') || b.name || ''
      return surnameA.localeCompare(surnameB, 'pl')
    })

  const isMaxAssignmentsReached = activeAssignments.length >= 10

  const renderAssignmentButtons = (variant = 'card') => {
    if (order.status !== 'active') return null

    const wrapperClass = variant === 'modal' ? 'modal-assignment-actions' : 'assignment-actions-compact'

    return (
      <div className={wrapperClass}>
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
            aria-expanded={showAssignDropdown}
            aria-haspopup="true"
          >
            Przypisz
          </button>

          {showAssignDropdown && availableUsers.length > 0 && (
            <div className="dropdown-menu" role="menu" onClick={(e) => e.stopPropagation()}>
              {availableUsers.map(user => (
                <button
                  key={user.id}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleAssignOther(user.id)
                  }}
                  className="dropdown-item"
                  role="menuitem"
                >
                  {user.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

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
    if (!time) return null
    return time.substring(0, 5)
  }

  const formatCreatedAt = (createdAt) => {
    const d = new Date(createdAt)
    const time = d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
    const date = d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' })
    return `${time} dnia ${date}`
  }

  return (
    <>
      <article id={`order-card-${order.id}`} className={`order-card status-${order.status}`} onClick={handleCardClick}>
        <div className="order-top-row">
            {activeAssignments.length > 0 && activeAssignments[0] ? (
              <span className="first-assigned-badge">
                {activeAssignments[0].user_profile?.name || 'Nieznany'}
              </span>
            ) : (
              <span className="unassigned-badge">Nieprzydzielone</span>
            )}
            <div className="top-row-icons">
              {(assignments.length > 0 || edits.length > 0) && (
                <button
                  className="btn-history-icon"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowHistory(!showHistory)
                  }}
                  title="Historia"
                  aria-label="Historia przypisań"
                >
                  📜
                  {activeAssignments.length > 0 && (
                    <span className="history-badge">{activeAssignments.length}</span>
                  )}
                </button>
              )}
              {order.insurance_company && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    window.open(`/insurance/${order.insurance_company}.pdf`, '_blank')
                  }}
                  className="btn-icon btn-print-oc"
                  title={`Drukuj OC - ${order.insurance_company}`}
                  aria-label={`Drukuj dokument OC ${order.insurance_company}`}
                >
                  🖨️
                </button>
              )}
              {(order.notes || order.created_by_profile) && (
                <button
                  className="btn-notes-info"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowNotesPopup(!showNotesPopup)
                  }}
                  title="Notatki"
                  aria-label="Pokaż notatki"
                >
                  i
                </button>
              )}
            </div>
          </div>

        <div className="order-main-row">
        <div className="order-info">
          <span className="order-date">{formatDate(order.date)}</span>
          {order.time && (
            <>
              <span className="order-time">{formatTime(order.time)}</span>
              <span className="order-separator">•</span>
            </>
          )}
          <span className="order-plate">{order.plate}</span>
          {order.insurance_company && (
            <span className="insurance-badge">{order.insurance_company}</span>
          )}
          <span className="order-separator">•</span>
          <span className="order-location">{order.location}</span>
        </div>

        <div className="order-actions">
          {order.status === 'active' && renderAssignmentButtons()}
          {order.status === 'active' && (
            <>
              <button onClick={() => onComplete(order.id)} className="btn-complete btn-success" disabled={!isOnline}>
                Zakończ
              </button>
              <button onClick={() => onEdit(order)} className="btn-icon btn-secondary" title="Edytuj" aria-label="Edytuj zlecenie" disabled={!isOnline}>
                ✏️
              </button>
              <button onClick={() => onDelete(order.id)} className="btn-icon btn-danger" title="Usuń" aria-label="Usuń zlecenie" disabled={!isOnline}>
                ✕
              </button>
            </>
          )}

          {order.status === 'completed' && (
            <>
              <button onClick={() => onRestore(order.id)} className="btn-icon btn-primary" title="Przywróć" aria-label="Przywróć zlecenie" disabled={!isOnline}>
                ↶
              </button>
              <button onClick={() => onDelete(order.id)} className="btn-icon btn-danger" title="Usuń" aria-label="Usuń zlecenie" disabled={!isOnline}>
                ✕
              </button>
            </>
          )}

          {order.status === 'deleted' && (
            <>
              <button onClick={() => onRestore(order.id)} className="btn-icon btn-primary" title="Przywróć" aria-label="Przywróć zlecenie" disabled={!isOnline}>
                ↶
              </button>
              {isAdmin && (
                <button onClick={() => setShowPermanentDeleteConfirm(true)} className="btn-icon btn-danger" title="Usuń na stałe" aria-label="Usuń zlecenie na stałe" disabled={!isOnline}>
                  🗑️
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {order.notes && (
        <div className="order-notes order-notes-desktop">{order.notes}</div>
      )}
      {showNotesPopup && (
        <div className="notes-popup" onClick={(e) => e.stopPropagation()}>
          {order.notes && (
            <div className="notes-popup-content">
              {order.notes}
            </div>
          )}
          {order.created_by_profile && (
            <div className={`notes-popup-creator${order.notes ? '' : ' no-border'}`}>
              Dodane przez {order.created_by_profile.name} o {formatCreatedAt(order.created_at)}
            </div>
          )}
        </div>
      )}

      {order.status === 'active' && (
        <div className="assignment-section" onClick={(e) => e.stopPropagation()}>
          {renderAssignmentButtons()}
        </div>
      )}

      {showHistory && (assignments.length > 0 || edits.length > 0) && (
        <div className="assignment-history-section" onClick={(e) => e.stopPropagation()}>
          <AssignmentHistory
            assignments={assignments}
            currentUserId={currentUserId}
            edits={edits}
            onUnassignOther={order.status === 'active' ? handleUnassignOther : undefined}
            orderId={order.id}
            isOnline={isOnline}
          />
        </div>
      )}
    </article>

    {showActionsModal && (
      <div
        className="modal-overlay"
        onMouseDown={(e) => { mouseDownOnOverlay.current = e.target === e.currentTarget }}
        onClick={(e) => { if (e.target === e.currentTarget && mouseDownOnOverlay.current) setShowActionsModal(false) }}
      >
        <div className="modal-content modal-actions-menu" role="dialog" aria-modal="true" aria-label="Akcje zlecenia" onClick={(e) => e.stopPropagation()}>
          <button className="modal-close-btn" onClick={() => setShowActionsModal(false)} aria-label="Zamknij">✕</button>
          <div className="modal-assignment-header">
            <div className="modal-header-top-row">
              <span className="modal-date-time">
                {formatDate(order.date)}
                {order.time && ` ${formatTime(order.time)}`}
                {' — '}
                {order.plate}
              </span>
            </div>
            <div className="modal-header-location">
              {order.location}
            </div>
          </div>

          <div className="modal-assignment-buttons">
            {renderAssignmentButtons('modal')}
          </div>

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
              <>
                <button
                  onClick={() => handleActionClick(() => onRestore(order.id))}
                  className="modal-action-item btn-primary"
                  disabled={!isOnline}
                >
                  ↶ Przywróć do aktywnych
                </button>
                {isAdmin && (
                  <button
                    onClick={() => {
                      setShowActionsModal(false)
                      setShowPermanentDeleteConfirm(true)
                    }}
                    className="modal-action-item btn-danger"
                    disabled={!isOnline}
                  >
                    🗑️ Usuń na stałe
                  </button>
                )}
              </>
            )}

            <button
              onClick={() => setShowActionsModal(false)}
              className="modal-action-item btn-secondary"
            >
              Anuluj
            </button>
            {order.created_by_profile && (
              <p className="modal-creator-info">
                Dodane przez {order.created_by_profile.name} o {formatCreatedAt(order.created_at)}
              </p>
            )}
          </div>
        </div>
      </div>
    )}

    {showUnassignConfirm && (
      <div
        className="modal-overlay"
        onMouseDown={(e) => { mouseDownOnOverlay.current = e.target === e.currentTarget }}
        onClick={(e) => { if (e.target === e.currentTarget && mouseDownOnOverlay.current) handleCancelUnassign() }}
      >
        <div className="modal-content" role="dialog" aria-modal="true" aria-label="Potwierdzenie wypisania" onClick={(e) => e.stopPropagation()}>
          <button className="modal-close-btn" onClick={handleCancelUnassign} aria-label="Zamknij">✕</button>
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

    {showUnassignOtherConfirm && unassignOtherTarget && (
      <div
        className="modal-overlay"
        onMouseDown={(e) => { mouseDownOnOverlay.current = e.target === e.currentTarget }}
        onClick={(e) => { if (e.target === e.currentTarget && mouseDownOnOverlay.current) handleCancelUnassignOther() }}
      >
        <div className="modal-content" role="dialog" aria-modal="true" aria-label="Potwierdzenie wypisania osoby" onClick={(e) => e.stopPropagation()}>
          <button className="modal-close-btn" onClick={handleCancelUnassignOther} aria-label="Zamknij">✕</button>
          <h2>Wypisanie z zlecenia</h2>
          <p>Czy na pewno chcesz wypisać <strong>{unassignOtherTarget.userName}</strong> z tego zlecenia?</p>
          <div className="modal-actions">
            <button onClick={handleCancelUnassignOther} className="btn-secondary">
              Anuluj
            </button>
            <button onClick={handleConfirmUnassignOther} className="btn-danger">
              Wypisz
            </button>
          </div>
        </div>
      </div>
    )}

    {showPermanentDeleteConfirm && (
      <div
        className="modal-overlay"
        onMouseDown={(e) => { mouseDownOnOverlay.current = e.target === e.currentTarget }}
        onClick={(e) => { if (e.target === e.currentTarget && mouseDownOnOverlay.current) setShowPermanentDeleteConfirm(false) }}
      >
        <div className="modal-content" role="dialog" aria-modal="true" aria-label="Trwałe usunięcie zlecenia" onClick={(e) => e.stopPropagation()}>
          <button className="modal-close-btn" onClick={() => setShowPermanentDeleteConfirm(false)} aria-label="Zamknij">✕</button>
          <h2>Trwałe usunięcie</h2>
          <p>Czy na pewno chcesz <strong>na stałe</strong> usunąć zlecenie <strong>{order.plate}</strong>?</p>
          <p style={{ color: '#dc2626', fontSize: '0.9em' }}>Ta operacja jest nieodwracalna - zlecenie i cała jego historia zostaną usunięte z bazy danych.</p>
          <div className="modal-actions">
            <button onClick={() => setShowPermanentDeleteConfirm(false)} className="btn-secondary">
              Anuluj
            </button>
            <button
              onClick={() => {
                onPermanentlyDelete(order.id)
                setShowPermanentDeleteConfirm(false)
              }}
              className="btn-danger"
            >
              Usuń na stałe
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
})
