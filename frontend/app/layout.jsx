import './globals.css';
import AnalyticsProvider from '@/src/components/AnalyticsProvider';
import SalesChatMount from '@/src/sales/ui/SalesChatMount';

export const metadata = {
  title: 'AMAIA AI PUMP HUNTER PRO',
  description: 'Cross-exchange accumulation intelligence for spot and futures crypto setups.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        {children}
        <AnalyticsProvider />
        <SalesChatMount />
      </body>
    </html>
  );
}
