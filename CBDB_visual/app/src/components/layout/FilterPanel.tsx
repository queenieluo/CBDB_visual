import { useTranslation } from 'react-i18next';

const FILTER_RELATIONS = [
  'father', 'mother', 'brother', 'sister',
  'son', 'daughter', 'spouse', 'concubine', 'ancestor', 'descendant',
] as const;

interface Props {
  activeRelationships: Set<string>;
  onToggleRelationship: (rel: string) => void;
  gender: 'all' | 'male' | 'female';
  onSetGender: (g: 'all' | 'male' | 'female') => void;
}

export function FilterPanel({
  activeRelationships, onToggleRelationship, gender, onSetGender,
}: Props) {
  const { t } = useTranslation();

  return (
    <div className="filter-panel">
      <div className="filter-section">
        <h4 className="filter-section-title">{t('filter.relationships')}</h4>
        <div className="filter-checkboxes">
          {FILTER_RELATIONS.map(rel => {
            const active = activeRelationships.size === 0 || activeRelationships.has(rel);
            return (
              <label key={rel} className={`filter-chip ${active ? 'filter-chip--active' : ''}`}>
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => onToggleRelationship(rel)}
                  hidden
                />
                <span>{t(`legend.${rel}`)}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="filter-section">
        <h4 className="filter-section-title">{t('filter.gender')}</h4>
        <div className="filter-radios">
          {(['all', 'male', 'female'] as const).map(g => (
            <label key={g} className={`filter-chip ${gender === g ? 'filter-chip--active' : ''}`}>
              <input
                type="radio"
                name="gender"
                checked={gender === g}
                onChange={() => onSetGender(g)}
                hidden
              />
              <span>{t(`filter.${g}`)}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
