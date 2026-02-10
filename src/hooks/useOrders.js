import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOrders()
  }, [])

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

      await fetchOrders()
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

      await fetchOrders()
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

      await fetchOrders()
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

      await fetchOrders()
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

      await fetchOrders()
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
