import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { toast } from 'react-hot-toast'
import { useScrollLock } from '../hooks/useScrollLock'

export function FeedbackModal({ userId, onClose }) {
  useScrollLock()
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmed = message.trim()
    if (!trimmed) return

    setSending(true)
    try {
      const { error } = await supabase
        .from('feedback')
        .insert({ user_id: userId, message: trimmed })

      if (error) throw error
      toast.success('Dziękujemy za feedback!')
      onClose()
    } catch (err) {
      console.error('Feedback error:', err)
      toast.error('Nie udało się wysłać feedbacku')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" role="dialog" aria-modal="true" aria-label="Wyślij feedback" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <button className="modal-close-btn" onClick={onClose} aria-label="Zamknij">✕</button>
        <h2>Feedback</h2>
        <form onSubmit={handleSubmit} className="order-form">
          <div className="form-group">
            <label htmlFor="feedback-message">Twój feedback</label>
            <textarea
              id="feedback-message"
              value={message}
              onChange={e => setMessage(e.target.value.slice(0, 2000))}
              placeholder="Opisz problem lub podziel się sugestią..."
              rows={5}
              autoFocus
              maxLength="2000"
            />
          </div>
          <div className="form-actions">
            <button type="button" onClick={onClose}>
              Anuluj
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={!message.trim() || sending}
            >
              {sending ? 'Wysyłanie...' : 'Wyślij'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
