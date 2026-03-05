// Mock Supabase Client for Demo Mode
// Compatible with @supabase/supabase-js API

// ============================================
// STORAGE HELPER
// ============================================

function getTable(name) {
  const data = sessionStorage.getItem(`demo_db_${name}`)
  if (!data) return []
  return JSON.parse(data)
}

function setTable(name, data) {
  sessionStorage.setItem(`demo_db_${name}`, JSON.stringify(data))
}

function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

function now() {
  return new Date().toISOString()
}

// ============================================
// AUTH NAMESPACE
// ============================================

class AuthMock {
  constructor() {
    this.listeners = []
  }

  getUser() {
    const userStr = sessionStorage.getItem('demo_auth_user')
    if (!userStr) {
      return { data: { user: null }, error: null }
    }
    const user = JSON.parse(userStr)
    return { data: { user }, error: null }
  }

  getSession() {
    const userResult = this.getUser()
    const session = userResult.data.user
      ? {
          user: userResult.data.user,
          access_token: 'demo-token',
          refresh_token: 'demo-refresh',
          expires_in: 3600,
          token_type: 'bearer',
        }
      : null
    return { data: { session }, error: null }
  }

  async signInWithPassword({ email }) {
    // Demo accepts any password, but email must match demo user
    const demoUser = this.getUser().data.user
    if (!demoUser) {
      const defaultUser = {
        id: 'demo-admin-id',
        email: 'admin@rentalapp.demo',
        user_metadata: { name: 'Anna Nowak' },
        aud: 'authenticated',
        created_at: now(),
      }
      sessionStorage.setItem('demo_auth_user', JSON.stringify(defaultUser))
      this.notifyListeners('SIGNED_IN', defaultUser)
      return { data: { user: defaultUser }, error: null }
    }

    if (email === demoUser.email || email === 'admin@rentalapp.demo') {
      this.notifyListeners('SIGNED_IN', demoUser)
      return { data: { user: demoUser }, error: null }
    }

    return {
      data: { user: null },
      error: { message: 'Invalid login credentials' },
    }
  }

  async signOut() {
    sessionStorage.removeItem('demo_auth_user')
    this.notifyListeners('SIGNED_OUT', null)
    return { error: null }
  }

  onAuthStateChange(callback) {
    this.listeners.push(callback)

    // Immediately call with initial session
    const { data: { session } } = this.getSession()
    callback('INITIAL_SESSION', session)

    return {
      data: {
        subscription: {
          unsubscribe: () => {
            this.listeners = this.listeners.filter(cb => cb !== callback)
          },
        },
      },
    }
  }

  notifyListeners(event, session) {
    this.listeners.forEach(callback => callback(event, session))
  }

  async updateUser(attributes) {
    const userResult = this.getUser()
    let user = userResult.data.user

    if (!user) {
      return { data: { user: null }, error: { message: 'No user logged in' } }
    }

    user = {
      ...user,
      user_metadata: {
        ...user.user_metadata,
        ...attributes.data,
      },
    }

    sessionStorage.setItem('demo_auth_user', JSON.stringify(user))

    // Update profile if name changed
    if (attributes.data?.name) {
      const profiles = getTable('profiles')
      const profile = profiles.find(p => p.id === user.id)
      if (profile) {
        profile.name = attributes.data.name
        setTable('profiles', profiles)
      }
    }

    this.notifyListeners('USER_UPDATED', { user })

    return { data: { user }, error: null }
  }

  async resetPasswordForEmail() {
    // No-op success
    return { data: {}, error: null }
  }
}

// ============================================
// QUERY BUILDER
// ============================================

class QueryBuilder {
  constructor(tableName) {
    this.tableName = tableName
    this.filters = []
    this.singleMode = null // 'single' | 'maybeSingle' | null
    this.columns = null
    this.ordering = null
    this.limitVal = null
    this.rangeVal = null
    this.insertData = null
    this.updateData = null
    this.deleteMode = false
  }

  select(columns = '*') {
    this.columns = columns
    return this
  }

  insert(data) {
    this.insertData = Array.isArray(data) ? data : [data]
    return this
  }

  update(data) {
    this.updateData = data
    return this
  }

  delete() {
    this.deleteMode = true
    return this
  }

  // Filter methods
  eq(column, value) {
    this.filters.push({ type: 'eq', column, value })
    return this
  }

  neq(column, value) {
    this.filters.push({ type: 'neq', column, value })
    return this
  }

