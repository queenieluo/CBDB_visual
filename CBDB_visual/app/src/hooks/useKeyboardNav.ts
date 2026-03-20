import { useEffect, useCallback } from 'react';
import type { GridCell } from '../types';

interface Options {
  gridData: GridCell[];
  selectedPersonID: number | null;
  onSelectCell: (cell: GridCell) => void;
  onClose: () => void;
  onExpand: (cell: GridCell) => void;
}

function parseCoord(s: string): number {
  return parseInt(s.replace(/[xy]/, ''), 10);
}

export function useKeyboardNav({ gridData, selectedPersonID, onSelectCell, onClose, onExpand }: Options) {
  const activeCells = gridData.filter(c => !c.isEmpty && c.personID > 0);

  const findCell = useCallback((personID: number) => {
    return activeCells.find(c => c.personID === personID) ?? null;
  }, [activeCells]);

  const findNeighbor = useCallback((current: GridCell, dx: number, dy: number): GridCell | null => {
    const cx = parseCoord(current.group);
    const cy = parseCoord(current.variable);

    // Find the closest active cell in the given direction
    let best: GridCell | null = null;
    let bestDist = Infinity;

    for (const cell of activeCells) {
      if (cell.personID === current.personID) continue;
      const nx = parseCoord(cell.group);
      const ny = parseCoord(cell.variable);

      // Must be in the correct direction
      if (dx > 0 && nx <= cx) continue;
      if (dx < 0 && nx >= cx) continue;
      if (dy > 0 && ny <= cy) continue;
      if (dy < 0 && ny >= cy) continue;

      const dist = Math.abs(nx - cx) + Math.abs(ny - cy);
      if (dist < bestDist) {
        bestDist = dist;
        best = cell;
      }
    }

    return best;
  }, [activeCells]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      if ((e.target as HTMLElement).tagName === 'INPUT') return;

      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (!selectedPersonID) {
        // If nothing selected, select the first active cell on arrow press
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && activeCells.length > 0) {
          e.preventDefault();
          onSelectCell(activeCells[0]);
        }
        return;
      }

      const current = findCell(selectedPersonID);
      if (!current) return;

      let neighbor: GridCell | null = null;

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          neighbor = findNeighbor(current, 1, 0);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          neighbor = findNeighbor(current, -1, 0);
          break;
        case 'ArrowUp':
          e.preventDefault();
          neighbor = findNeighbor(current, 0, 1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          neighbor = findNeighbor(current, 0, -1);
          break;
        case 'Enter':
          e.preventDefault();
          onExpand(current);
          return;
      }

      if (neighbor) {
        onSelectCell(neighbor);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedPersonID, activeCells, findCell, findNeighbor, onSelectCell, onClose, onExpand]);
}
