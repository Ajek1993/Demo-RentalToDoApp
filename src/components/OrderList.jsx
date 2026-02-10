import { useState } from 'react'
import { useOrders } from '../hooks/useOrders'
import { OrderCard } from './OrderCard'
import { OrderForm } from './OrderForm'

export function OrderList() {
  const { orders, loading, createOrder, updateOrder, deleteOrder, completeOrder, restoreOrder } = useOrders()
  const [activeTab, setActiveTab] = useState('active')
  const [showModal, setShowModal] = useState(false)
  const [editingOrder, setEditingOrder] = useState(null)

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
    await deleteOrder(id)
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
              onEdit={handleEditOrder}
              onComplete={handleCompleteOrder}
              onDelete={handleDeleteOrder}
              onRestore={handleRestoreOrder}
            />
          ))
        )}
      </div>

      <button className="fab" onClick={handleAddOrder} title="Dodaj zlecenie">
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
    </div>
  )
}
