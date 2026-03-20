import { useTranslation } from 'react-i18next';
import { RELATIONSHIP_COLORS } from '../../utils/constants';

const LEGEND_ITEMS = [
  'ego', 'father', 'mother', 'brother', 'sister',
  'son', 'daughter', 'spouse', 'concubine',
] as const;

export function Legend() {
  const { t } = useTranslation();

  return (
    <div className="legend-panel">
      <h3 className="legend-title">{t('legend.title')}</h3>
      <div className="legend-items">
        {LEGEND_ITEMS.map(rel => (
          <div key={rel} className="legend-item">
            <span
              className="legend-swatch"
              style={{ backgroundColor: RELATIONSHIP_COLORS[rel] }}
            />
            <span className="legend-label">{t(`legend.${rel}`)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
