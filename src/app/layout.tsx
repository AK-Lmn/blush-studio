import type { Metadata } from 'next';
import { Playfair_Display, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const playfairDisplay = Playfair_Display({
  variable: '--font-serif',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: '--font-sans',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Blush Studio | Boutique Beauty & Self-Care Sanctuary Manila',
  description:
    'Experience mindful beauty rituals, Japanese eyelash extensions, Russian manicures, and revitalizing skin therapy at Blush Studio in Bonifacio Global City, Taguig.',
  keywords: [
    'salon manila',
    'gel manicure bgc',
    'lash extensions taguig',
    'nail salon metro manila',
    'facial therapy',
    'blush studio',
  ],
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico' },
    ],
    apple: '/icon.svg',
  },
  other: {
    'page-type': 'service',
    'site-kind': 'other',
    'page-kind': 'place',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-type="service"
      className={`${playfairDisplay.variable} ${plusJakartaSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        {children}
      </body>
    </html>
  );
}
