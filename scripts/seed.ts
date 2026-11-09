import { db, migrateSchema } from '../src/lib/db';
import * as schema from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from '../src/lib/auth/password';
import path from 'path';
import fs from 'fs';

async function runSeed() {
  console.log('🌸 Starting Blush Studio Database Seeding...');

  // 1. Ensure migrations are applied synchronously
  await migrateSchema();

  // 2. Clear existing demo data in reverse dependency order
  console.log('Cleaning up old records...');
  try {
    await db.delete(schema.appointments);
    await db.delete(schema.staffServices);
    await db.delete(schema.staffSchedules);
    await db.delete(schema.staffUnavailable);
    await db.delete(schema.services);
    await db.delete(schema.serviceCategories);
    await db.delete(schema.staff);
    await db.delete(schema.customers);
    await db.delete(schema.businessHours);
    await db.delete(schema.businessSettings);
  } catch (err) {
    console.warn('Cleanup warning (tables may be empty):', err);
  }

  // 3. Business Settings
  console.log('Seeding Business Settings...');
  await db.insert(schema.businessSettings).values({
    businessName: 'Blush Studio',
    tagline: 'Refined Beauty & Self-Care Sanctuary',
    address: 'Unit 302, The Bellagio Promenade, Bonifacio Global City, Taguig, Metro Manila',
    phone: '0917-888-2587',
    email: 'hello@blushstudio.demo',
    messengerUrl: 'https://m.me/blushstudio.ph.demo',
    instagramUrl: 'https://instagram.com/blushstudio.ph.demo',
    bookingIntervalMinutes: 30,
    minAdvanceBookingHours: 2,
    maxAdvanceBookingDays: 30,
    bufferMinutes: 10,
    paymentInstructions: 'For GCash demonstration bookings, reference will be recorded. Please present your booking reference at the front desk upon arrival. No actual money will be charged.',
    metadata: {
      wifiAvailable: true,
      parkingAvailable: true,
      complimentaryDrinks: ['Espresso', 'Rose Hibiscus Iced Tea', 'Cucumber Mint Sparkler'],
    },
  });

  // 4. Business Hours (Mon-Sat 9AM-8PM, Sun 10AM-6PM)
  console.log('Seeding Business Hours...');
  const daysOfWeek: Array<{
    day: (typeof schema.dayOfWeekEnum.enumValues)[number];
    open: string;
    close: string;
    closed: boolean;
  }> = [
    { day: 'monday', open: '09:00', close: '20:00', closed: false },
    { day: 'tuesday', open: '09:00', close: '20:00', closed: false },
    { day: 'wednesday', open: '09:00', close: '20:00', closed: false },
    { day: 'thursday', open: '09:00', close: '20:00', closed: false },
    { day: 'friday', open: '09:00', close: '20:00', closed: false },
    { day: 'saturday', open: '09:00', close: '20:00', closed: false },
    { day: 'sunday', open: '10:00', close: '18:00', closed: false },
  ];

  for (const h of daysOfWeek) {
    await db.insert(schema.businessHours).values({
      dayOfWeek: h.day,
      openTime: h.open,
      closeTime: h.close,
      isClosed: h.closed,
    });
  }

  // 5. Service Categories
  console.log('Seeding Service Categories...');
  const [catNails] = await db
    .insert(schema.serviceCategories)
    .values({
      name: 'Nails & Extensions',
      description: 'Russian dry manicure, soft gel extensions, and couture nail art',
      sortOrder: 1,
    })
    .returning();

  const [catLashes] = await db
    .insert(schema.serviceCategories)
    .values({
      name: 'Lashes & Brows',
      description: 'Weightless Japanese lash extensions, brow lamination, and keratin lifts',
      sortOrder: 2,
    })
    .returning();

  const [catFacials] = await db
    .insert(schema.serviceCategories)
    .values({
      name: 'Facial & Glow Therapy',
      description: 'Hydrating glass skin facials, lymphatic drainage, and light therapy',
      sortOrder: 3,
    })
    .returning();

  const [catSelfCare] = await db
    .insert(schema.serviceCategories)
    .values({
      name: 'Self-Care Rituals',
      description: 'Aromatherapy scalp massage, hand spa, and gentle exfoliation rituals',
      sortOrder: 4,
    })
    .returning();

  // 6. Services
  console.log('Seeding Services...');
  // Nails
  const [srvClassicMani] = await db
    .insert(schema.services)
    .values({
      categoryId: catNails.id,
      name: 'Signature Gel Manicure',
      description: 'Gentle cuticle care, nail shaping, nourishing oil infusion, and long-lasting premium gel polish.',
      priceCentavos: 85000, // ₱850.00
      durationMinutes: 60,
      imageUrl: '/images/services/gel-mani.jpg',
      sortOrder: 1,
    })
    .returning();

  const [srvSoftGelExt] = await db
    .insert(schema.services)
    .values({
      categoryId: catNails.id,
      name: 'Soft Gel Après Extensions',
      description: 'Full-cover soft gel tips applied with builder gel. Natural finish, lightweight, durable up to 4 weeks.',
      priceCentavos: 185000, // ₱1,850.00
      durationMinutes: 90,
      imageUrl: '/images/services/gel-extensions.jpg',
      sortOrder: 2,
    })
    .returning();

  const [srvRussianPedi] = await db
    .insert(schema.services)
    .values({
      categoryId: catNails.id,
      name: 'Botanical Spa Pedicure',
      description: 'Epsom soak, gentle sea salt scrub, callus reduction, cuticle detox, and nourishing massage.',
      priceCentavos: 110000, // ₱1,100.00
      durationMinutes: 60,
      imageUrl: '/images/services/spa-pedi.jpg',
      sortOrder: 3,
    })
    .returning();

  // Lashes & Brows
  const [srvClassicLashes] = await db
    .insert(schema.services)
    .values({
      categoryId: catLashes.id,
      name: 'Featherlight Classic Lashes',
      description: '1:1 Japanese silk lashes meticulously bonded for an effortless, mascara-free daily look.',
      priceCentavos: 165000, // ₱1,650.00
      durationMinutes: 75,
      imageUrl: '/images/services/lashes-classic.jpg',
      sortOrder: 1,
    })
    .returning();

  const [srvHybridLashes] = await db
    .insert(schema.services)
    .values({
      categoryId: catLashes.id,
      name: 'Blush Angel Volume Lashes',
      description: 'Soft dimensional fans tailored to your natural eye contour for elevated texture and fullness.',
      priceCentavos: 220000, // ₱2,200.00
      durationMinutes: 90,
      imageUrl: '/images/services/lashes-volume.jpg',
      sortOrder: 2,
    })
    .returning();

  const [srvBrowLamination] = await db
    .insert(schema.services)
    .values({
      categoryId: catLashes.id,
      name: 'Couture Brow Lamination & Tint',
      description: 'Restructure brow hairs to enhance symmetry and fullness, finished with custom hybrid tint.',
      priceCentavos: 135000, // ₱1,350.00
      durationMinutes: 45,
      imageUrl: '/images/services/brow-lamination.jpg',
      sortOrder: 3,
    })
    .returning();

  // Facials
  const [srvGlassFacial] = await db
    .insert(schema.services)
    .values({
      categoryId: catFacials.id,
      name: 'Rose Quartz Glass Skin Facial',
      description: 'Enzyme deep cleanse, gentle ultrasonic extractions, chilled rose quartz gua sha, and peptide glow mask.',
      priceCentavos: 245000, // ₱2,450.00
      durationMinutes: 75,
      imageUrl: '/images/services/glass-facial.jpg',
      sortOrder: 1,
    })
    .returning();

  const [srvLymphaticFacial] = await db
    .insert(schema.services)
    .values({
      categoryId: catFacials.id,
      name: 'Sculpt & De-Puff Lymphatic Treatment',
      description: 'Targeted fascia release, bucco-facial lifting massage, and cryo-globe finish to sculpt jawline and cheekbones.',
      priceCentavos: 280000, // ₱2,800.00
      durationMinutes: 60,
      imageUrl: '/images/services/sculpt-facial.jpg',
      sortOrder: 2,
    })
    .returning();

  // Self-Care
  const [srvScalpMassage] = await db
    .insert(schema.services)
    .values({
      categoryId: catSelfCare.id,
      name: 'Rosemary Scalp & Neck Detox',
      description: 'Warm organic rosemary infusion massage, acupressure relief, and deeply conditioning hair serum.',
      priceCentavos: 95000, // ₱950.00
      durationMinutes: 45,
      imageUrl: '/images/services/scalp-massage.jpg',
      sortOrder: 1,
    })
    .returning();

  // 7. Staff Members
  console.log('Seeding Staff...');
  const [staffBea] = await db
    .insert(schema.staff)
    .values({
      firstName: 'Bea',
      lastName: 'Santos',
      email: 'bea.santos@blushstudio.demo',
      phone: '0917-111-2233',
      bio: 'Senior Nail Artist & Apres Specialist with 6+ years perfecting Russian manicure techniques and editorial nail art.',
      imageUrl: '/images/staff/bea.jpg',
      isActive: true,
    })
    .returning();

  const [staffCamille] = await db
    .insert(schema.staff)
    .values({
      firstName: 'Camille',
      lastName: 'Ramos',
      email: 'camille.ramos@blushstudio.demo',
      phone: '0917-222-3344',
      bio: 'Certified Japanese Lash Master & Brow Architect dedicated to featherlight, damage-free lash extensions.',
      imageUrl: '/images/staff/camille.jpg',
      isActive: true,
    })
    .returning();

  const [staffDianne] = await db
    .insert(schema.staff)
    .values({
      firstName: 'Dianne',
      lastName: 'Cruz',
      email: 'dianne.cruz@blushstudio.demo',
      phone: '0917-333-4455',
      bio: 'Licensed Aesthetician specializing in non-invasive skin rejuvenation, lymphatic drainage, and facial contouring.',
      imageUrl: '/images/staff/dianne.jpg',
      isActive: true,
    })
    .returning();

  const [staffAndrea] = await db
    .insert(schema.staff)
    .values({
      firstName: 'Andrea',
      lastName: 'Reyes',
      email: 'andrea.reyes@blushstudio.demo',
      phone: '0917-444-5566',
      bio: 'Versatile Senior Stylist skilled in holistic spa therapies, manicures, and signature brow sculpting.',
      imageUrl: '/images/staff/andrea.jpg',
      isActive: true,
    })
    .returning();

  // 8. Staff-Service Assignments
  console.log('Assigning Staff to Services...');
  const assignments = [
    // Bea: Nails + Scalp
    { staffId: staffBea.id, serviceId: srvClassicMani.id },
    { staffId: staffBea.id, serviceId: srvSoftGelExt.id },
    { staffId: staffBea.id, serviceId: srvRussianPedi.id },
    { staffId: staffBea.id, serviceId: srvScalpMassage.id },

    // Camille: Lashes + Brows
    { staffId: staffCamille.id, serviceId: srvClassicLashes.id },
    { staffId: staffCamille.id, serviceId: srvHybridLashes.id },
    { staffId: staffCamille.id, serviceId: srvBrowLamination.id },

    // Dianne: Facials + Scalp
    { staffId: staffDianne.id, serviceId: srvGlassFacial.id },
    { staffId: staffDianne.id, serviceId: srvLymphaticFacial.id },
    { staffId: staffDianne.id, serviceId: srvScalpMassage.id },

    // Andrea: Nails + Brows + Scalp
    { staffId: staffAndrea.id, serviceId: srvClassicMani.id },
    { staffId: staffAndrea.id, serviceId: srvRussianPedi.id },
    { staffId: staffAndrea.id, serviceId: srvBrowLamination.id },
    { staffId: staffAndrea.id, serviceId: srvScalpMassage.id },
  ];

  for (const a of assignments) {
    await db.insert(schema.staffServices).values(a);
  }

  // 9. Staff Schedules (Mon-Sat 9AM-6PM or 11AM-8PM)
  console.log('Seeding Staff Schedules...');
  const allStaff = [staffBea, staffCamille, staffDianne, staffAndrea];
  const workDays: (typeof schema.dayOfWeekEnum.enumValues)[number][] = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ];

  for (const st of allStaff) {
    for (const d of workDays) {
      await db.insert(schema.staffSchedules).values({
        staffId: st.id,
        dayOfWeek: d,
        startTime: '09:00',
        endTime: '18:00',
        isActive: true,
      });
    }
  }

  // 10. Customers
  console.log('Seeding Customers...');
  const [custMaria] = await db
    .insert(schema.customers)
    .values({
      firstName: 'Maria Clara',
      lastName: 'Garcia',
      email: 'mariaclara.garcia@gmail.com',
      phone: '09171234567',
      notes: 'Prefers almond nail shape. Sensitive skin around cuticles.',
    })
    .returning();

  const [custSofia] = await db
    .insert(schema.customers)
    .values({
      firstName: 'Sofia',
      lastName: 'Mendoza',
      email: 'sofia.mendoza@yahoo.com',
      phone: '09189876543',
      notes: 'VIP customer. Prefers quiet appointments with iced hibiscus tea.',
    })
    .returning();

  const [custChloe] = await db
    .insert(schema.customers)
    .values({
      firstName: 'Chloe',
      lastName: 'Villafuerte',
      email: 'chloe.v@outlook.com',
      phone: '09225556789',
      notes: 'Loves natural CC curl lashes. Usually books every 3 weeks.',
    })
    .returning();

  const [custJanine] = await db
    .insert(schema.customers)
    .values({
      firstName: 'Janine',
      lastName: 'Mercado',
      email: 'janine.mercado@gmail.com',
      phone: '09273456781',
      notes: 'Regular for facial glow therapy before weekend events.',
    })
    .returning();

  // 11. Appointments (Past, Today, Upcoming)
  console.log('Seeding Realistic Appointments...');
  const now = new Date();
  const sampleAppointments = [
    // Completed past appointment
    {
      referenceNumber: 'BLS-20241107-A9K2',
      customerId: custMaria.id,
      serviceId: srvClassicMani.id,
      staffId: staffBea.id,
      startTime: new Date(now.getTime() - 48 * 3600 * 1000), // 2 days ago
      endTime: new Date(now.getTime() - 47 * 3600 * 1000),
      status: 'completed' as const,
      paymentStatus: 'paid' as const,
      paymentMethod: 'gcash' as const,
      priceCentavos: srvClassicMani.priceCentavos,
      customerNotes: 'Milky pink nude shade requested.',
      adminNotes: 'Regular polish upgrade applied.',
      isWalkIn: false,
    },
    // Completed past facial
    {
      referenceNumber: 'BLS-20241108-B3X7',
      customerId: custJanine.id,
      serviceId: srvGlassFacial.id,
      staffId: staffDianne.id,
      startTime: new Date(now.getTime() - 24 * 3600 * 1000), // 1 day ago
      endTime: new Date(now.getTime() - (24 * 3600 - 4500) * 1000),
      status: 'completed' as const,
      paymentStatus: 'paid' as const,
      paymentMethod: 'cash' as const,
      priceCentavos: srvGlassFacial.priceCentavos,
      customerNotes: 'Preparing for wedding shoot.',
      adminNotes: 'Skin responded very well to cold globe massage.',
      isWalkIn: false,
    },
    // Today's appointment - In Progress
    {
      referenceNumber: 'BLS-20241109-C8M4',
      customerId: custSofia.id,
      serviceId: srvSoftGelExt.id,
      staffId: staffBea.id,
      startTime: new Date(now.getTime() - 1800 * 1000),
      endTime: new Date(now.getTime() + 3600 * 1000),
      status: 'in_progress' as const,
      paymentStatus: 'unpaid' as const,
      paymentMethod: 'gcash' as const,
      priceCentavos: srvSoftGelExt.priceCentavos,
      customerNotes: 'Chrome French tip design.',
      adminNotes: 'Client arrived on time. In chair 2.',
      isWalkIn: false,
    },
    // Today's upcoming appointment - Confirmed
    {
      referenceNumber: 'BLS-20241109-D2W9',
      customerId: custChloe.id,
      serviceId: srvHybridLashes.id,
      staffId: staffCamille.id,
      startTime: new Date(now.getTime() + 7200 * 1000), // in 2 hours
      endTime: new Date(now.getTime() + 12600 * 1000),
      status: 'confirmed' as const,
      paymentStatus: 'unpaid' as const,
      paymentMethod: 'cash' as const,
      priceCentavos: srvHybridLashes.priceCentavos,
      customerNotes: 'Wet-look lash effect please.',
      adminNotes: 'Confirmed via SMS reminder.',
      isWalkIn: false,
    },
    // Tomorrow's upcoming appointment - Pending
    {
      referenceNumber: 'BLS-20241110-E5P1',
      customerId: custMaria.id,
      serviceId: srvBrowLamination.id,
      staffId: staffAndrea.id,
      startTime: new Date(now.getTime() + 26 * 3600 * 1000),
      endTime: new Date(now.getTime() + (26 * 3600 + 2700) * 1000),
      status: 'pending' as const,
      paymentStatus: 'unpaid' as const,
      paymentMethod: 'gcash' as const,
      priceCentavos: srvBrowLamination.priceCentavos,
      customerNotes: 'Need patch test if possible.',
      adminNotes: 'Awaiting customer confirmation reply.',
      isWalkIn: false,
    },
    // Cancelled demo appointment
    {
      referenceNumber: 'BLS-20241106-F7T3',
      customerId: custJanine.id,
      serviceId: srvScalpMassage.id,
      staffId: staffDianne.id,
      startTime: new Date(now.getTime() - 72 * 3600 * 1000),
      endTime: new Date(now.getTime() - 69 * 3600 * 1000),
      status: 'cancelled' as const,
      paymentStatus: 'unpaid' as const,
      paymentMethod: null,
      priceCentavos: srvScalpMassage.priceCentavos,
      customerNotes: 'Need to reschedule due to flight delay.',
      adminNotes: 'Cancelled by client 6 hrs prior.',
      isWalkIn: false,
    },
  ];

  for (const appt of sampleAppointments) {
    await db.insert(schema.appointments).values({
      ...appt,
      isDemoSeed: true,
      visitorId: null,
    });
  }

  // 12. Seed Demo Admin User with Scrypt Hashed Password
  console.log('Seeding Demo Admin User...');
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@blushstudio.demo';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    throw new Error(
      'FATAL: SEED_ADMIN_PASSWORD or ADMIN_PASSWORD environment variable must be set before running database seed. No hardcoded default password allowed.'
    );
  }

  // Clean old admin records to ensure password hash is updated
  await db.delete(schema.accounts).where(eq(schema.accounts.id, 'admin-account-blush-001'));
  await db.delete(schema.users).where(eq(schema.users.email, adminEmail));

  const userId = 'admin-user-blush-001';
  await db.insert(schema.users).values({
    id: userId,
    name: 'Blush Studio Admin',
    email: adminEmail,
    emailVerified: true,
    role: 'admin',
  });

  const secureHash = hashPassword(adminPassword);
  await db.insert(schema.accounts).values({
    id: 'admin-account-blush-001',
    accountId: userId,
    providerId: 'credential',
    userId: userId,
    password: secureHash,
  });

  console.log('✨ Blush Studio Database Seeding Complete!');
}

runSeed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  });
