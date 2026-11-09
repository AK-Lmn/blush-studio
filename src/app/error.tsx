'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, RefreshCcw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled application error:', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16 bg-background text-foreground">
      <div className="max-w-md w-full text-center space-y-6 p-8 rounded-2xl bg-card border border-border shadow-xs">
        <div className="w-12 h-12 rounded-full bg-rose/10 text-rose flex items-center justify-center mx-auto">
          <Sparkles className="w-6 h-6" />
        </div>

        <div className="space-y-2">
          <h1 className="font-serif text-2xl font-semibold tracking-tight">
            Something went momentarily askew
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The studio experience encountered a momentary hiccup. Please try refreshing, or return to the main showcase.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button
            onClick={() => reset()}
            className="w-full sm:w-auto bg-rose hover:bg-rose/90 text-white rounded-full gap-2 px-6"
          >
            <RefreshCcw className="w-4 h-4" />
            Try again
          </Button>

          <Button
            asChild
            variant="outline"
            className="w-full sm:w-auto rounded-full gap-2 px-6"
          >
            <Link href="/">
              <Home className="w-4 h-4" />
              Return Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
