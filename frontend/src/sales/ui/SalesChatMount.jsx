'use client';

import { usePathname } from 'next/navigation';

import SalesChatWidget from '@/src/sales/ui/SalesChatWidget';

const PUBLIC_CHAT_ROUTES = ['/', '/login', '/onboarding', '/thank-you'];

export default function SalesChatMount() {
  const pathname = usePathname();
  if (!PUBLIC_CHAT_ROUTES.includes(pathname)) return null;
  return <SalesChatWidget />;
}
