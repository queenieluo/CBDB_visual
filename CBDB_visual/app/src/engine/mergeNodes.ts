import type { GridCell } from '../types';

/**
 * Parse "x5" → 5, "y3" → 3
 */
function parseCoord(s: string): number {
  return parseInt(s.replace(/[xy]/, ''), 10);
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
 * Derive generation delta from a single relationship keyword.
 * Positive = ancestor (older), negative = descendant (younger).
 */
function partToGen(part: string): number {
  const l = part.toLowerCase().trim();

  // Count "great-" prefixes
  let greatCount = 0;
  let remaining = l;
  while (remaining.includes('great-')) {
    greatCount++;
    remaining = remaining.replace('great-', '');
  }

  // Grandparents/grandchildren (check BEFORE father/son to avoid substring matches)
  if (remaining.includes('grandfather') || remaining.includes('grandmother')) return 2 + greatCount;
  if (remaining.includes('grandson') || remaining.includes('granddaughter')) return -(2 + greatCount);
  if (remaining.includes('grand-uncle') || remaining.includes('grand-aunt')) return 2 + greatCount;
  if (remaining.includes('grand-nephew') || remaining.includes('grand-niece')) return -(2 + greatCount);

  // Parents / ancestors
  if (remaining.includes('father') || remaining.includes('mother')) return 1;
  if (remaining.includes('uncle') || remaining.includes('aunt')) return 1;
  if (remaining.includes('ancestor')) return 1;

  // Children / descendants
  if (remaining.includes('son') || remaining.includes('daughter')) return -1;
  if (remaining.includes('nephew') || remaining.includes('niece')) return -1;
  if (remaining.includes('descendant')) return -1;

  // Same generation (spouse, brother, sister, cousin, in-law, etc.)
  return 0;
}

/**
 * Compute generation relative to root ego from a relationship label.
 * Handles possessive chains like "Father's brother's son" → +1 + 0 + (-1) = 0
 * and composed labels like "Son's grandson" → -1 + (-2) = -3
 */
function labelToGeneration(label: string): number {
  if (!label || label.toLowerCase() === 'ego' || label.toLowerCase() === 'unknown') return 0;

  // Split possessive chain: "Father's brother's son" → ["Father", "brother", "son"]
  const parts = label.split("'s ");
  let total = 0;
  for (const part of parts) {
    total += partToGen(part);
  }
  return total;
}

/**
 * Extract relationship label from info string: "王益 (7082) - Father" → "Father"
 */
function parseRelLabel(info: string): string {
  const match = info.match(/- (.+)$/);
  return match ? match[1].trim() : '';
}

/**
 * Estimate kinship closeness (total step count) from a relationship label.
 * Lower = closer kinship. Uses parenthetical explanation if available.
 */
function labelToCloseness(label: string): number {
  if (!label || label.toLowerCase() === 'ego' || label.toLowerCase() === 'unknown') return 0;

  // Use parenthetical explanation if available (e.g., "Uncle (father's brother)" → "father's brother")
  const parenMatch = label.match(/\(([^)]+)\)/);
  const desc = parenMatch ? parenMatch[1] : label;

  const parts = desc.split("'s ");
  let total = 0;
  for (const part of parts) {
    const l = part.toLowerCase().trim();
    let remaining = l;
    while (remaining.includes('great-')) {
      total++;
      remaining = remaining.replace('great-', '');
    }
    if (remaining.includes('grand')) {
      total += 2;
    } else {
      total += 1;
    }
  }
  return total;
}

/**
 * Check if a relationship label indicates a spouse.
 */
function isSpouseLabel(info: string): boolean {
  const label = parseRelLabel(info).toLowerCase();
  return label.includes('wife') || label.includes('husband') || label.includes('concubine');
}

/**
 * Find the nearest unoccupied x position radiating outward from centerX.
 */
function findNearestUnoccupied(centerX: number, occupiedX: Set<number>): number {
  if (!occupiedX.has(centerX)) return centerX;
  for (let d = 1; d <= 50; d++) {
    if (!occupiedX.has(centerX - d)) return centerX - d;
    if (!occupiedX.has(centerX + d)) return centerX + d;
  }
  return centerX + 51;
}

/**
 * Merge new cells from an expanded person into the existing grid.
 * Uses relationship labels to determine correct generation placement,
 * computing delta = (cell's gen from root) - (expander's gen from root).
 */
