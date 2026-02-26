import { vi } from 'vitest'

export const mockSupabaseAuth = {
  getUser: vi.fn(),
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
}

export const mockSupabaseFrom = () => ({
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  single: vi.fn(),
})

export const mockSupabase = {
  auth: mockSupabaseAuth,
  from: mockSupabaseFrom,
  channel: vi.fn(),
  removeChannel: vi.fn(),
}

export function resetMocks() {
  Object.values(mockSupabaseAuth).forEach(fn => fn.mockReset())
}
