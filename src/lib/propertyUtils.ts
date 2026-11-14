import type {
  InquiryInput,
  Property,
  PropertyCategory,
  PropertyInput,
  TransactionType,
} from '../types';

export interface PropertyFilterOptions {
  search: string;
  category: 'All' | PropertyCategory;
  transactionType: 'All' | TransactionType;
  corridor: string;
  includeUnavailable?: boolean;
}

export interface PortfolioMetrics {
  totalListings: number;
  availableCount: number;
  underOfferCount: number;
  totalAvailableSqFt: number;
  featuredCount: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

/**
 * Formats an INR integer into readable Indian numbering shorthand (e.g. ₹4.25 L/mo or ₹3.45 Cr).
 */
export function formatInrPrice(
  amountInr: number,
  transactionType: TransactionType
): string {
  if (!Number.isFinite(amountInr) || amountInr <= 0) {
    return 'Price on Request';
  }

  const suffix = transactionType === 'For Lease' ? ' / mo' : '';

  if (amountInr >= 10000000) {
    const crores = amountInr / 10000000;
    const formatted = crores % 1 === 0 ? crores.toFixed(0) : crores.toFixed(2);
    return `₹${formatted.replace(/\.00$/, '')} Cr${suffix}`;
  }

  if (amountInr >= 100000) {
    const lakhs = amountInr / 100000;
    const formatted = lakhs % 1 === 0 ? lakhs.toFixed(0) : lakhs.toFixed(2);
    return `₹${formatted.replace(/\.00$/, '')} L${suffix}`;
  }

  return `₹${amountInr.toLocaleString('en-IN')}${suffix}`;
}

export function formatAreaSqFt(areaSqFt: number): string {
  if (!Number.isFinite(areaSqFt) || areaSqFt <= 0) {
    return '—';
  }
  return `${Math.round(areaSqFt).toLocaleString('en-IN')} sq.ft`;
}

export function filterProperties(
  properties: Property[],
  filters: PropertyFilterOptions
): Property[] {
  const query = filters.search.trim().toLowerCase();

  return properties.filter((item) => {
    if (!filters.includeUnavailable && (item.status === 'Leased' || item.status === 'Sold')) {
      return false;
    }

    if (filters.category !== 'All' && item.category !== filters.category) {
      return false;
    }

    if (
      filters.transactionType !== 'All' &&
      item.transactionType !== filters.transactionType
    ) {
      return false;
    }

    if (filters.corridor && filters.corridor !== 'All' && item.corridor !== filters.corridor) {
      return false;
    }

    if (query.length > 0) {
      const haystack = [
        item.title,
        item.corridor,
        item.address,
        item.category,
        item.summary,
        item.specs.zoning,
      ]
        .join(' ')
        .toLowerCase();

      if (!haystack.includes(query)) {
        return false;
      }
    }

    return true;
  });
}

export function computePortfolioMetrics(properties: Property[]): PortfolioMetrics {
  let availableCount = 0;
  let underOfferCount = 0;
  let totalAvailableSqFt = 0;
  let featuredCount = 0;

  for (const prop of properties) {
    if (prop.status === 'Available') {
      availableCount += 1;
      totalAvailableSqFt += prop.specs.areaSqFt;
    } else if (prop.status === 'Under Offer') {
      underOfferCount += 1;
      totalAvailableSqFt += prop.specs.areaSqFt;
    }

    if (prop.featured) {
      featuredCount += 1;
    }
  }

  return {
    totalListings: properties.length,
    availableCount,
    underOfferCount,
    totalAvailableSqFt,
    featuredCount,
  };
}

export function validatePropertyInput(input: Partial<PropertyInput>): ValidationResult {
  const errors: Record<string, string> = {};

  if (!input.title || input.title.trim().length < 5) {
    errors.title = 'Property title must be at least 5 characters.';
  }

  if (!input.corridor || input.corridor.trim().length < 2) {
    errors.corridor = 'Specify an industrial corridor or locality.';
  }

  if (!input.address || input.address.trim().length < 8) {
    errors.address = 'Provide a complete property street address.';
  }

  if (!input.summary || input.summary.trim().length < 15) {
    errors.summary = 'Provide a concise summary of at least 15 characters.';
  }

  if (typeof input.priceInr !== 'number' || !Number.isFinite(input.priceInr) || input.priceInr <= 0) {
    errors.priceInr = 'Enter a valid positive INR amount.';
  }

  if (!input.specs || !Number.isFinite(input.specs.areaSqFt) || input.specs.areaSqFt <= 0) {
    errors.areaSqFt = 'Area in sq.ft must be greater than zero.';
  }

  if (!input.specs || !Number.isFinite(input.specs.roadWidthFt) || input.specs.roadWidthFt <= 0) {
    errors.roadWidthFt = 'Access road width in feet must be greater than zero.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateInquiryInput(input: Partial<InquiryInput>): ValidationResult {
  const errors: Record<string, string> = {};

  if (!input.name || input.name.trim().length < 2) {
    errors.name = 'Please enter your full name.';
  }

  const digits = (input.phone || '').replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 13) {
    errors.phone = 'Enter a valid 10-digit mobile or office phone number.';
  }

  const email = (input.email || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Enter a valid business or personal email address.';
  }

  if (!input.message || input.message.trim().length < 10) {
    errors.message = 'Include brief space requirements or preferred visit timing (min 10 chars).';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
