import { useMemo, useState, type FormEvent } from 'react';
import {
  ArrowRight,
  Clock,
  MapPin,
  Phone,
  Search,
  Star,
} from 'lucide-react';
import { DEFAULT_HERO_IMAGE } from '../config/agency.config';
import {
  computePortfolioMetrics,
  filterProperties,
  formatAreaSqFt,
  validateInquiryInput,
} from '../lib/propertyUtils';
import type {
  AgencySettings,
  Property,
  PropertyCategory,
  TransactionType,
} from '../types';
import { PropertyDetailModal } from './PropertyDetailModal';
import { PublicHeader } from './PublicHeader';
import { ResilientImage } from './ResilientImage';

interface PublicSiteProps {
  agency: AgencySettings;
  properties: Property[];
  loading: boolean;
  onOpenPortal: () => void;
}

const CATEGORY_OPTIONS: Array<'All' | PropertyCategory> = [
  'All',
  'Warehouse',
  'Industrial Plot',
  'Factory Shed',
  'Commercial',
];

const TRANSACTION_OPTIONS: Array<'All' | TransactionType> = [
  'All',
  'For Lease',
  'For Sale',
];

export function PublicSite({
  agency,
  properties,
  loading,
  onOpenPortal,
}: PublicSiteProps) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'All' | PropertyCategory>('All');
  const [transactionType, setTransactionType] = useState<'All' | TransactionType>('All');
  const [corridor, setCorridor] = useState<string>('All');
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  // Contact / Lead Form state
  const [leadName, setLeadName] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadCompany, setLeadCompany] = useState('');
  const [leadPropertyTitle, setLeadPropertyTitle] = useState('General Industrial Requirement');
  const [leadMessage, setLeadMessage] = useState('');
  const [leadErrors, setLeadErrors] = useState<Record<string, string>>({});
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [leadSubmitError, setLeadSubmitError] = useState('');
  const [leadSubmitted, setLeadSubmitted] = useState(false);

  const metrics = useMemo(() => computePortfolioMetrics(properties), [properties]);

  const filteredProperties = useMemo(
    () =>
      filterProperties(properties, {
        search,
        category,
        transactionType,
        corridor,
      }),
    [properties, search, category, transactionType, corridor]
  );

  function handleSelectCorridor(targetCorridor: string) {
    setCorridor(targetCorridor);
    const el = document.getElementById('properties');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }

  function handleResetFilters() {
    setSearch('');
    setCategory('All');
    setTransactionType('All');
    setCorridor('All');
  }

  async function handleLeadSubmit(e: FormEvent) {
    e.preventDefault();
    const validation = validateInquiryInput({
      name: leadName,
      phone: leadPhone,
      email: leadEmail,
      company: leadCompany,
      propertyTitle: leadPropertyTitle,
      message: leadMessage,
    });

    if (!validation.valid) {
      setLeadErrors(validation.errors);
      return;
    }

    setLeadErrors({});
    setLeadSubmitError('');
    setLeadSubmitting(true);

    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyTitle: leadPropertyTitle,
          name: leadName,
          phone: leadPhone,
          email: leadEmail,
          company: leadCompany,
          message: leadMessage,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLeadSubmitError(data.error || 'Could not submit inquiry.');
        return;
      }
      setLeadSubmitted(true);
      setLeadName('');
      setLeadPhone('');
      setLeadEmail('');
      setLeadCompany('');
      setLeadMessage('');
    } catch {
      setLeadSubmitError('Network error while submitting request.');
    } finally {
      setLeadSubmitting(false);
    }
  }

  return (
    <div id="top" className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <PublicHeader agencyName={agency.agencyName} onOpenPortal={onOpenPortal} />

      <main className="flex-1">
        {/* Hero Split */}
        <section className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
              <div className="lg:col-span-6 flex flex-col justify-center">
                <p className="text-xs font-medium text-slate-500">
                  {agency.categoryLabel}
                  <span aria-hidden="true" className="mx-2">·</span>
                  {agency.cityStatePin}
                </p>

                <h1
                  className="mt-4 font-display font-bold tracking-tight text-slate-950 text-balance"
                  style={{ fontSize: 'clamp(2.25rem, 4vw, 3.35rem)', lineHeight: 1.08 }}
                >
                  {agency.heroHeadline}
                </h1>

                <p className="mt-5 text-base leading-relaxed text-slate-600 max-w-xl">
                  {agency.heroSubheadline}
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <a
                    href="#properties"
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-md transition-colors whitespace-nowrap shrink-0"
                  >
                    Browse Properties
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </a>
                  <a
                    href="#contact"
                    className="inline-flex items-center justify-center px-4 py-3 text-sm font-medium text-slate-700 hover:text-slate-950 border border-slate-300 hover:border-slate-400 bg-white rounded-md transition-colors whitespace-nowrap shrink-0"
                  >
                    Schedule Site Visit
                  </a>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-200 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600">
                  <span className="inline-flex items-center gap-1.5 font-medium text-slate-800">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" aria-hidden="true" />
                    <span className="font-mono tabular-nums">{agency.googleRating.toFixed(1)}</span>
                    Google Rating
                  </span>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span>{agency.address}</span>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span>{agency.hoursLabel}</span>
                </div>
              </div>

              <div className="lg:col-span-6 flex">
                <div className="w-full aspect-[16/9] lg:aspect-auto lg:h-full min-h-[280px] rounded-lg overflow-hidden border border-slate-200 bg-slate-900">
                  <ResilientImage
                    src={DEFAULT_HERO_IMAGE}
                    alt="Modern industrial distribution park and commercial warehouse complex"
                    fallbackTitle={agency.agencyName}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>

            {/* Full-width 4-column industrial market metrics bar */}
            <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 border border-slate-200 rounded-lg bg-slate-50/70 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
              <div className="p-5">
                <p className="text-xs text-slate-500">Active Industrial Listings</p>
                <p className="mt-1 font-mono tabular-nums text-2xl font-semibold text-slate-900">
                  {metrics.availableCount + metrics.underOfferCount}
                </p>
              </div>
              <div className="p-5">
                <p className="text-xs text-slate-500">Available Floor &amp; Plot Area</p>
                <p className="mt-1 font-mono tabular-nums text-2xl font-semibold text-slate-900">
                  {metrics.totalAvailableSqFt.toLocaleString('en-IN')} sq.ft
                </p>
              </div>
              <div className="p-5">
                <p className="text-xs text-slate-500">Client Rating</p>
                <p className="mt-1 font-mono tabular-nums text-2xl font-semibold text-slate-900">
                  {agency.googleRating.toFixed(1)} / 5.0
                </p>
              </div>
              <div className="p-5">
                <p className="text-xs text-slate-500">Direct Agency Desk</p>
                <p className="mt-1 font-mono tabular-nums text-xl font-semibold text-slate-900">
                  {agency.phoneDisplay}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Property Portfolio Section */}
        <section id="properties" className="py-16 lg:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-slate-200">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-950 tracking-tight">
                  Verified Property Portfolio
                </h2>
                <p className="mt-2 text-sm text-slate-600 max-w-2xl">
                  Filter industrial warehouses, zoned industrial plots, factory sheds, and commercial spaces by corridor and transaction type.
                </p>
              </div>
              <p className="font-mono tabular-nums text-xs text-slate-500 shrink-0">
                Showing {filteredProperties.length} of {properties.length} properties
              </p>
            </div>

            {/* Filter Toolbar */}
            <div className="mt-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-md w-fit">
                {CATEGORY_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setCategory(opt)}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      category === opt
                        ? 'bg-white text-slate-950 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-md">
                  {TRANSACTION_OPTIONS.map((tx) => (
                    <button
                      key={tx}
                      type="button"
                      onClick={() => setTransactionType(tx)}
                      className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        transactionType === tx
                          ? 'bg-white text-slate-950 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {tx}
                    </button>
                  ))}
                </div>

                <div>
                  <label htmlFor="corridor-filter" className="sr-only">
                    Filter by corridor
                  </label>
                  <select
                    id="corridor-filter"
                    value={corridor}
                    onChange={(e) => setCorridor(e.target.value)}
                    className="px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-md text-slate-700 focus:outline-none focus:border-sky-700"
                  >
                    <option value="All">All Corridors</option>
                    {agency.corridors.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="relative flex-1 sm:flex-initial min-w-[220px]">
                  <Search
                    className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <label htmlFor="property-search" className="sr-only">
                    Search properties
                  </label>
                  <input
                    id="property-search"
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search corridor, zoning, title..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-700"
                  />
                </div>
              </div>
            </div>

            {/* Property Grid */}
            {loading ? (
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((idx) => (
                  <div
                    key={idx}
                    className="bg-white border border-slate-200 rounded-lg overflow-hidden animate-pulse"
                  >
                    <div className="aspect-[4/3] bg-slate-200" />
                    <div className="p-5 space-y-3">
                      <div className="h-3 w-1/2 bg-slate-200 rounded" />
                      <div className="h-5 w-3/4 bg-slate-200 rounded" />
                      <div className="h-4 w-full bg-slate-100 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredProperties.length === 0 ? (
              <div className="mt-10 bg-white border border-slate-200 rounded-lg p-10 text-center">
                <h3 className="text-base font-semibold text-slate-900">
                  No matching industrial or commercial properties
                </h3>
                <p className="mt-1.5 text-sm text-slate-600 max-w-md mx-auto">
                  Adjust your corridor, category, or search filters—or submit a custom space requirement below.
                </p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div
                data-testid="property-grid"
                className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {filteredProperties.map((prop) => (
                  <article
                    key={prop.id}
                    className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col justify-between transition-colors hover:border-slate-300"
                  >
                    <div>
                      <div className="aspect-[4/3] bg-slate-100 border-b border-slate-200 overflow-hidden">
                        <ResilientImage
                          src={prop.imageUrl}
                          alt={prop.title}
                          fallbackTitle={prop.title}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="p-5">
                        <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                          <div className="flex items-center gap-1.5 truncate">
                            <span>{prop.category}</span>
                            <span aria-hidden="true">·</span>
                            <span>{prop.transactionType}</span>
                            <span aria-hidden="true">·</span>
                            <span className="truncate">{prop.corridor}</span>
                          </div>
                          {prop.status === 'Under Offer' && (
                            <span className="text-amber-700 font-medium shrink-0">
                              Under Offer
                            </span>
                          )}
                        </div>

                        <h3 className="mt-2 text-lg font-semibold text-slate-950 leading-snug">
                          {prop.title}
                        </h3>

                        <p className="mt-2 text-sm text-slate-600 line-clamp-2 leading-relaxed">
                          {prop.summary}
                        </p>

                        <dl className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <dt className="text-slate-500">Area</dt>
                            <dd className="font-mono tabular-nums font-medium text-slate-900 mt-0.5">
                              {formatAreaSqFt(prop.specs.areaSqFt)}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-slate-500">Road Width</dt>
                            <dd className="font-mono tabular-nums font-medium text-slate-900 mt-0.5">
                              {prop.specs.roadWidthFt} ft
                            </dd>
                          </div>
                          <div>
                            <dt className="text-slate-500">
                              {prop.specs.clearHeightFt ? 'Clear Ht' : 'Power'}
                            </dt>
                            <dd className="font-mono tabular-nums font-medium text-slate-900 mt-0.5">
                              {prop.specs.clearHeightFt
                                ? `${prop.specs.clearHeightFt} ft`
                                : prop.specs.powerLoadKva
                                  ? `${prop.specs.powerLoadKva} kVA`
                                  : 'Ready'}
                            </dd>
                          </div>
                        </dl>
                      </div>
                    </div>

                    <div className="px-5 py-4 border-t border-slate-200 bg-slate-50/60 flex items-center justify-between gap-3">
                      <span className="font-mono tabular-nums text-base font-semibold text-slate-950">
                        {prop.priceDisplay}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedProperty(prop)}
                        className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-sky-700 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Inspect Property
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Core Capabilities Bento */}
        <section id="capabilities" className="py-16 lg:py-20 bg-white border-y border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-950 tracking-tight">
                Industrial Brokerage &amp; Advisory Capabilities
              </h2>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Structured site acquisition, statutory diligence, and long-term lease execution across industrial and commercial belts.
              </p>
            </div>

            <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
              {agency.capabilities.map((cap, index) => {
                const isWide = index === 0 || index === 3;
                return (
                  <div
                    key={cap.id}
                    className={`${
                      isWide ? 'lg:col-span-2' : 'lg:col-span-1'
                    } p-6 sm:p-8 bg-slate-50 border border-slate-200 rounded-lg flex flex-col justify-between`}
                  >
                    <div>
                      <span className="font-mono text-xs font-medium text-sky-700">
                        {cap.number}
                      </span>
                      <h3 className="mt-2 text-xl font-semibold text-slate-950">
                        {cap.title}
                      </h3>
                      <p className="mt-3 text-sm text-slate-600 leading-relaxed max-w-2xl">
                        {cap.summary}
                      </p>
                    </div>
                    <p className="mt-6 pt-4 border-t border-slate-200 text-xs font-medium text-slate-700">
                      {cap.outcomeMetric}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Agency Location, Corridors & Google Review Proof */}
        <section id="agency" className="py-16 lg:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-6 sm:p-8 flex flex-col justify-between">
                <div>
                  <p className="text-xs font-medium text-sky-700">
                    Agency Office &amp; Coverage Corridors
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-slate-950 tracking-tight">
                    Visit {agency.agencyName}
                  </h2>
                  <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                    Consult directly with our brokerage desk for verified title documentation, highway-adjacent logistics parcels, and scheduled property walkthroughs.
                  </p>

                  <dl className="mt-6 space-y-4 text-sm border-t border-slate-200 pt-6">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" aria-hidden="true" />
                      <div>
                        <dt className="text-xs text-slate-500">Office Address</dt>
                        <dd className="font-medium text-slate-900">
                          {agency.address}, {agency.cityStatePin}
                        </dd>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Phone className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" aria-hidden="true" />
                      <div>
                        <dt className="text-xs text-slate-500">Telephone</dt>
                        <dd>
                          <a
                            href={`tel:${agency.phoneHref}`}
                            className="font-mono font-medium text-slate-900 hover:text-sky-700"
                          >
                            {agency.phoneDisplay}
                          </a>
                        </dd>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Clock className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" aria-hidden="true" />
                      <div>
                        <dt className="text-xs text-slate-500">Business Hours</dt>
                        <dd className="font-medium text-slate-900">{agency.hoursLabel}</dd>
                      </div>
                    </div>
                  </dl>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-200">
                  <p className="text-xs font-medium text-slate-500 mb-3">
                    Filter Portfolio by Active Industrial Corridor
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {agency.corridors.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => handleSelectCorridor(c)}
                        className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer whitespace-nowrap"
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 bg-slate-900 text-slate-100 border border-slate-800 rounded-lg p-6 sm:p-8 flex flex-col justify-between">
                <div>
                  <p className="text-xs font-medium text-sky-400">
                    Google Review Summary
                  </p>
                  <div className="mt-4 flex items-baseline gap-4">
                    <span className="font-mono tabular-nums text-5xl font-bold text-white">
                      {agency.googleRating.toFixed(1)}
                    </span>
                    <div>
                      <div className="flex items-center gap-1" aria-label="5 out of 5 stars">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className="w-4 h-4 fill-amber-400 text-amber-400"
                            aria-hidden="true"
                          />
                        ))}
                      </div>
                      <p className="mt-1 text-xs text-slate-400 font-mono tabular-nums">
                        Based on {agency.reviewCount} verified{' '}
                        {agency.reviewCount === 1 ? 'review' : 'reviews'}
                      </p>
                    </div>
                  </div>

                  {/* Rating Breakdown Bars */}
                  <div className="mt-6 space-y-2 text-xs">
                    {[5, 4, 3, 2, 1].map((score) => (
                      <div key={score} className="flex items-center gap-3">
                        <span className="w-4 font-mono tabular-nums text-slate-400">
                          {score}
                        </span>
                        <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              score === 5 ? 'bg-amber-400 w-full' : 'w-0'
                            }`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {agency.reviews[0] && (
                  <blockquote className="mt-8 pt-6 border-t border-slate-800">
                    <p className="text-sm leading-relaxed text-slate-200">
                      “{agency.reviews[0].comment}”
                    </p>
                    <footer className="mt-3 text-xs text-slate-400">
                      {agency.reviews[0].author} · {agency.reviews[0].company}
                    </footer>
                  </blockquote>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Lead Capture & Site Visit Form */}
        <section id="contact" className="py-16 lg:py-20 bg-white border-t border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-5">
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-950 tracking-tight">
                  Request a Site Inspection or Custom Sourcing
                </h2>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                  Share your square-footage, power load, or highway access requirements. Our commercial desk responds with verified floorplans and scheduled site visits.
                </p>

                <div className="mt-8 pt-6 border-t border-slate-200 space-y-3 text-sm text-slate-700">
                  <p>
                    <span className="text-xs text-slate-500 block">Direct Line</span>
                    <a
                      href={`tel:${agency.phoneHref}`}
                      className="font-mono font-semibold text-slate-950 hover:text-sky-700"
                    >
                      {agency.phoneDisplay}
                    </a>
                  </p>
                  <p>
                    <span className="text-xs text-slate-500 block">Office Hours</span>
                    <span className="font-medium">{agency.hoursLabel}</span>
                  </p>
                </div>
              </div>

              <div className="lg:col-span-7">
                {leadSubmitted ? (
                  <div
                    className="p-8 bg-slate-50 border border-emerald-200 rounded-lg"
                    role="status"
                  >
                    <h3 className="text-lg font-semibold text-emerald-900">
                      Inquiry Received
                    </h3>
                    <p className="mt-2 text-sm text-slate-700 leading-relaxed">
                      Your requirement has been recorded in our brokerage desk queue. A property specialist will contact you shortly.
                    </p>
                    <button
                      type="button"
                      onClick={() => setLeadSubmitted(false)}
                      className="mt-5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md cursor-pointer"
                    >
                      Submit Another Inquiry
                    </button>
                  </div>
                ) : (
                  <form
                    onSubmit={handleLeadSubmit}
                    noValidate
                    className="p-6 sm:p-8 bg-slate-50 border border-slate-200 rounded-lg space-y-4"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="lead-name"
                          className="block text-xs font-medium text-slate-700 mb-1"
                        >
                          Full Name
                        </label>
                        <input
                          id="lead-name"
                          type="text"
                          value={leadName}
                          onChange={(e) => setLeadName(e.target.value)}
                          placeholder="Alex Morgan"
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-sky-700"
                        />
                        {leadErrors.name && (
                          <p className="mt-1 text-xs text-red-700">{leadErrors.name}</p>
                        )}
                      </div>

                      <div>
                        <label
                          htmlFor="lead-phone"
                          className="block text-xs font-medium text-slate-700 mb-1"
                        >
                          Phone Number
                        </label>
                        <input
                          id="lead-phone"
                          type="tel"
                          value={leadPhone}
                          onChange={(e) => setLeadPhone(e.target.value)}
                          placeholder="(555) 014-8290"
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-sky-700"
                        />
                        {leadErrors.phone && (
                          <p className="mt-1 text-xs text-red-700">{leadErrors.phone}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="lead-email"
                          className="block text-xs font-medium text-slate-700 mb-1"
                        >
                          Email Address
                        </label>
                        <input
                          id="lead-email"
                          type="email"
                          value={leadEmail}
                          onChange={(e) => setLeadEmail(e.target.value)}
                          placeholder="alex@enterprise.example"
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-sky-700"
                        />
                        {leadErrors.email && (
                          <p className="mt-1 text-xs text-red-700">{leadErrors.email}</p>
                        )}
                      </div>

                      <div>
                        <label
                          htmlFor="lead-company"
                          className="block text-xs font-medium text-slate-700 mb-1"
                        >
                          Company (Optional)
                        </label>
                        <input
                          id="lead-company"
                          type="text"
                          value={leadCompany}
                          onChange={(e) => setLeadCompany(e.target.value)}
                          placeholder="Northgate Logistics Co."
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-sky-700"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="lead-property"
                        className="block text-xs font-medium text-slate-700 mb-1"
                      >
                        Property or Category of Interest
                      </label>
                      <select
                        id="lead-property"
                        value={leadPropertyTitle}
                        onChange={(e) => setLeadPropertyTitle(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-sky-700"
                      >
                        <option value="General Industrial Requirement">
                          General Industrial Requirement
                        </option>
                        {properties.map((p) => (
                          <option key={p.id} value={p.title}>
                            {p.title} ({p.corridor})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="lead-message"
                        className="block text-xs font-medium text-slate-700 mb-1"
                      >
                        Space &amp; Operational Requirements
                      </label>
                      <textarea
                        id="lead-message"
                        rows={4}
                        value={leadMessage}
                        onChange={(e) => setLeadMessage(e.target.value)}
                        placeholder="Describe required area in sq.ft, power kVA, dock bays, or target move-in date..."
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-sky-700"
                      />
                      {leadErrors.message && (
                        <p className="mt-1 text-xs text-red-700">{leadErrors.message}</p>
                      )}
                    </div>

                    {leadSubmitError && (
                      <p className="text-xs text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-md">
                        {leadSubmitError}
                      </p>
                    )}

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={leadSubmitting}
                        className="px-6 py-2.5 text-sm font-semibold text-white bg-sky-700 hover:bg-sky-800 disabled:opacity-60 rounded-md transition-colors cursor-pointer"
                      >
                        {leadSubmitting ? 'Sending Inquiry...' : 'Submit Inquiry'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="bg-slate-950 text-slate-400 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <p className="font-display text-base font-semibold text-white">
              {agency.agencyName}
            </p>
            <p className="mt-1 text-xs">
              {agency.address}, {agency.cityStatePin} · {agency.phoneDisplay}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs">
            <a href="#properties" className="hover:text-white transition-colors">
              Properties
            </a>
            <a href="#capabilities" className="hover:text-white transition-colors">
              Capabilities
            </a>
            <a href="#agency" className="hover:text-white transition-colors">
              Agency
            </a>
            <a href="#contact" className="hover:text-white transition-colors">
              Contact
            </a>
            <button
              type="button"
              onClick={onOpenPortal}
              className="text-slate-200 hover:text-white font-medium cursor-pointer"
            >
              Agent Portal
            </button>
          </div>
        </div>
      </footer>

      <PropertyDetailModal
        property={selectedProperty}
        agency={agency}
        onClose={() => setSelectedProperty(null)}
      />
    </div>
  );
}
