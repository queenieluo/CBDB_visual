import type { GridCell } from '../types';

/**
 * Parse "x5" → 5, "y3" → 3
 */
function parseCoord(s: string): number {
  return parseInt(s.replace(/[xy]/, ''), 10);
}

function findLeftMostX(yValue: string, data: GridCell[]): number | null {
  let min: number | null = null;
  for (const d of data) {
    if (!d.isEmpty && d.personID > 0 && d.variable === yValue) {
      const x = parseCoord(d.group);
      if (min === null || x < min) min = x;
    }
  }
  return min;
}

function findRightMostX(yValue: string, data: GridCell[]): number | null {
  let max: number | null = null;
  for (const d of data) {
    if (!d.isEmpty && d.personID > 0 && d.variable === yValue) {
      const x = parseCoord(d.group);
      if (max === null || x > max) max = x;
    }
  }
  return max;
}

function makeEmptyCell(group: string, variable: string): GridCell {
  return {
    personID: -1,
    group,
    variable,
    value: 0,
    text: '',
    info: '',
    entry: '',
    assoc_num: 0,
    isEmpty: true,
  };
}

/**
 * Merge new cells from an expanded person into the existing grid.
 * Ports the logic from QL_08232024.html onmouseclick handler.
 */
export function mergeNodes(
  existingData: GridCell[],
  existingNodeIDs: Set<number>,
  newData: GridCell[],
  sourceCell: GridCell
): GridCell[] {
  const result = [...existingData];
  const sourceY = parseCoord(sourceCell.variable);

  // Find the source node in the new data to determine its y-position there
  const newSourceCell = newData.find(
    d => !d.isEmpty && d.personID === sourceCell.personID
  );
  const newSourceY = newSourceCell ? parseCoord(newSourceCell.variable) : sourceY;

  let ancestorCount = 0;
  let siblingCount = 0;
  let descendantCount = 0;

  for (const cell of newData) {
    if (cell.isEmpty || cell.personID <= 0) continue;
    if (existingNodeIDs.has(cell.personID)) continue;

    const cellY = parseCoord(cell.variable);
    let newY: string;
    let counter: number;

    if (cellY > newSourceY) {
      // ancestor
      newY = `y${sourceY + 1}`;
      counter = ancestorCount;
      ancestorCount++;
    } else if (cellY === newSourceY) {
      // sibling / same generation
      newY = `y${sourceY}`;
      counter = siblingCount;
      siblingCount++;
    } else {
      // descendant
      newY = `y${sourceY - 1}`;
      counter = descendantCount;
      descendantCount++;
    }

    let newX: string;
    if (counter % 2 === 0) {
      const leftMost = findLeftMostX(newY, result);
      newX = leftMost !== null ? `x${leftMost - 1}` : 'x11';
    } else {
      const rightMost = findRightMostX(newY, result);
      newX = rightMost !== null ? `x${rightMost + 1}` : 'x11';
    }

    const mergedCell: GridCell = {
      ...cell,
      group: newX,
      variable: newY,
    };

    // Replace an existing empty cell at this position, or add new
    const existingIdx = result.findIndex(
      d => d.group === newX && d.variable === newY
    );
    if (existingIdx !== -1) {
      result[existingIdx] = mergedCell;
    } else {
      result.push(mergedCell);
    }

    existingNodeIDs.add(cell.personID);
  }

  // Ensure the grid is rectangular: fill any missing positions with empty cells
  const allGroups = new Set(result.map(d => d.group));
  const allVars = new Set(result.map(d => d.variable));
  const positionSet = new Set(result.map(d => `${d.group}:${d.variable}`));

  for (const g of allGroups) {
    for (const v of allVars) {
      const key = `${g}:${v}`;
      if (!positionSet.has(key)) {
        result.push(makeEmptyCell(g, v));
        positionSet.add(key);
      }
    }
  }

  return result;
}
