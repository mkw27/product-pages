/*
  Landing page generator.
  Reads products.json, validates everything, generates output/.
  Run with: node src/generate.js
  Zero dependencies — Node.js built-ins only.
*/

const fs = require('fs');
const path = require('path');
const { validate } = require('./validate');

const PROJECT_ROOT = path.join(__dirname, '..');
const TEMPLATE_FILE = path.join(__dirname, 'template.html');
const IMAGES_DIR = path.join(PROJECT_ROOT, 'images');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'output');

// ---- HTML escaping ----
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ---- Build gallery slides HTML ----
function buildSlides(images, slug) {
  return images.map((filename, i) => {
    // Path relative to the output folder
    const src = `images/${escapeHtml(filename)}`;
    return `<div class="gallery-slide"><img src="${src}" alt="Product image ${i + 1}" loading="lazy"></div>`;
  }).join('\n      ');
}

// ---- Build gallery dot indicators ----
function buildDots(images) {
  return images.map((_, i) => {
    const active = i === 0 ? ' active' : '';
    return `<div class="gallery-dot${active}" data-index="${i}"></div>`;
  }).join('\n      ');
}

// ---- Build Tally iframe ----
function buildTallyIframe(url) {
  if (!url || url.trim() === '') {
    return '<!-- No Tally form configured -->';
  }
  return `<iframe src="${escapeHtml(url)}" allow="fullscreen" title="Order Form"></iframe>`;
}

// ---- Generate ----
function generate() {
  console.log('🔨 Product Landing Page Generator\n');

  // Validate everything first
  const products = validate();

  // Load template
  if (!fs.existsSync(TEMPLATE_FILE)) {
    console.error('ERROR: template.html not found at:', TEMPLATE_FILE);
    process.exit(1);
  }
  const template = fs.readFileSync(TEMPLATE_FILE, 'utf8');

  // Wipe and recreate output directory
  if (fs.existsSync(OUTPUT_DIR)) {
    fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  let count = 0;

  products.forEach((product) => {
    const slug = product.slug;
    // Only use first 5 images
    const images = product.images.slice(0, 5);

    // Prepare placeholder replacements
    const replacements = {
      '{{PRODUCT_NAME}}': escapeHtml(product.name),
      '{{TAGLINE}}': escapeHtml(product.tagline || ''),
      '{{PRICE}}': escapeHtml(product.price),
      '{{CTA_TEXT}}': escapeHtml(product.ctaText || 'Buy Now'),
      '{{TRUST_MARKER}}': escapeHtml(product.trustMarker || ''),
      '{{GALLERY_SLIDES}}': buildSlides(images, slug),
      '{{GALLERY_DOTS}}': buildDots(images),
      '{{TALLY_FORM_URL}}': escapeHtml(product.tallyFormUrl || ''),
      '{{TALLY_DIRECT_LINK}}': escapeHtml((product.tallyFormUrl || '').replace('/embed/', '/')),
      '{{TALLY_IFRAME}}': buildTallyIframe(product.tallyFormUrl),
      '{{PAGE_TITLE}}': escapeHtml(product.pageTitle || product.name),
      '{{PAGE_DESCRIPTION}}': escapeHtml(product.pageDescription || product.tagline || ''),
      '{{OG_IMAGE}}': escapeHtml(product.ogImage || `images/${escapeHtml(images[0])}`),
    };

    // Apply replacements
    let page = template;
    Object.entries(replacements).forEach(([placeholder, value]) => {
      page = page.split(placeholder).join(value);
    });

    // Warn about unreplaced placeholders
    const unreplaced = page.match(/\{\{.*?\}\}/g);
    if (unreplaced) {
      console.warn(`  ⚠️  ${product.name}: Unreplaced placeholders: ${unreplaced.join(', ')}`);
    }

    // Write output
    const productOutputDir = path.join(OUTPUT_DIR, slug);
    fs.mkdirSync(productOutputDir, { recursive: true });
    fs.writeFileSync(path.join(productOutputDir, 'index.html'), page, 'utf8');

    // Copy product images into output
    const outputImagesDir = path.join(productOutputDir, 'images');
    fs.mkdirSync(outputImagesDir, { recursive: true });

    const sourceImageDir = path.join(IMAGES_DIR, slug);
    images.forEach((filename) => {
      const src = path.join(sourceImageDir, filename);
      const dest = path.join(outputImagesDir, filename);
      fs.copyFileSync(src, dest);
    });

    console.log(`  ✅ ${product.name} → /${slug}/`);
    count++;
  });

  console.log(`\n🎉 Done! ${count} landing page(s) generated in /output/`);
}

generate();
