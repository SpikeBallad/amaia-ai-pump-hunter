import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import SalesAdminDashboard from '@/src/sales/ui/SalesAdminDashboard';

export const metadata = {
  title: 'Sales Admin | AMAIA AI PUMP HUNTER PRO',
};

export default function Page() {
  const sessionCookie = cookies().get('amaia-admin-session');
  if (!sessionCookie?.value) redirect('/login');
  return <SalesAdminDashboard />;
}
