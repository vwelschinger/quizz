import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import QuizRunner from './QuizRunner';

export const dynamic = 'force-dynamic';

export default async function QuizPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return <QuizRunner />;
}
