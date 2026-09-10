import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { BusinessSettings } from '@/types';

const SETTINGS_DOC = 'business';

export const DEFAULT_SETTINGS: BusinessSettings = {
  businessName: 'SecureVision CCTV & Electrical',
  tagline: 'Cameras, wiring & installation you can trust',
  phone: '',
  whatsappNumber: import.meta.env.VITE_DEFAULT_WHATSAPP_NUMBER ?? '',
  email: '',
  address: '',
  workingHours: 'Mon–Sat, 9:00 AM – 7:00 PM',
  logoUrl: '',
  heroImageUrl: '',
};

export function useSettings() {
  const [settings, setSettings] = useState<BusinessSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'settings', SETTINGS_DOC),
      (snap) => {
        if (snap.exists()) {
          setSettings({ ...DEFAULT_SETTINGS, ...(snap.data() as Partial<BusinessSettings>) });
        }
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, []);

  return { settings, loading, error };
}

export async function saveSettings(settings: BusinessSettings) {
  await setDoc(doc(db, 'settings', SETTINGS_DOC), settings, { merge: true });
}
