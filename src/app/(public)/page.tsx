import React from 'react';
import Link from 'next/link';
import { connection } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatPrice, formatDuration } from '@/lib/utils';
import { getNextAvailableAvailability } from '@/server/services/booking-engine';
import {
  Sparkles,
  Calendar,
  Clock,
  ShieldCheck,
  Coffee,
  CheckCircle2,
  ArrowRight,
  Star,
  MapPin,
  LayoutDashboard,
} from 'lucide-react';

function formatSlot12h(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(':');
  const h = Number(hStr);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${mStr} ${period}`;
}

export default async function HomePage() {
  await connection();
  // Fetch active services and categories from database
  const categories = await db
    .select()
    .from(schema.serviceCategories)
    .where(eq(schema.serviceCategories.isActive, true))
    .orderBy(asc(schema.serviceCategories.sortOrder));

  const srvs = await db
    .select()
    .from(schema.services)
    .where(eq(schema.services.isActive, true))
    .orderBy(asc(schema.services.sortOrder));

  const featuredServices = srvs.slice(0, 4);
  const heroService =
    srvs.find((s: any) => s.name.toLowerCase().includes('rose quartz')) || featuredServices[0];

  const liveAvailability = heroService
    ? await getNextAvailableAvailability(heroService.id)
    : { dateStr: null, dayLabel: null, slots: [] };

  return (
    <div className="space-y-24 sm:space-y-32 pb-16">
      {/* ─── HERO SECTION ────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-12 md:pt-20 pb-16 md:pb-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary border border-border text-xs text-foreground font-medium mx-auto lg:mx-0">
                <Sparkles className="w-3.5 h-3.5 text-rose" />
                <span>Boutique Beauty & Self-Care Studio • BGC, Manila</span>
              </div>

              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-foreground font-medium tracking-tight leading-[1.12]">
                Mindful beauty rituals crafted for the modern soul.
              </h1>

              <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed font-sans">
                Experience meticulous Japanese lash artistry, Russian gel manicures, and bespoke skin glow therapies in a serene private sanctuary.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2">
                <Button variant="blush" size="lg" className="w-full sm:w-auto h-12 px-7 text-sm font-semibold" asChild>
                  <Link href="/book" className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>Reserve Your Appointment</span>
                  </Link>
                </Button>
                <Button variant="outline" size="lg" className="w-full sm:w-auto h-12 px-6 text-sm" asChild>
                  <Link href="/services">
                    <span>Explore Service Menu</span>
                  </Link>
                </Button>
              </div>

              {/* Trust markers */}
              <div className="grid grid-cols-3 gap-4 pt-8 border-t border-border/70 max-w-lg mx-auto lg:mx-0">
                <div className="space-y-0.5">
                  <div className="text-xl sm:text-2xl font-serif font-bold text-foreground">
                    100%
                  </div>
                  <div className="text-xs text-muted-foreground font-sans">
                    Hospital-grade sterilization
                  </div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-xl sm:text-2xl font-serif font-bold text-foreground">
                    Cruelty-Free
                  </div>
                  <div className="text-xs text-muted-foreground font-sans">
                    Japanese & EU products
                  </div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-xl sm:text-2xl font-serif font-bold text-foreground">
                    Complimentary
                  </div>
                  <div className="text-xs text-muted-foreground font-sans">
                    Artisanal teas & espresso
                  </div>
                </div>
              </div>
            </div>

            {/* Right Hero Image Card */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md lg:max-w-none rounded-2xl overflow-hidden border border-border shadow-sm bg-card p-5 space-y-5">
                <div className="aspect-4/3 rounded-xl bg-secondary/80 flex flex-col justify-end p-6 border border-border/60 relative overflow-hidden group">
                  <img
                    src={heroService?.imageUrl || '/images/services/glass-facial.jpg'}
                    alt={heroService?.name || 'Rose Quartz Glass Skin Facial'}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-foreground/85 via-foreground/30 to-transparent z-10" />
                  <div className="relative z-20 text-white space-y-1">
                    <span className="text-xs font-semibold tracking-wider uppercase text-accent">
                      Signature Ritual
                    </span>
                    <h3 className="font-serif text-xl font-medium">
                      {heroService?.name || 'Rose Quartz Glass Skin Facial'}
                    </h3>
                    <p className="text-xs text-white/85 line-clamp-2">
                      {heroService?.description ||
                        'Deep lymphatic release, chilled gua sha sculpting, and organic peptide hydration.'}
                    </p>
                  </div>
                </div>

                {/* Live Real-Time Availability from Booking Engine */}
                <div className="bg-background rounded-xl p-4 border border-border space-y-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5 font-medium text-foreground">
                      <Clock className="w-3.5 h-3.5 text-rose" />
                      <span>{liveAvailability.dayLabel || 'Live Studio Calendar'}</span>
                    </span>
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium text-[11px]">
                      {liveAvailability.slots.length > 0 ? 'Live open slots' : 'Check calendar'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {liveAvailability.slots.length > 0 ? (
                      liveAvailability.slots.map((slot) => (
                        <Link
                          key={slot}
                          href={heroService ? `/book?serviceId=${heroService.id}` : '/book'}
                          className="text-xs px-2.5 py-1 rounded bg-secondary text-foreground hover:bg-rose hover:text-white transition-colors font-medium"
                        >
                          {formatSlot12h(slot)}
                        </Link>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Open slots across qualified stylists
                      </span>
                    )}
                    <Link
                      href={heroService ? `/book?serviceId=${heroService.id}` : '/book'}
                      className="text-xs text-rose font-medium hover:underline ml-auto"
                    >
                      View all →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── INTERACTIVE GUIDED DEMO WALKTHROUGH ────────────────────── */}
      <section id="guided-demo" className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-rose">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Interactive Walkthrough</span>
              </div>
              <h2 className="font-serif text-2xl sm:text-3xl font-medium text-foreground">
                Test the Customer &amp; Management Workflow
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <Button variant="blush" size="sm" asChild>
                <Link href="/book" className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>1. Start Booking</span>
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/login" className="flex items-center gap-1.5">
                  <LayoutDashboard className="w-3.5 h-3.5 text-rose" />
                  <span>2. Open Admin Portal</span>
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <span className="text-xs font-mono font-bold text-rose">STEP 01</span>
              <h3 className="font-serif text-base font-semibold text-foreground">
                Book Using Demo Customer
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Pick a service and time slot, then click <strong className="text-foreground">&ldquo;Use Demo Customer&rdquo;</strong> on Step 4 to autofill safe fictional guest info.
              </p>
            </div>
            <div className="space-y-2">
              <span className="text-xs font-mono font-bold text-rose">STEP 02</span>
              <h3 className="font-serif text-base font-semibold text-foreground">
                Receive Reference Pass
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Confirm your reservation to receive an instant <span className="font-mono text-foreground">BLS-YYYYMMDD</span> code tied privately to your browser session.
              </p>
            </div>
            <div className="space-y-2">
              <span className="text-xs font-mono font-bold text-rose">STEP 03</span>
              <h3 className="font-serif text-base font-semibold text-foreground">
                Manage Live in Dashboard
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Visit the <Link href="/admin/login" className="text-rose font-medium hover:underline">Admin Portal</Link>, click <strong className="text-foreground">&ldquo;Explore Demo as Manager&rdquo;</strong>, and find your booking under <strong className="text-foreground">Appointments</strong>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FEATURED SERVICES ───────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div className="space-y-2">
            <h2 className="font-serif text-3xl sm:text-4xl text-foreground font-medium tracking-tight">
              Curated Services
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-lg">
              Each treatment is customized to your natural contours and personal aesthetic.
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/services" className="flex items-center gap-1.5">
              <span>View Complete Menu</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredServices.map((service: any) => (
            <div
              key={service.id}
              className="group bg-card rounded-2xl border border-border overflow-hidden flex flex-col justify-between hover:border-rose/50 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200"
            >
              <div>
                {service.imageUrl && (
                  <div className="aspect-4/3 w-full overflow-hidden bg-secondary border-b border-border/60">
                    <img
                      src={service.imageUrl}
                      alt={service.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  </div>
                )}
                <div className="p-5 space-y-2.5">
                  <h3 className="font-serif text-lg font-medium text-foreground group-hover:text-rose transition-colors leading-snug">
                    {service.name}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                    {service.description}
                  </p>
                </div>
              </div>

              <div className="px-5 pb-5 pt-4 border-t border-border flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    {formatPrice(service.priceCentavos)}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {formatDuration(service.durationMinutes)}
                  </div>
                </div>
                <Button variant="secondary" size="sm" asChild>
                  <Link href={`/book?serviceId=${service.id}`}>
                    Book
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── ABOUT THE SANCTUARY ─────────────────────────────────────── */}
      <section id="sanctuary" className="bg-secondary/40 border-y border-border py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 space-y-6">
              <h2 className="font-serif text-3xl sm:text-4xl text-foreground font-medium tracking-tight">
                An unhurried sanctuary in the heart of Bonifacio Global City.
              </h2>
              <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                <p>
                  Blush Studio was created as an antidote to rush-hour salon chairs and mechanical treatments. Our private studio provides an unhurried, warm environment where clients can truly unwind.
                </p>
                <p>
                  Every technician at Blush is rigorously trained in Japanese 1:1 lash isolation, hypoallergenic nail preparation, and hygienic skin therapies. We believe that self-care should feel restorative, personal, and meticulously crafted.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-rose shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">
                      Autoclave Sterilization
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Medical-grade sanitization sealed in individual pouches.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Coffee className="w-5 h-5 text-rose shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">
                      Complimentary Refreshments
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Rose hibiscus cold brews, organic teas, and espresso.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 space-y-6">
              <div className="aspect-4/3 rounded-2xl overflow-hidden border border-border shadow-xs bg-card">
                <img
                  src="/images/sanctuary.jpg"
                  alt="Blush Studio Sanctuary Interior in Bonifacio Global City"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="bg-card rounded-2xl border border-border p-6 sm:p-8 space-y-5">
                <h3 className="font-serif text-xl font-medium text-foreground">
                  The Blush Standard
                </h3>
                <ul className="space-y-3.5 text-sm text-muted-foreground">
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-rose shrink-0" />
                    <span>One-on-one personalized consultations before every appointment</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-rose shrink-0" />
                    <span>Non-toxic, low-fume builder gels and Japanese silk fibers</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-rose shrink-0" />
                    <span>Guaranteed retention policy: complimentary fixes within 5 days</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-rose shrink-0" />
                    <span>Private styling pods with noise-dampening acoustic curtains</span>
                  </li>
                </ul>

                <div className="pt-2">
                  <Button variant="blush" asChild className="w-full justify-center">
                    <Link href="/book">
                      Experience Blush Studio Today
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CLIENT EXPERIENCES / TESTIMONIALS ───────────────────────── */}
      <section id="testimonials" className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-xl mx-auto space-y-3 mb-12">
          <Badge variant="blush">Fictional Demo Content</Badge>
          <h2 className="font-serif text-3xl sm:text-4xl text-foreground font-medium tracking-tight">
            Client Words
          </h2>
          <p className="text-sm text-muted-foreground">
            Simulated client feedback demonstrating realistic studio satisfaction and repeat booking frequency.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              quote:
                'The Russian gel manicure with Bea lasted 4 full weeks without a single chip. The space is so calm and smells like fresh rosewater. Truly the best salon experience in BGC.',
              name: 'Camille Veloso',
              treatment: 'Signature Gel Manicure',
              rating: 5,
            },
            {
              quote:
                'My lashes look so natural and feel virtually weightless. Camille took time to assess my eye shape and recommended the perfect curl. Booking online took less than 2 minutes!',
              name: 'Dianne Lim',
              treatment: 'Featherlight Classic Lashes',
              rating: 5,
            },
            {
              quote:
                'The Rose Quartz facial was deeply relaxing. My skin was radiant for days after. Love the attention to cleanliness and the complimentary hibiscus iced tea.',
              name: 'Bianca Soriano',
              treatment: 'Rose Quartz Glass Facial',
              rating: 5,
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="bg-card rounded-xl border border-border p-6 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-1">
                  {Array.from({ length: item.rating }).map((_, i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 fill-amber-400 text-amber-400"
                    />
                  ))}
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed italic">
                  "{item.quote}"
                </p>
              </div>
              <div className="pt-4 border-t border-border">
                <div className="font-semibold text-xs text-foreground">
                  {item.name}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {item.treatment}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FREQUENTLY ASKED QUESTIONS ─────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="text-center space-y-3 mb-10">
          <h2 className="font-serif text-3xl text-foreground font-medium tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-sm text-muted-foreground">
            Everything you need to know before visiting our Manila sanctuary.
          </p>
        </div>

        <div className="divide-y divide-border border-y border-border">
          {[
            {
              q: 'How far in advance should I book?',
              a: 'We recommend booking 2 to 5 days in advance for weekend slots. Our online booking platform accepts reservations up to 30 days ahead.',
            },
            {
              q: 'What payment methods do you accept?',
              a: 'We accept Cash and GCash upon arrival at the studio. In this demonstration environment, all payment steps are simulated and no real payment is required.',
            },
            {
              q: 'What is your cancellation and rescheduling policy?',
              a: 'We kindly request at least 4 hours notice for rescheduling or cancellations so we can offer the slot to waitlisted guests.',
            },
            {
              q: 'Is parking available at the BGC studio?',
              a: 'Yes, basement customer parking is available at The Bellagio Promenade with direct elevator access to Unit 302.',
            },
          ].map((faq, i) => (
            <div key={i} className="py-5 space-y-2">
              <h4 className="text-sm font-semibold text-foreground font-sans">
                {faq.q}
              </h4>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── LOCATION & HOURS CALLOUT ───────────────────────────────── */}
      <section id="location" className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="bg-card rounded-2xl border border-border p-8 md:p-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <h2 className="font-serif text-3xl text-foreground font-medium tracking-tight">
                Visit Our Sanctuary
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Conveniently located near Burgos Circle and Mind Museum in Bonifacio Global City.
              </p>
              <div className="space-y-2 text-sm text-foreground">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-rose" />
                  <span>Unit 302, The Bellagio Promenade, BGC, Taguig</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-rose" />
                  <span>Mon to Sat: 9:00 AM to 8:00 PM (Sun: 10:00 AM to 6:00 PM)</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-end">
              <Button variant="blush" size="lg" asChild>
                <Link href="/book">
                  Book an Appointment
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── VELTWO STUDIO CONVERSION CTA ───────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="bg-secondary/60 rounded-2xl border border-rose/30 p-8 md:p-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-rose">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Built by Veltwo Studio</span>
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-medium text-foreground tracking-tight">
              Need a booking and operations platform like this for your business?
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Veltwo Studio designs custom websites, online reservation workflows, and staff management dashboards tailored for Philippine salons, clinics, and service businesses.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto shrink-0">
            <Button variant="blush" size="lg" asChild>
              <a
                href="https://www.facebook.com/veltwo/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2"
              >
                <span>Inquire via Veltwo Studio</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/admin/login" className="flex items-center justify-center gap-2">
                <LayoutDashboard className="w-4 h-4 text-rose" />
                <span>Try Admin Demo</span>
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
