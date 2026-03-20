import { type MouseEvent, useCallback, useMemo } from 'react';
import { useTreeState, useTreeDispatch } from '../../state/TreeContext';
import { useTooltip } from '../../hooks/useTooltip';
import { usePersonData } from '../../hooks/usePersonData';
import { useKeyboardNav } from '../../hooks/useKeyboardNav';
import { Grid } from './Grid';
import { Tooltip } from './Tooltip';
import { ExportButton } from '../common/ExportButton';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorBanner } from '../common/ErrorBanner';
import type { GridCell } from '../../types';
import { useTranslation } from 'react-i18next';

function parseRelFromInfo(info: string): string {
  const match = info.match(/- (.+)$/);
  return match ? match[1].trim().toLowerCase() : '';
}

const FEMALE_RELS = new Set(['mother', 'sister', 'daughter', 'wife', 'spouse', 'concubine']);
const MALE_RELS = new Set(['father', 'brother', 'son', 'husband']);

export function GridContainer() {
  const { t } = useTranslation();
  const state = useTreeState();
  const dispatch = useTreeDispatch();
  const { expandPerson } = usePersonData();
  const { gridData, edges, loading, error, filters, selectedPersonID, rootPersonID } = state;
  const expandedIDs: Set<number> = (state as any).expandedPersonIDs ?? new Set();
  const { tooltip, showTooltip, moveTooltip, hideTooltip } = useTooltip();

  const egoVariable = useMemo(() => {
    if (!rootPersonID) return null;
    const egoCell = gridData.find(c => c.personID === rootPersonID);
    return egoCell?.variable ?? null;
  }, [gridData, rootPersonID]);

  const { dimmedCells, dimmedEdges } = useMemo(() => {
    const dimCells = new Set<number>();
    const dimEdges = new Set<string>();
    const hasRelFilter = filters.relationshipTypes.size > 0;
    const hasGenderFilter = filters.gender !== 'all';

    if (!hasRelFilter && !hasGenderFilter) return { dimmedCells: dimCells, dimmedEdges: dimEdges };

    for (const cell of gridData) {
      if (cell.isEmpty || cell.personID <= 0) continue;
      const rel = parseRelFromInfo(cell.info);
      let dimmed = false;

      if (hasRelFilter && rel && !filters.relationshipTypes.has(rel)) {
        const matchesAny = [...filters.relationshipTypes].some(f => rel.includes(f));
        if (!matchesAny) dimmed = true;
      }

      if (hasGenderFilter && rel) {
        if (filters.gender === 'male' && FEMALE_RELS.has(rel)) dimmed = true;
        if (filters.gender === 'female' && MALE_RELS.has(rel)) dimmed = true;
      }

      if (rel === 'ego' || cell.info.toLowerCase().includes('ego')) dimmed = false;
      if (dimmed) dimCells.add(cell.personID);
    }

    for (const edge of edges) {
      if (dimCells.has(edge.sourceID) || dimCells.has(edge.targetID)) {
        dimEdges.add(`${edge.sourceID}-${edge.targetID}`);
      }
    }

    return { dimmedCells: dimCells, dimmedEdges: dimEdges };
  }, [gridData, edges, filters]);

  const handleCellHover = useCallback((e: MouseEvent, cell: GridCell) => {
    showTooltip(e.clientX, e.clientY, cell.info, cell.personID);
  }, [showTooltip]);

  const handleCellMove = useCallback((e: MouseEvent) => {
    moveTooltip(e.clientX, e.clientY);
  }, [moveTooltip]);

  const handleCellClick = useCallback((cell: GridCell) => {
    if (!expandedIDs.has(cell.personID)) {
      expandPerson(cell);
    }
    dispatch({ type: 'SELECT_PERSON', personID: cell.personID });
  }, [expandedIDs, expandPerson, dispatch]);

  const handleDeselect = useCallback(() => {
    dispatch({ type: 'SELECT_PERSON', personID: null });
  }, [dispatch]);

  useKeyboardNav({
    gridData,
    selectedPersonID,
    onSelectCell: (cell) => dispatch({ type: 'SELECT_PERSON', personID: cell.personID }),
    onClose: handleDeselect,
    onExpand: handleCellClick,
  });

  if (loading && gridData.length === 0) {
    return (
      <div className="grid-container grid-container--loading">
        <LoadingSpinner />
      </div>
    );
  }

  if (error && gridData.length === 0) {
    return (
      <div className="grid-container">
        <ErrorBanner message={error} />
      </div>
    );
  }

  if (gridData.length === 0) {
    return (
      <div className="grid-container grid-container--empty">
        <div className="empty-state">
          <div className="empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </div>
          <p className="empty-title">{t('app.title')}</p>
          <p className="empty-message">{t('search.placeholder')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid-outer">
      <div className="grid-toolbar">
        <ExportButton />
      </div>
      <div className="grid-container">
        {loading && (
          <div className="grid-loading-overlay">
            <LoadingSpinner />
          </div>
        )}
        <Grid
          data={gridData}
          edges={edges}
          expandedIDs={expandedIDs}
          dimmedCells={dimmedCells}
          dimmedEdges={dimmedEdges}
          selectedPersonID={selectedPersonID}
          egoVariable={egoVariable}
          onCellHover={handleCellHover}
          onCellMove={handleCellMove}
          onCellLeave={hideTooltip}
          onCellClick={handleCellClick}
        />
        <Tooltip
          visible={tooltip.visible}
          x={tooltip.x}
          y={tooltip.y}
          info={tooltip.info}
          kinshipPath={tooltip.kinshipPath}
        />
      </div>
    </div>
  );
}
