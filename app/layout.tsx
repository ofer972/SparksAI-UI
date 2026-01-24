import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/contexts/Providers';

export const metadata: Metadata = {
  title: 'SparksAI Insights & Dasboards',
  description: 'Agile and SAFe metrics, insights with recommendations  and dashboards',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-surface text-content-primary transition-colors">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
