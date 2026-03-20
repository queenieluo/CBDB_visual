import { useState, useEffect, useRef, useCallback, type FormEvent, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { usePersonData } from '../../hooks/usePersonData';
import { fetchSearchIndex, type SearchEntry } from '../../api';

interface Suggestion {
  personID: number;
  name: string;
  dynasty?: string;
  hasKin?: boolean;
}

/**
 * Build suggestions from the global search index.
 */
function buildSuggestions(index: SearchEntry[], query: string): Suggestion[] {
  if (!query.trim()) return [];
  const q = query.trim().toLowerCase();
  const results: Suggestion[] = [];
  for (const entry of index) {
    if (
      String(entry.id).includes(q) ||
      entry.name.toLowerCase().includes(q) ||
      entry.en.toLowerCase().includes(q)
    ) {
      results.push({
        personID: entry.id,
        name: `${entry.name} (${entry.en})`,
        dynasty: entry.dynasty,
        hasKin: entry.hasKin,
      });
    }
    if (results.length >= 10) break;
  }
  return results;
}

export function SearchBar() {
  const { t } = useTranslation();
  const { loading, searchPerson } = usePersonData();
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const [searchIndex, setSearchIndex] = useState<SearchEntry[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Load search index on mount
  useEffect(() => {
    fetchSearchIndex().then(setSearchIndex);
  }, []);

  // Debounced suggestion building
  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!input.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      const s = buildSuggestions(searchIndex, input);
      setSuggestions(s);
      setShowSuggestions(s.length > 0);
      setHighlightIdx(-1);
    }, 200);
    return () => clearTimeout(debounceRef.current);
  }, [input, searchIndex]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler as any);
    return () => document.removeEventListener('mousedown', handler as any);
  }, []);

  const doSearch = useCallback((value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const id = Number(trimmed);
    if (isNaN(id) || id <= 0) return;
    searchPerson(id);
    setShowSuggestions(false);
  }, [searchPerson]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    doSearch(input);
  };

  const handleSelect = (s: Suggestion) => {
    setInput(String(s.personID));
    searchPerson(s.personID);
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!showSuggestions) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && highlightIdx >= 0) {
      e.preventDefault();
      handleSelect(suggestions[highlightIdx]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="search-wrapper" ref={wrapperRef}>
      <form className="search-bar" onSubmit={handleSubmit}>
        <input
          type="text"
          className="search-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder={t('search.placeholder')}
          disabled={loading}
          autoComplete="off"
        />
        <button type="submit" className="search-button" disabled={loading}>
          {loading ? t('search.searching') : t('search.button')}
        </button>
      </form>
      {showSuggestions && (
        <ul className="search-suggestions">
          {suggestions.map((s, i) => (
            <li
              key={s.personID}
              className={`search-suggestion ${i === highlightIdx ? 'search-suggestion--active' : ''}`}
              onMouseDown={() => handleSelect(s)}
              onMouseEnter={() => setHighlightIdx(i)}
            >
              <span className="suggestion-name">{s.name}</span>
              <span className="suggestion-id">{s.dynasty ? `${s.dynasty} · ` : ''}#{s.personID}{s.hasKin ? '' : ' (no kin)'}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
