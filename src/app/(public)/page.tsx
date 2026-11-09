import React from 'react';
import Link from 'next/link';
import { connection } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatPrice, formatDuration } from '@/lib/utils';
import {
  Sparkles,
  Calendar,
  Clock,
  ShieldCheck,
  HeartHandshake,
  Coffee,
  CheckCircle2,
  ArrowRight,
  Star,
  MapPin,
  ChevronRight,
} from 'lucide-react';

export default async function HomePage() {
  await connection();
  // Fetch services and categories from the database
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
              <div className="relative mx-auto max-w-md lg:max-w-none rounded-2xl overflow-hidden border border-border shadow-sm bg-card p-6 space-y-6">
                <div className="aspect-4/3 rounded-xl bg-secondary/80 flex flex-col justify-end p-6 border border-border/60 relative overflow-hidden">
                  <div className="absolute inset-0 bg-linear-to-t from-foreground/80 via-foreground/20 to-transparent z-10" />
                  <div className="relative z-20 text-white space-y-1">
                    <span className="text-xs font-semibold tracking-wider uppercase text-accent">
                      Signature Ritual
                    </span>
                    <h3 className="font-serif text-xl font-medium">
                      Rose Quartz Glass Skin Facial
                    </h3>
                    <p className="text-xs text-white/80 line-clamp-2">
                      Deep lymphatic release, chilled gua sha sculpting, and organic peptide hydration.
                    </p>
                  </div>
                </div>

                {/* Instant appointment slot peek */}
                <div className="bg-background rounded-xl p-4 border border-border space-y-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5 font-medium text-foreground">
                      <Clock className="w-3.5 h-3.5 text-rose" />
                      <span>Today's Availability</span>
                    </span>
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium text-[11px]">
                      Open slots available
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2.5 py-1 rounded bg-secondary text-foreground font-medium">
                      2:00 PM
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded bg-secondary text-foreground font-medium">
                      3:30 PM
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded bg-secondary text-foreground font-medium">
                      5:00 PM
                    </span>
                    <Link
                      href="/book"
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
              className="group bg-card rounded-xl border border-border p-5 flex flex-col justify-between hover:border-rose/50 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-serif text-lg font-medium text-foreground group-hover:text-rose transition-colors">
                    {service.name}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                  {service.description}
                </p>
              </div>

              <div className="pt-6 mt-6 border-t border-border flex items-center justify-between">
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

            <div className="lg:col-span-6">
              <div className="bg-card rounded-2xl border border-border p-8 space-y-6">
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
    </div>
  );
}
