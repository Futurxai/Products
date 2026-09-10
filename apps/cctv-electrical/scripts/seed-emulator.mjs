// Seeds the Firebase Emulator Suite (Auth + Firestore) with demo data so you
// can try the storefront and admin panel locally without a real Firebase
// project. Run the emulators first (`firebase emulators:start`), then:
//
//   node scripts/seed-emulator.mjs
//
// Demo admin login: demo@securevision.test / Demo@12345
// (This account only exists in the local emulator — it resets whenever the
// emulator process stops, and is never connected to any real backend.)

import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';

const PROJECT_ID = 'demo-cctv-electrical';

const app = initializeApp({ projectId: PROJECT_ID });
const db = getFirestore(app);
db.settings({ ignoreUndefinedProperties: true });
const auth = getAuth(app);

function svgImage(label, bg, fg = '#ffffff') {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640">
    <rect width="640" height="640" fill="${bg}"/>
    <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="40" font-weight="700"
      fill="${fg}" text-anchor="middle" dominant-baseline="middle">${label}</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

async function clearCollection(name) {
  const snap = await db.collection(name).get();
  await Promise.all(snap.docs.map((d) => d.ref.delete()));
}

async function main() {
  console.log(`Seeding emulator project "${PROJECT_ID}"...`);

  for (const c of ['categories', 'products', 'services', 'orders']) {
    await clearCollection(c);
  }

  // ---------- Categories ----------
  const categories = [
    { name: 'CCTV Cameras', slug: 'cctv-cameras', order: 0 },
    { name: 'DVR & NVR', slug: 'dvr-nvr', order: 1 },
    { name: 'Accessories & Cables', slug: 'accessories-cables', order: 2 },
    { name: 'Electrical Wiring', slug: 'electrical-wiring', order: 3 },
  ];
  const categoryIds = {};
  for (const cat of categories) {
    const ref = await db.collection('categories').add({ ...cat, createdAt: Date.now() });
    categoryIds[cat.name] = ref.id;
  }

  // ---------- Products ----------
  const products = [
    {
      name: '2MP HD Dome Camera (Night Vision)',
      category: 'CCTV Cameras',
      price: 1899,
      mrp: 2299,
      description: 'Indoor/outdoor dome camera with 20m night vision, weatherproof housing and wide-angle lens.',
      specs: 'Resolution: 2MP\nNight Vision: 20m IR\nLens: 3.6mm\nWeatherproof: IP66',
      available: true,
      featured: true,
      color: '#1a5ff5',
    },
    {
      name: '4MP Bullet Camera Outdoor',
      category: 'CCTV Cameras',
      price: 2499,
      mrp: 2999,
      description: 'High-resolution bullet camera built for outdoor perimeter security with color night vision.',
      specs: 'Resolution: 4MP\nNight Vision: 30m Color IR\nLens: 4mm',
      available: true,
      featured: true,
      color: '#307eff',
    },
    {
      name: '5MP PTZ Speed Dome Camera',
      category: 'CCTV Cameras',
      price: 8999,
      description: '360° pan-tilt-zoom camera with auto-tracking, ideal for large open areas and parking lots.',
      specs: 'Resolution: 5MP\nOptical Zoom: 20x\nPan: 360° continuous',
      available: true,
      featured: false,
      color: '#173cad',
    },
    {
      name: '4-Channel NVR (No Storage)',
      category: 'DVR & NVR',
      price: 3499,
      description: 'Network video recorder supporting up to 4 IP cameras with remote mobile viewing.',
      specs: 'Channels: 4\nHDMI Output: Yes\nMobile App: Yes',
      available: true,
      featured: false,
      color: '#0f2050',
    },
    {
      name: '8-Channel DVR with Mobile App',
      category: 'DVR & NVR',
      price: 4999,
      mrp: 5799,
      description: 'Digital video recorder for analog/HD cameras with H.265+ compression for efficient storage.',
      specs: 'Channels: 8\nCompression: H.265+\nMobile App: Yes',
      available: false,
      featured: true,
      color: '#183789',
    },
    {
      name: '2TB Surveillance-Grade Hard Disk',
      category: 'Accessories & Cables',
      price: 5499,
      description: 'Purpose-built HDD rated for 24/7 continuous recording workloads in DVR/NVR systems.',
      specs: 'Capacity: 2TB\nRPM: 5400\nWarranty: 3 years',
      available: true,
      featured: false,
      color: '#f59e0b',
    },
    {
      name: 'BNC Combo Cable 90m Roll',
      category: 'Accessories & Cables',
      price: 1299,
      description: 'Copper video + power combo cable roll for analog CCTV camera installation runs.',
      specs: 'Length: 90m\nType: Video + Power',
      available: true,
      featured: false,
      color: '#d97706',
    },
    {
      name: 'MCB Distribution Board (8-way)',
      category: 'Electrical Wiring',
      price: 899,
      description: 'Compact MCB distribution board for residential and small commercial electrical panels.',
      specs: 'Ways: 8\nMaterial: Fire-retardant ABS',
      available: true,
      featured: false,
      color: '#307eff',
    },
  ];

  const now = Date.now();
  for (const p of products) {
    await db.collection('products').add({
      name: p.name,
      slug: p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
      categoryId: categoryIds[p.category],
      categoryName: p.category,
      description: p.description,
      specs: p.specs ?? '',
      price: p.price,
      mrp: p.mrp,
      images: [svgImage(p.name.split(' ').slice(0, 3).join(' '), p.color)],
      available: p.available,
      featured: p.featured,
      createdAt: now,
      updatedAt: now,
    });
  }

  // ---------- Services ----------
  const services = [
    {
      title: 'CCTV Installation & Setup',
      description: 'End-to-end camera installation: site survey, cabling, mounting, DVR/NVR configuration and mobile app setup.',
      color: '#1a5ff5',
    },
    {
      title: 'Electrical Wiring & Rewiring',
      description: 'Licensed electricians for new wiring, panel upgrades, and safe rewiring of homes and offices.',
      color: '#f59e0b',
    },
    {
      title: 'Annual Maintenance Contract (AMC)',
      description: 'Scheduled inspections, cleaning, firmware updates and priority support for your CCTV system.',
      color: '#173cad',
    },
  ];
  for (const [i, s] of services.entries()) {
    await db.collection('services').add({
      title: s.title,
      description: s.description,
      images: [svgImage(s.title.split(' ').slice(0, 2).join(' '), s.color)],
      order: i,
      createdAt: now,
    });
  }

  // ---------- Settings ----------
  await db.collection('settings').doc('business').set({
    businessName: 'SecureVision CCTV & Electrical',
    tagline: 'Cameras, wiring & installation you can trust',
    phone: '+91 98765 43210',
    whatsappNumber: '919876543210',
    email: 'hello@securevision.test',
    address: '12 MG Road, Bengaluru, Karnataka 560001',
    workingHours: 'Mon–Sat, 9:00 AM – 7:00 PM',
    logoUrl: '',
    heroImageUrl: svgImage('SecureVision', '#173cad'),
    facebookUrl: '',
    instagramUrl: '',
    seoDescription: 'Shop CCTV cameras, DVRs/NVRs and accessories, plus book professional CCTV and electrical installation services.',
  });

  // ---------- Admin user ----------
  const email = 'demo@securevision.test';
  const password = 'Demo@12345';
  let user;
  try {
    user = await auth.getUserByEmail(email);
  } catch {
    user = await auth.createUser({ email, password, emailVerified: true, displayName: 'Demo Admin' });
  }
  await db.collection('admins').doc(user.uid).set({
    email,
    name: 'Demo Admin',
    createdAt: now,
  });

  console.log('Seed complete.');
  console.log(`  ${categories.length} categories, ${products.length} products, ${services.length} services`);
  console.log(`  Admin login -> ${email} / ${password}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
