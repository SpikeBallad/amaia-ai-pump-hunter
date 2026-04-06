import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import Providers from '@/app/providers';
import DashboardPage from '@/src/components/DashboardPage';

export const metadata = {
  title: 'Terminal | AMAIA AI PUMP HUNTER PRO',
};

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
