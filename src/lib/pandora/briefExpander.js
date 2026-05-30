/**
 * Brief Expander
 * 
 * Converts a single user sentence into a structured Pandora brief.
 */

import {
  inferProductType,
  inferTone,
  inferCtaStyle,
  DEFAULT_BRIEF,
} from './pandoraSchema.js';

/**
 * Expand a brief from a single sentence input
 * 
 * Example input:
 * "Dokonala booking landing page, premium effect with liquid glass - barber shop 2025 trends"
 * 
 * Expected output:
 * {
 *   productType: "landing-page",
 *   projectName: "Liquid Glass Barber Booking 2025",
 *   businessType: "Prémiový barber shop s online rezerváciami",
 *   projectType: "landing-page",
 *   targetAudience: "Muži 25–45 rokov, ktorí chcú prémiový strih, úpravu brady a rýchlu online rezerváciu bez telefonovania.",
 *   preferredTone: "premium",
 *   goal: "Zvýšiť počet online rezervácií na barber služby cez prémiovú landing page.",
 *   description: "Konverzná booking landing page pre prémiový barber shop v štýle 2025 s liquid glass efektom, službami, cenníkom, dôverou, FAQ, kontaktom a jasným CTA na rezerváciu termínu.",
 *   contactEmail: "hello@example.com",
 *   locale: "sk",
 *   ctaStyle: "direct"
 * }
 */
export function expandBriefFromSentence(input) {
  if (!input || typeof input !== 'string') {
    throw new Error('Input must be a non-empty string');
  }

  const trimmedInput = input.trim();
  if (!trimmedInput) {
    throw new Error('Input cannot be empty');
  }

  // Infer base product type
  const productType = inferProductType(trimmedInput);
  const preferredTone = inferTone(trimmedInput);
  const ctaStyle = inferCtaStyle(trimmedInput);

  // Detect locale
  const locale = detectLocale(trimmedInput);

  // Extract key info
  const projectName = generateProjectName(trimmedInput);
  const businessType = generateBusinessType(trimmedInput, locale);
  const targetAudience = generateTargetAudience(trimmedInput, locale);
  const goal = generateGoal(trimmedInput, productType, locale);
  const description = generateDescription(trimmedInput, productType, preferredTone, locale);

  // Default to hello@example.com if no email is found
  const contactEmail = extractEmail(trimmedInput) || 'hello@example.com';

  return {
    projectName,
    goal,
    description,
    contactEmail,
    productType,
    businessType,
    projectType: productType,
    targetAudience,
    preferredTone,
    locale,
    ctaStyle,
  };
}

/**
 * Detect locale from input text
 */
function detectLocale(input) {
  const lower = input.toLowerCase();

  // Slovak indicators
  if (lower.includes('barber') || lower.includes('barber shop')) {
    // Often Slovak context
    return 'sk';
  }
  if (lower.match(/ž|č|š|ý|á|é|ú|ň|ť|ľ/)) {
    return 'sk';
  }

  // German indicators
  if (lower.includes('friseur') || lower.includes('barbier')) {
    return 'de';
  }

  // Czech indicators
  if (lower.includes('kadeřnictví')) {
    return 'cs';
  }

  // Default to English
  return 'en';
}

/**
 * Generate project name from input
 */
function generateProjectName(input) {
  // Extract effect or style if mentioned
  const effectMatch = input.match(/liquid glass|glass|gradient|minimal|modern|premium/i);
  const effect = effectMatch ? effectMatch[0] : '';

  // Extract business type or service
  const serviceMatch = input.match(/barber|salon|clinic|shop|booking/i);
  const service = serviceMatch ? serviceMatch[0] : '';

  // Extract year or trend
  const yearMatch = input.match(/\d{4}/);
  const year = yearMatch ? yearMatch[0] : '';

  // Build project name
  const parts = [];
  if (effect) parts.push(effect);
  if (service) parts.push(service.charAt(0).toUpperCase() + service.slice(1));
  if (input.includes('booking')) parts.push('Booking');
  if (year) parts.push(year);

  if (parts.length > 0) {
    return parts.join(' ');
  }

  return 'New Project';
}

