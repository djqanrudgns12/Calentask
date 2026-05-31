import { ReactNode } from 'react';
import { ArchiveCommandPalette } from '@/components/archive/ArchiveCommandPalette';
import { ArchiveSidebar } from '@/components/archive/ArchiveSidebar';
import { PinPadOverlay } from '@/components/archive/PinPadOverlay';

export default function ArchiveLayout({ children }: { children: ReactNode }) {
  return (
    <PinPadOverlay>
    <div className="flex h-screen overflow-hidden bg-[#f7f9fb] text-slate-900 font-sans">
      {/* Global Command Palette */}
      <ArchiveCommandPalette />
      
      {/* Sidebar for Navigation between Notes, Agenda */}
      <ArchiveSidebar />
      
      <main className="flex-1 flex flex-col min-w-0 relative">
        {children}
      </main>
    </div>
    </PinPadOverlay>
  );
}
