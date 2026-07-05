'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useGlobalUIStore } from '@/store/useGlobalUIStore'
import { useArchiveStore } from '@/store/useArchiveStore'
import { useCalendarStore } from '@/store/useCalendarStore'

export function useGlobalShortcuts() {
  const router = useRouter()
  const { toggleShortcutsModal, closeShortcutsModal } = useGlobalUIStore()
  const { isPinLocked } = useArchiveStore()
  const openAddEvent = useCalendarStore(s => s.openAddEvent)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Block shortcuts if security PIN is locked AND we are on a protected route
      const isProtectedRoute = window.location.pathname.startsWith('/archive') || window.location.pathname.startsWith('/profile')
      
      if (isPinLocked && isProtectedRoute) {
        // Except Escape to close any modals if somehow open
        if (e.key === 'Escape') {
          closeShortcutsModal()
        }
        return
      }

      // 2. Prevent interference with input fields
      const target = e.target as HTMLElement
      const isInputFocused = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable

      // Only Esc should work when input is focused (to clear focus)
      if (isInputFocused) {
        if (e.key === 'Escape') {
          target.blur()
        }
        return
      }

      // 3. Process Shortcuts
      const isMod = e.metaKey || e.ctrlKey // Cmd on Mac, Ctrl on Windows

      if (e.key === 'Escape') {
        closeShortcutsModal()
        return
      }

      if (isMod) {
        switch (e.key.toLowerCase()) {
          case '/':
            e.preventDefault()
            toggleShortcutsModal()
            break
          
          case 'n':
            e.preventDefault()
            // Depending on current route, we might do different things.
            // For now, if we are in calendar, open Add Event.
            if (window.location.pathname === '/calendar' || window.location.pathname === '/') {
              openAddEvent()
            }
            break
            
          case '1':
            e.preventDefault()
            router.push('/')
            break
            
          case '2':
            e.preventDefault()
            router.push('/archive')
            break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPinLocked, toggleShortcutsModal, closeShortcutsModal, router, openAddEvent])
}
