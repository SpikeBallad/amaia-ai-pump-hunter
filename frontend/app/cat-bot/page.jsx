import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import Providers from '@/app/providers';
import CatBotPage from '@/src/components/CatBotPage';

export const metadata = {
  title: 'Cat Bot | AMAIA AI PUMP HUNTER PRO',
};

export default function Page() {
  const sessionCookie = cookies().get('amaia-admin-session');

  if (!sessionCookie?.value) {
    redirect('/login');
  }

  return (
    <Providers>
      <CatBotPage />
    </Providers>
  );
}
