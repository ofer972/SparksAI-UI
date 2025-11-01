import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/contexts/Providers';

export const metadata: Metadata = {
  title: 'SparksAI Burndown Chart',
  description: 'Sprint burndown chart visualization for SparksAI',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
