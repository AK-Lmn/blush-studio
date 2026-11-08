import React from 'react';
import Link from 'next/link';
import { Logo } from './logo';
import { Clock, MapPin, Phone, Mail, Camera } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-card border-t border-border mt-20 pt-16 pb-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand & Mission */}
          <div className="md:col-span-1 space-y-4">
            <Logo />
            <p className="text-sm text-muted-foreground leading-relaxed">
              A private beauty and self-care sanctuary situated in Metro Manila. Dedicated to mindful beauty rituals, master craftsmanship, and serene restorative care.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <a
                href="https://instagram.com/blushstudio.ph.demo"
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-foreground hover:bg-accent/40 transition-colors"
                aria-label="Instagram"
              >
                <Camera className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="font-serif text-base font-semibold text-foreground tracking-tight">
              Explore
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/services" className="hover:text-rose transition-colors">
                  Services & Menu
                </Link>
              </li>
              <li>
                <Link href="/book" className="hover:text-rose transition-colors">
                  Book an Appointment
                </Link>
              </li>
              <li>
                <Link href="/#sanctuary" className="hover:text-rose transition-colors">
                  Our Philosophy & Space
                </Link>
              </li>
              <li>
                <Link href="/#testimonials" className="hover:text-rose transition-colors">
                  Client Experiences
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-rose transition-colors">
                  Administrative Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Hours */}
          <div className="space-y-4">
            <h4 className="font-serif text-base font-semibold text-foreground tracking-tight flex items-center gap-2">
              <Clock className="w-4 h-4 text-rose" />
              <span>Studio Hours</span>
            </h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex justify-between border-b border-border/50 pb-1.5">
                <span>Monday to Saturday</span>
                <span className="font-medium text-foreground">9:00 AM to 8:00 PM</span>
              </div>
              <div className="flex justify-between border-b border-border/50 pb-1.5">
                <span>Sunday</span>
                <span className="font-medium text-foreground">10:00 AM to 6:00 PM</span>
              </div>
              <p className="text-xs text-muted-foreground pt-1">
                By appointment preferred. Walk-ins subject to stylist availability.
              </p>
            </div>
          </div>

          {/* Location & Contact */}
          <div className="space-y-4">
            <h4 className="font-serif text-base font-semibold text-foreground tracking-tight">
              Sanctuary Location
            </h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-rose shrink-0 mt-0.5" />
                <span>Unit 302, The Bellagio Promenade, Bonifacio Global City, Taguig, Metro Manila</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-rose shrink-0" />
                <span>0917-888-2587</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-rose shrink-0" />
                <span>hello@blushstudio.demo</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Attribution & Legal */}
        <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Blush Studio Philippines. Fictional demo environment.</p>
          <div className="flex items-center gap-1.5">
            <span>Demo experience crafted by</span>
            <a
              href="https://www.facebook.com/veltwo/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground hover:text-rose transition-colors underline underline-offset-4 decoration-border hover:decoration-rose"
            >
              Veltwo Studio
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
