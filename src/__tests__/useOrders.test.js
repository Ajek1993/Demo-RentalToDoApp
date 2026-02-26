import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useOrders } from '../hooks/useOrders'
import { mockSupabase, resetMocks } from './mocks/supabase'

vi.mock('../lib/supabase', () => ({
  supabase: mockSupabase,
}))

describe('useOrders', () => {
  beforeEach(() => {
    resetMocks()
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
    })
  })

  it('should initialize with loading state and empty orders', () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [] }),
    })

    const { result } = renderHook(() => useOrders())

    expect(result.current.loading).toBe(true)
    expect(Array.isArray(result.current.orders)).toBe(true)
  })

  it('should fetch orders successfully', async () => {
    const mockOrders = [
      {
        id: '1',
        plate: 'ABC123',
        date: '2026-02-26',
        location: 'Kraków',
        status: 'active',
        created_by: 'user-123',
      },
      {
        id: '2',
        plate: 'XYZ789',
        date: '2026-02-27',
        location: 'Warszawa',
        status: 'active',
        created_by: 'user-456',
      },
    ]

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockOrders, error: null }),
    })

    const { result } = renderHook(() => useOrders())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.orders).toHaveLength(2)
  })

  it('should handle order fetch error', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      }),
    })

    const { result } = renderHook(() => useOrders())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.orders).toHaveLength(0)
  })

  it('should create order with valid data', async () => {
    const newOrder = {
      plate: 'NEW123',
      date: '2026-02-28',
      time: '10:00',
      location: 'Gdańsk',
      notes: 'Test order',
    }

    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({ data: [{ id: '999', ...newOrder }], error: null }),
    })

    const { result } = renderHook(() => useOrders())

    await act(async () => {
      await result.current.createOrder(newOrder)
    })

    expect(mockSupabase.from).toHaveBeenCalledWith('orders')
  })
})
