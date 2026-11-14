export type PropertyCategory =
  | 'Warehouse'
  | 'Industrial Plot'
  | 'Factory Shed'
  | 'Commercial';

export type TransactionType = 'For Sale' | 'For Lease';

export type PropertyStatus = 'Available' | 'Under Offer' | 'Leased' | 'Sold';

export type InquiryStatus = 'New' | 'Contacted' | 'Site Visit Scheduled' | 'Closed';

export interface PropertySpecs {
  areaSqFt: number;
  plotDimensions: string;
  clearHeightFt?: number;
  powerLoadKva?: number;
  roadWidthFt: number;
  zoning: string;
}

export interface Property {
  id: string;
  title: string;
  category: PropertyCategory;
  transactionType: TransactionType;
  status: PropertyStatus;
  priceInr: number;
  priceDisplay: string;
  corridor: string;
  address: string;
  summary: string;
  description: string;
  imageUrl: string;
  featured: boolean;
  specs: PropertySpecs;
  highlights: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PropertyInput {
  title: string;
  category: PropertyCategory;
  transactionType: TransactionType;
  status: PropertyStatus;
  priceInr: number;
  corridor: string;
  address: string;
  summary: string;
  description: string;
  imageUrl: string;
  featured: boolean;
  specs: PropertySpecs;
  highlights: string[];
}

export interface Inquiry {
  id: string;
  propertyId: string | null;
  propertyTitle: string;
  name: string;
  phone: string;
  email: string;
  company: string;
  message: string;
  status: InquiryStatus;
  internalNotes: string;
  createdAt: string;
}

export interface InquiryInput {
  propertyId?: string | null;
  propertyTitle?: string;
  name: string;
  phone: string;
  email: string;
  company?: string;
  message: string;
}

export interface AgencyCapability {
  id: string;
  number: string;
  title: string;
  summary: string;
  outcomeMetric: string;
}

export interface AgencyReview {
  id: string;
  author: string;
  company: string;
  rating: number;
  comment: string;
  dateLabel: string;
}

export interface AgencySettings {
  agencyName: string;
  categoryLabel: string;
  tagline: string;
  heroHeadline: string;
  heroSubheadline: string;
  address: string;
  cityStatePin: string;
  phoneDisplay: string;
  phoneHref: string;
  email: string;
  hoursLabel: string;
  googleRating: number;
  reviewCount: number;
  corridors: string[];
  capabilities: AgencyCapability[];
  reviews: AgencyReview[];
}

export interface AdminSessionUser {
  id: string;
  email: string;
  name: string;
  role: 'Owner' | 'Manager';
}

export interface SecurityAuditCheck {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface SecurityAuditReport {
  gitignoreProtected: boolean;
  sessionSecretConfigured: boolean;
  demoCredentialsActive: boolean;
  dataDirRelative: string;
  checks: SecurityAuditCheck[];
}
