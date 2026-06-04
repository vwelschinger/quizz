import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import QuizRunner from './QuizRunner';

export const dynamic = 'force-dynamic';

export default async function QuizPage({
  searchParams,
}: {
  searchParams: Promise<{ theme?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const { theme } = await searchParams;
  return <QuizRunner theme={theme?.trim() || null} />;
}
