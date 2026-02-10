import { useState } from 'react'
import { useOrders } from '../hooks/useOrders'
import { OrderCard } from './OrderCard'
import { OrderForm } from './OrderForm'
import { useOnlineStatus } from './OfflineBanner'

export function OrderList({ currentUser }) {
  const { orders, loading, createOrder, updateOrder, deleteOrder, completeOrder, restoreOrder, assignToOrder, unassignFromOrder, fetchAssignments } = useOrders()
  const isOnline = useOnlineStatus()
  const [activeTab, setActiveTab] = useState('active')
  const [showModal, setShowModal] = useState(false)
  const [editingOrder, setEditingOrder] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [orderToDelete, setOrderToDelete] = useState(null)
  const [deleteAssignments, setDeleteAssignments] = useState([])

  const filteredOrders = orders.filter(order => order.status === activeTab)

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
      await updateOrder(editingOrder.id, formData)
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

      <div className="orders-container">
        {filteredOrders.length === 0 ? (
          <div className="empty-state">
            <p>
              {activeTab === 'active' && 'Brak aktywnych zleceń'}
              {activeTab === 'completed' && 'Brak zakończonych zleceń'}
              {activeTab === 'deleted' && 'Brak usuniętych zleceń'}
            </p>
          </div>
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
