export interface DemoServiceCategory {
  id: string;
  name: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
}

export interface DemoService {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  priceCentavos: number;
  durationMinutes: number;
  imageUrl?: string;
  categoryName?: string;
  isActive: boolean;
  sortOrder: number;
}

export const FALLBACK_CATEGORIES: DemoServiceCategory[] = [
  {
    id: 'cat-nails',
    name: 'Nails & Extensions',
    description: 'Russian dry manicure, soft gel extensions, and couture nail art',
    sortOrder: 1,
    isActive: true,
  },
  {
    id: 'cat-lashes',
    name: 'Lashes & Brows',
    description: 'Weightless Japanese lash extensions, brow lamination, and keratin lifts',
    sortOrder: 2,
    isActive: true,
  },
  {
    id: 'cat-facials',
    name: 'Facial & Glow Therapy',
    description: 'Hydrating glass skin facials, lymphatic drainage, and light therapy',
    sortOrder: 3,
    isActive: true,
  },
  {
    id: 'cat-selfcare',
    name: 'Self-Care Rituals',
    description: 'Aromatherapy scalp massage, hand spa, and gentle exfoliation rituals',
    sortOrder: 4,
    isActive: true,
  },
];

export const FALLBACK_SERVICES: DemoService[] = [
  {
    id: 'srv-gel-mani',
    categoryId: 'cat-nails',
    name: 'Signature Gel Manicure',
    description: 'Gentle cuticle care, nail shaping, nourishing oil infusion, and long-lasting premium gel polish.',
    priceCentavos: 85000,
    durationMinutes: 60,
    imageUrl: '/images/services/gel-mani.jpg',
    categoryName: 'Nails & Extensions',
    isActive: true,
    sortOrder: 1,
  },
  {
    id: 'srv-soft-gel',
    categoryId: 'cat-nails',
    name: 'Soft Gel Aprés Extensions',
    description: 'Full-cover soft gel tips applied with builder gel. Natural finish, lightweight, durable up to 4 weeks.',
    priceCentavos: 185000,
    durationMinutes: 90,
    imageUrl: '/images/services/gel-extensions.jpg',
    categoryName: 'Nails & Extensions',
    isActive: true,
    sortOrder: 2,
  },
  {
    id: 'srv-spa-pedi',
    categoryId: 'cat-nails',
    name: 'Botanical Spa Pedicure',
    description: 'Epsom soak, gentle sea salt scrub, callus reduction, cuticle detox, and nourishing massage.',
    priceCentavos: 110000,
    durationMinutes: 60,
    imageUrl: '/images/services/spa-pedi.jpg',
    categoryName: 'Nails & Extensions',
    isActive: true,
    sortOrder: 3,
  },
  {
    id: 'srv-lashes-classic',
    categoryId: 'cat-lashes',
    name: 'Featherlight Classic Lashes',
    description: '1:1 Japanese silk lashes meticulously bonded for an effortless, mascara-free daily look.',
    priceCentavos: 165000,
    durationMinutes: 75,
    imageUrl: '/images/services/lashes-classic.jpg',
    categoryName: 'Lashes & Brows',
    isActive: true,
    sortOrder: 1,
  },
  {
    id: 'srv-brow-lam',
    categoryId: 'cat-lashes',
    name: 'Boutique Brow Lamination & Tint',
    description: 'Feathery upward styling paired with botanical custom tinting for fuller, sculpted arches.',
    priceCentavos: 135000,
    durationMinutes: 50,
    imageUrl: '/images/services/brow-lamination.jpg',
    categoryName: 'Lashes & Brows',
    isActive: true,
    sortOrder: 2,
  },
  {
    id: 'srv-glass-facial',
    categoryId: 'cat-facials',
    name: 'Korean Glass Skin Hydrafacial',
    description: 'Deep sonic pore cleansing, hyaluronic acid infusion, cryo-sculpting, and collagen LED canopy.',
    priceCentavos: 245000,
    durationMinutes: 75,
    imageUrl: '/images/services/hydrafacial.jpg',
    categoryName: 'Facial & Glow Therapy',
    isActive: true,
    sortOrder: 1,
  },
  {
    id: 'srv-scalp-ritual',
    categoryId: 'cat-selfcare',
    name: 'Botanical Scalp Detox & Massage',
    description: 'Rosemary mint scalp exfoliation, warm oil pressure point massage, and botanical mist infusion.',
    priceCentavos: 125000,
    durationMinutes: 45,
    imageUrl: '/images/services/scalp-spa.jpg',
    categoryName: 'Self-Care Rituals',
    isActive: true,
    sortOrder: 1,
  },
];
