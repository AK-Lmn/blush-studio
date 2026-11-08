'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Logo } from '@/components/public/logo';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  CalendarDays,
  CalendarCheck2,
  Users,
  Sparkles,
  UserCheck,
  BarChart3,
  Settings,
  LogOut,
  ExternalLink,
  Menu,
  X,
} from 'lucide-react';

export function AdminNav({
  adminUser,
}: {
  adminUser: { name: string; email: string };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { label: 'Overview', href: '/admin', icon: LayoutDashboard },
    { label: 'Appointments', href: '/admin/appointments', icon: CalendarCheck2 },
    { label: 'Calendar', href: '/admin/calendar', icon: CalendarDays },
    { label: 'Clients', href: '/admin/customers', icon: Users },
    { label: 'Services', href: '/admin/services', icon: Sparkles },
    { label: 'Staff & Team', href: '/admin/staff', icon: UserCheck },
    { label: 'Reports', href: '/admin/reports', icon: BarChart3 },
    { label: 'Settings', href: '/admin/settings', icon: Settings },
  ];

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      toast.success('Signed out successfully');
      router.push('/admin/login');
      router.refresh();
    } catch {
      toast.error('Logout failed');
    }
  };

  return (
    <>
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-card border-b border-border sticky top-0 z-30">
        <Logo />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle navigation menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Sidebar (Desktop + Mobile Drawer) */}
      <aside
        className={cn(
          'w-64 bg-card border-r border-border flex flex-col justify-between shrink-0 transition-all z-20',
          'fixed inset-y-0 left-0 md:static',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <Logo />
            <button
              onClick={() => setMobileOpen(false)}
              className="md:hidden text-muted-foreground p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-3 py-2 rounded-lg bg-secondary/50 border border-border text-xs">
            <div className="font-semibold text-foreground truncate">{adminUser.name}</div>
            <div className="text-[11px] text-muted-foreground truncate">{adminUser.email}</div>
          </div>

          <nav className="space-y-1">
            {links.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === '/admin'
                  ? pathname === '/admin'
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-rose text-white font-semibold shadow-xs'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className="p-6 border-t border-border space-y-2">
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>View Public Website</span>
          </Link>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 text-xs text-rose-700 hover:text-rose-900 px-3 py-2 rounded-lg hover:bg-rose-50 transition-colors font-medium cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
