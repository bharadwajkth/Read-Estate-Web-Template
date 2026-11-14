import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computePortfolioMetrics,
  filterProperties,
  formatAreaSqFt,
  formatInrPrice,
  validateInquiryInput,
  validatePropertyInput,
} from './propertyUtils';
import type { Property } from '../types';

const sampleProperties: Property[] = [
  {
    id: 'p1',
    title: 'North Logistics Park Grade-A Warehouse',
    category: 'Warehouse',
    transactionType: 'For Lease',
    status: 'Available',
    priceInr: 425000,
    priceDisplay: '₹4.25 L / mo',
    corridor: 'North Logistics Park',
    address: 'Plot 14, Commerce Parkway, Metro City',
    summary: '25,000 sq.ft dock-high logistics hub.',
    description: 'Detailed logistics description.',
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
    id: 'p2',
    title: 'Westgate Industrial Plot',
    category: 'Industrial Plot',
    transactionType: 'For Sale',
    status: 'Under Offer',
    priceInr: 34500000,
    priceDisplay: '₹3.45 Cr',
    corridor: 'Westgate Industrial Zone',
    address: 'Sector 2, Westgate, Metro City',
    summary: '1-acre corner industrial land parcel.',
    description: 'Detailed plot description.',
    imageUrl: '/src/assets/images/generic_industrial_land_1794642466626.jpg',
    featured: false,
    specs: {
      areaSqFt: 43560,
      plotDimensions: '220 ft × 198 ft',
      roadWidthFt: 60,
      zoning: 'Industrial Freehold',
    },
    highlights: ['Corner plot'],
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  },
  {
    id: 'p3',
    title: 'Leased Harbor Shed',
    category: 'Factory Shed',
    transactionType: 'For Lease',
    status: 'Leased',
    priceInr: 180000,
    priceDisplay: '₹1.80 L / mo',
    corridor: 'Harbor Freight Corridor',
    address: 'Phase 1, Harbor Park, Metro City',
    summary: 'Already leased shed.',
    description: 'Leased.',
    imageUrl: '/src/assets/images/generic_manufacturing_shed_1794642468052.jpg',
    featured: false,
    specs: {
      areaSqFt: 12000,
      plotDimensions: '120 ft × 100 ft',
      roadWidthFt: 60,
      zoning: 'Industrial',
    },
    highlights: [],
    createdAt: '2026-01-03T00:00:00.000Z',
    updatedAt: '2026-01-03T00:00:00.000Z',
  },
];

test('formatInrPrice formats lakhs and crores accurately', () => {
  assert.equal(formatInrPrice(425000, 'For Lease'), '₹4.25 L / mo');
  assert.equal(formatInrPrice(34500000, 'For Sale'), '₹3.45 Cr');
  assert.equal(formatInrPrice(20000000, 'For Sale'), '₹2 Cr');
  assert.equal(formatInrPrice(85000, 'For Lease'), '₹85,000 / mo');
});

test('formatAreaSqFt formats Indian locale numbers', () => {
  assert.equal(formatAreaSqFt(25000), '25,000 sq.ft');
  assert.equal(formatAreaSqFt(0), '—');
});

test('filterProperties excludes leased/sold by default and filters by category & query', () => {
  const publicOnly = filterProperties(sampleProperties, {
    search: '',
    category: 'All',
    transactionType: 'All',
    corridor: 'All',
  });
  assert.equal(publicOnly.length, 2);

  const warehouses = filterProperties(sampleProperties, {
    search: 'dock-high',
    category: 'Warehouse',
    transactionType: 'For Lease',
    corridor: 'North Logistics Park',
  });
  assert.equal(warehouses.length, 1);
  assert.equal(warehouses[0].id, 'p1');

  const adminAll = filterProperties(sampleProperties, {
    search: '',
    category: 'All',
    transactionType: 'All',
    corridor: 'All',
    includeUnavailable: true,
  });
  assert.equal(adminAll.length, 3);
});

test('computePortfolioMetrics aggregates available square footage and counts', () => {
  const metrics = computePortfolioMetrics(sampleProperties);
  assert.equal(metrics.totalListings, 3);
  assert.equal(metrics.availableCount, 1);
  assert.equal(metrics.underOfferCount, 1);
  assert.equal(metrics.totalAvailableSqFt, 68560);
  assert.equal(metrics.featuredCount, 1);
});

test('validatePropertyInput enforces required fields and positive numerics', () => {
  const invalid = validatePropertyInput({
    title: 'Ab',
    priceInr: -10,
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.title);
  assert.ok(invalid.errors.priceInr);
  assert.ok(invalid.errors.areaSqFt);

  const valid = validatePropertyInput({
    title: 'Northgate Industrial Shed',
    corridor: 'North Logistics Park',
    address: 'Plot 8, Commerce Parkway, Metro City 400102',
    summary: 'Well-ventilated 12,000 sq.ft PEB shed with 100 kVA power.',
    priceInr: 220000,
    specs: {
      areaSqFt: 12000,
      plotDimensions: '120 ft × 100 ft',
      roadWidthFt: 60,
      zoning: 'Industrial',
    },
  });
  assert.equal(valid.valid, true);
});

test('validateInquiryInput rejects invalid phone/email and accepts valid lead', () => {
  const bad = validateInquiryInput({
    name: 'A',
    phone: '123',
    email: 'not-an-email',
    message: 'Hi',
  });
  assert.equal(bad.valid, false);
  assert.ok(bad.errors.name);
  assert.ok(bad.errors.phone);
  assert.ok(bad.errors.email);
  assert.ok(bad.errors.message);

  const good = validateInquiryInput({
    name: 'Alex Morgan',
    phone: '5550148290',
    email: 'alex@example.com',
    message: 'Need site inspection for North Logistics Park warehouse this Friday.',
  });
  assert.equal(good.valid, true);
});
