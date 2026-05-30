/**
 * Pandora Schema & Normalization
 * 
 * Exports schema definitions, default values, and normalization functions
 * for converting user input into structured Pandora briefs.
 */

export const PRODUCT_TYPES = [
  'landing-page',
  'saas',
  'ecommerce',
  'portfolio',
  'blog',
  'documentation',
  'wordpress-snippet',
];

export const DEFAULT_BRIEF = {
  projectName: '',
  goal: '',
  description: '',
  contactEmail: '',
  productType: 'landing-page',
  businessType: '',
  projectType: 'landing-page',
  targetAudience: '',
  preferredTone: 'professional',
  locale: 'en',
  ctaStyle: 'standard',
};

/**
 * Forbidden phrases that indicate legacy web24h/WordPress content
 * These should never appear in generated content unless explicitly requested
 */
export const FORBIDDEN_LEGACY_PHRASES = [
  'Web24h Project',
  'web24h',
  'web do 24h',
  'WordPress payload',
  'WordPress metabox',
  'Poslať brief',
  'pošli brief',
  'tvorba webu',
  'webová prezentácia',
  'Proces bez zbytočných meetingov',
  'profesionálny štart webu',
];

/**
 * Normalize brief by ensuring all required fields are present
 * and filtering out invalid values
 */
export function normalizeBrief(input) {
  if (!input || typeof input !== 'object') {
    throw new Error('Brief must be a non-null object');
  }

  const brief = { ...DEFAULT_BRIEF, ...input };

  // Validate required fields
  if (!brief.projectName || typeof brief.projectName !== 'string') {
    throw new Error('projectName is required and must be a string');
  }
  if (!brief.goal || typeof brief.goal !== 'string') {
    throw new Error('goal is required and must be a string');
  }
  if (!brief.description || typeof brief.description !== 'string') {
    throw new Error('description is required and must be a string');
  }
  if (!brief.contactEmail || typeof brief.contactEmail !== 'string') {
    throw new Error('contactEmail is required and must be a string');
  }

  // Validate product type
  if (!PRODUCT_TYPES.includes(brief.productType)) {
    brief.productType = 'landing-page';
  }

  // Trim all string values
  Object.keys(brief).forEach((key) => {
    if (typeof brief[key] === 'string') {
      brief[key] = brief[key].trim();
    }
  });

  return brief;
}

/**
 * Validate core brief fields
 */
export function validateBriefCore(brief) {
  const errors = [];

  if (!brief.projectName) {
    errors.push('projectName is required');
  }
  if (!brief.goal) {
    errors.push('goal is required');
  }
  if (!brief.description) {
    errors.push('description is required');
  }
  if (!brief.contactEmail) {
    errors.push('contactEmail is required');
  }

  // Validate email format
  if (brief.contactEmail && !brief.contactEmail.includes('@')) {
    errors.push('contactEmail must be a valid email address');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Infer product type from user input
 */
export function inferProductType(input) {
  const lower = input.toLowerCase();

  // Check for explicit landing page first
  if (lower.includes('landing') || lower.includes('landing page')) {
    return 'landing-page';
  }
  // Check for wordpress before other patterns
  if (lower.includes('wordpress')) {
    return 'wordpress-snippet';
  }
  // Check for documentation
  if (lower.includes('documentation') || lower.includes('docs')) {
    return 'documentation';
  }
  // Check for blog
  if (lower.includes('blog')) {
    return 'blog';
  }
  // Check for portfolio
  if (lower.includes('portfolio')) {
    return 'portfolio';
  }
  // Check for SaaS
  if (lower.includes('saas') || lower.includes('application') || lower.includes('app ')) {
    return 'saas';
  }
  // Check for ecommerce (shop/store must come after landing page check)
  if (lower.includes('ecommerce') || lower.includes('e-commerce')) {
    return 'ecommerce';
  }
  // Only check for shop/store if not preceded by "barber" or other service types
  if ((lower.includes('shop') || lower.includes('store')) && !lower.includes('barber') && !lower.includes('salon')) {
    return 'ecommerce';
  }

  return 'landing-page';
}

/**
 * Infer tone from user input
 */
export function inferTone(input) {
  const lower = input.toLowerCase();

  if (lower.includes('premium') || lower.includes('luxury')) {
    return 'premium';
  }
  if (lower.includes('casual') || lower.includes('fun')) {
    return 'casual';
  }
  if (lower.includes('formal') || lower.includes('corporate')) {
    return 'formal';
  }
  if (lower.includes('minimal')) {
    return 'minimal';
  }

  return 'professional';
}

/**
 * Infer CTA style from user input
 */
export function inferCtaStyle(input) {
  const lower = input.toLowerCase();

  // Booking/reservation = direct action
  if (lower.includes('booking') || lower.includes('reservation') || lower.includes('reserve') || lower.includes('book')) {
    return 'direct';
  }
  if (lower.includes('direct') || lower.includes('buy') || lower.includes('order') || lower.includes('purchase')) {
    return 'direct';
  }
  if (lower.includes('contact') || lower.includes('email') || lower.includes('reach')) {
    return 'contact';
  }
  if (lower.includes('subscribe') || lower.includes('newsletter')) {
    return 'subscribe';
  }
  if (lower.includes('learn more') || lower.includes('discover')) {
    return 'discover';
  }

  return 'standard';
}
