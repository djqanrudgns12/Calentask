import Link from 'next/link';
import { redirect } from 'next/navigation';
import TidyStatsDashboard from '@/components/tidy-stats/TidyStatsDashboard';
import { requireStatsUser } from '@/lib/tidy-stats/server';
import { StatsError } from '@/lib/tidy-stats/transport';

export default async function TidyStatsPage() {
  let message = '';
  try { await requireStatsUser(); }
  catch (error) {
    if (error instanceof StatsError && error.status === 401) redirect('/login');
    message = error instanceof StatsError ? error.message : '로그인 상태를 확인하지 못했습니다.';
  }
  return <main className="min-h-screen bg-background text-foreground"><div className="mx-auto max-w-7xl px-6 pt-6"><Link href="/" className="text-sm text-muted-foreground hover:underline">← Calentask로 돌아가기</Link></div>
    {message ? <p role="alert" className="mx-auto max-w-7xl p-6">{message}</p> : <TidyStatsDashboard />}</main>;
}
