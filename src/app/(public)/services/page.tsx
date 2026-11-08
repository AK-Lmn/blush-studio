import React from 'react';
import Link from 'next/link';
import { connection } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatPrice, formatDuration } from '@/lib/utils';
import { Clock, Calendar, Sparkles, Check, ArrowRight } from 'lucide-react';


export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  await connection();
  const { category: selectedCategoryId } = await searchParams;

  // Fetch all active categories
  const categories = await db
    .select()
    .from(schema.serviceCategories)
    .where(eq(schema.serviceCategories.isActive, true))
    .orderBy(asc(schema.serviceCategories.sortOrder));

  // Fetch all active services
  const allServices = await db
    .select({
      id: schema.services.id,
      categoryId: schema.services.categoryId,
      name: schema.services.name,
      description: schema.services.description,
      priceCentavos: schema.services.priceCentavos,
      durationMinutes: schema.services.durationMinutes,
      imageUrl: schema.services.imageUrl,
      categoryName: schema.serviceCategories.name,
    })
    .from(schema.services)
    .innerJoin(
      schema.serviceCategories,
      eq(schema.services.categoryId, schema.serviceCategories.id)
    )
    .where(eq(schema.services.isActive, true))
    .orderBy(asc(schema.services.sortOrder));

  const filteredServices = selectedCategoryId
    ? allServices.filter((s: any) => s.categoryId === selectedCategoryId)
    : allServices;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 md:py-16 space-y-12">
      {/* Header */}
      <div className="max-w-2xl space-y-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary text-xs text-foreground font-medium">
          <Sparkles className="w-3.5 h-3.5 text-rose" />
          <span>Curated Treatment Menu</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-5xl text-foreground font-medium tracking-tight">
          Services & Treatments
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          Every session begins with a personalized consultation. All prices are in Philippine Pesos (PHP) and include high-grade Japanese and European hypoallergenic materials.
        </p>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <Link
          href="/services"
          className={`px-4 py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-colors ${
            !selectedCategoryId
              ? 'bg-foreground text-background font-semibold'
              : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-secondary'
          }`}
        >
          All Rituals ({allServices.length})
        </Link>
        {categories.map((cat: any) => {
          const isSelected = selectedCategoryId === cat.id;
          const count = allServices.filter((s: any) => s.categoryId === cat.id).length;
          return (
            <Link
              key={cat.id}
              href={`/services?category=${cat.id}`}
              className={`px-4 py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-colors ${
                isSelected
                  ? 'bg-foreground text-background font-semibold'
                  : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              {cat.name} ({count})
            </Link>
          );
        })}
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredServices.map((service: any) => (
          <div
            key={service.id}
            className="group bg-card rounded-xl border border-border p-6 flex flex-col justify-between hover:border-rose/50 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs uppercase tracking-wider text-rose font-medium">
                  {service.categoryName}
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatDuration(service.durationMinutes)}</span>
                </span>
              </div>

              <h2 className="font-serif text-xl font-medium text-foreground group-hover:text-rose transition-colors">
                {service.name}
              </h2>

              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-4">
                {service.description}
              </p>
            </div>

            <div className="pt-6 mt-6 border-t border-border flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground block">Starting at</span>
                <span className="text-lg font-serif font-bold text-foreground">
                  {formatPrice(service.priceCentavos)}
                </span>
              </div>
              <Button variant="blush" size="sm" asChild>
                <Link href={`/book?serviceId=${service.id}`} className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Reserve</span>
                </Link>
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Advice Box */}
      <div className="bg-secondary/50 rounded-2xl border border-border p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-1 text-center sm:text-left">
          <h3 className="font-serif text-lg font-medium text-foreground">
            Custom Nail Art or Special Event Styling?
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Send us your inspiration photos on Messenger for consultation and personalized quote.
          </p>
        </div>
        <Button variant="outline" asChild>
          <a
            href="https://m.me/blushstudio.ph.demo"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5"
          >
            <span>Message Studio Stylist</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </Button>
      </div>
    </div>
  );
}
