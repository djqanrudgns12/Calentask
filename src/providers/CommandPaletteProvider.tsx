'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'

const CommandPalette = dynamic(
  () => import('@/components/ui/CommandPalette').then(module => module.CommandPalette),
  { ssr: false },
)

export function CommandPaletteProvider() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'k' || (!event.metaKey && !event.ctrlKey)) return
      event.preventDefault()
      setOpen(current => !current)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  return open ? <CommandPalette onOpenChange={setOpen} /> : null
}
