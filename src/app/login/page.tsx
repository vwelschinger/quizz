import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import LoginForm from './LoginForm';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect('/');
  return (
    <div className="mx-auto w-full max-w-[440px]">
      <LoginForm />
    </div>
  );
}
