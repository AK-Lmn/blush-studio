import React from 'react';
import Link from 'next/link';

export function Logo({ className = '' }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex items-center gap-2 group ${className}`}>
      <span className="w-8 h-8 rounded-full bg-accent/60 border border-rose/30 flex items-center justify-center text-foreground font-serif text-sm font-semibold group-hover:scale-105 transition-transform">
        B
      </span>
      <span className="flex flex-col">
        <span className="font-serif text-xl tracking-tight text-foreground font-semibold">
          Blush Studio
        </span>
        <span className="text-[10px] tracking-widest uppercase text-muted-foreground -mt-1 font-sans">
          Manila
        </span>
      </span>
    </Link>
  );
}
