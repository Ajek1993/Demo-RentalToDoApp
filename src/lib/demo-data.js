// Demo data seed for sessionStorage-based mock database

// Helper: generate UUID v4
function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// Helper: get relative date
function getRelativeDate(daysOffset = 0) {
  const date = new Date()
  date.setDate(date.getDate() + daysOffset)
  return date.toISOString().split('T')[0]
}

// Helper: get relative datetime
function getRelativeDateTime(daysOffset = 0, hour = 12) {
  const date = new Date()
  date.setDate(date.getDate() + daysOffset)
  date.setHours(hour, 0, 0, 0)
  return date.toISOString()
}

// Demo admin user (compatible with Supabase auth user)
export function getDemoUser() {
  return {
    id: 'demo-admin-id',
    email: 'admin@rentalapp.demo',
    user_metadata: {
      name: 'Jan Kowalski',
    },
    aud: 'authenticated',
    created_at: getRelativeDateTime(-30, 10),
  }
}

// Initialize demo database in sessionStorage
export function initializeDemoDatabase() {
  if (sessionStorage.getItem('demo_initialized')) {
    return // Already initialized
  }

  const today = getRelativeDate(0)
  const yesterday = getRelativeDate(-1)
  const tomorrow = getRelativeDate(1)
  const dayAfterTomorrow = getRelativeDate(2)
  const nextWeek = getRelativeDate(7)

  // === PROFILES (5 users) ===
  const profiles = [
    {
      id: 'demo-admin-id',
      name: 'Jan Kowalski',
      role: 'admin',
      created_at: getRelativeDateTime(-30, 10),
    },
    {
      id: 'demo-user-1',
      name: 'Anna Nowak',
      role: 'user',
      created_at: getRelativeDateTime(-25, 14),
    },
    {
      id: 'demo-user-2',
      name: 'Piotr Lewandowski',
      role: 'user',
      created_at: getRelativeDateTime(-20, 9),
    },
    {
      id: 'demo-user-3',
      name: 'Maria Wójcik',
      role: 'user',
      created_at: getRelativeDateTime(-15, 11),
    },
    {
      id: 'demo-user-4',
      name: 'Tomasz Zieliński',
      role: 'user',
      created_at: getRelativeDateTime(-10, 16),
    },
  ]

  // === ORDERS (~15 orders with mixed statuses) ===
  const orders = [
    // Active - Today
    {
      id: generateId(),
      plate: 'WA12345',
      date: today,
      time: '08:00',
      location: 'Warszawa, ul. Marszałkowska 1',
      notes: 'Klient czeka na hali odlotów',
      status: 'active',
      insurance_company: null,
      created_at: getRelativeDateTime(0, 7),
    },
    {
      id: generateId(),
      plate: 'KR67890',
      date: today,
      time: '10:30',
      location: 'Kraków, ul. Floriańska 5',
      notes: '',
      status: 'active',
      insurance_company: 'PZU',
      created_at: getRelativeDateTime(0, 6),
    },
    {
      id: generateId(),
      plate: 'PO11223',
      date: today,
      time: '14:00',
      location: 'Poznań, Stary Browar',
      notes: 'Dostawa kluczy w recepcji',
      status: 'active',
      insurance_company: null,
      created_at: getRelativeDateTime(0, 5),
    },
    // Active - Tomorrow
    {
      id: generateId(),
      plate: 'GD44556',
      date: tomorrow,
      time: '09:00',
      location: 'Gdańsk, Airport',
      notes: '',
      status: 'active',
      insurance_company: 'WARTA',
      created_at: getRelativeDateTime(0, 4),
    },
    {
      id: generateId(),
      plate: 'LD77889',
      date: tomorrow,
      time: '15:30',
      location: 'Łódź, Manufaktura',
      notes: 'Kontakt: 600-123-456',
      status: 'active',
      insurance_company: null,
      created_at: getRelativeDateTime(0, 3),
    },
    // Active - Day after tomorrow
    {
      id: generateId(),
      plate: 'SZ99001',
      date: dayAfterTomorrow,
      time: '11:00',
      location: 'Szczecin, Galeria Kaskada',
      notes: '',
      status: 'active',
      insurance_company: 'ALLIANZ',
      created_at: getRelativeDateTime(0, 2),
    },
    // Active - Next week
    {
      id: generateId(),
      plate: 'BY22334',
      date: nextWeek,
      time: '08:30',
      location: 'Bydgoszcz, dworzec PKP',
      notes: 'Wczesny poranek',
      status: 'active',
      insurance_company: null,
      created_at: getRelativeDateTime(-1, 20),
    },
    // Completed - Yesterday
    {
      id: generateId(),
      plate: 'KT55667',
      date: yesterday,
      time: '07:00',
      location: 'Katowice, Silesia City Center',
      notes: 'Zlecenie zrealizowane',
      status: 'completed',
      insurance_company: null,
      created_at: getRelativeDateTime(-1, 6),
    },
    {
      id: generateId(),
      plate: 'OP88990',
      date: yesterday,
      time: '16:00',
      location: 'Opole, Solaris Center',
      notes: '',
      status: 'completed',
      insurance_company: 'VIG',
      created_at: getRelativeDateTime(-2, 14),
    },
    // Completed - Earlier
    {
      id: generateId(),
      plate: 'WR33445',
      date: getRelativeDate(-3),
      time: '12:00',
      location: 'Wrocław, Sky Tower',
      notes: 'Klient非常 satisfied',
      status: 'completed',
      insurance_company: null,
      created_at: getRelativeDateTime(-3, 10),
    },
    {
      id: generateId(),
      plate: 'LO66778',
      date: getRelativeDate(-4),
      time: '09:30',
      location: 'Lublin, Lubicz',
      notes: '',
      status: 'completed',
      insurance_company: 'TUW',
      created_at: getRelativeDateTime(-4, 8),
    },
    {
      id: generateId(),
      plate: 'ZR00112',
      date: getRelativeDate(-5),
      time: '13:00',
      location: 'Zielona Góra,Focus Mall',
      notes: 'Dokumenty w bagażniku',
      status: 'completed',
      insurance_company: null,
      created_at: getRelativeDateTime(-5, 11),
    },
    // Deleted (soft delete)
    {
      id: generateId(),
      plate: 'GD44556',
      date: today,
      time: '08:00',
      location: 'Gdańsk - anulowane',
      notes: 'Anulowane przez klienta',
      status: 'deleted',
      insurance_company: null,
      created_at: getRelativeDateTime(-1, 7),
    },
    {
      id: generateId(),
      plate: 'PO99887',
      date: getRelativeDate(-2),
      time: '15:00',
      location: 'Poznań - duplikat',
      notes: 'Duplikat zlecenia',
      status: 'deleted',
      insurance_company: null,
      created_at: getRelativeDateTime(-2, 13),
    },
  ]

  // === ORDER ASSIGNMENTS (~20 assignments) ===
  const orderAssignments = []
  const activeOrders = orders.filter(o => o.status === 'active')

  // Assign demo admin to first 2 orders (so user can see "Wypisz się" button)
  activeOrders.slice(0, 2).forEach((order, idx) => {
    orderAssignments.push({
      id: generateId(),
      order_id: order.id,
      user_id: 'demo-admin-id',
      assigned_at: getRelativeDateTime(0, 6 - idx),
      unassigned_at: null,
      unassigned_by: null,
    })
  })

  // Assign other users to remaining active orders
  activeOrders.slice(2, 6).forEach((order, idx) => {
    const userId = `demo-user-${(idx % 4) + 1}`
    orderAssignments.push({
      id: generateId(),
      order_id: order.id,
      user_id: userId,
      assigned_at: getRelativeDateTime(0, 6 - idx),
      unassigned_at: null,
      unassigned_by: null,
    })
  })

  // Multiple assignments for some orders
  activeOrders[0]?.id && orderAssignments.push(
    {
      id: generateId(),
      order_id: activeOrders[0].id,
      user_id: 'demo-user-1',
      assigned_at: getRelativeDateTime(0, 7),
      unassigned_at: null,
      unassigned_by: null,
    },
    {
      id: generateId(),
      order_id: activeOrders[0].id,
      user_id: 'demo-user-2',
      assigned_at: getRelativeDateTime(0, 5),
      unassigned_at: null,
      unassigned_by: null,
    }
  )

  // Historical assignments (unassigned)
  orderAssignments.push(
    {
      id: generateId(),
      order_id: activeOrders[2]?.id || activeOrders[0]?.id || orders[0].id,
      user_id: 'demo-user-3',
      assigned_at: getRelativeDateTime(-1, 10),
      unassigned_at: getRelativeDateTime(0, 9),
      unassigned_by: 'demo-admin-id',
    }
  )

  // === DYSPOZYJNOSC (availability slots for current week) ===
  const dyspozycyjnosc = []
  const weekDays = [0, 1, 2, 3, 4, 5, 6] // Next 7 days
  const users = ['demo-user-1', 'demo-user-2', 'demo-user-3', 'demo-user-4']

  weekDays.forEach((dayOffset, idx) => {
    users.forEach(userId => {
      // Random availability: true for most days, false for some
      const isAvailable = Math.random() > 0.2
      dyspozycyjnosc.push({
        id: generateId(),
        user_id: userId,
        date: getRelativeDate(dayOffset),
        available: isAvailable,
        created_at: getRelativeDateTime(-7 - idx, 10),
      })
    })
  })

  // === KURSY (completed courses) ===
  const kursy = [
    {
      id: generateId(),
      user_id: 'demo-user-1',
      order_id: orders[8]?.id || activeOrders[0]?.id,
      data: getRelativeDate(-3),
      nr_rej: 'WR33445',
      marka: 'Toyota',
      adres: 'Wrocław, Sky Tower',
      kwota: '150.00',
      created_at: getRelativeDateTime(-3, 14),
    },
    {
      id: generateId(),
      user_id: 'demo-user-2',
      order_id: orders[9]?.id || activeOrders[1]?.id,
      data: getRelativeDate(-4),
      nr_rej: 'OP88990',
      marka: 'Volkswagen',
      adres: 'Opole, Solaris Center',
      kwota: '120.00',
      created_at: getRelativeDateTime(-4, 17),
    },
    {
      id: generateId(),
      user_id: 'demo-user-3',
      order_id: orders[10]?.id || activeOrders[0]?.id,
      data: getRelativeDate(-5),
      nr_rej: 'LO66778',
      marka: 'BMW',
      adres: 'Lublin, Lubicz',
      kwota: '180.00',
      created_at: getRelativeDateTime(-5, 15),
    },
  ]

  // === ORDER EDITS (edit history) ===
  const orderEdits = [
    {
      id: generateId(),
      order_id: activeOrders[0]?.id || orders[0].id,
      edited_by: 'demo-admin-id',
      edited_at: getRelativeDateTime(0, 8),
      changes: { time: ['07:00', '08:00'], notes: ['', 'Klient czeka na hali odlotów'] },
    },
    {
      id: generateId(),
      order_id: activeOrders[1]?.id || orders[1].id,
      edited_by: 'demo-user-1',
      edited_at: getRelativeDateTime(0, 9),
      changes: { location: ['Kraków, centrum', 'Kraków, ul. Floriańska 5'] },
    },
    {
      id: generateId(),
      order_id: activeOrders[2]?.id || orders[2].id,
      edited_by: 'demo-admin-id',
      edited_at: getRelativeDateTime(-1, 16),
      changes: { insurance_company: [null, 'PZU'] },
    },
  ]

  // === FEEDBACK ===
  const feedback = [
    {
      id: generateId(),
      user_id: 'demo-user-1',
      message: 'Aplikacja działa świetnie! Proponuję dodać powiadomienia push.',
      created_at: getRelativeDateTime(-2, 12),
    },
    {
      id: generateId(),
      user_id: 'demo-user-2',
      message: 'Filtrowanie po dacie bardzo pomocne.',
      created_at: getRelativeDateTime(-5, 9),
    },
  ]

  // === PUSH SUBSCRIPTIONS (empty - push disabled in demo) ===
  const pushSubscriptions = []

  // Store all data in sessionStorage
  const tables = {
    profiles,
    orders,
    assignments: orderAssignments,
    dyspozycyjnosc,
    kursy,
    order_edits: orderEdits,
    feedback,
    push_subscriptions: pushSubscriptions,
  }

  Object.entries(tables).forEach(([tableName, data]) => {
    sessionStorage.setItem(`demo_db_${tableName}`, JSON.stringify(data))
  })

  sessionStorage.setItem('demo_initialized', 'true')
  sessionStorage.setItem('demo_auth_user', JSON.stringify(getDemoUser()))
}
