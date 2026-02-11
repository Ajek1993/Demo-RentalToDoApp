import { useState, useEffect, useCallback } from 'react'
import { useAvailability } from '../hooks/useAvailability'

const DAY_NAMES = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz']

function getWeekDates(offset = 0) {
  const now = new Date()
  const day = now.getDay() // 0=Sun, 1=Mon...
  const diff = day === 0 ? -6 : 1 - day // Shift to Monday
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff + offset * 7)
  monday.setHours(0, 0, 0, 0)

  const dates = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    dates.push(d)
  }
  return dates
}

function toDateStr(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatShortDate(date) {
  return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function AvailabilityManager({ onClose }) {
  const { loading, fetchMyWeek, saveDaySlots } = useAvailability()
  const [weekOffset, setWeekOffset] = useState(0)
  const [weekDates, setWeekDates] = useState(() => getWeekDates(0))
  const [weekData, setWeekData] = useState({})
  const [editingDay, setEditingDay] = useState(null)
  const [daySlots, setDaySlots] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const dates = getWeekDates(weekOffset)
    setWeekDates(dates)
    loadWeek(dates)
  }, [weekOffset])

  async function loadWeek(dates) {
    const dateStrs = dates.map(toDateStr)
    const data = await fetchMyWeek(dateStrs)
    setWeekData(data)
  }

  const openDayEditor = (date) => {
    const dateStr = toDateStr(date)
    const existing = weekData[dateStr] || []

    if (existing.length === 0) {
      setDaySlots([{ is_full_day: false, start_time: '08:00', end_time: '16:00' }])
    } else if (existing.some(s => s.is_full_day)) {
      setDaySlots([{ is_full_day: true, start_time: '', end_time: '' }])
    } else {
      setDaySlots(existing.map(s => ({
        is_full_day: false,
        start_time: s.start_time?.substring(0, 5) || '08:00',
        end_time: s.end_time?.substring(0, 5) || '16:00'
      })))
    }
    setEditingDay(date)
  }

  const handleToggleFullDay = () => {
    const isCurrentlyFull = daySlots.length === 1 && daySlots[0].is_full_day
    if (isCurrentlyFull) {
      setDaySlots([{ is_full_day: false, start_time: '08:00', end_time: '16:00' }])
    } else {
      setDaySlots([{ is_full_day: true, start_time: '', end_time: '' }])
    }
  }

  const handleSlotChange = (index, field, value) => {
    setDaySlots(prev => prev.map((s, i) =>
      i === index ? { ...s, [field]: value } : s
    ))
  }

  const handleAddSlot = () => {
    setDaySlots(prev => [...prev, { is_full_day: false, start_time: '12:00', end_time: '16:00' }])
  }

  const handleRemoveSlot = (index) => {
    setDaySlots(prev => prev.filter((_, i) => i !== index))
  }

  const handleSaveDay = async () => {
    if (!editingDay) return
    setSaving(true)
    const dateStr = toDateStr(editingDay)

    // Filtruj puste sloty
    const validSlots = daySlots.filter(s =>
      s.is_full_day || (s.start_time && s.end_time)
    )

    const { error } = await saveDaySlots(dateStr, validSlots)
    if (!error) {
      await loadWeek(weekDates)
      setEditingDay(null)
    }
    setSaving(false)
  }

  const handleClearDay = async () => {
    if (!editingDay) return
    setSaving(true)
    const dateStr = toDateStr(editingDay)
    await saveDaySlots(dateStr, [])
    await loadWeek(weekDates)
    setEditingDay(null)
    setSaving(false)
  }

  const isFullDay = daySlots.length === 1 && daySlots[0].is_full_day

  const getDaySummary = (date) => {
    const dateStr = toDateStr(date)
    const slots = weekData[dateStr] || []
    if (slots.length === 0) return null
    if (slots.some(s => s.is_full_day)) return 'Cały dzień'
    return slots.map(s =>
      `${s.start_time?.substring(0, 5)}-${s.end_time?.substring(0, 5)}`
    ).join(', ')
  }

  const weekLabel = () => {
    const first = weekDates[0]
    const last = weekDates[6]
    return `${formatShortDate(first)} - ${formatShortDate(last)}`
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content avail-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Moja dyspozycyjność</h2>

        <div className="avail-week-nav">
          <button
            className="btn-compact btn-secondary"
            onClick={() => setWeekOffset(prev => prev - 1)}
          >
            &larr;
          </button>
          <span className="avail-week-label">{weekLabel()}</span>
          <button
            className="btn-compact btn-secondary"
            onClick={() => setWeekOffset(prev => prev + 1)}
          >
            &rarr;
          </button>
        </div>

        {loading ? (
          <div className="loading-container"><div className="spinner"></div></div>
        ) : (
          <div className="avail-week-grid">
            {weekDates.map((date, i) => {
              const summary = getDaySummary(date)
              const isToday = toDateStr(date) === toDateStr(new Date())
              return (
                <button
                  key={i}
                  className={`avail-day-card ${summary ? 'has-slots' : ''} ${isToday ? 'is-today' : ''}`}
                  onClick={() => openDayEditor(date)}
                >
                  <span className="avail-day-name">{DAY_NAMES[i]}</span>
                  <span className="avail-day-date">{formatShortDate(date)}</span>
                  {summary ? (
                    <span className="avail-day-summary">{summary}</span>
                  ) : (
                    <span className="avail-day-empty">-</span>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {editingDay && (
          <div className="avail-day-editor">
            <h3>{DAY_NAMES[editingDay.getDay() === 0 ? 6 : editingDay.getDay() - 1]} {formatShortDate(editingDay)}</h3>

            <button
              className={`avail-fullday-toggle ${isFullDay ? 'active' : ''}`}
              onClick={handleToggleFullDay}
            >
              Cały dzień
            </button>

            {!isFullDay && (
              <div className="avail-slots-list">
                {daySlots.map((slot, index) => (
                  <div key={index} className="avail-slot-row">
                    <input
                      type="time"
                      value={slot.start_time}
                      onChange={(e) => handleSlotChange(index, 'start_time', e.target.value)}
                    />
                    <span className="avail-slot-separator">-</span>
                    <input
                      type="time"
                      value={slot.end_time}
                      onChange={(e) => handleSlotChange(index, 'end_time', e.target.value)}
                    />
                    {daySlots.length > 1 && (
                      <button
                        className="btn-icon btn-danger avail-remove-slot"
                        onClick={() => handleRemoveSlot(index)}
                      >
                        &times;
                      </button>
                    )}
                  </div>
                ))}
                <button
                  className="btn-compact btn-secondary"
                  onClick={handleAddSlot}
                >
                  + Dodaj slot
                </button>
              </div>
            )}

            <div className="avail-day-actions">
              <button
                className="btn-compact btn-danger"
                onClick={handleClearDay}
                disabled={saving}
              >
                Wyczyść
              </button>
              <button
                className="btn-compact btn-secondary"
                onClick={() => setEditingDay(null)}
                disabled={saving}
              >
                Anuluj
              </button>
              <button
                className="btn-compact btn-primary"
                onClick={handleSaveDay}
                disabled={saving}
              >
                {saving ? 'Zapisuję...' : 'Zapisz'}
              </button>
            </div>
          </div>
        )}

        <div className="avail-close">
          <button className="btn-secondary" onClick={onClose}>Zamknij</button>

        </div>
      </div>
    </div>
  )
}
