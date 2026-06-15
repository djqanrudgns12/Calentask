import { Bell, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import InsightsClient from './InsightsClient';

export default async function InsightsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* Header */}
      <header className="px-6 pt-16 pb-6 flex justify-between items-center sticky top-0 bg-background/90 backdrop-blur-md z-10">
        <div className="flex items-center gap-4">
          <Link href="/">
            <button className="w-10 h-10 rounded-full bg-card border border-border shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-95 transition-all">
              <ArrowLeft size={20} />
            </button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Good morning</h1>
            <p className="text-muted-foreground text-sm mt-1.5 font-medium">Your activity breakdown.</p>
          </div>
        </div>
        <button className="w-11 h-11 rounded-full bg-card border border-border shadow-sm flex items-center justify-center text-foreground active:scale-95 transition-transform">
          <Bell size={20} />
        </button>
      </header>

      {/* Main Content */}
      <main className="px-6 max-w-md mx-auto">
        <InsightsClient />
      </main>
    </div>
  );
}
