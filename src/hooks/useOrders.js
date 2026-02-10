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

  return {
    orders,
    loading,
    fetchOrders,
    createOrder,
    updateOrder,
    deleteOrder,
    completeOrder,
    restoreOrder
  }
}
