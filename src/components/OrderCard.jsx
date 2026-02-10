export function OrderCard({ order, onEdit, onComplete, onDelete, onRestore }) {
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
    <div className={`order-card status-${order.status}`}>
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
    </div>
  )
}
