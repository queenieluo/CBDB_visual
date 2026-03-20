import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

interface UrlParamsResult {
  initialPersonID: number | null;
  initialLang: 'en' | 'zh' | null;
}

/**
 * Read ?person= and ?lang= from URL on mount.
 * Sync state changes back to URL.
 */
export function useUrlParams(
  currentPersonID: number | null,
  currentLang: string
): UrlParamsResult {
  const { i18n } = useTranslation();
  const initialized = useRef(false);

  // Parse initial values from URL
  const params = new URLSearchParams(window.location.search);
  const initialPersonID = params.get('person') ? Number(params.get('person')) : null;
  const rawLang = params.get('lang');
  const initialLang = (rawLang === 'en' || rawLang === 'zh') ? rawLang : null;

  // Set language from URL on first load
  useEffect(() => {
    if (initialLang && !initialized.current) {
      i18n.changeLanguage(initialLang);
    }
    initialized.current = true;
  }, [initialLang, i18n]);

  // Sync state back to URL
  useEffect(() => {
    const url = new URL(window.location.href);
    let changed = false;

    if (currentPersonID) {
      if (url.searchParams.get('person') !== String(currentPersonID)) {
        url.searchParams.set('person', String(currentPersonID));
        changed = true;
      }
    }

    if (url.searchParams.get('lang') !== currentLang) {
      url.searchParams.set('lang', currentLang);
      changed = true;
    }

    if (changed) {
      window.history.replaceState({}, '', url.toString());
    }
  }, [currentPersonID, currentLang]);

  return { initialPersonID, initialLang };
}
