import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import Providers from './providers';
import DashboardPage from '@/src/components/DashboardPage';

export default function Page() {
  const sessionCookie = cookies().get('amaia-admin-session');

  if (!sessionCookie?.value) {
    redirect('/login');
  }

  return (
    <Providers>
      <DashboardPage />
    </Providers>
  );
}
