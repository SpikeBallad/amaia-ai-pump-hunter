import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import LoginPage from '@/src/components/LoginPage';

export const metadata = {
  title: 'Login | Amaia AI Pump Hunter',
};

export default function Page() {
  const sessionCookie = cookies().get('amaia-admin-session');

  if (sessionCookie?.value) {
    redirect('/');
  }

  return <LoginPage />;
}
