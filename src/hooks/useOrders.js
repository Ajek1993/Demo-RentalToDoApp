import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export function useOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const channelRef = useRef(null)
  const currentUserIdRef = useRef(null)

  // Pobierz ID aktualnego użytkownika
  useEffect(() => {
    async function getUserId() {
      const { data: { user } } = await supabase.auth.getUser()
      currentUserIdRef.current = user?.id
    }
    getUserId()
  }, [])

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
          console.log('🔥 EVENT PRZYSZEDŁ:', payload.eventType, payload.new)
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

  async function createOrder({ plate, date, time, location, notes }) {
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

  async function updateOrder(id, updates) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      // Nie trzeba fetchOrders - realtime załatwi aktualizację
      return { data, error: null }
    } catch (error) {
      console.error('Error updating order:', error)
      return { data: null, error }
    }
  }

  async function deleteOrder(id) {
    try {
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

      // Nie trzeba fetchOrders - realtime załatwi aktualizację
      return { data, error: null }
    } catch (error) {
      console.error('Error completing order:', error)
      return { data: null, error }
    }
  }

  async function restoreOrder(id) {
    try {
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

  return {
    orders,
    loading,
    fetchOrders,
    createOrder,
    updateOrder,
    deleteOrder,
    completeOrder,
    restoreOrder,
    assignToOrder,
    unassignFromOrder,
    fetchAssignments
  }
}
