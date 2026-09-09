'use client'

import { useGlobalShortcuts } from '@/hooks/useGlobalShortcuts'
import dynamic from 'next/dynamic'
import { useGlobalUIStore } from '@/store/useGlobalUIStore'

const ShortcutsModal = dynamic(
  () => import('@/components/ui/ShortcutsModal').then(module => module.ShortcutsModal),
  { ssr: false },
)

export function GlobalShortcutsProvider() {
  useGlobalShortcuts()
  const isOpen = useGlobalUIStore(state => state.isShortcutsModalOpen)

  return isOpen ? <ShortcutsModal /> : null
}