export function mergeNodes(
  existingData: GridCell[],
  existingNodeIDs: Set<number>,
  newData: GridCell[],
  sourceCell: GridCell
): GridCell[] {
  const result = [...existingData];
  const sourceY = parseCoord(sourceCell.variable);

  // Group new cells by their generation delta relative to the expanded person.
  // The fetched CSV treats the expanded person as its own ego, so labels like
  // "Grandson" are already relative to the expanded person — no adjustment needed.
  const byDelta = new Map<number, GridCell[]>();

  for (const cell of newData) {
    if (cell.isEmpty || cell.personID <= 0) continue;
    if (existingNodeIDs.has(cell.personID)) continue;

    const cellRel = parseRelLabel(cell.info);
    const delta = labelToGeneration(cellRel);

    if (!byDelta.has(delta)) byDelta.set(delta, []);
    byDelta.get(delta)!.push(cell);
  }

  const sourceX = parseCoord(sourceCell.group);

  // Place cells at the correct y-levels using generation deltas
  // Sort by kinship closeness so closer relatives are placed nearer to source
  for (const [delta, cells] of byDelta) {
    const newY = `y${sourceY + delta}`;

    // Sort cells by closeness (ascending = closest first)
    cells.sort((a, b) =>
      labelToCloseness(parseRelLabel(a.info)) - labelToCloseness(parseRelLabel(b.info))
    );

    // Track occupied x positions at this y-level
    const occupiedX = new Set<number>();
    for (const d of result) {
      if (!d.isEmpty && d.personID > 0 && d.variable === newY) {
        occupiedX.add(parseCoord(d.group));
      }
    }

    for (const cell of cells) {
      const newXNum = findNearestUnoccupied(sourceX, occupiedX);
      const newX = `x${newXNum}`;
      occupiedX.add(newXNum);

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

/**
 * Reorder grid cells so that x-positions reflect kinship closeness to the ego.
 * Closer relatives (fewer kinship steps) are placed nearer to the ego on the x-axis.
 */
export function reorderByCloseness(cells: GridCell[], egoPersonID: number): GridCell[] {
  const egoCell = cells.find(c => c.personID === egoPersonID);
  if (!egoCell) return cells;

  const egoX = parseCoord(egoCell.group);

  // Group non-empty, non-ego cells by y-level
  const byY = new Map<string, GridCell[]>();
  for (const c of cells) {
    if (c.isEmpty || c.personID <= 0 || c.personID === egoPersonID) continue;
    if (!byY.has(c.variable)) byY.set(c.variable, []);
    byY.get(c.variable)!.push({ ...c });
  }

  const result: GridCell[] = [];

  // Place ego unchanged
  result.push({ ...egoCell });

  for (const [yLevel, yCells] of byY) {
    // Sort by closeness (ascending)
    yCells.sort((a, b) =>
      labelToCloseness(parseRelLabel(a.info)) - labelToCloseness(parseRelLabel(b.info))
    );

    const occupiedX = new Set<number>();

    if (yLevel === egoCell.variable) {
      // Ego's row: spouses go right, others go left
      occupiedX.add(egoX);

      const spouses = yCells.filter(c => isSpouseLabel(c.info));
      const others = yCells.filter(c => !isSpouseLabel(c.info));

      // Spouses right of ego, closest first
      let rightX = egoX + 1;
      for (const s of spouses) {
        while (occupiedX.has(rightX)) rightX++;
        result.push({ ...s, group: `x${rightX}` });
        occupiedX.add(rightX);
      }

      // Others left of ego, closest first
      let leftX = egoX - 1;
      for (const o of others) {
        while (occupiedX.has(leftX)) leftX--;
        result.push({ ...o, group: `x${leftX}` });
        occupiedX.add(leftX);
      }
    } else {
      // Non-ego row: radiate from egoX, closest relatives get nearest positions
      for (const c of yCells) {
        const newXNum = findNearestUnoccupied(egoX, occupiedX);
        result.push({ ...c, group: `x${newXNum}` });
        occupiedX.add(newXNum);
      }
    }
  }

  // Fill empty cells to make rectangular grid
  const allGroups = new Set(result.map(d => d.group));
  const allVars = new Set(result.map(d => d.variable));
  const posSet = new Set(result.map(d => `${d.group}:${d.variable}`));

  for (const g of allGroups) {
    for (const v of allVars) {
      const key = `${g}:${v}`;
      if (!posSet.has(key)) {
        result.push(makeEmptyCell(g, v));
        posSet.add(key);
      }
    }
  }

  return result;
}
