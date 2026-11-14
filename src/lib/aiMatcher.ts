import type { AgencySettings, Property, PropertyCategory, TransactionType } from '../types';

export interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
}

export interface AdvisorResponse {
  reply: string;
  recommendedPropertyIds: string[];
  followUpSuggestions: string[];
}

export interface PropertyMatchCriteria {
  maxBudgetInr?: number;
  category?: PropertyCategory;
  transactionType?: TransactionType;
  minAreaSqFt?: number;
  minPowerKva?: number;
  keywords: string[];
  preferAffordable: boolean;
}

/**
 * Extracts structured search hints (budget in Lakhs/Crores, category, lease vs sale, area, power)
 * from a natural-language buyer/tenant query.
 */
export function parseQueryCriteria(query: string): PropertyMatchCriteria {
  const lower = query.toLowerCase();
  const criteria: PropertyMatchCriteria = {
    keywords: lower
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2),
    preferAffordable:
      /\b(affordable|cheap|cheaper|budget|low cost|lowest|economical|under|within|less than)\b/.test(
        lower
      ),
  };

  if (/\b(lease|rent|rental|monthly|per month|\/mo)\b/.test(lower)) {
    criteria.transactionType = 'For Lease';
  } else if (/\b(buy|sale|purchase|own|freehold)\b/.test(lower)) {
    criteria.transactionType = 'For Sale';
  }

  if (/\b(warehouse|logistics|storage|cold|godown)\b/.test(lower)) {
    criteria.category = 'Warehouse';
  } else if (/\b(plot|land|acre|parcel)\b/.test(lower)) {
    criteria.category = 'Industrial Plot';
  } else if (/\b(shed|factory|manufacturing|crane|peb)\b/.test(lower)) {
    criteria.category = 'Factory Shed';
  } else if (/\b(commercial|office|showroom|complex)\b/.test(lower)) {
    criteria.category = 'Commercial';
  }

  // Budget parsing: e.g. "under 3 L", "below 5 lakh", "within 2.5 Cr"
  const croreMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:cr|crore|crores)\b/);
  const lakhMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:l|lac|lakh|lakhs)\b/);
  if (croreMatch) {
    criteria.maxBudgetInr = Math.round(Number(croreMatch[1]) * 10000000);
  } else if (lakhMatch) {
    criteria.maxBudgetInr = Math.round(Number(lakhMatch[1]) * 100000);
  }

  const areaMatch = lower.match(/(\d[\d,]*)\s*(?:sq\.?\s*ft|sqft|sft)\b/);
  if (areaMatch) {
    criteria.minAreaSqFt = Number(areaMatch[1].replace(/,/g, ''));
  }

  const powerMatch = lower.match(/(\d+)\s*\+?\s*(?:kva|hp)\b/);
  if (powerMatch) {
    criteria.minPowerKva = Number(powerMatch[1]);
  }

  return criteria;
}

/**
 * Ranks available properties by relevance and affordability based on user query criteria.
 */
export function rankSuitableProperties(
  properties: Property[],
  query: string,
  limit: number = 3
): Property[] {
  const active = properties.filter(
    (p) => p.status === 'Available' || p.status === 'Under Offer'
  );
  if (active.length === 0) return [];

  const criteria = parseQueryCriteria(query);

  const scored = active.map((prop) => {
    let score = 0;

    if (prop.status === 'Available') score += 3;
    if (criteria.category && prop.category === criteria.category) score += 20;
    if (criteria.transactionType && prop.transactionType === criteria.transactionType) {
      score += 18;
    }

    if (criteria.maxBudgetInr) {
      if (prop.priceInr <= criteria.maxBudgetInr) {
        score += 25;
      } else {
        score -= 25;
      }
    }

    if (criteria.minAreaSqFt && prop.specs.areaSqFt >= criteria.minAreaSqFt) {
      score += 10;
    }

    if (
      criteria.minPowerKva &&
      (prop.specs.powerLoadKva ?? 0) >= criteria.minPowerKva
    ) {
      score += 12;
    }

    const haystack = [
      prop.title,
      prop.corridor,
      prop.category,
      prop.summary,
      prop.specs.zoning,
      ...prop.highlights,
    ]
      .join(' ')
      .toLowerCase();

    for (const kw of criteria.keywords) {
      if (haystack.includes(kw)) {
        score += 4;
      }
    }

    return { prop, score };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (criteria.preferAffordable) {
      return a.prop.priceInr - b.prop.priceInr;
    }
    return Number(b.prop.featured) - Number(a.prop.featured);
  });

  return scored.slice(0, limit).map((s) => s.prop);
}

/**
 * Sanitizes recommended property IDs against the active catalog so only real existing IDs are returned.
 */
export function filterValidPropertyIds(
  candidateIds: unknown,
  properties: Property[]
): string[] {
  if (!Array.isArray(candidateIds)) return [];
  const validSet = new Set(
    properties
      .filter((p) => p.status === 'Available' || p.status === 'Under Offer')
      .map((p) => p.id)
  );
  const unique: string[] = [];
  for (const id of candidateIds) {
    if (typeof id === 'string' && validSet.has(id) && !unique.includes(id)) {
      unique.push(id);
    }
  }
  return unique.slice(0, 3);
}

/**
 * Formats live inventory and agency contact metadata into a compact context block for Gemini.
 */
export function buildCatalogContext(
  agency: AgencySettings,
  properties: Property[]
): string {
  const active = properties.filter(
    (p) => p.status === 'Available' || p.status === 'Under Offer'
  );

  const lines = active.map((p) => {
    const specs = [
      `Area: ${p.specs.areaSqFt.toLocaleString('en-IN')} sq.ft`,
      `Road: ${p.specs.roadWidthFt} ft`,
      p.specs.clearHeightFt ? `Clear Height: ${p.specs.clearHeightFt} ft` : null,
      p.specs.powerLoadKva ? `Power: ${p.specs.powerLoadKva} kVA` : null,
      `Zoning: ${p.specs.zoning}`,
    ]
      .filter(Boolean)
      .join(', ');

    return `- ID: ${p.id} | Title: ${p.title} | Category: ${p.category} | Transaction: ${p.transactionType} | Status: ${p.status} | Price: ${p.priceDisplay} (${p.priceInr} INR) | Corridor: ${p.corridor} | Specs: ${specs} | Summary: ${p.summary}`;
  });

  return [
    `Agency: ${agency.agencyName} (${agency.categoryLabel})`,
    `Office: ${agency.address}, ${agency.cityStatePin}`,
    `Phone: ${agency.phoneDisplay} | Hours: ${agency.hoursLabel}`,
    `Active Corridors: ${agency.corridors.join(', ')}`,
    `Active Property Catalog (${active.length} listings):`,
    ...lines,
  ].join('\n');
}
