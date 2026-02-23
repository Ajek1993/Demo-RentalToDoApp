import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Import web-push
import webpush from 'npm:web-push@3.6.7'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://to-do-app-abacus.vercel.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Weryfikacja shared secret — funkcja wywoływana wyłącznie z triggerów PostgreSQL
  const secret = req.headers.get('X-Internal-Secret')
  const expectedSecret = Deno.env.get('PUSH_SECRET')
  if (!expectedSecret || secret !== expectedSecret) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders })
  }

  try {
    // Konfiguracja VAPID
    const vapidEmail = Deno.env.get('VAPID_EMAIL') || 'mailto:admin@example.com'
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')

    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error('VAPID keys not configured')
    }

    webpush.setVapidDetails(
      vapidEmail,
      vapidPublicKey,
      vapidPrivateKey
    )

    // Parsuj dane z requestu
    const { title, body, url, userId, targetRole } = await req.json()

    // Inicjalizacja Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Pobierz subskrypcje — opcjonalnie filtrowane po roli lub z wykluczeniem usera
    let query;

    if (targetRole) {
      // Filtruj po roli użytkownika (inner join z profiles)
      query = supabase
        .from('push_subscriptions')
        .select('*, profiles!inner(role)')
        .eq('profiles.role', targetRole)
    } else {
      query = supabase.from('push_subscriptions').select('*')

      if (userId) {
        query = query.neq('user_id', userId) // Nie wysyłaj do użytkownika, który wykonał akcję
      }
    }

    const { data: subscriptions, error } = await query

    if (error) {
      console.error('Error fetching subscriptions:', error)
      throw error
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No subscriptions found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Wyślij push do każdej subskrypcji
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        }

        const payload = JSON.stringify({
          title: title || 'Nowe powiadomienie',
          body: body || '',
          url: url || '/',
          tag: `notification-${Date.now()}`
        })

        try {
          await webpush.sendNotification(pushSubscription, payload)
          return { success: true, endpoint: sub.endpoint }
        } catch (error) {
          console.error(`Failed to send to ${sub.endpoint}:`, error)

          // Jeśli subskrypcja wygasła (410 Gone), usuń ją z bazy
          if (error.statusCode === 410) {
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('endpoint', sub.endpoint)
          }

          return { success: false, endpoint: sub.endpoint, error: error.message }
        }
      })
    )

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length
    const failed = results.length - successful

    return new Response(
      JSON.stringify({
        success: true,
        sent: successful,
        failed: failed,
        total: subscriptions.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in send-push function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
