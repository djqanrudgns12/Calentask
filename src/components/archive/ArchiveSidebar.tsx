'use client'

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Archive, StickyNote, CalendarCheck, Home } from 'lucide-react';

export function ArchiveSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 flex-shrink-0 bg-card shadow-apple-soft flex flex-col z-10">
      <div className="p-6 pb-2 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white">
            <Archive className="w-5 h-5" />
          </div>
          <span className="text-xl font-extrabold tracking-tight text-foreground">Archive</span>
        </div>
      </div>
      
      <div className="px-4 py-6 flex flex-col space-y-2">
        <Link 
          href="/archive/notes"
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
            pathname.startsWith('/archive/notes') 
              ? 'bg-slate-900 text-white shadow-md' 
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <StickyNote className="w-5 h-5" />
          <span className="font-medium">Notes</span>
        </Link>
        
        <Link 
          href="/archive/agenda"
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
            pathname.startsWith('/archive/agenda') 
              ? 'bg-slate-900 text-white shadow-md' 
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <CalendarCheck className="w-5 h-5" />
          <span className="font-medium">Agenda</span>
        </Link>
      </div>

      <div className="mt-auto p-4">
        <Link 
          href="/"
          className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all font-medium border border-border"
        >
          <Home className="w-4 h-4" />
          Return to Calendar
        </Link>
      </div>
    </aside>
  );
}
