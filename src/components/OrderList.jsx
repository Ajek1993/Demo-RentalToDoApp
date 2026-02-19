import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useOrders } from '../hooks/useOrders'
import { OrderCard } from './OrderCard'
import { OrderForm } from './OrderForm'
import { useOnlineStatus } from './OfflineBanner'

function toLocalDateStr(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function groupOrdersByDate(orders) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = toLocalDateStr(today)

  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = toLocalDateStr(tomorrow)

  const groups = {
    overdue: { label: 'Przeterminowane', orders: [] },
    today: { label: 'Dzisiaj', orders: [] },
    tomorrow: { label: 'Jutro', orders: [] },
    later: { label: 'Później', orders: [] },
  }

  for (const order of orders) {
    const d = order.date
    if (!d || d < todayStr) {
      groups.overdue.orders.push(order)
    } else if (d === todayStr) {
      groups.today.orders.push(order)
    } else if (d === tomorrowStr) {
      groups.tomorrow.orders.push(order)
    } else {
      groups.later.orders.push(order)
    }
  }

  // Sortuj wewnątrz grup: date ASC, time ASC
  const sortFn = (a, b) => {
    if (a.date !== b.date) return (a.date || '').localeCompare(b.date || '')
    return (a.time || '').localeCompare(b.time || '')
  }
  for (const g of Object.values(groups)) {
    g.orders.sort(sortFn)
  }

  return groups
}

