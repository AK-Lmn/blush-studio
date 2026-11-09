'use client';

import React from 'react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex items-center justify-center p-6 bg-[#FAF6F3] text-[#2D2424] font-sans antialiased">
        <div className="max-w-md w-full text-center space-y-6 p-8 rounded-2xl bg-white border border-[#EADBDA] shadow-xs">
          <div className="w-12 h-12 rounded-full bg-[#E29494]/15 text-[#C26A6A] flex items-center justify-center mx-auto text-xl">
            ✨
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-serif font-semibold">
              Blush Studio Demo Experience
            </h1>
            <p className="text-sm text-neutral-600 leading-relaxed">
              An unexpected condition occurred while rendering this page.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => reset()}
              className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-[#C26A6A] text-white text-sm font-medium hover:bg-[#B05B5B] transition-colors"
            >
              Reload Experience
            </button>
            <a
              href="/"
              className="w-full sm:w-auto px-6 py-2.5 rounded-full border border-[#EADBDA] text-sm font-medium hover:bg-neutral-50 transition-colors"
            >
              Go to Homepage
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
