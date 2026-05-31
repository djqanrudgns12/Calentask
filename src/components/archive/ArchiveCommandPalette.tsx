'use client'

import { useEffect } from 'react';
import { useArchiveStore } from '@/store/useArchiveStore';
import { useRouter } from 'next/navigation';
// Note: We will replace this with shadcn Command when it finishes installing
// import {
//   CommandDialog,
//   CommandEmpty,
//   CommandGroup,
//   CommandInput,
//   CommandItem,
//   CommandList,
// } from "@/components/ui/command"

export function ArchiveCommandPalette() {
  const { isCommandPaletteOpen, setCommandPaletteOpen } = useArchiveStore();
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandPaletteOpen(!isCommandPaletteOpen);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [isCommandPaletteOpen, setCommandPaletteOpen]);

  // Dummy implementation until shadcn component is ready
  if (!isCommandPaletteOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-[20vh]">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
        <input 
          autoFocus
          className="w-full px-6 py-4 text-lg border-b outline-none"
          placeholder="Type a command or search..."
          onKeyDown={(e) => {
            if (e.key === 'Escape') setCommandPaletteOpen(false);
          }}
        />
        <div className="p-4 space-y-2">
          <div 
            className="px-4 py-2 hover:bg-slate-100 rounded-lg cursor-pointer"
            onClick={() => {
              router.push('/archive/notes');
              setCommandPaletteOpen(false);
            }}
          >
            Go to Notes
          </div>
          <div 
            className="px-4 py-2 hover:bg-slate-100 rounded-lg cursor-pointer"
            onClick={() => {
              router.push('/archive/agenda');
              setCommandPaletteOpen(false);
            }}
          >
            Go to Agenda
          </div>
        </div>
      </div>
    </div>
  );
}
