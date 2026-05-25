import { Bell } from 'lucide-react';
import InsightsClient from './InsightsClient';

export default async function InsightsPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-gray-900 pb-24">
      {/* Header */}
      <header className="px-6 pt-16 pb-6 flex justify-between items-center sticky top-0 bg-[#FAFAFA]/90 backdrop-blur-md z-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Good morning</h1>
          <p className="text-gray-500 text-sm mt-1.5 font-medium">Your activity breakdown.</p>
        </div>
        <button className="w-11 h-11 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-600 active:scale-95 transition-transform">
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