/**
 * Generate business type from input
 */
function generateBusinessType(input, locale) {
  // Detect service type
  if (input.match(/barber|barbier|friseur/i)) {
    if (locale === 'sk') {
      return input.includes('premium') || input.includes('luxury')
        ? 'Prémiový barber shop s online rezerváciami'
        : 'Barber shop s online rezerváciami';
    }
    return 'Barber shop with online reservations';
  }

  if (input.match(/salon|salón/i)) {
    if (locale === 'sk') {
      return 'Kadeřnícký salón s online rezerváciami';
    }
    return 'Hair salon with online reservations';
  }

  if (input.match(/clinic|klinika/i)) {
    if (locale === 'sk') {
      return 'Lekárska klinika s online objednávkou';
    }
    return 'Medical clinic with online scheduling';
  }

  // Fallback
  if (locale === 'sk') {
    return 'Profesionálny podnik s online službami';
  }
  return 'Professional business with online services';
}

/**
 * Generate target audience from input
 */
function generateTargetAudience(input, locale) {
  if (input.match(/barber/i)) {
    if (locale === 'sk') {
      return 'Muži 25–45 rokov, ktorí chcú prémiový strih, úpravu brady a rýchlu online rezerváciu bez telefonovania.';
    }
    return 'Men 25–45 years old seeking premium haircuts, beard grooming, and quick online booking without phone calls.';
  }

  if (input.match(/salon/i)) {
    if (locale === 'sk') {
      return 'Ženy 20–60 rokov hľadajúce profesionálne vlasové služby s flexibilnými rezerváciami online.';
    }
    return 'Women 20–60 seeking professional hair services with convenient online scheduling.';
  }

  // Generic
  if (locale === 'sk') {
    return 'Zákazníci hľadajúci kvalitné služby s možnosťou online rezervácie.';
  }
  return 'Customers seeking quality services with convenient online booking.';
}

/**
 * Generate goal from input
 */
function generateGoal(input, productType, locale) {
  if (input.match(/barber|booking|reservation/i)) {
    if (locale === 'sk') {
      return 'Zvýšiť počet online rezervácií na barber služby cez atraktívnu landing page.';
    }
    return 'Increase online barber booking reservations through an attractive landing page.';
  }

  if (locale === 'sk') {
    return 'Zvýšiť konverzie a online engagment cez profesionálnu landing page.';
  }
  return 'Increase conversions and engagement through a professional landing page.';
}

/**
 * Generate description from input
 */
function generateDescription(input, productType, preferredTone, locale) {
  const hasLiquidGlass = input.includes('liquid glass') || input.includes('glass');
  const isBooking = input.match(/booking|reservation/i);
  const is2025 = input.includes('2025');
  const isPremium = input.match(/premium|luxury/i);

  let desc = '';

  if (locale === 'sk') {
    desc = isBooking
      ? 'Konverzná booking landing page pre'
      : 'Profesionálna landing page pre';
    desc += isPremium ? ' prémiový' : '';
    desc += ' barber shop';
    if (is2025) desc += ' v štýle 2025';
    if (hasLiquidGlass) desc += ' s liquid glass efektom';
    desc += ', s službami, cenníkom, referencami, FAQ, kontaktom a jasným CTA.';
  } else {
    desc = isBooking
      ? 'Conversion-focused booking landing page for'
      : 'Professional landing page for';
    desc += isPremium ? ' premium' : '';
    desc += ' barber shop';
    if (is2025) desc += ' in 2025 style';
    if (hasLiquidGlass) desc += ' with liquid glass effect';
    desc += ', featuring services, pricing, testimonials, FAQ, contact, and clear CTA.';
  }

  return desc;
}

/**
 * Extract email from input if present
 */
function extractEmail(input) {
  const emailMatch = input.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
  return emailMatch ? emailMatch[1] : null;
}
