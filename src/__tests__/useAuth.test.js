import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAuth } from '../hooks/useAuth'
import { mockSupabaseAuth, resetMocks } from './mocks/supabase'

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: mockSupabaseAuth,
    from: vi.fn(),
  },
}))

describe('useAuth', () => {
  beforeEach(() => {
    resetMocks()
  })

  it('should initialize with loading state', () => {
    mockSupabaseAuth.getUser.mockResolvedValue({ data: { user: null } })

    const { result } = renderHook(() => useAuth())

    expect(result.current.loading).toBe(true)
  })

  it('should handle successful sign out', async () => {
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: { user: { id: '123', email: 'test@test.com' } },
    })
    mockSupabaseAuth.signOut.mockResolvedValue({ error: null })

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      await result.current.signOut()
    })

    expect(mockSupabaseAuth.signOut).toHaveBeenCalled()
  })

  it('should handle sign in with password', async () => {
    mockSupabaseAuth.signInWithPassword.mockResolvedValue({
      data: { user: { id: '123', email: 'user@test.com' } },
      error: null,
    })

    const { result } = renderHook(() => useAuth())

    await act(async () => {
      await result.current.signIn('user@test.com', 'password123')
    })

    expect(mockSupabaseAuth.signInWithPassword).toHaveBeenCalledWith({
      email: 'user@test.com',
      password: 'password123',
    })
  })

  it('should handle sign in error', async () => {
    mockSupabaseAuth.signInWithPassword.mockResolvedValue({
      data: null,
      error: { message: 'Invalid credentials' },
    })

    const { result } = renderHook(() => useAuth())

    await act(async () => {
      await result.current.signIn('user@test.com', 'wrong')
    })

    expect(mockSupabaseAuth.signInWithPassword).toHaveBeenCalled()
  })
})
