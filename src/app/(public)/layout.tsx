import React from 'react';
import { DemoBanner } from '@/components/public/demo-banner';
import { Navbar } from '@/components/public/navbar';
import { Footer } from '@/components/public/footer';
import { Toaster } from 'sonner';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground antialiased selection:bg-accent selection:text-foreground">
      <DemoBanner />
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <Toaster position="top-right" richColors />
    </div>
  );
}
