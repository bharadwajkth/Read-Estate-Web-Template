import { useEffect, useState, type FormEvent } from 'react';
import { Check, MapPin, Phone, X } from 'lucide-react';
import { formatAreaSqFt, validateInquiryInput } from '../lib/propertyUtils';
import type { AgencySettings, Property } from '../types';
import { ResilientImage } from './ResilientImage';

interface PropertyDetailModalProps {
  property: Property | null;
  agency: AgencySettings;
  onClose: () => void;
}

export function PropertyDetailModal({
  property,
  agency,
  onClose,
}: PropertyDetailModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!property) return;
    setName('');
    setPhone('');
    setEmail('');
    setCompany('');
    setMessage(
      `Requesting site inspection and floorplan details for ${property.title}.`
    );
    setErrors({});
    setSubmitError('');
    setSubmitted(false);
  }, [property]);

  useEffect(() => {
    if (!property) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [property, onClose]);

  if (!property) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!property) return;

    const validation = validateInquiryInput({
      propertyId: property.id,
      propertyTitle: property.title,
      name,
      phone,
      email,
      company,
      message,
    });

    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    setSubmitError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: property.id,
          propertyTitle: property.title,
          name,
          phone,
          email,
          company,
          message,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || 'Could not submit inquiry. Please try again.');
        return;
      }
      setSubmitted(true);
    } catch {
      setSubmitError('Network error while sending request. Please call our office directly.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="property-modal-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span>{property.category}</span>
            <span aria-hidden="true">·</span>
            <span>{property.transactionType}</span>
            <span aria-hidden="true">·</span>
            <span>{property.corridor}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${property.title} details`}
            className="inline-flex items-center justify-center w-9 h-9 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12">
          <div className="lg:col-span-7 p-6 space-y-6 border-b lg:border-b-0 lg:border-r border-slate-200">
            <div className="aspect-[4/3] rounded-md overflow-hidden border border-slate-200 bg-slate-100">
              <ResilientImage
                src={property.imageUrl}
                alt={property.title}
                fallbackTitle={property.title}
              />
            </div>

            <div>
              <div className="flex flex-wrap items-baseline justify-between gap-4">
                <h2
                  id="property-modal-title"
                  className="text-2xl font-bold text-slate-900 tracking-[-0.01em]"
                >
                  {property.title}
                </h2>
                <span className="font-mono tabular-nums text-xl font-semibold text-sky-700">
                  {property.priceDisplay}
                </span>
              </div>
              <p className="mt-2 flex items-start gap-2 text-sm text-slate-600">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{property.address}</span>
              </p>
              <p className="mt-4 text-sm leading-relaxed text-slate-700">
                {property.description}
              </p>
            </div>

            <div className="border-t border-slate-200 pt-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">
                Technical Specifications
              </h3>
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <dt className="text-xs text-slate-500">Built-up / Plot Area</dt>
                  <dd className="font-mono tabular-nums font-medium text-slate-900 mt-0.5">
                    {formatAreaSqFt(property.specs.areaSqFt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Dimensions</dt>
                  <dd className="font-mono tabular-nums font-medium text-slate-900 mt-0.5">
                    {property.specs.plotDimensions || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Road Frontage</dt>
                  <dd className="font-mono tabular-nums font-medium text-slate-900 mt-0.5">
                    {property.specs.roadWidthFt} ft wide
                  </dd>
                </div>
                {property.specs.clearHeightFt ? (
                  <div>
                    <dt className="text-xs text-slate-500">Clear Height</dt>
                    <dd className="font-mono tabular-nums font-medium text-slate-900 mt-0.5">
                      {property.specs.clearHeightFt} ft
                    </dd>
                  </div>
                ) : null}
                {property.specs.powerLoadKva ? (
                  <div>
                    <dt className="text-xs text-slate-500">Power Sanction</dt>
                    <dd className="font-mono tabular-nums font-medium text-slate-900 mt-0.5">
                      {property.specs.powerLoadKva} kVA
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-xs text-slate-500">Zoning Classification</dt>
                  <dd className="font-medium text-slate-900 mt-0.5">
                    {property.specs.zoning}
                  </dd>
                </div>
              </dl>
            </div>

            {property.highlights.length > 0 && (
              <div className="border-t border-slate-200 pt-5">
                <h3 className="text-sm font-semibold text-slate-900 mb-2.5">
                  Site Highlights
                </h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-700">
                  {property.highlights.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <Check
                        className="w-4 h-4 text-sky-700 shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="lg:col-span-5 p-6 bg-slate-50/70 flex flex-col justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Schedule Site Inspection
              </h3>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                Submit your contact details to arrange an accompanied walkthrough or request title documentation.
              </p>

              {submitted ? (
                <div
                  className="mt-6 p-5 bg-white border border-emerald-200 rounded-md"
                  role="status"
                >
                  <p className="text-sm font-semibold text-emerald-800">
                    Inspection Request Logged
                  </p>
                  <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                    Thank you, {name}. Our commercial advisory desk will reach out on{' '}
                    <span className="font-mono">{phone}</span> shortly.
                  </p>
                  <button
                    type="button"
                    onClick={onClose}
                    className="mt-4 w-full py-2 px-4 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md cursor-pointer"
                  >
                    Return to Portfolio
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="mt-5 space-y-3.5" noValidate>
                  <div>
                    <label
                      htmlFor="modal-inq-name"
                      className="block text-xs font-medium text-slate-700 mb-1"
                    >
                      Full Name
                    </label>
                    <input
                      id="modal-inq-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Alex Morgan"
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-sky-700"
                    />
                    {errors.name && (
                      <p className="mt-1 text-xs text-red-700">{errors.name}</p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="modal-inq-phone"
                      className="block text-xs font-medium text-slate-700 mb-1"
                    >
                      Phone Number
                    </label>
                    <input
                      id="modal-inq-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(555) 019-4820"
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-sky-700"
                    />
                    {errors.phone && (
                      <p className="mt-1 text-xs text-red-700">{errors.phone}</p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="modal-inq-email"
                      className="block text-xs font-medium text-slate-700 mb-1"
                    >
                      Email Address
                    </label>
                    <input
                      id="modal-inq-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="operations@company.in"
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-sky-700"
                    />
                    {errors.email && (
                      <p className="mt-1 text-xs text-red-700">{errors.email}</p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="modal-inq-company"
                      className="block text-xs font-medium text-slate-700 mb-1"
                    >
                      Company / Organization (Optional)
                    </label>
                    <input
                      id="modal-inq-company"
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="Deccan Logistics Pvt. Ltd."
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-sky-700"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="modal-inq-message"
                      className="block text-xs font-medium text-slate-700 mb-1"
                    >
                      Requirements &amp; Preferred Visit Time
                    </label>
                    <textarea
                      id="modal-inq-message"
                      rows={3}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-sky-700"
                    />
                    {errors.message && (
                      <p className="mt-1 text-xs text-red-700">{errors.message}</p>
                    )}
                  </div>

                  {submitError && (
                    <p className="text-xs text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-md">
                      {submitError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-sky-700 hover:bg-sky-800 disabled:opacity-60 rounded-md transition-colors cursor-pointer"
                  >
                    {submitting ? 'Submitting Request...' : 'Request Site Inspection'}
                  </button>
                </form>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200 text-xs text-slate-600 flex items-center justify-between gap-3">
              <span>Direct Agency Desk</span>
              <a
                href={`tel:${agency.phoneHref}`}
                className="inline-flex items-center gap-1.5 font-mono font-medium text-slate-900 hover:text-sky-700"
              >
                <Phone className="w-3.5 h-3.5" aria-hidden="true" />
                {agency.phoneDisplay}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
