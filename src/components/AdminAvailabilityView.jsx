import { useState, useEffect, useCallback } from 'react'
import { useAvailability } from '../hooks/useAvailability'
import { useScrollLock } from '../hooks/useScrollLock'

const DAY_NAMES = ['Niedz', 'Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob']

function toDateStr(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatDisplayDate(dateStr) {
  const [y, m, d] = dateStr.split('-')
  const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d))
  const dayName = DAY_NAMES[date.getDay()]
  return `${dayName} ${d}.${m}.${y}`
}

export function AdminAvailabilityView({ onClose }) {
  useScrollLock()
  const { fetchDateAvailability } = useAvailability()
  const [selectedDate, setSelectedDate] = useState(toDateStr(new Date()))
  const [dateRange, setDateRange] = useState('single') // 'single' | 'range'
  const [endDate, setEndDate] = useState('')
  const [availability, setAvailability] = useState([])
  const [rangeAvailability, setRangeAvailability] = useState({})
  const [loading, setLoading] = useState(false)

  const loadSingleDate = useCallback(async (date) => {
    setLoading(true)
    const data = await fetchDateAvailability(date)
    setAvailability(data)
    setLoading(false)
  }, [fetchDateAvailability])

  useEffect(() => {
    if (dateRange === 'single' && selectedDate) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadSingleDate(selectedDate)
    }
  }, [selectedDate, dateRange, loadSingleDate])

  async function loadDateRange() {
    if (!selectedDate || !endDate) return
    setLoading(true)

    const start = new Date(selectedDate)
    const end = new Date(endDate)
    const results = {}

    const current = new Date(start)
    while (current <= end) {
      const dateStr = toDateStr(current)
      const data = await fetchDateAvailability(dateStr)
      results[dateStr] = data
      current.setDate(current.getDate() + 1)
    }

    setRangeAvailability(results)
    setLoading(false)
  }

  function formatSlots(person) {
    const isUnavail = person.slots.some(s => s.is_unavailable)
    if (isUnavail) return 'Niedostępny'

    const isFullDay = person.slots.some(s => s.is_full_day)
    if (isFullDay) return 'Cały dzień'

    return person.slots.map(s =>
      `${s.start_time?.substring(0, 5)}-${s.end_time?.substring(0, 5)}`
    ).join(', ')
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content admin-avail-modal" role="dialog" aria-modal="true" aria-label="Dyspozycyjność kierowców" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} aria-label="Zamknij">✕</button>
        <h2>Dyspozycyjność kierowców</h2>

        <div className="admin-avail-controls">
          <div className="admin-avail-mode">
            <button
              className={`filter-chip ${dateRange === 'single' ? 'active' : ''}`}
              aria-pressed={dateRange === 'single'}
              onClick={() => setDateRange('single')}
            >
              Jeden dzień
            </button>
            <button
              className={`filter-chip ${dateRange === 'range' ? 'active' : ''}`}
              aria-pressed={dateRange === 'range'}
              onClick={() => setDateRange('range')}
            >
              Zakres dat
            </button>
          </div>

          <div className="admin-avail-dates">
            <label htmlFor="avail-start-date">
              {dateRange === 'single' ? 'Data:' : 'Od:'}
            </label>
            <input
              id="avail-start-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="date-range-input"
            />
            {dateRange === 'range' && (
              <>
                <label htmlFor="avail-end-date">Do:</label>
                <input
                  id="avail-end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="date-range-input"
                />
                <button
                  className="btn-compact btn-primary"
                  onClick={loadDateRange}
                  disabled={!selectedDate || !endDate || loading}
                >
                  Pokaż
                </button>
              </>
            )}
          </div>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
          </div>
        ) : dateRange === 'single' ? (
          <div className="admin-avail-results">
            <h3>{formatDisplayDate(selectedDate)}</h3>
            {availability.length === 0 ? (
              <p className="empty-state">Brak zgłoszonej dyspozycyjności na ten dzień</p>
            ) : (
              <ul className="admin-avail-list">
                {availability.map((person, i) => {
                  const isUnavail = person.slots.some(s => s.is_unavailable)
                  return (
                    <li key={i} className={`admin-avail-person ${isUnavail ? 'unavailable' : ''}`}>
                      <span className="admin-avail-name">{person.name}</span>
                      <span className={`admin-avail-slots ${isUnavail ? 'unavailable' : ''}`}>
                        {formatSlots(person)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        ) : (
          <div className="admin-avail-results">
            {Object.keys(rangeAvailability).length === 0 ? (
              <p className="empty-state">Wybierz zakres dat i kliknij "Pokaż"</p>
            ) : (
              Object.entries(rangeAvailability)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([date, persons]) => (
                  <div key={date} className="admin-avail-day-section">
                    <h3>{formatDisplayDate(date)}</h3>
                    {persons.length === 0 ? (
                      <p className="admin-avail-empty">Brak zgłoszeń</p>
                    ) : (
                      <ul className="admin-avail-list compact">
                        {persons.map((person, i) => {
                          const isUnavail = person.slots.some(s => s.is_unavailable)
                          return (
                            <li key={i} className={`admin-avail-person ${isUnavail ? 'unavailable' : ''}`}>
                              <span className="admin-avail-name">{person.name}</span>
                              <span className={`admin-avail-slots ${isUnavail ? 'unavailable' : ''}`}>
                                {formatSlots(person)}
                              </span>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                ))
            )}
          </div>
        )}

      </div>
    </div>
  )
}
