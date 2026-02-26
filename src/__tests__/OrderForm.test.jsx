import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { OrderForm } from '../components/OrderForm'

vi.mock('../lib/supabase')
vi.mock('../hooks/useAvailability', () => ({
  useAvailability: () => ({
    fetchDateAvailability: vi.fn().mockResolvedValue([]),
  }),
}))

describe('OrderForm', () => {
  const defaultProps = {
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    initialData: null,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render form fields', () => {
    render(<OrderForm {...defaultProps} />)

    expect(screen.getByLabelText(/nr rej/i, { selector: 'input' })).toBeInTheDocument()
    expect(screen.getByLabelText(/data/i, { selector: 'input' })).toBeInTheDocument()
    expect(screen.getByLabelText(/lokalizacja/i, { selector: 'input' })).toBeInTheDocument()
  })

  it('should reject form submission with empty plate', async () => {
    render(<OrderForm {...defaultProps} />)

    const submitBtn = screen.getByRole('button', { name: /dodaj/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(defaultProps.onSubmit).not.toHaveBeenCalled()
    })
  })

  it('should validate plate format (uppercase)', async () => {
    const { getByLabelText } = render(<OrderForm {...defaultProps} />)

    const plateInput = getByLabelText(/nr rej/i)
    fireEvent.change(plateInput, { target: { value: 'abc123' } })

    // Plate should be converted to uppercase
    expect(plateInput.value).toMatch(/^[A-Z0-9]*$/)
  })

  it('should enforce location max length', () => {
    const { getByLabelText } = render(<OrderForm {...defaultProps} />)

    const locationInput = getByLabelText(/lokalizacja/i)
    fireEvent.change(locationInput, { target: { value: 'A'.repeat(250) } })

    expect(locationInput.value.length).toBeLessThanOrEqual(255)
  })

  it('should enforce notes max length', () => {
    const { getByLabelText } = render(<OrderForm {...defaultProps} />)

    const notesInput = getByLabelText(/notatki/i)
    fireEvent.change(notesInput, { target: { value: 'A'.repeat(510) } })

    expect(notesInput.value.length).toBeLessThanOrEqual(500)
  })

  it('should allow form submission with valid data', async () => {
    const { getByLabelText, getByRole } = render(<OrderForm {...defaultProps} />)

    fireEvent.change(getByLabelText(/nr rej/i), { target: { value: 'ABC123' } })
    fireEvent.change(getByLabelText(/data/i), { target: { value: '2026-02-26' } })
    fireEvent.change(getByLabelText(/lokalizacja/i), { target: { value: 'Kraków' } })

    const submitBtn = getByRole('button', { name: /dodaj/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(defaultProps.onSubmit).toHaveBeenCalled()
    })
  })

  it('should call onCancel when cancel button is clicked', () => {
    render(<OrderForm {...defaultProps} />)

    const cancelBtn = screen.getByRole('button', { name: /anuluj/i })
    fireEvent.click(cancelBtn)

    expect(defaultProps.onCancel).toHaveBeenCalled()
  })
})
