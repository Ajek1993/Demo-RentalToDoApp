import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useAvailability() {
  const [loading, setLoading] = useState(false)

  // Pobierz dyspozycyjność jednego usera na cały tydzień (7 dat)
  const fetchMyWeek = useCallback(async (dates) => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return {}

      const { data, error } = await supabase
        .from('availability')
        .select('*')
        .eq('user_id', user.id)
        .in('date', dates)
        .order('start_time', { ascending: true })

      if (error) throw error

      // Grupuj po dacie
      const byDate = {}
      for (const d of dates) {
        byDate[d] = []
      }
      for (const row of (data || [])) {
        if (!byDate[row.date]) byDate[row.date] = []
        byDate[row.date].push(row)
      }
      return byDate
    } catch (error) {
      console.error('Error fetching availability:', error)
      return {}
    } finally {
      setLoading(false)
    }
  }, [])

  // Zapisz dyspozycyjność na dany dzień (zastępuje wszystkie istniejące sloty)
  const saveDaySlots = useCallback(async (date, slots) => {
    // slots: [{ is_full_day, start_time, end_time }]
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { error: 'Not authenticated' }

      // Usuń istniejące sloty na ten dzień
      await supabase
        .from('availability')
        .delete()
        .eq('user_id', user.id)
        .eq('date', date)

      if (slots.length === 0) return { error: null }

      // Wstaw nowe
      const rows = slots.map(s => ({
        user_id: user.id,
        date,
        is_full_day: s.is_full_day || false,
        start_time: s.is_full_day ? null : s.start_time,
        end_time: s.is_full_day ? null : s.end_time
      }))

      const { error } = await supabase
        .from('availability')
        .insert(rows)

      if (error) throw error
      return { error: null }
    } catch (error) {
      console.error('Error saving availability:', error)
      return { error }
    }
  }, [])

  // Pobierz dyspozycyjność WSZYSTKICH userów na dany dzień (do podglądu w OrderForm)
  const fetchDateAvailability = useCallback(async (date) => {
    try {
      if (!date) return []

      const { data, error } = await supabase
        .from('availability')
        .select(`
          *,
          profile:profiles!availability_user_id_fkey(id, name)
        `)
        .eq('date', date)
        .order('start_time', { ascending: true })

      if (error) throw error

      // Grupuj po userze
      const byUser = {}
      for (const row of (data || [])) {
        const uid = row.user_id
        if (!byUser[uid]) {
          byUser[uid] = {
            name: row.profile?.name || 'Nieznany',
            slots: []
          }
        }
        byUser[uid].slots.push(row)
      }

      // Konwertuj na tablicę posortowaną po nazwie
      return Object.values(byUser).sort((a, b) => a.name.localeCompare(b.name))
    } catch (error) {
      console.error('Error fetching date availability:', error)
      return []
    }
  }, [])

  return {
    loading,
    fetchMyWeek,
    saveDaySlots,
    fetchDateAvailability
  }
}
