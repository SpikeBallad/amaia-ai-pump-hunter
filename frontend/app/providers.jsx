'use client';

import { MarketProvider } from '@/src/context/MarketContext';

export default function Providers({ children }) {
  return <MarketProvider>{children}</MarketProvider>;
}
