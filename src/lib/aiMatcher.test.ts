import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_AGENCY_SETTINGS } from '../config/agency.config';
import type { Property } from '../types';
import {
  buildCatalogContext,
  filterValidPropertyIds,
  parseQueryCriteria,
  rankSuitableProperties,
} from './aiMatcher';

const testCatalog: Property[] = [
  {
    id: 'prop-1',
    title: 'North Logistics Grade-A Warehouse',
    category: 'Warehouse',
    transactionType: 'For Lease',
    status: 'Available',
    priceInr: 425000,
    priceDisplay: '₹4.25 L / mo',
    corridor: 'North Logistics Park',
    address: 'Plot 14, Commerce Parkway',
    summary: '25,000 sq.ft dock-high logistics hub.',
    description: 'Details',
    imageUrl: '/src/assets/images/generic_warehouse_bays_1794642467180.jpg',
    featured: true,
    specs: {
      areaSqFt: 25000,
      plotDimensions: '250 ft × 100 ft',
      clearHeightFt: 32,
      powerLoadKva: 120,
      roadWidthFt: 80,
      zoning: 'Industrial',
    },
    highlights: ['6 docks'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'prop-2',
    title: 'Midtown Commerce Corner Complex',
    category: 'Commercial',
    transactionType: 'For Lease',
    status: 'Available',
    priceInr: 185000,
    priceDisplay: '₹1.85 L / mo',
    corridor: 'Midtown Commerce Belt',
    address: '1400 Main Boulevard',
    summary: '6,800 sq.ft showroom and office space.',
    description: 'Details',
    imageUrl: '/src/assets/images/generic_commercial_office_1794642468025.jpg',
    featured: false,
    specs: {
      areaSqFt: 6800,
      plotDimensions: '85 ft × 80 ft',
      clearHeightFt: 14,
      powerLoadKva: 65,
      roadWidthFt: 100,
      zoning: 'Commercial',
    },
    highlights: ['Main road'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'prop-3',
    title: 'Westgate Corner Industrial Land Parcel',
    category: 'Industrial Plot',
    transactionType: 'For Sale',
    status: 'Available',
    priceInr: 34500000,
    priceDisplay: '₹3.45 Cr',
    corridor: 'Westgate Industrial Zone',
    address: 'Sector II, Westgate',
    summary: '1 Acre industrial land parcel.',
    description: 'Details',
    imageUrl: '/src/assets/images/generic_industrial_land_1794642466626.jpg',
    featured: true,
    specs: {
      areaSqFt: 43560,
      plotDimensions: '220 ft × 198 ft',
      powerLoadKva: 250,
      roadWidthFt: 60,
      zoning: 'Industrial Freehold',
    },
    highlights: ['250 kVA nearby'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'prop-4',
    title: 'Archived Sold Shed',
    category: 'Factory Shed',
    transactionType: 'For Sale',
    status: 'Sold',
    priceInr: 12000000,
    priceDisplay: '₹1.20 Cr',
    corridor: 'Harbor Freight Corridor',
    address: 'Phase I',
    summary: 'Sold unit.',
    description: 'Sold.',
    imageUrl: '/src/assets/images/generic_manufacturing_shed_1794642468052.jpg',
    featured: false,
    specs: {
      areaSqFt: 9000,
      plotDimensions: '100 ft × 90 ft',
      roadWidthFt: 45,
      zoning: 'Industrial',
    },
    highlights: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

test('parseQueryCriteria detects budgets in lakhs/crores, categories, and lease/sale intent', () => {
  const q1 = parseQueryCriteria('Find an affordable warehouse for lease under 3 lakh');
  assert.equal(q1.preferAffordable, true);
  assert.equal(q1.category, 'Warehouse');
  assert.equal(q1.transactionType, 'For Lease');
  assert.equal(q1.maxBudgetInr, 300000);

  const q2 = parseQueryCriteria('Industrial plot for buy under 4 Cr with 200 kVA');
  assert.equal(q2.category, 'Industrial Plot');
  assert.equal(q2.transactionType, 'For Sale');
  assert.equal(q2.maxBudgetInr, 40000000);
  assert.equal(q2.minPowerKva, 200);
});

test('rankSuitableProperties ranks affordable matching properties and excludes Sold listings', () => {
  const leaseAffordable = rankSuitableProperties(
    testCatalog,
    'Most affordable property for lease under 2.5 lakh',
    3
  );
  assert.equal(leaseAffordable[0].id, 'prop-2');
  assert.ok(leaseAffordable.every((p) => p.status !== 'Sold'));

  const plotMatch = rankSuitableProperties(
    testCatalog,
    'Looking for industrial land plot for sale with 200+ kVA power',
    2
  );
  assert.equal(plotMatch[0].id, 'prop-3');
});

test('filterValidPropertyIds strips hallucinated or sold IDs', () => {
  const valid = filterValidPropertyIds(
    ['prop-2', 'prop-4', 'fake-999', 'prop-1', 'prop-3'],
    testCatalog
  );
  assert.deepEqual(valid, ['prop-2', 'prop-1', 'prop-3']);
});

test('buildCatalogContext includes active properties and excludes sold items', () => {
  const ctx = buildCatalogContext(DEFAULT_AGENCY_SETTINGS, testCatalog);
  assert.ok(ctx.includes('Meridian Industrial Realty'));
  assert.ok(ctx.includes('prop-1'));
  assert.equal(ctx.includes('Archived Sold Shed'), false);
});
