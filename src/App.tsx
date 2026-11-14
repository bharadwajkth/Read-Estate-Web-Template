import { useCallback, useEffect, useState } from 'react';
import { AdminPortal } from './components/AdminPortal';
import { PublicSite } from './components/PublicSite';
import { DEFAULT_AGENCY_SETTINGS } from './config/agency.config';
import type { AgencySettings, Property } from './types';

function isAdminPath(): boolean {
  return window.location.pathname.startsWith('/admin');
}

export default function App() {
  const [view, setView] = useState<'public' | 'admin'>(() =>
    isAdminPath() ? 'admin' : 'public'
  );
  const [agency, setAgency] = useState<AgencySettings>(DEFAULT_AGENCY_SETTINGS);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPublicData = useCallback(async () => {
    try {
      const [agencyRes, propsRes] = await Promise.all([
        fetch('/api/agency'),
        fetch('/api/properties'),
      ]);
      if (agencyRes.ok) {
        const aData = await agencyRes.json();
        if (aData.agency) {
          setAgency(aData.agency);
          document.title = `${aData.agency.agencyName} — ${aData.agency.categoryLabel}`;
        }
      }
      if (propsRes.ok) {
        const pData = await propsRes.json();
        setProperties(pData.properties || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPublicData();
  }, [loadPublicData]);

  useEffect(() => {
    const onPopState = () => {
      setView(isAdminPath() ? 'admin' : 'public');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  function navigateTo(target: 'public' | 'admin') {
    const nextPath = target === 'admin' ? '/admin' : '/';
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
    setView(target);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  if (view === 'admin') {
    return (
      <AdminPortal
        agency={agency}
        onAgencyUpdated={(next) => {
          setAgency(next);
          document.title = `${next.agencyName} — ${next.categoryLabel}`;
        }}
        onPropertiesChanged={loadPublicData}
        onBackToSite={() => navigateTo('public')}
      />
    );
  }

  return (
    <PublicSite
      agency={agency}
      properties={properties}
      loading={loading}
      onOpenPortal={() => navigateTo('admin')}
    />
  );
}
