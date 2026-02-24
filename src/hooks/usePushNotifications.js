import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// Funkcja pomocnicza do konwersji VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function usePushNotifications(userId) {
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [supported, setSupported] = useState(false)

  useEffect(() => {
    checkSupport()
    checkSubscription()
  }, [userId])

  const checkSupport = () => {
    const isSupported =
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window

    setSupported(isSupported)
    return isSupported
  }

  const checkSubscription = async () => {
    try {
      if (!checkSupport()) {
        setLoading(false)
        return
      }

      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription && userId) {
        // Browser has a subscription - verify it exists in DB for current user
        const subscriptionJSON = subscription.toJSON()
        const { data } = await supabase
          .from('push_subscriptions')
          .select('id')
          .eq('endpoint', subscriptionJSON.endpoint)
          .eq('user_id', userId)
          .maybeSingle()

        setSubscribed(!!data)
      } else {
        setSubscribed(false)
      }

      setLoading(false)
    } catch (error) {
      console.error('Error checking subscription:', error)
      setLoading(false)
    }
  }

  const subscribe = async () => {
    try {
      if (!checkSupport()) {
        throw new Error('Push notifications are not supported')
      }

      // Sprawdź uprawnienia
      const permission = await Notification.requestPermission()

      if (permission !== 'granted') {
        throw new Error('Permission for notifications was denied')
      }

      // Zarejestruj Service Worker
      const registration = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      // Pobierz VAPID public key z env
      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY

      if (!vapidPublicKey) {
        throw new Error('VAPID public key not configured')
      }

      // Utwórz subskrypcję
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      })

      // Zapisz subskrypcję do Supabase
      const subscriptionJSON = subscription.toJSON()

      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('User not authenticated')
      }

      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: subscriptionJSON.endpoint,
          p256dh: subscriptionJSON.keys.p256dh,
          auth: subscriptionJSON.keys.auth
        }, {
          onConflict: 'user_id,endpoint'
        })

      if (error) throw error

      setSubscribed(true)
      return true
    } catch (error) {
      console.error('Error subscribing to push notifications:', error)
      throw error
    }
  }

  const unsubscribe = async () => {
    try {
      if (!checkSupport()) {
        throw new Error('Push notifications are not supported')
      }

      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        // Usuń z przeglądarki
        const unsubscribed = await subscription.unsubscribe()
        if (!unsubscribed) {
          throw new Error('Browser failed to unsubscribe from push notifications')
        }

        // Usuń z Supabase
        const subscriptionJSON = subscription.toJSON()

        const { data: { user } } = await supabase.auth.getUser()

        const query = supabase
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', subscriptionJSON.endpoint)

        const { error } = user
          ? await query.eq('user_id', user.id)
          : await query

        if (error) throw error
      }

      setSubscribed(false)
      return true
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error)
      throw error
    }
  }

  return {
    subscribed,
    loading,
    supported,
    subscribe,
    unsubscribe
  }
}
