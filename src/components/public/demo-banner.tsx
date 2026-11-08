import React from 'react';
import Link from 'next/link';
import { Sparkles, ArrowRight } from 'lucide-react';

export function DemoBanner() {
  return (
    <aside aria-label="Demo notice" className="bg-secondary/70 border-b border-border/80 text-xs text-foreground py-1.5 px-4">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1 text-center sm:text-left">
        <div className="flex items-center justify-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-rose shrink-0" aria-hidden="true" />
          <span className="text-muted-foreground">
            <strong className="font-semibold text-foreground">Interactive Demo:</strong> Blush Studio is a fictional showcase salon developed by <a href="https://www.facebook.com/veltwo/" target="_blank" rel="noopener noreferrer" className="font-medium text-foreground hover:text-rose underline underline-offset-2 decoration-border hover:decoration-rose transition-colors">Veltwo Studio</a>. No actual payments or appointments.
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1 font-medium text-rose hover:text-foreground hover:underline transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded px-1"
          >
            <span>Staff & Admin Portal</span>
            <ArrowRight className="w-3 h-3" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </aside>
  );
}
