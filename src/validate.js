/*
  Validates products.json and image paths before generation.
  Called by generate.js — exits with clear errors if anything is wrong.
*/

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const PRODUCTS_FILE = path.join(PROJECT_ROOT, 'products.json');
const IMAGES_DIR = path.join(PROJECT_ROOT, 'images');

function validate() {
  const errors = [];
  const warnings = [];

  // Check products.json exists
  if (!fs.existsSync(PRODUCTS_FILE)) {
    console.error('ERROR: products.json not found at:', PRODUCTS_FILE);
    process.exit(1);
  }

  // Parse JSON
  let products;
  try {
    const raw = fs.readFileSync(PRODUCTS_FILE, 'utf8');
    products = JSON.parse(raw);
  } catch (err) {
    console.error('ERROR: products.json is not valid JSON.');
    console.error('Details:', err.message);
    process.exit(1);
  }

  // Must be an array
  if (!Array.isArray(products)) {
    console.error('ERROR: products.json must be an array (starts with [ )');
    process.exit(1);
  }

  if (products.length === 0) {
    console.error('ERROR: products.json is empty. Add at least one product.');
    process.exit(1);
  }

  const slugs = new Set();
  const requiredFields = ['name', 'slug', 'price', 'images'];

  products.forEach((product, index) => {
    const label = product.name || `Product #${index + 1}`;

    // Check required fields
    const missing = requiredFields.filter(f => !product[f]);
    if (missing.length > 0) {
      errors.push(`${label}: Missing required fields: ${missing.join(', ')}`);
      return;
    }

    // Validate slug format
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(product.slug)) {
      errors.push(`${label}: Invalid slug "${product.slug}". Use only lowercase letters, numbers, and hyphens (e.g., "my-product")`);
      return;
    }

    // Check duplicate slugs
    if (slugs.has(product.slug)) {
      errors.push(`${label}: Duplicate slug "${product.slug}". Each product needs a unique slug.`);
      return;
    }
    slugs.add(product.slug);

    // Validate images array
    if (!Array.isArray(product.images)) {
      errors.push(`${label}: "images" must be an array of filenames.`);
      return;
    }

    if (product.images.length === 0) {
      errors.push(`${label}: "images" array is empty. Add at least one image filename.`);
      return;
    }

    if (product.images.length > 5) {
      warnings.push(`${label}: ${product.images.length} images provided. Only 5 fit in the gallery — extras will be ignored.`);
    }

    // Validate each image file exists
    const productImageDir = path.join(IMAGES_DIR, product.slug);

    if (!fs.existsSync(productImageDir)) {
      errors.push(
        `${label}: Image folder not found: images/${product.slug}/.\n` +
        `  Create this folder and add your product photos there.`
      );
      return;
    }

    product.images.forEach((filename, imgIndex) => {
      // Check for unsafe characters in filename
      if (/[^a-zA-Z0-9._\-]/.test(filename)) {
        errors.push(
          `${label}: Image filename "${filename}" contains invalid characters.\n` +
          `  Use only letters, numbers, hyphens, underscores, and periods.`
        );
        return;
      }

      const filePath = path.join(productImageDir, filename);
      if (!fs.existsSync(filePath)) {
        errors.push(
          `${label}: Image file not found: images/${product.slug}/${filename}\n` +
          `  Upload this file to that folder.`
        );
      }
    });

    // Validate Tally URL format if provided
    if (product.tallyFormUrl && product.tallyFormUrl.trim() !== '') {
      if (!product.tallyFormUrl.startsWith('https://tally.so/embed/')) {
        warnings.push(
          `${label}: Tally URL should look like "https://tally.so/embed/abc123".\n` +
          `  Go to your Tally form → Share → Embed → copy the URL.`
        );
      }
    }
  });

  // Print warnings
  if (warnings.length > 0) {
    console.log('WARNINGS:');
    warnings.forEach(w => console.log('  ⚠️  ' + w));
    console.log('');
  }

  // Print errors and exit
  if (errors.length > 0) {
    console.error('ERRORS:');
    errors.forEach(e => console.error('  ❌ ' + e));
    console.error(`\n${errors.length} error(s) found. Fix them before generating.`);
    process.exit(1);
  }

  console.log('✅ Validation passed — all products and images look good.\n');
  return products;
}

module.exports = { validate };