export function OrderList({ currentUser, isAdmin }) {
  const { orders, loading, myAssignedOrderIds, createOrder, updateOrder, deleteOrder, completeOrder, restoreOrder, assignToOrder, unassignFromOrder, fetchAssignments, fetchOrderEdits } = useOrders()
  const isOnline = useOnlineStatus()
  const [activeTab, setActiveTab] = useState('active')
  const [showModal, setShowModal] = useState(false)
  const [editingOrder, setEditingOrder] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [orderToDelete, setOrderToDelete] = useState(null)
  const [deleteAssignments, setDeleteAssignments] = useState([])
  const [showOnlyMine, setShowOnlyMine] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [collapsedGroups, setCollapsedGroups] = useState(new Set())
  const [showSearch, setShowSearch] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const searchInputRef = useRef(null)

  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [showSearch])

  const toggleGroup = useCallback((groupKey) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupKey)) {
        next.delete(groupKey)
      } else {
        next.add(groupKey)
      }
      return next
    })
  }, [])

  const filteredOrders = useMemo(() => {
    let result = orders.filter(order => order.status === activeTab)
    if (showOnlyMine) {
      result = result.filter(order => myAssignedOrderIds.has(order.id))
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      result = result.filter(order => {
        const displayDate = order.date
          ? order.date.split('-').reverse().join('.')
          : ''
        return (
          (order.plate || '').toLowerCase().includes(q) ||
          (order.location || '').toLowerCase().includes(q) ||
          (order.notes || '').toLowerCase().includes(q) ||
          displayDate.includes(q)
        )
      })
    }
    if (dateFrom) {
      result = result.filter(order => order.date >= dateFrom)
    }
    if (dateTo) {
      result = result.filter(order => order.date <= dateTo)
    }
    result.sort((a, b) => {
      if (a.date !== b.date) return (a.date || '').localeCompare(b.date || '')
      return (a.time || '').localeCompare(b.time || '')
    })
    return result
  }, [orders, activeTab, showOnlyMine, myAssignedOrderIds, searchQuery, dateFrom, dateTo])

  const dateGroups = useMemo(() => {
    if (activeTab !== 'active') return null
    return groupOrdersByDate(filteredOrders)
  }, [filteredOrders, activeTab])

  const handleAddOrder = () => {
    setEditingOrder(null)
    setShowModal(true)
  }

  const handleEditOrder = (order) => {
    setEditingOrder(order)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingOrder(null)
  }

  const handleSubmitOrder = async (formData) => {
    if (editingOrder) {
      await updateOrder(editingOrder.id, formData, editingOrder)
    } else {
      await createOrder(formData)
    }
    handleCloseModal()
  }

  const handleCompleteOrder = async (id) => {
    await completeOrder(id)
  }

  const handleDeleteOrder = async (id) => {
    const { data: assignments } = await fetchAssignments(id)

    // Zawsze pokazuj modal potwierdzenia
    setOrderToDelete(id)
    setDeleteAssignments(assignments || [])
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = async () => {
    if (orderToDelete) {
      await deleteOrder(orderToDelete)
      setShowDeleteConfirm(false)
      setOrderToDelete(null)
      setDeleteAssignments([])
    }
  }

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false)
    setOrderToDelete(null)
    setDeleteAssignments([])
  }

  const handleRestoreOrder = async (id) => {
    await restoreOrder(id)
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Ładowanie zleceń...</p>
      </div>
    )
  }

  return (
    <div className="order-list-container">
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'active' ? 'active' : ''}`}
          onClick={() => setActiveTab('active')}
        >
          Aktywne ({orders.filter(o => o.status === 'active').length})
        </button>
        <button
          className={`tab ${activeTab === 'completed' ? 'active' : ''}`}
          onClick={() => setActiveTab('completed')}
        >
          Zakończone ({orders.filter(o => o.status === 'completed').length})
        </button>
        <button
          className={`tab ${activeTab === 'deleted' ? 'active' : ''}`}
          onClick={() => setActiveTab('deleted')}
        >
          Usunięte ({orders.filter(o => o.status === 'deleted').length})
        </button>
      </div>

      <div className="toolbar">
            <button
              className={`toolbar-icon-btn ${showFilters ? 'active' : ''} ${(showOnlyMine || dateFrom || dateTo) ? 'has-active-filter' : ''}`}
              onClick={() => setShowFilters(prev => !prev)}
              title="Filtry"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            </button>
            {showSearch ? (
              <div className="search-wrapper search-expanded">
                <input
                  ref={searchInputRef}
                  type="text"
                  className="search-input"
                  placeholder="Szukaj..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onBlur={() => {
                    if (!searchQuery) setShowSearch(false)
                  }}
                />
                <button
                  className="search-clear"
                  onClick={() => { setSearchQuery(''); setShowSearch(false) }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                className={`toolbar-icon-btn ${searchQuery ? 'has-active-filter' : ''}`}
                onClick={() => setShowSearch(true)}
                title="Szukaj"
                style={{ marginLeft: 'auto' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </button>
            )}
          </div>

          {showFilters && (
            <div className="filter-panel">
              <button
                className={`filter-chip ${showOnlyMine ? 'active' : ''}`}
                onClick={() => setShowOnlyMine(prev => !prev)}
              >
                Moje
              </button>
              <label className="date-range-label">Od</label>
              <input
                type="date"
                className="date-range-input"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
              <label className="date-range-label">Do</label>
              <input
                type="date"
                className="date-range-input"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
              {(dateFrom || dateTo) && (
                <button
                  className="filter-chip"
                  onClick={() => { setDateFrom(''); setDateTo('') }}
                >
                  ✕
                </button>
              )}
            </div>
          )}

          <div className="orders-container">
            {filteredOrders.length === 0 ? (
              <div className="empty-state">
                <p>
                  {activeTab === 'active' && (showOnlyMine ? 'Brak przypisanych do Ciebie zleceń' : 'Brak aktywnych zleceń')}
                  {activeTab === 'completed' && 'Brak zakończonych zleceń'}
                  {activeTab === 'deleted' && 'Brak usuniętych zleceń'}
                </p>
              </div>
            ) : dateGroups ? (
              Object.entries(dateGroups).map(([key, group]) => {
                if (group.orders.length === 0) return null
                const isCollapsed = collapsedGroups.has(key)
                return (
                  <div className={`date-group ${key === 'overdue' ? 'date-group-overdue' : ''}`} key={key}>
                    <button className="date-group-header" onClick={() => toggleGroup(key)}>
                      <span className={`chevron ${isCollapsed ? '' : 'open'}`}>›</span>
                      <span className="date-group-label">{group.label}</span>
                      <span className="date-group-count">{group.orders.length}</span>
                    </button>
                    {!isCollapsed && (
                      <div className="date-group-body">
                        {group.orders.map(order => (
                          <OrderCard
                            key={order.id}
                            order={order}
                            currentUserId={currentUser?.id}
                            onEdit={handleEditOrder}
                            onComplete={handleCompleteOrder}
                            onDelete={handleDeleteOrder}
                            onRestore={handleRestoreOrder}
                            onAssign={assignToOrder}
                            onUnassign={unassignFromOrder}
                            fetchAssignments={fetchAssignments}
                            fetchOrderEdits={fetchOrderEdits}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })
            ) : (
              filteredOrders.map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  currentUserId={currentUser?.id}
                  onEdit={handleEditOrder}
                  onComplete={handleCompleteOrder}
                  onDelete={handleDeleteOrder}
                  onRestore={handleRestoreOrder}
                  onAssign={assignToOrder}
                  onUnassign={unassignFromOrder}
                  fetchAssignments={fetchAssignments}
                  fetchOrderEdits={fetchOrderEdits}
                />
              ))
            )}
          </div>

          <button className="fab" onClick={handleAddOrder} title="Dodaj zlecenie" disabled={!isOnline}>
        +
      </button>

      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingOrder ? 'Edytuj zlecenie' : 'Nowe zlecenie'}</h2>
            <OrderForm
              onSubmit={handleSubmitOrder}
              initialData={editingOrder}
              onCancel={handleCloseModal}
              isAdmin={isAdmin}
            />
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={handleCancelDelete}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Potwierdzenie usunięcia</h2>
            <p>
              {deleteAssignments.length > 0 ? (
                <>
                  To zlecenie jest przypisane do:{' '}
                  <strong>
                    {deleteAssignments[0]?.user_profile?.name || 'Nieznany'}
                  </strong>
                  . Czy na pewno chcesz je usunąć?
                </>
              ) : (
                'Czy na pewno chcesz usunąć to zlecenie?'
              )}
            </p>
            <div className="modal-actions">
              <button onClick={handleCancelDelete} className="btn-secondary">
                Anuluj
              </button>
              <button onClick={handleConfirmDelete} className="btn-danger">
                {deleteAssignments.length > 0 ? 'Usuń mimo to' : 'Usuń'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
