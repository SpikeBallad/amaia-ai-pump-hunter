import './globals.css';

export const metadata = {
  title: 'Amaia AI Pump Hunter',
  description: 'Smart money scanner with real-time compression tracking, narratives, and market alerts.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
