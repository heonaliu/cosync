import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import { Nav } from '@/components/layout/Nav';
import { Toaster } from '@/components/ui/sonner';

import './globals.css';

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'CoSync',
  description: 'A home for young makers.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} bg-cream font-sans text-ink antialiased`}>
        <Nav />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
