import { useEffect, useRef } from 'react'

export default function Modal({ children, onClose, ariaLabel }) {
  const modalRef = useRef(null)
  const previousFocusRef = useRef(null)
  const onCloseRef = useRef(onClose)
  const mouseDownOnOverlay = useRef(false)

  onCloseRef.current = onClose

  useEffect(() => {
    // Save previous focus to restore later
    previousFocusRef.current = document.activeElement

    // Focus the modal container
    modalRef.current?.focus()

    // iOS scroll lock
    const scrollY = window.scrollY
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = '100%'

    // Handle Escape key
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onCloseRef.current?.()
        return
      }

      // Focus trap: keep Tab inside modal
      if (e.key === 'Tab') {
        const focusable = modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (!focusable || focusable.length === 0) return

        const first = focusable[0]
        const last = focusable[focusable.length - 1]

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      // Restore iOS scroll
      const savedScrollY = document.body.style.top
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      window.scrollTo(0, parseInt(savedScrollY || '0') * -1)
      // Restore focus on close
      previousFocusRef.current?.focus()
    }
  }, []) // empty deps — fires only on mount/unmount

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => { mouseDownOnOverlay.current = e.target === e.currentTarget }}
      onClick={(e) => { if (e.target === e.currentTarget && mouseDownOnOverlay.current) onCloseRef.current?.() }}
    >
      <div
        ref={modalRef}
        className="modal-content"
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
