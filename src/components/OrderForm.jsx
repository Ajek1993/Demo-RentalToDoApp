import { useState, useEffect, useCallback } from 'react'
import { useAvailability } from '../hooks/useAvailability'
import { findVehicleByPlate } from '../lib/vehicleService'
import { detectCityInLocation } from '../lib/cityService'
import { calculateDistancePrice } from '../lib/priceCalculator'

const INSURANCE_COMPANIES = ['PZU', 'WARTA', 'VIG', 'ALLIANZ', 'TUW', 'INNE']

/**
 * Parsuje string lokalizacji i wyodrębnia komponenty
 * @param {string} locationString - np. "transfer komis Opolska OC"
 * @returns {{ operationType: string, hasOC: boolean, cleanLocation: string }}
 */
function parseLocationString(locationString) {
  if (!locationString) {
    return { operationType: '', hasOC: false, cleanLocation: '' }
  }

  const str = locationString.trim()
  const strLower = str.toLowerCase()

  // Wykryj typ operacji
  let operationType = ''
  if (strLower.startsWith('wydanie ')) operationType = 'wydanie'
  else if (strLower.startsWith('odbiór ') || strLower.startsWith('odbior ')) operationType = 'odbiór'
  else if (strLower.startsWith('transfer ')) operationType = 'transfer'

  // Wykryj flagę OC (na końcu stringa)
  const hasOC = /\bOC\b/i.test(str)

  // Usuń typ operacji z początku i OC z końca
  let cleanLocation = str
  if (operationType) {
    cleanLocation = cleanLocation.replace(new RegExp(`^${operationType}\\s+`, 'i'), '')
  }
  cleanLocation = cleanLocation.replace(/\s+OC\b/gi, '').trim()

  return { operationType, hasOC, cleanLocation }
}

export function OrderForm({ onSubmit, initialData, onCancel, isAdmin }) {
  // Parsuj initialData.location przy edycji
  const parsedLocation = parseLocationString(initialData?.location)

  const [formData, setFormData] = useState({
    plate: initialData?.plate || '',
    date: initialData?.date || '',
    time: initialData?.time || '',
    location: initialData ? parsedLocation.cleanLocation : '',
    notes: initialData?.notes || '',
    insurance_company: initialData?.insurance_company || null
  })
  const [ocSprwacy, setOcSprawcy] = useState(
    !!initialData?.insurance_company || parsedLocation.hasOC
  )
  const [operationType, setOperationType] = useState(parsedLocation.operationType)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [dateAvailability, setDateAvailability] = useState([])
  const { fetchDateAvailability } = useAvailability()
  const [detectedMarka, setDetectedMarka] = useState('')
  const [detectedDistance, setDetectedDistance] = useState(null)
  const [detectedCity, setDetectedCity] = useState(null)
  const [isOneWay, setIsOneWay] = useState(initialData?.is_one_way || false)

  useEffect(() => {
    if (formData.date) {
      fetchDateAvailability(formData.date).then(setDateAvailability)
    } else {
      setDateAvailability([])
    }
  }, [formData.date])

  // Wykryj dystans z bazy miast przy zmianie lokalizacji
  useEffect(() => {
    async function detectDistance() {
      if (formData.location.trim().length >= 3) {
        const { city, distanceKm } = await detectCityInLocation(formData.location)
        setDetectedDistance(distanceKm)
        setDetectedCity(city)
        // Resetuj isOneWay jeśli dystans <= 100km
        if (distanceKm === null || distanceKm <= 100) {
          setIsOneWay(false)
        }
      } else {
        setDetectedDistance(null)
        setDetectedCity(null)
        setIsOneWay(false)
      }
    }
    detectDistance()
  }, [formData.location])

  function handleChange(e) {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }))
    }
  }

  // Autocomplete marki przy zmianie numeru rejestracyjnego
  const handlePlateChange = useCallback(async (e) => {
    const value = e.target.value.toUpperCase().trim()
    setFormData(prev => ({ ...prev, plate: value }))
    if (errors.plate) {
      setErrors(prev => ({ ...prev, plate: null }))
    }

    // Szukaj marki gdy nr rej ma min 3 znaki
    if (value.length >= 3) {
      const marka = await findVehicleByPlate(value)
      setDetectedMarka(marka || '')
    } else {
      setDetectedMarka('')
    }
  }, [errors.plate])

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
      const composedLocation = [
        operationType,
        formData.location.trim(),
        ocSprwacy ? 'OC' : ''
      ].filter(Boolean).join(' ')

      await onSubmit({
        ...formData,
        location: composedLocation,
        is_one_way: isOneWay && detectedDistance && detectedDistance > 100
      })
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
          onChange={handlePlateChange}
          placeholder="np. WA12345"
          disabled={submitting}
        />
        {errors.plate && <span className="error">{errors.plate}</span>}
        {detectedMarka && (
          <span className="detected-marka">
            Pojazd: <strong>{detectedMarka}</strong>
          </span>
        )}
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
        <label htmlFor="time">Godzina</label>
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
        <label>Typ operacji</label>
        <div className="operation-type-group">
          {['wydanie', 'odbiór', 'transfer'].map(type => (
            <button
              key={type}
              type="button"
              className={`operation-type-btn ${operationType === type ? 'selected' : ''}`}
              aria-pressed={operationType === type}
              onClick={() => {
                const newType = operationType === type ? '' : type
                setOperationType(newType)
                // Przy wyborze transfer - wyłącz OC sprawcy
                if (newType === 'transfer') {
                  setOcSprawcy(false)
                  setFormData(prev => ({ ...prev, insurance_company: null }))
                }
              }}
              disabled={submitting}
            >
              {type}
            </button>
          ))}
        </div>
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
        {detectedCity && detectedDistance && (
          <div className="detected-distance">
            <span className="distance-badge">
              {detectedCity}: {detectedDistance} km
              {detectedDistance > 100 && (
                <span className="distance-price">
                  {' '}~{calculateDistancePrice(detectedDistance)} zł
                  {isOneWay && <span className="one-way-price"> → {Math.round(calculateDistancePrice(detectedDistance) * 1.5)} zł (x1,5)</span>}
                </span>
              )}
            </span>
          </div>
        )}
      </div>

      {detectedDistance && detectedDistance > 100 && (
        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={isOneWay}
              onChange={(e) => setIsOneWay(e.target.checked)}
              disabled={submitting}
            />
            Tylko w jedną stronę (mnożnik x1,5)
          </label>
        </div>
      )}

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
            disabled={submitting || operationType === 'transfer'}
          />
          OC sprawcy
          {operationType === 'transfer' && (
            <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginLeft: '8px' }}>
              (niedostępne dla transferu)
            </span>
          )}
        </label>
        {ocSprwacy && (
          <>
            <label htmlFor="insurance-company-select" className="sr-only">Ubezpieczyciel OC</label>
            <select
              id="insurance-company-select"
              name="insurance_company"
              value={formData.insurance_company || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, insurance_company: e.target.value }))}
              disabled={submitting}
              className="insurance-select"
              aria-label="Wybierz ubezpieczyciela"
            >
              {INSURANCE_COMPANIES.map(company => (
                <option key={company} value={company}>{company}</option>
              ))}
            </select>
          </>
        )}
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
