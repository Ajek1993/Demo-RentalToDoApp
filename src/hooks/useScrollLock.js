import { useEffect } from 'react'

export function useScrollLock(active = true) {
  useEffect(() => {
    if (!active) return

    const scrollY = window.scrollY
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = '100%'

    return () => {
      const savedScrollY = document.body.style.top
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      window.scrollTo(0, parseInt(savedScrollY || '0') * -1)
    }
  }, [active])
}
