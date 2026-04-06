import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import LoginPage from '@/src/components/LoginPage';

export const metadata = {
  title: 'Login | AMAIA AI PUMP HUNTER PRO',
};

export default function Page() {
  const sessionCookie = cookies().get('amaia-admin-session');

  if (sessionCookie?.value) {
    redirect('/terminal');
  }

  return <LoginPage />;
}
