const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

fs.mkdirSync('public/images/staff', { recursive: true });
fs.mkdirSync('public/images/services', { recursive: true });

async function createStaffImage(name, title, initials, filename) {
  const svg = `
  <svg width="600" height="600" viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bgGrad_${initials}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FAF6F3"/>
        <stop offset="50%" stop-color="#F5EBE6"/>
        <stop offset="100%" stop-color="#EADBDA"/>
      </linearGradient>
      <radialGradient id="halo_${initials}" cx="50%" cy="42%" r="35%">
        <stop offset="0%" stop-color="#E29494" stop-opacity="0.4"/>
        <stop offset="100%" stop-color="#C26A6A" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="ringGrad_${initials}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#E29494"/>
        <stop offset="100%" stop-color="#C26A6A"/>
      </linearGradient>
    </defs>
    <rect width="600" height="600" fill="url(#bgGrad_${initials})"/>
    <circle cx="300" cy="250" r="180" fill="url(#halo_${initials})"/>
    <circle cx="300" cy="250" r="120" fill="#FFF8F6" stroke="url(#ringGrad_${initials})" stroke-width="3"/>
    <text x="300" y="275" font-family="'Playfair Display', Georgia, serif" font-size="68" font-style="italic" font-weight="600" text-anchor="middle" fill="#4A2020">${initials}</text>
    <text x="300" y="425" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="24" font-weight="700" letter-spacing="1" text-anchor="middle" fill="#2D2424">${name.toUpperCase()}</text>
    <text x="300" y="460" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="15" font-weight="500" letter-spacing="0.5" text-anchor="middle" fill="#8C7A7A">${title}</text>
    <text x="300" y="520" font-family="'Playfair Display', Georgia, serif" font-size="13" font-style="italic" letter-spacing="2" text-anchor="middle" fill="#C26A6A">BLUSH STUDIO • BGC MANILA</text>
  </svg>`;
  await sharp(Buffer.from(svg)).jpeg({ quality: 92 }).toFile(path.join('public/images/staff', filename));
}

async function createServiceImage(title, category, duration, price, filename) {
  const svg = `
  <svg width="800" height="500" viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="sbg_${filename.replace(/\W/g, '_')}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FAF6F3"/>
        <stop offset="60%" stop-color="#F4EAE6"/>
        <stop offset="100%" stop-color="#E8D8D4"/>
      </linearGradient>
    </defs>
    <rect width="800" height="500" fill="url(#sbg_${filename.replace(/\W/g, '_')})"/>
    <rect x="30" y="30" width="740" height="440" rx="20" fill="#FFFDFD" stroke="#EADBDA" stroke-width="2"/>
    <circle cx="400" cy="180" r="75" fill="#FAF1ED" stroke="#E8CECA" stroke-width="1.5"/>
    <text x="400" y="195" font-family="'Playfair Display', Georgia, serif" font-size="42" font-style="italic" text-anchor="middle" fill="#C26A6A">✦</text>
    <text x="400" y="295" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="13" font-weight="700" letter-spacing="3" text-anchor="middle" fill="#C26A6A">${category.toUpperCase()}</text>
    <text x="400" y="335" font-family="'Playfair Display', Georgia, serif" font-size="26" font-weight="600" text-anchor="middle" fill="#2D2424">${title}</text>
    <text x="400" y="375" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="14" text-anchor="middle" fill="#7A6666">${duration} • ${price}</text>
    <text x="400" y="425" font-family="'Playfair Display', Georgia, serif" font-size="12" font-style="italic" letter-spacing="2" text-anchor="middle" fill="#A89494">BLUSH SANCTUARY • BONIFACIO GLOBAL CITY</text>
  </svg>`;
  await sharp(Buffer.from(svg)).jpeg({ quality: 92 }).toFile(path.join('public/images/services', filename));
}

async function run() {
  await createStaffImage('Camille Santos', 'Master Russian Manicurist', 'CS', 'camille.jpg');
  await createStaffImage('Bea Alcantara', 'Japanese Lash Artisan', 'BA', 'bea.jpg');
  await createStaffImage('Dianne Lim', 'Facial and Glow Specialist', 'DL', 'dianne.jpg');
  await createStaffImage('Andrea Morales', 'Nail Care and Brow Specialist', 'AM', 'andrea.jpg');

  await createServiceImage('Russian Structured Gel Manicure', 'Nails and Hand Care', '90 mins', '₱1,850', 'gel-mani.jpg');
  await createServiceImage('Russian Structured Gel Manicure', 'Nails and Hand Care', '90 mins', '₱1,850', 'gel-manicure.jpg');
  await createServiceImage('Apres Gel-X Extensions', 'Nails and Hand Care', '120 mins', '₱2,800', 'gel-extensions.jpg');
  await createServiceImage('Petal and Sea Salt Spa Pedicure', 'Nails and Hand Care', '75 mins', '₱1,650', 'spa-pedi.jpg');
  await createServiceImage('Featherlight Classic Lashes', 'Lashes and Brows', '90 mins', '₱2,200', 'lashes-classic.jpg');
  await createServiceImage('Tokyo Wet Lash Styling', 'Lashes and Brows', '105 mins', '₱2,650', 'lashes-volume.jpg');
  await createServiceImage('Keratin Brow Lamination and Tint', 'Lashes and Brows', '60 mins', '₱1,450', 'brow-lamination.jpg');
  await createServiceImage('Korean Glass Skin Hydrafacial', 'Facial Therapy', '75 mins', '₱2,450', 'glass-facial.jpg');
  await createServiceImage('Gua Sha Buccal Lifting Facial', 'Facial Therapy', '75 mins', '₱2,650', 'sculpt-facial.jpg');
  await createServiceImage('Botanical Scalp Detox Ritual', 'Self-Care Rituals', '45 mins', '₱1,250', 'scalp-massage.jpg');

  console.log('Successfully generated all 14 brand image assets');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
