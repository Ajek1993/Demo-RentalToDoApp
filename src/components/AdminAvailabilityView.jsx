import { useState, useEffect } from 'react'
import { useAvailability } from '../hooks/useAvailability'

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
  const { fetchDateAvailability } = useAvailability()
  const [selectedDate, setSelectedDate] = useState(toDateStr(new Date()))
  const [dateRange, setDateRange] = useState('single') // 'single' | 'range'
  const [endDate, setEndDate] = useState('')
  const [availability, setAvailability] = useState([])
  const [rangeAvailability, setRangeAvailability] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (dateRange === 'single' && selectedDate) {
      loadSingleDate(selectedDate)
    }
  }, [selectedDate, dateRange])

  async function loadSingleDate(date) {
    setLoading(true)
    const data = await fetchDateAvailability(date)
    setAvailability(data)
    setLoading(false)
  }

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
      <div className="modal-content admin-avail-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Dyspozycyjność kierowców</h2>

        <div className="admin-avail-controls">
          <div className="admin-avail-mode">
            <button
              className={`filter-chip ${dateRange === 'single' ? 'active' : ''}`}
              onClick={() => setDateRange('single')}
            >
              Jeden dzień
            </button>
            <button
              className={`filter-chip ${dateRange === 'range' ? 'active' : ''}`}
              onClick={() => setDateRange('range')}
            >
              Zakres dat
            </button>
          </div>

          <div className="admin-avail-dates">
            <label>
              {dateRange === 'single' ? 'Data:' : 'Od:'}
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="date-range-input"
              />
            </label>
            {dateRange === 'range' && (
              <>
                <label>
                  Do:
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="date-range-input"
                  />
                </label>
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
                    <h4>{formatDisplayDate(date)}</h4>
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

        <div className="avail-close">
          <button className="btn-secondary" onClick={onClose}>Zamknij</button>
        </div>
      </div>
    </div>
  )
}
