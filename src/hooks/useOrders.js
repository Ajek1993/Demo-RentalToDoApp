import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { calculatePriceAsync } from '../lib/priceCalculator'

export function useOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [myAssignedOrderIds, setMyAssignedOrderIds] = useState(new Set())
  const channelRef = useRef(null)
  const currentUserIdRef = useRef(null)

  // Pobierz ID aktualnego użytkownika
  useEffect(() => {
    async function getUserId() {
      const { data: { user } } = await supabase.auth.getUser()
      currentUserIdRef.current = user?.id
      if (user?.id) {
        fetchMyAssignments(user.id)
      }
    }
    getUserId()
  }, [])

  async function fetchMyAssignments(userId) {
    const uid = userId || currentUserIdRef.current
    if (!uid) return
    try {
      const { data, error } = await supabase
        .from('assignments')
        .select('order_id')
        .eq('user_id', uid)
        .is('unassigned_at', null)

      if (error) throw error
      setMyAssignedOrderIds(new Set((data || []).map(a => a.order_id)))
    } catch (error) {
      console.error('Error fetching my assignments:', error)
    }
  }

  useEffect(() => {
    fetchOrders()
    setupRealtimeSubscription()

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [])

  async function setupRealtimeSubscription() {
    // Pobierz mapę user_id -> name dla toastów
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name')

    const profileMap = {}
    profiles?.forEach(p => {
      profileMap[p.id] = p.name
    })

    const channel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        async (payload) => {
          const { eventType, new: newRow, old: oldRow } = payload

          if (eventType === 'INSERT') {
            // Pobierz dane profilu twórcy
            const { data: profile } = await supabase
              .from('profiles')
              .select('name')
              .eq('id', newRow.created_by)
              .single()

            const orderWithProfile = {
              ...newRow,
              created_by_profile: profile
            }

            setOrders(prev => [orderWithProfile, ...prev])

            // Nie pokazuj toast dla własnych akcji
            if (newRow.created_by !== currentUserIdRef.current) {
              toast.success(`Nowe zlecenie: ${newRow.plate}`, {
                icon: '🆕'
              })
            }
          } else if (eventType === 'UPDATE') {
            // Pobierz dane profilu twórcy
            const { data: profile } = await supabase
              .from('profiles')
              .select('name')
              .eq('id', newRow.created_by)
              .single()

            const orderWithProfile = {
              ...newRow,
              created_by_profile: profile
            }

            setOrders(prev =>
              prev.map(order =>
                order.id === newRow.id ? orderWithProfile : order
              )
            )

            // Toast przy zmianie statusu (nie dla własnych akcji)
            if (newRow.created_by !== currentUserIdRef.current) {
              if (newRow.status === 'completed' && oldRow.status !== 'completed') {
                toast.success(`Zlecenie zakończone: ${newRow.plate}`, {
                  icon: '✅'
                })
              } else if (newRow.status === 'deleted' && oldRow.status !== 'deleted') {
                toast(`Zlecenie usunięte: ${newRow.plate}`, {
                  icon: '🗑️'
                })
              } else if (newRow.status === 'active' && oldRow.status === 'deleted') {
                toast.success(`Zlecenie przywrócone: ${newRow.plate}`, {
                  icon: '↩️'
                })
              }
            }
          } else if (eventType === 'DELETE') {
            setOrders(prev => prev.filter(order => order.id !== oldRow.id))
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'assignments' },
        async (payload) => {
          const { eventType, new: newRow, old: oldRow } = payload

          if (eventType === 'INSERT') {
            // Pobierz dane przypisania z profilami
            const { data: assignment } = await supabase
              .from('assignments')
              .select(`
                *,
                user_profile:profiles!assignments_user_id_fkey(id, name),
                assigned_by_profile:profiles!assignments_assigned_by_fkey(id, name)
              `)
              .eq('id', newRow.id)
              .single()

            if (assignment) {
              // Toast o nowym przypisaniu
              if (newRow.user_id !== currentUserIdRef.current &&
                  newRow.assigned_by !== currentUserIdRef.current) {
                const userName = assignment.user_profile?.name || 'Ktoś'
                // Pobierz plate zlecenia
                const { data: order } = await supabase
                  .from('orders')
                  .select('plate')
                  .eq('id', newRow.order_id)
                  .single()

                if (order) {
                  toast.success(`${userName} przypisał się do ${order.plate}`, {
                    icon: '👤'
                  })
                }
              }
            }

            // Odśwież moje przypisania
            fetchMyAssignments()
          } else if (eventType === 'UPDATE') {
            // Przypisanie zostało zaktualizowane (np. wypisanie)
            if (newRow.unassigned_at && !oldRow.unassigned_at) {
              // Ktoś się wypisał
              if (newRow.user_id !== currentUserIdRef.current) {
                const { data: assignment } = await supabase
                  .from('assignments')
                  .select(`
                    *,
                    user_profile:profiles!assignments_user_id_fkey(id, name)
                  `)
                  .eq('id', newRow.id)
                  .single()

                if (assignment?.user_profile) {
                  const { data: order } = await supabase
                    .from('orders')
                    .select('plate')
                    .eq('id', newRow.order_id)
                    .single()

                  if (order) {
                    toast(`${assignment.user_profile.name} wypisał się z ${order.plate}`, {
                      icon: '👋'
                    })
                  }
                }
              }
            }

            // Odśwież moje przypisania
            fetchMyAssignments()
          }
        }
      )
      .subscribe()

    channelRef.current = channel
  }

  async function fetchOrders() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          created_by_profile:profiles!orders_created_by_fkey(id, name)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setOrders(data || [])
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }

  async function createOrder({ plate, date, time, location, notes, insurance_company, is_one_way }) {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { data, error } = await supabase
        .from('orders')
        .insert([{
          plate,
          date,
          time,
          location,
          notes,
          insurance_company: insurance_company || null,
          is_one_way: is_one_way || false,
          status: 'active',
          created_by: user.id
        }])
        .select()
        .single()

      if (error) throw error

      // Nie trzeba fetchOrders - realtime załatwi aktualizację
      return { data, error: null }
    } catch (error) {
      console.error('Error creating order:', error)
      return { data: null, error }
    }
  }

  async function updateOrder(id, updates, oldOrder) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      // Zapisz diff do order_edits
      if (oldOrder) {
        const trackFields = ['plate', 'date', 'time', 'location', 'notes', 'insurance_company', 'is_one_way']
        const changes = {}
        for (const field of trackFields) {
          const oldVal = oldOrder[field] ?? ''
          const newVal = updates[field] ?? ''
          if (String(oldVal) !== String(newVal)) {
            changes[field] = [String(oldVal), String(newVal)]
          }
        }
        if (Object.keys(changes).length > 0) {
          const { data: { user } } = await supabase.auth.getUser()
          await supabase.from('order_edits').insert({
            order_id: id,
            edited_by: user.id,
            changes
          })
        }
      }

      // Synchronizacja z kursem - jeśli istnieje powiązany kurs, zaktualizuj go
      const { data: kurs } = await supabase
        .from('kursy')
        .select('id')
        .eq('order_id', id)
        .maybeSingle()

      if (kurs) {
        // Przelicz kwotę automatycznie (z obsługą miast z bazy)
        const isOneWay = updates.is_one_way ?? data.is_one_way ?? false
        const priceResult = await calculatePriceAsync(
          updates.location || data.location,
          updates.insurance_company || data.insurance_company,
          { isOneWay }
        )

        await supabase
          .from('kursy')
          .update({
            data: updates.date || data.date,
            nr_rej: updates.plate || data.plate,
            adres: updates.location || data.location,
            kwota: priceResult.price
            // marka pozostaje bez zmian (edytowana tylko w zakładce Kursy)
          })
          .eq('id', kurs.id)
      }

      // Nie trzeba fetchOrders - realtime załatwi aktualizację
      return { data, error: null }
    } catch (error) {
      console.error('Error updating order:', error)
      return { data: null, error }
    }
  }

  async function deleteOrder(id) {
    try {
      // Usuń kurs powiązany z tym zleceniem (jeśli istnieje)
      const { error: deleteKursError } = await supabase
        .rpc('delete_kurs_by_order_id', { p_order_id: id })

      if (deleteKursError) {
        console.error('Error deleting kurs:', deleteKursError)
      }

      const { data, error } = await supabase
        .from('orders')
        .update({ status: 'deleted' })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      // Nie trzeba fetchOrders - realtime załatwi aktualizację
      return { data, error: null }
    } catch (error) {
      console.error('Error deleting order:', error)
      return { data: null, error }
    }
  }

  async function completeOrder(id) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .update({ status: 'completed' })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      // Automatyczne tworzenie kursu dla pierwszego przypisanego
      try {
        // Pobierz pierwszego przypisanego (najwcześniejszy assigned_at, aktywny)
        const { data: assignments } = await supabase
          .from('assignments')
          .select('user_id')
          .eq('order_id', id)
          .is('unassigned_at', null)
          .order('assigned_at', { ascending: true })
          .limit(1)

        const wykonawcaId = assignments?.[0]?.user_id || null

        if (wykonawcaId) {
          // Oblicz kwotę automatycznie (z obsługą miast z bazy i mnożnika x1,5)
          const priceResult = await calculatePriceAsync(
            data.location,
            data.insurance_company,
            { isOneWay: data.is_one_way || false }
          )

          // Utwórz kurs
          await supabase.from('kursy').insert({
            user_id: wykonawcaId,
            wykonawca_id: wykonawcaId,
            order_id: id,
            data: data.date,
            nr_rej: data.plate || '',
            marka: '',
            adres: data.location || '',
            kwota: priceResult.price
          })
        }
      } catch (kursError) {
        // Ignoruj błąd duplikatu (kurs już istnieje dla tego zlecenia)
        if (!kursError.message?.includes('duplicate') && !kursError.message?.includes('unique')) {
          console.error('Error creating kurs:', kursError)
        }
      }

      // Nie trzeba fetchOrders - realtime załatwi aktualizację
      return { data, error: null }
    } catch (error) {
      console.error('Error completing order:', error)
      return { data: null, error }
    }
  }

  async function restoreOrder(id) {
    try {
      // Usuń kurs powiązany z tym zleceniem (używa funkcji SECURITY DEFINER)
      const { error: deleteError } = await supabase
        .rpc('delete_kurs_by_order_id', { p_order_id: id })

      if (deleteError) {
        console.error('Error deleting kurs:', deleteError)
      }

      const { data, error } = await supabase
        .from('orders')
        .update({ status: 'active' })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      // Nie trzeba fetchOrders - realtime załatwi aktualizację
      return { data, error: null }
    } catch (error) {
      console.error('Error restoring order:', error)
      return { data: null, error }
    }
  }

  async function assignToOrder(orderId, userId, assignedBy) {
    try {
      const { data, error } = await supabase
        .from('assignments')
        .insert([{
          order_id: orderId,
          user_id: userId,
          assigned_by: assignedBy
        }])
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Error assigning to order:', error)
      return { data: null, error }
    }
  }

  async function unassignFromOrder(orderId, userId, unassignedBy) {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { data, error } = await supabase
        .from('assignments')
        .update({
          unassigned_at: new Date().toISOString(),
          unassigned_by: unassignedBy || user.id
        })
        .eq('order_id', orderId)
        .eq('user_id', userId)
        .is('unassigned_at', null)

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Error unassigning from order:', error)
      return { data: null, error }
    }
  }

  async function fetchAssignments(orderId) {
    try {
      const { data, error } = await supabase
        .from('assignments')
        .select(`
          *,
          user_profile:profiles!assignments_user_id_fkey(id, name),
          assigned_by_profile:profiles!assignments_assigned_by_fkey(id, name),
          unassigned_by_profile:profiles!assignments_unassigned_by_fkey(id, name)
        `)
        .eq('order_id', orderId)
        .order('assigned_at', { ascending: true })
        .limit(20)

      if (error) throw error

      // Sortuj: najpierw aktywni (unassigned_at = null), potem wypisani
      const sorted = (data || []).sort((a, b) => {
        if (a.unassigned_at === null && b.unassigned_at !== null) return -1
        if (a.unassigned_at !== null && b.unassigned_at === null) return 1
        return new Date(a.assigned_at) - new Date(b.assigned_at)
      })

      return { data: sorted, error: null }
    } catch (error) {
      console.error('Error fetching assignments:', error)
      return { data: [], error }
    }
  }

  async function fetchOrderEdits(orderId) {
    try {
      const { data, error } = await supabase
        .from('order_edits')
        .select(`
          *,
          edited_by_profile:profiles!order_edits_edited_by_fkey(id, name)
        `)
        .eq('order_id', orderId)
        .order('edited_at', { ascending: false })
        .limit(50)

      if (error) throw error
      return { data: data || [], error: null }
    } catch (error) {
      console.error('Error fetching order edits:', error)
      return { data: [], error }
    }
  }

  return {
    orders,
    loading,
    myAssignedOrderIds,
    fetchOrders,
    createOrder,
    updateOrder,
    deleteOrder,
    completeOrder,
    restoreOrder,
    assignToOrder,
    unassignFromOrder,
    fetchAssignments,
    fetchOrderEdits
  }
}
