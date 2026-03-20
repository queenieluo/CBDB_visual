import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTreeState } from '../../state/TreeContext';
import { fetchKinshipPath } from '../../api';
import { getCellColor } from '../../engine/colorScale';
import type { GridCell } from '../../types';

interface Props {
  cell: GridCell | null;
  onClose: () => void;
}

export function DetailSidebar({ cell, onClose }: Props) {
  const { t } = useTranslation();
  const { rootPersonID } = useTreeState();
  const [kinshipPath, setKinshipPath] = useState<string | null>(null);

  useEffect(() => {
    setKinshipPath(null);
    if (!cell || cell.isEmpty || !rootPersonID) return;
    let cancelled = false;
    fetchKinshipPath(rootPersonID, cell.personID).then(path => {
      if (!cancelled) setKinshipPath(path);
    });
    return () => { cancelled = true; };
  }, [cell, rootPersonID]);

  if (!cell || cell.isEmpty) return null;

  const relationship = cell.info.match(/- (.+)$/)?.[1] || 'Unknown';

  return (
    <div className="detail-sidebar">
      <div className="detail-header">
        <h3 className="detail-name">{cell.text}</h3>
        <button className="detail-close" onClick={onClose}>&times;</button>
      </div>

      <div
        className="detail-badge"
        style={{ backgroundColor: getCellColor(cell.value) }}
      >
        {relationship}
      </div>

      <dl className="detail-list">
        <dt>Person ID</dt>
        <dd>{cell.personID}</dd>

        {cell.dynasty && (
          <>
            <dt>Dynasty</dt>
            <dd>{cell.dynasty}</dd>
          </>
        )}

        {(cell.yearBirth || cell.yearDeath) && (
          <>
            <dt>Life</dt>
            <dd>
              {cell.yearBirth && cell.yearBirth !== '0' ? `b. ${cell.yearBirth}` : ''}
              {cell.yearBirth && cell.yearBirth !== '0' && cell.yearDeath && cell.yearDeath !== '0' ? ' – ' : ''}
              {cell.yearDeath && cell.yearDeath !== '0' ? `d. ${cell.yearDeath}` : ''}
            </dd>
          </>
        )}

        {cell.examStatus && (
          <>
            <dt>Exam</dt>
            <dd>{cell.examStatus}</dd>
          </>
        )}

        <dt>Info</dt>
        <dd>{cell.info}</dd>

        {kinshipPath && (
          <>
            <dt>{t('tooltip.kinshipPath')}</dt>
            <dd>{kinshipPath}</dd>
          </>
        )}

        {cell.entry && (
          <>
            <dt>{t('filter.entry')}</dt>
            <dd>{cell.entry}</dd>
          </>
        )}

        {cell.assoc_num > 0 && (
          <>
            <dt>{t('filter.connections')}</dt>
            <dd>{cell.assoc_num}</dd>
          </>
        )}
      </dl>

      <a
        className="detail-link"
        href={`https://cbdb.fas.harvard.edu/cbdbapi/person.php?id=${cell.personID}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        View on CBDB &rarr;
      </a>
    </div>
  );
}