  is(column, value) {
    this.filters.push({ type: 'is', column, value })
    return this
  }

  in(column, values) {
    this.filters.push({ type: 'in', column, values })
    return this
  }

  gte(column, value) {
    this.filters.push({ type: 'gte', column, value })
    return this
  }

  lte(column, value) {
    this.filters.push({ type: 'lte', column, value })
    return this
  }

  or(filterString) {
    // Basic OR support - handles simple cases like "status.eq.active,status.eq.completed"
    const conditions = filterString.split(',').map(s => s.trim())
    conditions.forEach(condition => {
      const match = condition.match(/(\w+)\.(eq|neq|is|gte|lte)\.([^]+)/)
      if (match) {
        const [, column, op, value] = match
        const decodedValue = value === 'null' ? null : value.replace(/^'(.*)'$/, '$1')
        this.filters.push({ type: op, column, value: decodedValue, or: true })
      }
    })
    return this
  }

  order(column, { ascending = true } = {}) {
    this.ordering = { column, ascending }
    return this
  }

  limit(n) {
    this.limitVal = n
    return this
  }

  range(from, to) {
    this.rangeVal = { from, to }
    return this
  }

  single() {
    this.singleMode = 'single'
    return this
  }

  maybeSingle() {
    this.singleMode = 'maybeSingle'
    return this
  }

  // Apply filters to data
  applyFilters(data) {
    let result = [...data]

    this.filters.forEach(filter => {
      if (filter.or && result.length > 0) {
        // OR logic - create new result set
        const orResult = this.applySingleFilter(result, filter)
        // Merge with existing result (union)
        const existingIds = result.map(row => row.id)
        orResult.forEach(row => {
          if (!existingIds.includes(row.id)) {
            result.push(row)
          }
        })
      } else {
        // AND logic
        result = this.applySingleFilter(result, filter)
      }
    })

    return result
  }

  applySingleFilter(data, filter) {
    return data.filter(row => {
      const value = row[filter.column]

      switch (filter.type) {
        case 'eq':
          return value === filter.value
        case 'neq':
          return value !== filter.value
        case 'is':
          return filter.value === null ? (value === null || value === undefined) : (value !== null && value !== undefined)
        case 'in':
          return filter.values.includes(value)
        case 'gte':
          return value >= filter.value
        case 'lte':
          return value <= filter.value
        default:
          return true
      }
    })
  }

