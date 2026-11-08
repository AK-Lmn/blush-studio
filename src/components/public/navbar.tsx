'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from './logo';
import { Button } from '@/components/ui/button';
import { Menu, X, Calendar, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const navLinks = [
    { label: 'Home', href: '/' },
    { label: 'Services & Rates', href: '/services' },
    { label: 'Book Appointment', href: '/book' },
    { label: 'Our Sanctuary', href: '/#sanctuary' },
    { label: 'Hours & Location', href: '/#location' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur-md border-b border-border/80 transition-all">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Logo />

        {/* Desktop Navigation */}
        <nav aria-label="Main Navigation" className="hidden md:flex items-center gap-7">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'text-sm font-medium tracking-tight transition-colors hover:text-rose relative py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm',
                  isActive ? 'text-foreground font-semibold' : 'text-muted-foreground'
                )}
              >
                {link.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-rose rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Right CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Button variant="blush" size="sm" asChild>
            <Link href="/book" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Book Appointment</span>
            </Link>
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex md:hidden items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-card px-4 pt-3 pb-6 space-y-3 animate-in slide-in-from-top-2 duration-150">
          <nav className="flex flex-col space-y-2">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-secondary text-foreground font-semibold'
                      : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <div className="pt-2 border-t border-border flex flex-col gap-2">
            <Button variant="blush" className="w-full justify-center" asChild>
              <Link href="/book" onClick={() => setMobileMenuOpen(false)}>
                <Calendar className="w-4 h-4 mr-2" />
                <span>Book Appointment Online</span>
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-center" asChild>
              <Link href="/admin" onClick={() => setMobileMenuOpen(false)}>
                <span>Staff & Admin Portal</span>
              </Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
