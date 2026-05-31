'use client'

import { useGlobalShortcuts } from '@/hooks/useGlobalShortcuts'
import { ShortcutsModal } from '@/components/ui/ShortcutsModal'

export function GlobalShortcutsProvider() {
  // Mount the global shortcuts hook
  useGlobalShortcuts()

  // Render the modal
  return <ShortcutsModal />
}