  // Resolve joins (e.g., profiles(*), user_profile:profiles!fkey(id, name))
  resolveJoins(data) {
    if (!this.columns) {
      return data
    }

    // Parse Supabase join syntax:
    // - profiles(*)
    // - user_profile:profiles!assignments_user_id_fkey(id, name)
    const joinRegex = /([\w]+):([\w]+)!([\w_]+)\((\*|[^)]+)\)/g
    const simpleJoinRegex = /(\w+)\((\*|[^)]+)\)/g

    const joins = []
    let match

    // First try complex syntax with foreign key
    const complexColumns = this.columns.replace(/,\s*/g, ', ')
    while ((match = joinRegex.exec(complexColumns)) !== null) {
      joins.push({
        alias: match[1],      // e.g., user_profile
        table: match[2],      // e.g., profiles
        fkey: match[3],       // e.g., assignments_user_id_fkey
        columns: match[4],    // e.g., id, name or *
      })
    }

    // Then try simple syntax without foreign key
    // Remove complex joins from string first to avoid double-matching
    const simpleColumns = this.columns.replace(joinRegex, '')
    while ((match = simpleJoinRegex.exec(simpleColumns)) !== null) {
      const alias = match[1]
      // Skip if alias already captured by complex regex
      if (joins.some(j => j.alias === alias)) continue
      joins.push({
        alias: alias,
        table: alias === 'profile' ? 'profiles' : alias + 's',
        columns: match[2],
      })
    }

    if (joins.length === 0) {
      return data
    }

    // Resolve each join
    return data.map(row => {
      const result = { ...row }

      joins.forEach(join => {
        const targetTable = join.table
        // Find foreign key - try common patterns
        let foreignKey = null
        const possibleKeys = []

        // Extract FK column name from fkey string (e.g., "assignments_assigned_by_fkey" -> "assigned_by")
        if (join.fkey) {
          const fkeyMatch = join.fkey.match(/^[\w]+?_(.+)_fkey$/)
          if (fkeyMatch) {
            possibleKeys.push(fkeyMatch[1])
          }
        }

        possibleKeys.push(
          `${targetTable.slice(0, -1)}_id`,  // profiles -> profile_id
          `${targetTable}_id`,                // profiles -> profiles_id
          `user_id`,                          // default for profiles
        )

        for (const key of possibleKeys) {
          if (row[key] !== undefined) {
            foreignKey = key
            break
          }
        }

        if (foreignKey && row[foreignKey]) {
          const relatedData = getTable(targetTable)
          const related = relatedData.find(item => item.id === row[foreignKey])

          if (related) {
            // Filter columns if specific ones requested
            if (join.columns !== '*') {
              const cols = join.columns.split(',').map(c => c.trim())
              const filtered = {}
              cols.forEach(col => {
                filtered[col] = related[col]
              })
              result[join.alias] = filtered
            } else {
              result[join.alias] = related
            }
          }
        }
      })

      return result
    })
  }

  // Execute query
  async execute() {
    let data = getTable(this.tableName)

    // INSERT
    if (this.insertData) {
      const now = new Date().toISOString()
      const inserted = this.insertData.map(row => {
        const newRow = {
          id: row.id || generateId(),
          ...row,
        }
        // Add timestamp based on table
        if (this.tableName === 'assignments') {
          if (!newRow.assigned_at) {
            newRow.assigned_at = now
          }
          // Ensure null defaults for unassigned fields (not undefined)
          if (newRow.unassigned_at === undefined) {
            newRow.unassigned_at = null
          }
          if (newRow.unassigned_by === undefined) {
            newRow.unassigned_by = null
          }
        } else if (!newRow.created_at) {
          newRow.created_at = now
        }
        return newRow
      })

      const currentData = getTable(this.tableName)
      const newData = [...currentData, ...inserted]
      setTable(this.tableName, newData)

      // Emit realtime events
      this.emitRealtimeEvent('INSERT', inserted)

      // Return inserted data (with joins if .select() was chained)
      data = this.resolveJoins(inserted)
      return this.applyTerminal(data)
    }

    // UPDATE
    if (this.updateData !== null) {
      data = this.applyFilters(data)

      // Keep old rows before mutation for realtime events
      const oldRows = data.map(row => ({ ...row }))

      const updated = data.map(row => ({
        ...row,
        ...this.updateData,
      }))

      // Replace updated rows in table
      const currentData = getTable(this.tableName)
      const updatedIds = updated.map(u => u.id)
      const newData = currentData.map(row =>
        updatedIds.includes(row.id)
          ? updated.find(u => u.id === row.id)
          : row
      )
      setTable(this.tableName, newData)

      // Emit realtime events with old rows
      this.emitRealtimeEvent('UPDATE', updated, oldRows)

      // Return updated data (with joins if .select() was chained)
      data = this.resolveJoins(updated)
      return this.applyTerminal(data)
    }

    // DELETE
    if (this.deleteMode) {
      data = this.applyFilters(data)
      const deletedIds = data.map(row => row.id)

      const currentData = getTable(this.tableName)
      const newData = currentData.filter(row => !deletedIds.includes(row.id))
      setTable(this.tableName, newData)

      // Emit realtime events
      this.emitRealtimeEvent('DELETE', data)

      return { data, error: null }
    }

    // SELECT (default)
    data = this.applyFilters(data)

    // Apply ordering
    if (this.ordering) {
      data.sort((a, b) => {
        const aVal = a[this.ordering.column]
        const bVal = b[this.ordering.column]
        const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0
        return this.ordering.ascending ? comparison : -comparison
      })
    }

    // Apply limit
    if (this.limitVal !== null) {
      data = data.slice(0, this.limitVal)
    }

    // Apply range
    if (this.rangeVal) {
      data = data.slice(this.rangeVal.from, this.rangeVal.to + 1)
    }

    data = this.resolveJoins(data)
    return this.applyTerminal(data)
  }

  // Apply single/maybeSingle terminal
  applyTerminal(data) {
    if (this.singleMode === 'single') {
      if (data.length === 0) {
        return { data: null, error: { message: 'No rows returned' } }
      }
      return { data: data[0], error: null }
    }

    if (this.singleMode === 'maybeSingle') {
      if (data.length === 0) {
        return { data: null, error: null }
      }
      if (data.length > 1) {
        return { data: data[0], error: { message: 'Multiple rows returned' } }
      }
      return { data: data[0], error: null }
    }

    return { data, error: null }
  }

  // Realtime event emission
  emitRealtimeEvent(eventType, payload, oldRows = null) {
    setTimeout(() => {
      globalDemoChannels.forEach(channel => {
        channel.listeners.forEach(listener => {
          if (listener.event === 'postgres_changes') {
            const { config, callback } = listener
            if (config.event === '*' || config.event === eventType) {
              if (!config.table || config.table === this.tableName) {
                payload.forEach((row, index) => {
                  callback({
                    eventType,
                    new: eventType === 'DELETE' ? null : row,
                    old: eventType === 'DELETE' ? row : (oldRows ? oldRows[index] : null),
                  })
                })
              }
            }
          }
        })
      })
    }, 50) // 50ms delay
  }

  // Thenable for async/await support
  then(onFulfilled, onRejected) {
    return this.execute().then(onFulfilled, onRejected)
  }

  catch(onRejected) {
    return this.execute().catch(onRejected)
  }

  finally(onFinally) {
    return this.execute().finally(onFinally)
  }
}

