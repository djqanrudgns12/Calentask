import { redirect } from 'next/navigation';

export default function ArchivePage() {
  // Archive home automatically redirects to notes
  redirect('/archive/notes');
}
