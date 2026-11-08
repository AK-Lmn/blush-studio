'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Logo } from '@/components/public/logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Lock, ArrowRight, Sparkles, ArrowLeft } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      toast.success('Welcome back, Administrator');
      router.push('/admin');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    setEmail('admin@blushstudio.demo');
    setPassword('BlushDemo2024!');
    toast.info('Demo credentials populated');
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 bg-background selection:bg-accent selection:text-foreground">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-3">
          <div className="flex justify-center mb-2">
            <Logo />
          </div>
          <Badge variant="blush">Staff & Management Portal</Badge>
          <h1 className="font-serif text-2xl sm:text-3xl font-medium text-foreground tracking-tight">
            Studio Administration
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Sign in to manage appointments, staff schedules, and client records.
          </p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-8 shadow-xs space-y-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Email Address
              </label>
              <Input
                type="email"
                placeholder="admin@blushstudio.demo"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Password
              </label>
              <Input
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <Button
              type="submit"
              variant="blush"
              className="w-full justify-center h-10 font-semibold"
              disabled={loading}
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Lock className="w-4 h-4" />
                  <span>Sign In to Dashboard</span>
                </span>
              )}
            </Button>
          </form>

          {/* Quick Demo Credentials Box */}
          <div className="pt-4 border-t border-border space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Demo Credentials:</span>
              <button
                type="button"
                onClick={fillDemoCredentials}
                className="text-rose hover:underline font-semibold flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                <span>Fill Demo Admin</span>
              </button>
            </div>
            <div className="p-3 rounded-lg bg-secondary/50 border border-border text-[11px] text-muted-foreground font-mono space-y-1">
              <div>Email: admin@blushstudio.demo</div>
              <div>Password: BlushDemo2024!</div>
            </div>
          </div>
        </div>

        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Customer Website</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