// ============================================
// CHANNEL / REALTIME
// ============================================

const globalDemoChannels = []

class ChannelMock {
  constructor(name) {
    this.name = name
    this.listeners = []
    globalDemoChannels.push(this)
  }

  on(event, config, callback) {
    this.listeners.push({ event, config, callback })
    return this
  }

  subscribe(callback) {
    // Simulate subscription
    setTimeout(() => {
      callback?.('SUBSCRIBED', this.name)
    }, 10)
    return this
  }
}

function removeChannel(channel) {
  const idx = globalDemoChannels.indexOf(channel)
  if (idx > -1) {
    globalDemoChannels.splice(idx, 1)
  }
}

// ============================================
// FUNCTIONS INVOKE (Edge Functions)
// ============================================

async function invokeFunction(functionName, { body } = {}) {
  switch (functionName) {
    case 'admin-actions': {
      const { action } = body

      // List users
      if (action === 'list-users') {
        const profiles = getTable('profiles')

        // Mock auth users with emails
        const users = profiles.map((p, idx) => ({
          id: p.id,
          email: idx === 0 ? 'admin@rentalapp.demo' : `user${idx}@rentalapp.demo`,
          name: p.name,
          role: p.role,
          created_at: p.created_at,
          last_sign_in: now(),
          confirmed: true,
        }))

        return { data: { users }, error: null }
      }

      // Invite user
      if (action === 'invite') {
        const { email } = body
        const newProfile = {
          id: generateId(),
          name: email.split('@')[0],
          role: 'user',
          created_at: now(),
        }

        const profiles = getTable('profiles')
        profiles.push(newProfile)
        setTable('profiles', profiles)

        return { data: { success: true, userId: newProfile.id }, error: null }
      }

      // Delete user
      if (action === 'delete-user') {
        const { userId } = body

        // Remove profile
        let profiles = getTable('profiles')
        profiles = profiles.filter(p => p.id !== userId)
        setTable('profiles', profiles)

        // Remove related data
        let assignments = getTable('assignments')
        assignments = assignments.filter(a => a.user_id !== userId)
        setTable('assignments', assignments)

        let availability = getTable('dyspozycyjnosc')
        availability = availability.filter(a => a.user_id !== userId)
        setTable('dyspozycyjnosc', availability)

        return { data: { success: true }, error: null }
      }

      return { data: null, error: { message: 'Unknown action' } }
    }

    case 'send-push':
      // No-op in demo mode (push disabled)
      return { data: { success: true, sent: 0, message: 'Push disabled in demo mode' }, error: null }

    default:
      return { data: null, error: { message: `Unknown function: ${functionName}` } }
  }
}

// ============================================
// RPC (Stored Procedures)
// ============================================

async function rpc(functionName, params) {
  switch (functionName) {
    case 'delete_kurs_by_order_id': {
      const { order_id } = params
      let kursy = getTable('kursy')
      kursy = kursy.filter(k => k.order_id !== order_id)
      setTable('kursy', kursy)

      return { data: null, error: null }
    }

    default:
      return { data: null, error: { message: `Unknown RPC function: ${functionName}` } }
  }
}

// ============================================
// CLIENT FACTORY
// ============================================

function createDemoClient() {
  return {
    auth: new AuthMock(),
    from: (table) => new QueryBuilder(table),
    channel: (name) => new ChannelMock(name),
    removeChannel,
    functions: {
      invoke: invokeFunction,
    },
    rpc,
  }
}

export { createDemoClient }
