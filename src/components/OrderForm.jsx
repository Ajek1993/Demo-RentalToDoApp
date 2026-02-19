import { useState, useEffect } from 'react'
import { useAvailability } from '../hooks/useAvailability'

const INSURANCE_COMPANIES = ['PZU', 'WARTA', 'VIG', 'ALLIANZ', 'TUW', 'INNE']

export function OrderForm({ onSubmit, initialData, onCancel, isAdmin }) {
  const [formData, setFormData] = useState({
    plate: initialData?.plate || '',
    date: initialData?.date || '',
    time: initialData?.time || '',
    location: initialData?.location || '',
    notes: initialData?.notes || '',
    insurance_company: initialData?.insurance_company || null
  })
  const [ocSprwacy, setOcSprawcy] = useState(!!initialData?.insurance_company)
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
    } else if (formData.plate.trim().length > 10) {
      newErrors.plate = 'Numer rejestracyjny jest za długi (max 10 znaków)'
    }
    if (!formData.date) {
      newErrors.date = 'Data jest wymagana'
    }
    if (!formData.time) {
      newErrors.time = 'Godzina jest wymagana'
    }
    if (!formData.location.trim()) {
      newErrors.location = 'Lokalizacja jest wymagana'
    } else if (formData.location.trim().length > 200) {
      newErrors.location = 'Lokalizacja jest za długa (max 200 znaków)'
    }
    if (formData.notes.length > 2000) {
      newErrors.notes = 'Uwagi są za długie (max 2000 znaków)'
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

  function handleQuickPaste(e) {
    const value = e.target.value.trim()
    const match = value.match(/^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}:\d{2})$/)
    if (match) {
      const [, day, month, year, time] = match
      const date = `${year}-${month}-${day}`
      setFormData(prev => ({ ...prev, date, time }))
      setErrors(prev => ({ ...prev, date: null, time: null }))
      e.target.value = ''
    }
  }

  return (
    <form onSubmit={handleSubmit} className="order-form">
      <div className="form-group quick-paste-group">
        <label htmlFor="quickPaste">Szybkie wklejanie daty</label>
        <input
          type="text"
          id="quickPaste"
          onChange={handleQuickPaste}
          onPaste={(e) => {
            setTimeout(() => handleQuickPaste(e), 0)
          }}
          placeholder="Wklej np. 14-02-2026 18:00"
          disabled={submitting}
        />
      </div>

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
              const isUnavail = person.slots.some(s => s.is_unavailable)
              const slotsText = isUnavail
                ? 'brak'
                : person.slots.some(s => s.is_full_day)
                ? 'cały dzień'
                : person.slots.map(s =>
                    `${s.start_time?.substring(0, 5)}-${s.end_time?.substring(0, 5)}`
                  ).join(', ')
              return (
                <div key={i} className="avail-preview-person">
                  <span className="avail-preview-name">{person.name}</span>
                  <span className={`avail-preview-slots ${isUnavail ? 'unavailable' : ''}`}>{slotsText}</span>
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

      {isAdmin && (
        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={ocSprwacy}
              onChange={(e) => {
                setOcSprawcy(e.target.checked)
                if (!e.target.checked) {
                  setFormData(prev => ({ ...prev, insurance_company: null }))
                } else if (!formData.insurance_company) {
                  setFormData(prev => ({ ...prev, insurance_company: 'PZU' }))
                }
              }}
              disabled={submitting}
            />
            OC sprawcy
          </label>
          {ocSprwacy && (
            <select
              name="insurance_company"
              value={formData.insurance_company || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, insurance_company: e.target.value }))}
              disabled={submitting}
              className="insurance-select"
            >
              {INSURANCE_COMPANIES.map(company => (
                <option key={company} value={company}>{company}</option>
              ))}
            </select>
          )}
        </div>
      )}

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
