import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  Building2,
  Check,
  Inbox,
  LayoutDashboard,
  Lock,
  LogOut,
  Menu,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { computePortfolioMetrics, formatAreaSqFt } from '../lib/propertyUtils';
import type {
  AdminSessionUser,
  AgencySettings,
  Inquiry,
  InquiryStatus,
  Property,
  PropertyInput,
  PropertyStatus,
  SecurityAuditReport,
} from '../types';
import { PropertyFormModal } from './PropertyFormModal';

interface AdminPortalProps {
  agency: AgencySettings;
  onAgencyUpdated: (next: AgencySettings) => void;
  onPropertiesChanged: () => Promise<void>;
  onBackToSite: () => void;
}

type DashboardTab = 'overview' | 'properties' | 'inquiries' | 'settings';

export function AdminPortal({
  agency,
  onAgencyUpdated,
  onPropertiesChanged,
  onBackToSite,
}: AdminPortalProps) {
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<AdminSessionUser | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [demoEmail, setDemoEmail] = useState<string | null>(null);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  // Dashboard state
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [adminProperties, setAdminProperties] = useState<Property[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [auditReport, setAuditReport] = useState<SecurityAuditReport | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  // Property filters & modals
  const [propSearch, setPropSearch] = useState('');
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [confirmDeleteProp, setConfirmDeleteProp] = useState<Property | null>(null);

  // Inquiry state
  const [inquiryFilter, setInquiryFilter] = useState<'All' | InquiryStatus>('All');
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [inquiryFeedback, setInquiryFeedback] = useState('');

  // Settings & Password state
  const [settingsForm, setSettingsForm] = useState<AgencySettings>(agency);
  const [corridorsInput, setCorridorsInput] = useState(agency.corridors.join(', '));
  const [settingsSavedMsg, setSettingsSavedMsg] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    setSettingsForm(agency);
    setCorridorsInput(agency.corridors.join(', '));
  }, [agency]);

  const loadDashboardData = useCallback(async () => {
    setDashboardLoading(true);
    try {
      const [propsRes, inqRes, auditRes] = await Promise.all([
        fetch('/api/properties?includeAll=true'),
        fetch('/api/inquiries'),
        fetch('/api/security-audit'),
      ]);

      if (propsRes.ok) {
        const pData = await propsRes.json();
        setAdminProperties(pData.properties || []);
      }
      if (inqRes.ok) {
        const iData = await inqRes.json();
        const list: Inquiry[] = iData.inquiries || [];
        setInquiries(list);
        const notes: Record<string, string> = {};
        for (const item of list) {
          notes[item.id] = item.internalNotes || '';
        }
        setNoteDrafts(notes);
      }
      if (auditRes.ok) {
        const aData = await auditRes.json();
        setAuditReport(aData.report || null);
      }
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        setDemoMode(Boolean(data.demoMode));
        setDemoEmail(data.demoEmail || null);
        if (data.authenticated && data.user) {
          setUser(data.user);
          await loadDashboardData();
        }
      } finally {
        setAuthLoading(false);
      }
    }
    checkSession();
  }, [loadDashboardData]);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setLoginError('');
    if (!loginEmail.trim() || !loginPassword) {
      setLoginError('Enter both your admin email and password.');
      return;
    }

    setLoggingIn(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || 'Authentication failed.');
        return;
      }
      setUser(data.user);
      setDemoMode(Boolean(data.demoMode));
      setLoginPassword('');
      await loadDashboardData();
    } catch {
      setLoginError('Network error while signing in.');
    } finally {
      setLoggingIn(false);
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setAdminProperties([]);
    setInquiries([]);
  }

  function handleFillDemoCredentials() {
    setLoginEmail(demoEmail || 'admin@example-realty.com');
    setLoginPassword('AdminTemplate@2026');
    setLoginError('');
  }

  async function handleSaveProperty(payload: PropertyInput, existingId?: string) {
    const endpoint = existingId ? `/api/properties/${existingId}` : '/api/properties';
    const method = existingId ? 'PATCH' : 'POST';

    const res = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to save listing.');
    }
    await loadDashboardData();
    await onPropertiesChanged();
  }

  async function handleQuickStatusChange(propId: string, nextStatus: PropertyStatus) {
    const res = await fetch(`/api/properties/${propId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (res.ok) {
      await loadDashboardData();
      await onPropertiesChanged();
    }
  }

  async function handleConfirmDelete() {
    if (!confirmDeleteProp) return;
    const res = await fetch(`/api/properties/${confirmDeleteProp.id}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      setConfirmDeleteProp(null);
      await loadDashboardData();
      await onPropertiesChanged();
    }
  }

  async function handleUpdateInquiry(
    id: string,
    patch: { status?: InquiryStatus; internalNotes?: string }
  ) {
    const res = await fetch(`/api/inquiries/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      setInquiryFeedback('Inquiry updated.');
      setTimeout(() => setInquiryFeedback(''), 2500);
      await loadDashboardData();
    }
  }

  async function handleSaveAgencySettings(e: FormEvent) {
    e.preventDefault();
    setSettingsSavedMsg('');
    const nextCorridors = corridorsInput
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);

    const res = await fetch('/api/agency', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...settingsForm,
        corridors: nextCorridors,
      }),
    });
    const data = await res.json();
    if (res.ok && data.agency) {
      onAgencyUpdated(data.agency);
      setSettingsSavedMsg('Agency template settings saved and published.');
      setTimeout(() => setSettingsSavedMsg(''), 3000);
    }
  }

  async function handlePasswordUpdate(e: FormEvent) {
    e.preventDefault();
    setPasswordError('');
    setPasswordMessage('');

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }

    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) {
      setPasswordError(data.error || 'Could not update password.');
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    setDemoMode(Boolean(data.demoMode));
    setPasswordMessage('Admin password updated securely.');
    await loadDashboardData();
  }

  const metrics = useMemo(() => computePortfolioMetrics(adminProperties), [adminProperties]);

  const filteredAdminProps = useMemo(() => {
    const q = propSearch.trim().toLowerCase();
    if (!q) return adminProperties;
    return adminProperties.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.corridor.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }, [adminProperties, propSearch]);

  const filteredInquiries = useMemo(() => {
    if (inquiryFilter === 'All') return inquiries;
    return inquiries.filter((i) => i.status === inquiryFilter);
  }, [inquiries, inquiryFilter]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <p className="text-sm text-slate-600">Verifying session...</p>
      </div>
    );
  }

  // Unauthenticated Sign-In Screen
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-4 sm:p-8">
        <div>
          <button
            type="button"
            onClick={onBackToSite}
            className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 hover:text-slate-950 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Return to {agency.agencyName}
          </button>
        </div>

        <div className="w-full max-w-md mx-auto bg-white border border-slate-200 rounded-lg p-6 sm:p-8">
          <div className="flex items-center gap-2 text-xs font-medium text-sky-700">
            <Lock className="w-3.5 h-3.5" aria-hidden="true" />
            Protected Management Console
          </div>
          <h1 className="mt-2 text-2xl font-bold text-slate-950 tracking-tight">
            Agent Portal Sign In
          </h1>
          <p className="mt-1.5 text-sm text-slate-600">
            Manage property listings, client site visit inquiries, and white-label agency configuration.
          </p>

          <form onSubmit={handleLogin} noValidate className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="login-email"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Admin Email
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="admin@example-realty.com"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-sky-700"
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Password
              </label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-sky-700"
              />
            </div>

            {loginError && (
              <p
                role="alert"
                className="text-xs text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-md"
              >
                {loginError}
              </p>
            )}

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-md transition-colors cursor-pointer"
            >
              {loggingIn ? 'Signing In...' : 'Sign In to Dashboard'}
            </button>
          </form>

          {demoMode && (
            <div className="mt-6 pt-5 border-t border-slate-200">
              <p className="text-xs text-slate-600 leading-relaxed">
                Template demo credentials are active in this environment. Rotate the password under{' '}
                <span className="font-medium text-slate-900">Template &amp; Security</span> before production deployment.
              </p>
              <button
                type="button"
                onClick={handleFillDemoCredentials}
                className="mt-3 w-full py-2 px-3 text-xs font-medium text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-md transition-colors cursor-pointer"
              >
                Fill Template Demo Credentials
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-500">
          Sessions use signed HttpOnly cookies and salted scrypt hashing.
        </p>
      </div>
    );
  }

  const navTabs: Array<{ id: DashboardTab; label: string; icon: typeof LayoutDashboard }> = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'properties', label: 'Properties', icon: Building2 },
    { id: 'inquiries', label: 'Inquiries', icon: Inbox },
    { id: 'settings', label: 'Template & Security', icon: ShieldCheck },
  ];

  const openInquiriesCount = inquiries.filter((i) => i.status !== 'Closed').length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Mobile Dashboard Top Bar */}
      <div className="lg:hidden bg-white border-b border-slate-200 px-4 h-14 flex items-center justify-between">
        <span className="font-display text-sm font-bold text-slate-950 truncate">
          {agency.agencyName} · Console
        </span>
        <button
          type="button"
          onClick={() => setMobileMenuOpen((v) => !v)}
          aria-label="Toggle dashboard navigation"
          className="w-10 h-10 inline-flex items-center justify-center rounded-md border border-slate-200 text-slate-700 cursor-pointer"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`${
          mobileMenuOpen ? 'block' : 'hidden'
        } lg:flex lg:flex-col lg:w-64 bg-slate-950 text-slate-200 border-r border-slate-800 shrink-0 justify-between`}
      >
        <div>
          <div className="p-6 border-b border-slate-800">
            <p className="font-display text-base font-bold text-white truncate">
              {agency.agencyName}
            </p>
            <p className="mt-1 text-xs text-slate-400 truncate">{user.email}</p>
          </div>

          <nav aria-label="Dashboard Navigation" className="p-3 space-y-1">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-md transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-sky-700 text-white'
                      : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{tab.label}</span>
                  </span>
                  {tab.id === 'inquiries' && openInquiriesCount > 0 && (
                    <span className="font-mono tabular-nums text-xs text-slate-300">
                      {openInquiriesCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-3 border-t border-slate-800 space-y-1">
          <button
            type="button"
            onClick={onBackToSite}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-900 hover:text-white rounded-md cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>View Public Website</span>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-900 hover:text-white rounded-md cursor-pointer"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs text-slate-500">
              Management Console /{' '}
              <span className="text-slate-900 font-medium capitalize">{activeTab}</span>
            </p>
            <h1 className="text-lg font-semibold text-slate-950">
              {activeTab === 'overview' && 'Portfolio & Lead Overview'}
              {activeTab === 'properties' && 'Property Listings Inventory'}
              {activeTab === 'inquiries' && 'Site Visit & Client Inquiries'}
              {activeTab === 'settings' && 'White-Label Template & Security'}
            </h1>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingProperty(null);
              setFormModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            Add Property
          </button>
        </header>

        <main className="flex-1 p-6 space-y-6 max-w-6xl w-full">
          {dashboardLoading ? (
            <div className="bg-white border border-slate-200 rounded-lg p-8 text-sm text-slate-500">
              Loading portfolio records...
            </div>
          ) : (
            <>
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white border border-slate-200 rounded-lg p-5">
                      <p className="text-xs text-slate-500">Total Managed Listings</p>
                      <p className="mt-1 font-mono tabular-nums text-2xl font-semibold text-slate-950">
                        {metrics.totalListings}
                      </p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-lg p-5">
                      <p className="text-xs text-slate-500">Available Now</p>
                      <p className="mt-1 font-mono tabular-nums text-2xl font-semibold text-emerald-700">
                        {metrics.availableCount}
                      </p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-lg p-5">
                      <p className="text-xs text-slate-500">Available Area</p>
                      <p className="mt-1 font-mono tabular-nums text-2xl font-semibold text-slate-950">
                        {metrics.totalAvailableSqFt.toLocaleString('en-IN')} sq.ft
                      </p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-lg p-5">
                      <p className="text-xs text-slate-500">Open Inquiries</p>
                      <p className="mt-1 font-mono tabular-nums text-2xl font-semibold text-sky-700">
                        {openInquiriesCount}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg overflow-hidden">
                      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-slate-950">
                          Recent Client Inquiries
                        </h2>
                        <button
                          type="button"
                          onClick={() => setActiveTab('inquiries')}
                          className="text-xs font-medium text-sky-700 hover:underline cursor-pointer"
                        >
                          Manage All
                        </button>
                      </div>
                      {inquiries.length === 0 ? (
                        <div className="p-6 text-sm text-slate-500">
                          No inquiries logged yet.
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-200">
                          {inquiries.slice(0, 4).map((inq) => (
                            <div key={inq.id} className="p-4 flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-slate-950 truncate">
                                  {inq.name}
                                  {inq.company ? ` · ${inq.company}` : ''}
                                </p>
                                <p className="text-xs text-slate-600 truncate mt-0.5">
                                  {inq.propertyTitle}
                                </p>
                                <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                                  {inq.message}
                                </p>
                              </div>
                              <span className="text-xs font-medium text-slate-700 shrink-0">
                                {inq.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg overflow-hidden">
                      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-slate-950">
                          Security &amp; Git Readiness
                        </h2>
                        <button
                          type="button"
                          onClick={() => setActiveTab('settings')}
                          className="text-xs font-medium text-sky-700 hover:underline cursor-pointer"
                        >
                          Configure
                        </button>
                      </div>
                      <div className="p-5 space-y-3">
                        {auditReport?.checks.map((chk) => (
                          <div key={chk.id} className="flex items-start gap-2.5 text-xs">
                            <Check
                              className={`w-4 h-4 shrink-0 mt-0.5 ${
                                chk.passed ? 'text-emerald-700' : 'text-amber-600'
                              }`}
                              aria-hidden="true"
                            />
                            <div>
                              <p className="font-medium text-slate-900">{chk.label}</p>
                              <p className="text-slate-500 mt-0.5">{chk.detail}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Properties Inventory Tab */}
              {activeTab === 'properties' && (
                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                  <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="relative max-w-sm w-full">
                      <Search
                        className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                        aria-hidden="true"
                      />
                      <label htmlFor="admin-prop-search" className="sr-only">
                        Search managed properties
                      </label>
                      <input
                        id="admin-prop-search"
                        type="search"
                        value={propSearch}
                        onChange={(e) => setPropSearch(e.target.value)}
                        placeholder="Filter by title, corridor, category..."
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:border-sky-700"
                      />
                    </div>
                    <span className="font-mono tabular-nums text-xs text-slate-500">
                      {filteredAdminProps.length} listings
                    </span>
                  </div>

                  {filteredAdminProps.length === 0 ? (
                    <div className="p-10 text-center">
                      <p className="text-sm font-medium text-slate-900">
                        No property listings match your search
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingProperty(null);
                          setFormModalOpen(true);
                        }}
                        className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-sky-700 rounded-md cursor-pointer"
                      >
                        Add First Property
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-600">
                            <th className="py-3 px-4 font-medium">Property</th>
                            <th className="py-3 px-4 font-medium">Category</th>
                            <th className="py-3 px-4 font-medium text-right">Area</th>
                            <th className="py-3 px-4 font-medium text-right">Price</th>
                            <th className="py-3 px-4 font-medium">Status</th>
                            <th className="py-3 px-4 font-medium text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {filteredAdminProps.map((prop) => (
                            <tr key={prop.id} className="hover:bg-slate-50/80">
                              <td className="py-3 px-4">
                                <p className="font-medium text-slate-950">{prop.title}</p>
                                <p className="text-xs text-slate-500">{prop.corridor}</p>
                              </td>
                              <td className="py-3 px-4 text-xs text-slate-700">
                                {prop.category} · {prop.transactionType}
                              </td>
                              <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-slate-800">
                                {formatAreaSqFt(prop.specs.areaSqFt)}
                              </td>
                              <td className="py-3 px-4 text-right font-mono tabular-nums text-xs font-semibold text-slate-950">
                                {prop.priceDisplay}
                              </td>
                              <td className="py-3 px-4">
                                <label htmlFor={`status-${prop.id}`} className="sr-only">
                                  Status for {prop.title}
                                </label>
                                <select
                                  id={`status-${prop.id}`}
                                  value={prop.status}
                                  onChange={(e) =>
                                    handleQuickStatusChange(
                                      prop.id,
                                      e.target.value as PropertyStatus
                                    )
                                  }
                                  className="px-2 py-1 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-sky-700"
                                >
                                  <option value="Available">Available</option>
                                  <option value="Under Offer">Under Offer</option>
                                  <option value="Leased">Leased</option>
                                  <option value="Sold">Sold</option>
                                </select>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    aria-label={`Edit ${prop.title}`}
                                    onClick={() => {
                                      setEditingProperty(prop);
                                      setFormModalOpen(true);
                                    }}
                                    className="p-2 text-slate-600 hover:text-sky-700 hover:bg-slate-100 rounded cursor-pointer"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    aria-label={`Delete ${prop.title}`}
                                    onClick={() => setConfirmDeleteProp(prop)}
                                    className="p-2 text-slate-600 hover:text-red-700 hover:bg-red-50 rounded cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Inquiries Tab */}
              {activeTab === 'inquiries' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-md">
                      {(
                        [
                          'All',
                          'New',
                          'Contacted',
                          'Site Visit Scheduled',
                          'Closed',
                        ] as const
                      ).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setInquiryFilter(st)}
                          className={`px-3 py-1.5 text-xs font-medium rounded cursor-pointer ${
                            inquiryFilter === st
                              ? 'bg-white text-slate-950 shadow-sm'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                    {inquiryFeedback && (
                      <span className="text-xs font-medium text-emerald-700">
                        {inquiryFeedback}
                      </span>
                    )}
                  </div>

                  {filteredInquiries.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-lg p-10 text-center text-sm text-slate-500">
                      No inquiries in this stage.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredInquiries.map((inq) => (
                        <div
                          key={inq.id}
                          className="bg-white border border-slate-200 rounded-lg p-5 space-y-3"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                              <h3 className="text-base font-semibold text-slate-950">
                                {inq.name}
                                {inq.company ? ` — ${inq.company}` : ''}
                              </h3>
                              <p className="mt-1 text-xs text-slate-600">
                                <span className="font-mono">{inq.phone}</span>
                                <span aria-hidden="true" className="mx-2">·</span>
                                <span>{inq.email}</span>
                                <span aria-hidden="true" className="mx-2">·</span>
                                <span className="font-medium text-slate-800">
                                  {inq.propertyTitle}
                                </span>
                              </p>
                            </div>

                            <div>
                              <label htmlFor={`inq-status-${inq.id}`} className="sr-only">
                                Lead status for {inq.name}
                              </label>
                              <select
                                id={`inq-status-${inq.id}`}
                                value={inq.status}
                                onChange={(e) =>
                                  handleUpdateInquiry(inq.id, {
                                    status: e.target.value as InquiryStatus,
                                  })
                                }
                                className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-md focus:outline-none focus:border-sky-700"
                              >
                                <option value="New">New</option>
                                <option value="Contacted">Contacted</option>
                                <option value="Site Visit Scheduled">
                                  Site Visit Scheduled
                                </option>
                                <option value="Closed">Closed</option>
                              </select>
                            </div>
                          </div>

                          <p className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-md p-3">
                            {inq.message}
                          </p>

                          <div className="flex flex-col sm:flex-row gap-2">
                            <label htmlFor={`note-${inq.id}`} className="sr-only">
                              Internal broker note for {inq.name}
                            </label>
                            <input
                              id={`note-${inq.id}`}
                              type="text"
                              value={noteDrafts[inq.id] ?? ''}
                              onChange={(e) =>
                                setNoteDrafts((prev) => ({
                                  ...prev,
                                  [inq.id]: e.target.value,
                                }))
                              }
                              placeholder="Add internal follow-up notes..."
                              className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:border-sky-700"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateInquiry(inq.id, {
                                  internalNotes: noteDrafts[inq.id] ?? '',
                                })
                              }
                              className="px-3.5 py-1.5 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer shrink-0"
                            >
                              Save Note
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Template & Security Settings Tab */}
              {activeTab === 'settings' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <form
                    onSubmit={handleSaveAgencySettings}
                    className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-6 space-y-4"
                  >
                    <div>
                      <h2 className="text-base font-semibold text-slate-950">
                        White-Label Agency Template Configuration
                      </h2>
                      <p className="mt-1 text-xs text-slate-600">
                        Customize brand identity, contact details, and regional corridors to deploy this application for any real estate agency.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="cfg-name" className="block text-xs font-medium text-slate-700 mb-1">
                          Agency Name
                        </label>
                        <input
                          id="cfg-name"
                          type="text"
                          value={settingsForm.agencyName}
                          onChange={(e) =>
                            setSettingsForm((s) => ({ ...s, agencyName: e.target.value }))
                          }
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label htmlFor="cfg-cat" className="block text-xs font-medium text-slate-700 mb-1">
                          Business Category
                        </label>
                        <input
                          id="cfg-cat"
                          type="text"
                          value={settingsForm.categoryLabel}
                          onChange={(e) =>
                            setSettingsForm((s) => ({ ...s, categoryLabel: e.target.value }))
                          }
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="cfg-headline" className="block text-xs font-medium text-slate-700 mb-1">
                        Hero Headline
                      </label>
                      <input
                        id="cfg-headline"
                        type="text"
                        value={settingsForm.heroHeadline}
                        onChange={(e) =>
                          setSettingsForm((s) => ({ ...s, heroHeadline: e.target.value }))
                        }
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                      />
                    </div>

                    <div>
                      <label htmlFor="cfg-sub" className="block text-xs font-medium text-slate-700 mb-1">
                        Hero Subheadline
                      </label>
                      <textarea
                        id="cfg-sub"
                        rows={2}
                        value={settingsForm.heroSubheadline}
                        onChange={(e) =>
                          setSettingsForm((s) => ({ ...s, heroSubheadline: e.target.value }))
                        }
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="cfg-addr" className="block text-xs font-medium text-slate-700 mb-1">
                          Street Address
                        </label>
                        <input
                          id="cfg-addr"
                          type="text"
                          value={settingsForm.address}
                          onChange={(e) =>
                            setSettingsForm((s) => ({ ...s, address: e.target.value }))
                          }
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label htmlFor="cfg-city" className="block text-xs font-medium text-slate-700 mb-1">
                          City, State &amp; PIN
                        </label>
                        <input
                          id="cfg-city"
                          type="text"
                          value={settingsForm.cityStatePin}
                          onChange={(e) =>
                            setSettingsForm((s) => ({ ...s, cityStatePin: e.target.value }))
                          }
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label htmlFor="cfg-phone" className="block text-xs font-medium text-slate-700 mb-1">
                          Phone Display
                        </label>
                        <input
                          id="cfg-phone"
                          type="text"
                          value={settingsForm.phoneDisplay}
                          onChange={(e) =>
                            setSettingsForm((s) => ({ ...s, phoneDisplay: e.target.value }))
                          }
                          className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label htmlFor="cfg-hours" className="block text-xs font-medium text-slate-700 mb-1">
                          Business Hours
                        </label>
                        <input
                          id="cfg-hours"
                          type="text"
                          value={settingsForm.hoursLabel}
                          onChange={(e) =>
                            setSettingsForm((s) => ({ ...s, hoursLabel: e.target.value }))
                          }
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="cfg-corridors" className="block text-xs font-medium text-slate-700 mb-1">
                        Active Corridors (comma-separated)
                      </label>
                      <input
                        id="cfg-corridors"
                        type="text"
                        value={corridorsInput}
                        onChange={(e) => setCorridorsInput(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                      />
                    </div>

                    {settingsSavedMsg && (
                      <p className="text-xs font-medium text-emerald-700" role="status">
                        {settingsSavedMsg}
                      </p>
                    )}

                    <button
                      type="submit"
                      className="px-5 py-2.5 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-md cursor-pointer"
                    >
                      Save Template Settings
                    </button>
                  </form>

                  <div className="lg:col-span-5 space-y-6">
                    <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
                      <h2 className="text-base font-semibold text-slate-950">
                        Security &amp; .gitignore Audit
                      </h2>
                      <p className="text-xs text-slate-600">
                        Runtime verification ensuring secrets, environment variables, and local data stores stay out of Git.
                      </p>

                      <div className="space-y-3 pt-2 border-t border-slate-200">
                        {auditReport?.checks.map((chk) => (
                          <div key={chk.id} className="flex items-start gap-2.5 text-xs">
                            <Check
                              className={`w-4 h-4 shrink-0 mt-0.5 ${
                                chk.passed ? 'text-emerald-700' : 'text-amber-600'
                              }`}
                              aria-hidden="true"
                            />
                            <div>
                              <p className="font-medium text-slate-900">{chk.label}</p>
                              <p className="text-slate-500 mt-0.5">{chk.detail}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <form
                      onSubmit={handlePasswordUpdate}
                      className="bg-white border border-slate-200 rounded-lg p-6 space-y-4"
                    >
                      <h2 className="text-base font-semibold text-slate-950">
                        Rotate Admin Password
                      </h2>
                      <div>
                        <label htmlFor="pw-current" className="block text-xs font-medium text-slate-700 mb-1">
                          Current Password
                        </label>
                        <input
                          id="pw-current"
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label htmlFor="pw-new" className="block text-xs font-medium text-slate-700 mb-1">
                          New Password (min 8 chars)
                        </label>
                        <input
                          id="pw-new"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                        />
                      </div>

                      {passwordError && (
                        <p className="text-xs text-red-700">{passwordError}</p>
                      )}
                      {passwordMessage && (
                        <p className="text-xs text-emerald-700" role="status">
                          {passwordMessage}
                        </p>
                      )}

                      <button
                        type="submit"
                        className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md cursor-pointer"
                      >
                        Update Password
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Add / Edit Listing Modal */}
      <PropertyFormModal
        open={formModalOpen}
        editingProperty={editingProperty}
        corridors={agency.corridors}
        onClose={() => {
          setFormModalOpen(false);
          setEditingProperty(null);
        }}
        onSave={handleSaveProperty}
      />

      {/* Non-blocking Delete Confirmation Modal */}
      {confirmDeleteProp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
        >
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-lg p-6 shadow-xl">
            <h2 id="delete-modal-title" className="text-base font-semibold text-slate-950">
              Delete Property Listing
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Remove <span className="font-medium text-slate-900">{confirmDeleteProp.title}</span> permanently from the agency portfolio?
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteProp(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 rounded-md cursor-pointer"
              >
                Delete Listing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
