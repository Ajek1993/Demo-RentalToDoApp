import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ErrorBoundary } from '../components/ErrorBoundary'

// Suppress console.error during tests for cleaner output
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

const ThrowError = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <div>No error</div>
}

describe('ErrorBoundary', () => {
  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    )

    expect(screen.getByText('No error')).toBeInTheDocument()
  })

  it('should catch rendering errors and display fallback UI', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText(/coś poszło nie tak/i)).toBeInTheDocument()
  })

  it('should display refresh button in fallback', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    const refreshBtn = screen.getByRole('button', { name: /odśwież aplikację/i })
    expect(refreshBtn).toBeInTheDocument()
  })

  it('should display warning icon in fallback', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('⚠️')).toBeInTheDocument()
  })

  it('should have correct styling on refresh button', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    const refreshBtn = screen.getByRole('button', { name: /odśwież aplikację/i })
    expect(refreshBtn).toHaveStyle({
      background: '#fff',
      color: '#667eea',
      border: 'none',
    })
  })
})
