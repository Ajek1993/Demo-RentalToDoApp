import { useState, useEffect } from 'react'
import { useAvailability } from '../hooks/useAvailability'

export function OrderForm({ onSubmit, initialData, onCancel }) {
  const [formData, setFormData] = useState({
    plate: initialData?.plate || '',
    date: initialData?.date || '',
    time: initialData?.time || '',
    location: initialData?.location || '',
    notes: initialData?.notes || ''
  })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [dateAvailability, setDateAvailability] = useState([])
  const { fetchDateAvailability } = useAvailability()

  useEffect(() => {
    if (formData.date) {
      fetchDateAvailability(formData.date).then(setDateAvailability)
    } else {
      setDateAvailability([])
    }
  }, [formData.date])

  function handleChange(e) {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }))
    }
  }

  function validate() {
    const newErrors = {}

    if (!formData.plate.trim()) {
      newErrors.plate = 'Numer rejestracyjny jest wymagany'
    }
    if (!formData.date) {
      newErrors.date = 'Data jest wymagana'
    }
    if (!formData.time) {
      newErrors.time = 'Godzina jest wymagana'
    }
    if (!formData.location.trim()) {
      newErrors.location = 'Lokalizacja jest wymagana'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!validate()) return

    setSubmitting(true)
    try {
      await onSubmit(formData)
    } catch (error) {
      console.error('Error submitting form:', error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="order-form">
      <div className="form-group">
        <label htmlFor="plate">Numer rejestracyjny *</label>
        <input
          type="text"
          id="plate"
          name="plate"
          value={formData.plate}
          onChange={handleChange}
          placeholder="np. WA12345"
          disabled={submitting}
        />
        {errors.plate && <span className="error">{errors.plate}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="date">Data *</label>
        <input
          type="date"
          id="date"
          name="date"
          value={formData.date}
          onChange={handleChange}
          disabled={submitting}
        />
        {errors.date && <span className="error">{errors.date}</span>}
        {formData.date && dateAvailability.length > 0 && (
          <div className="avail-preview">
            <span className="avail-preview-label">Dostępni:</span>
            {dateAvailability.map((person, i) => {
              const slotsText = person.slots.some(s => s.is_full_day)
                ? 'cały dzień'
                : person.slots.map(s =>
                    `${s.start_time?.substring(0, 5)}-${s.end_time?.substring(0, 5)}`
                  ).join(', ')
              return (
                <div key={i} className="avail-preview-person">
                  <span className="avail-preview-name">{person.name}</span>
                  <span className="avail-preview-slots">{slotsText}</span>
                </div>
              )
            })}
          </div>
        )}
        {formData.date && dateAvailability.length === 0 && (
          <div className="avail-preview avail-preview-empty">
            Brak zgłoszonej dyspozycyjności na ten dzień
          </div>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="time">Godzina *</label>
        <input
          type="time"
          id="time"
          name="time"
          value={formData.time}
          onChange={handleChange}
          disabled={submitting}
        />
        {errors.time && <span className="error">{errors.time}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="location">Lokalizacja *</label>
        <input
          type="text"
          id="location"
          name="location"
          value={formData.location}
          onChange={handleChange}
          placeholder="np. Lotnisko Okęcie T1"
          disabled={submitting}
        />
        {errors.location && <span className="error">{errors.location}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="notes">Notatki</label>
        <textarea
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          placeholder="Dodatkowe informacje..."
          rows="3"
          disabled={submitting}
        />
      </div>

      <div className="form-actions">
        <button type="button" onClick={onCancel} disabled={submitting}>
          Anuluj
        </button>
        <button type="submit" disabled={submitting}>
          {submitting ? 'Zapisywanie...' : 'Zapisz'}
        </button>
      </div>
    </form>
  )
}
