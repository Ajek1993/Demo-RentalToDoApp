import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = [
  'https://example.com',
  'http://localhost:5173',
]

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') ?? ''
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Brak nagłówka autoryzacji' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  // Weryfikacja tożsamości wywołującego użytkownika
  const supabaseUser = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } },
  )

  const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Nieautoryzowany' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Sprawdź czy użytkownik jest adminem
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Brak uprawnień administratora' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let body: { action?: string; email?: string; userId?: string } = {}
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Nieprawidłowe dane żądania' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { action } = body

  // --- Lista użytkowników ---
  if (action === 'list-users') {
    const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    if (listError) {
      return new Response(JSON.stringify({ error: listError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, name, role, created_at')

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]))

    const users = authUsers.users.map((u) => {
      const p = profileMap.get(u.id)
      return {
        id: u.id,
        email: u.email,
        name: p?.name ?? '',
        role: p?.role ?? 'user',
        created_at: p?.created_at ?? u.created_at,
        last_sign_in: u.last_sign_in_at,
        confirmed: !!u.confirmed_at,
      }
    })

    return new Response(JSON.stringify({ users }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // --- Zaproszenie użytkownika (magiczny link) ---
  if (action === 'invite') {
    const { email } = body
    if (!email) {
      return new Response(JSON.stringify({ error: 'Adres e-mail jest wymagany' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: 'https://example.com/',
    })

    if (inviteError) {
      return new Response(JSON.stringify({ error: inviteError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, userId: data.user?.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // --- Usunięcie użytkownika ---
  if (action === 'delete-user') {
    const { userId } = body
    if (!userId) {
      return new Response(JSON.stringify({ error: 'ID użytkownika jest wymagane' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (userId === user.id) {
      return new Response(JSON.stringify({ error: 'Nie możesz usunąć własnego konta' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (deleteError) {
      return new Response(JSON.stringify({ error: deleteError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ error: 'Nieznana akcja' }), {
    status: 400,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
