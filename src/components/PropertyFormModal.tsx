import { useEffect, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { TEMPLATE_PROPERTY_IMAGES } from '../config/agency.config';
import { formatInrPrice, validatePropertyInput } from '../lib/propertyUtils';
import type {
  Property,
  PropertyCategory,
  PropertyInput,
  PropertyStatus,
  TransactionType,
} from '../types';

interface PropertyFormModalProps {
  open: boolean;
  editingProperty: Property | null;
  corridors: string[];
  onClose: () => void;
  onSave: (payload: PropertyInput, existingId?: string) => Promise<void>;
}

const IMAGE_PRESETS = [
  { label: 'Logistics Warehouse', url: TEMPLATE_PROPERTY_IMAGES.warehouse },
  { label: 'Zoned Industrial Plot', url: TEMPLATE_PROPERTY_IMAGES.plot },
  { label: 'Factory Shed (PEB)', url: TEMPLATE_PROPERTY_IMAGES.shed },
  { label: 'Commercial Showroom', url: TEMPLATE_PROPERTY_IMAGES.commercial },
];

export function PropertyFormModal({
  open,
  editingProperty,
  corridors,
  onClose,
  onSave,
}: PropertyFormModalProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<PropertyCategory>('Warehouse');
  const [transactionType, setTransactionType] = useState<TransactionType>('For Lease');
  const [status, setStatus] = useState<PropertyStatus>('Available');
  const [priceInr, setPriceInr] = useState('250000');
  const [corridor, setCorridor] = useState(corridors[0] || 'North Logistics Park');
  const [address, setAddress] = useState('');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState(TEMPLATE_PROPERTY_IMAGES.warehouse);
  const [featured, setFeatured] = useState(false);

  const [areaSqFt, setAreaSqFt] = useState('15000');
  const [plotDimensions, setPlotDimensions] = useState('150 ft × 100 ft');
  const [clearHeightFt, setClearHeightFt] = useState('30');
  const [powerLoadKva, setPowerLoadKva] = useState('100');
  const [roadWidthFt, setRoadWidthFt] = useState('60');
  const [zoning, setZoning] = useState('Industrial / Logistics Approved');
  const [highlightsText, setHighlightsText] = useState(
    'Clear transferable title\nDirect arterial road access'
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    if (!open) return;

    if (editingProperty) {
      setTitle(editingProperty.title);
      setCategory(editingProperty.category);
      setTransactionType(editingProperty.transactionType);
      setStatus(editingProperty.status);
      setPriceInr(String(editingProperty.priceInr));
      setCorridor(editingProperty.corridor);
      setAddress(editingProperty.address);
      setSummary(editingProperty.summary);
      setDescription(editingProperty.description);
      setImageUrl(editingProperty.imageUrl);
      setFeatured(editingProperty.featured);
      setAreaSqFt(String(editingProperty.specs.areaSqFt));
      setPlotDimensions(editingProperty.specs.plotDimensions);
      setClearHeightFt(
        editingProperty.specs.clearHeightFt
          ? String(editingProperty.specs.clearHeightFt)
          : ''
      );
      setPowerLoadKva(
        editingProperty.specs.powerLoadKva
          ? String(editingProperty.specs.powerLoadKva)
          : ''
      );
      setRoadWidthFt(String(editingProperty.specs.roadWidthFt));
      setZoning(editingProperty.specs.zoning);
      setHighlightsText(editingProperty.highlights.join('\n'));
    } else {
      setTitle('');
      setCategory('Warehouse');
      setTransactionType('For Lease');
      setStatus('Available');
      setPriceInr('250000');
      setCorridor(corridors[0] || 'North Logistics Park');
      setAddress('');
      setSummary('');
      setDescription('');
      setImageUrl(TEMPLATE_PROPERTY_IMAGES.warehouse);
      setFeatured(false);
      setAreaSqFt('15000');
      setPlotDimensions('150 ft × 100 ft');
      setClearHeightFt('30');
      setPowerLoadKva('100');
      setRoadWidthFt('60');
      setZoning('Industrial / Logistics Approved');
      setHighlightsText('Clear transferable title\nDirect arterial road access');
    }
    setErrors({});
    setServerError('');
  }, [open, editingProperty, corridors]);

  if (!open) return null;

  const parsedPrice = Number(priceInr);
  const formattedPreview = formatInrPrice(parsedPrice, transactionType);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const payload: PropertyInput = {
      title: title.trim(),
      category,
      transactionType,
      status,
      priceInr: Number(priceInr),
      corridor: corridor.trim(),
      address: address.trim(),
      summary: summary.trim(),
      description: description.trim() || summary.trim(),
      imageUrl: imageUrl.trim() || TEMPLATE_PROPERTY_IMAGES.warehouse,
      featured,
      specs: {
        areaSqFt: Number(areaSqFt),
        plotDimensions: plotDimensions.trim() || 'Standard Industrial',
        clearHeightFt: clearHeightFt ? Number(clearHeightFt) : undefined,
        powerLoadKva: powerLoadKva ? Number(powerLoadKva) : undefined,
        roadWidthFt: Number(roadWidthFt),
        zoning: zoning.trim() || 'Industrial',
      },
      highlights: highlightsText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
    };

    const validation = validatePropertyInput(payload);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    setServerError('');
    setSaving(true);
    try {
      await onSave(payload, editingProperty?.id);
      onClose();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Failed to save property.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="property-form-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h2 id="property-form-title" className="text-base font-semibold text-slate-950">
            {editingProperty ? 'Edit Property Listing' : 'Add New Property Listing'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close property form"
            className="w-9 h-9 inline-flex items-center justify-center rounded-md text-slate-600 hover:bg-slate-200/70 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="prop-title" className="block text-xs font-medium text-slate-700 mb-1">
                Property Title
              </label>
              <input
                id="prop-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. North Logistics Park Distribution Bay"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-sky-700"
              />
              {errors.title && <p className="mt-1 text-xs text-red-700">{errors.title}</p>}
            </div>

            <div>
              <label htmlFor="prop-category" className="block text-xs font-medium text-slate-700 mb-1">
                Category
              </label>
              <select
                id="prop-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as PropertyCategory)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-sky-700"
              >
                <option value="Warehouse">Warehouse</option>
                <option value="Industrial Plot">Industrial Plot</option>
                <option value="Factory Shed">Factory Shed</option>
                <option value="Commercial">Commercial</option>
              </select>
            </div>

            <div>
              <label htmlFor="prop-tx" className="block text-xs font-medium text-slate-700 mb-1">
                Transaction Type
              </label>
              <select
                id="prop-tx"
                value={transactionType}
                onChange={(e) => setTransactionType(e.target.value as TransactionType)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-sky-700"
              >
                <option value="For Lease">For Lease</option>
                <option value="For Sale">For Sale</option>
              </select>
            </div>

            <div>
              <label htmlFor="prop-price" className="block text-xs font-medium text-slate-700 mb-1">
                Price in INR ({formattedPreview})
              </label>
              <input
                id="prop-price"
                type="number"
                min="1"
                value={priceInr}
                onChange={(e) => setPriceInr(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md focus:outline-none focus:border-sky-700"
              />
              {errors.priceInr && <p className="mt-1 text-xs text-red-700">{errors.priceInr}</p>}
            </div>

            <div>
              <label htmlFor="prop-status" className="block text-xs font-medium text-slate-700 mb-1">
                Availability Status
              </label>
              <select
                id="prop-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as PropertyStatus)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-sky-700"
              >
                <option value="Available">Available</option>
                <option value="Under Offer">Under Offer</option>
                <option value="Leased">Leased</option>
                <option value="Sold">Sold</option>
              </select>
            </div>

            <div>
              <label htmlFor="prop-corridor" className="block text-xs font-medium text-slate-700 mb-1">
                Industrial Corridor / Locality
              </label>
              <input
                id="prop-corridor"
                type="text"
                value={corridor}
                onChange={(e) => setCorridor(e.target.value)}
                list="corridor-datalist"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-sky-700"
              />
              <datalist id="corridor-datalist">
                {corridors.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              {errors.corridor && <p className="mt-1 text-xs text-red-700">{errors.corridor}</p>}
            </div>

            <div>
              <label htmlFor="prop-image" className="block text-xs font-medium text-slate-700 mb-1">
                Architectural Photo Preset
              </label>
              <select
                id="prop-image"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-sky-700"
              >
                {IMAGE_PRESETS.map((preset) => (
                  <option key={preset.url} value={preset.url}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="prop-address" className="block text-xs font-medium text-slate-700 mb-1">
                Street Address
              </label>
              <input
                id="prop-address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Plot 22, Commerce Parkway, Metro City 400102"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-sky-700"
              />
              {errors.address && <p className="mt-1 text-xs text-red-700">{errors.address}</p>}
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="prop-summary" className="block text-xs font-medium text-slate-700 mb-1">
                Card Summary (1-2 sentences)
              </label>
              <input
                id="prop-summary"
                type="text"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="15,000 sq.ft high-clearance facility with 4 loading docks and 100 kVA power."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-sky-700"
              />
              {errors.summary && <p className="mt-1 text-xs text-red-700">{errors.summary}</p>}
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="prop-desc" className="block text-xs font-medium text-slate-700 mb-1">
                Detailed Property Overview
              </label>
              <textarea
                id="prop-desc"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Full technical and connectivity details..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-sky-700"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="prop-area" className="block text-xs font-medium text-slate-700 mb-1">
                Area (sq.ft)
              </label>
              <input
                id="prop-area"
                type="number"
                min="1"
                value={areaSqFt}
                onChange={(e) => setAreaSqFt(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md focus:outline-none focus:border-sky-700"
              />
              {errors.areaSqFt && <p className="mt-1 text-xs text-red-700">{errors.areaSqFt}</p>}
            </div>

            <div>
              <label htmlFor="prop-dims" className="block text-xs font-medium text-slate-700 mb-1">
                Dimensions
              </label>
              <input
                id="prop-dims"
                type="text"
                value={plotDimensions}
                onChange={(e) => setPlotDimensions(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md focus:outline-none focus:border-sky-700"
              />
            </div>

            <div>
              <label htmlFor="prop-road" className="block text-xs font-medium text-slate-700 mb-1">
                Road Width (ft)
              </label>
              <input
                id="prop-road"
                type="number"
                min="1"
                value={roadWidthFt}
                onChange={(e) => setRoadWidthFt(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md focus:outline-none focus:border-sky-700"
              />
              {errors.roadWidthFt && <p className="mt-1 text-xs text-red-700">{errors.roadWidthFt}</p>}
            </div>

            <div>
              <label htmlFor="prop-height" className="block text-xs font-medium text-slate-700 mb-1">
                Clear Height (ft, optional)
              </label>
              <input
                id="prop-height"
                type="number"
                value={clearHeightFt}
                onChange={(e) => setClearHeightFt(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md focus:outline-none focus:border-sky-700"
              />
            </div>

            <div>
              <label htmlFor="prop-power" className="block text-xs font-medium text-slate-700 mb-1">
                Power Load (kVA, optional)
              </label>
              <input
                id="prop-power"
                type="number"
                value={powerLoadKva}
                onChange={(e) => setPowerLoadKva(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md focus:outline-none focus:border-sky-700"
              />
            </div>

            <div>
              <label htmlFor="prop-zoning" className="block text-xs font-medium text-slate-700 mb-1">
                Zoning
              </label>
              <input
                id="prop-zoning"
                type="text"
                value={zoning}
                onChange={(e) => setZoning(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-sky-700"
              />
            </div>

            <div className="col-span-2 sm:col-span-3">
              <label htmlFor="prop-highlights" className="block text-xs font-medium text-slate-700 mb-1">
                Key Highlights (one per line)
              </label>
              <textarea
                id="prop-highlights"
                rows={3}
                value={highlightsText}
                onChange={(e) => setHighlightsText(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-sky-700"
              />
            </div>
          </div>

          {serverError && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-md">
              {serverError}
            </p>
          )}

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 disabled:opacity-60 rounded-md cursor-pointer"
            >
              {saving
                ? 'Saving Listing...'
                : editingProperty
                  ? 'Save Changes'
                  : 'Publish Listing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
