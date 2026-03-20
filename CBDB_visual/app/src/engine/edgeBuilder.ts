import type { GridCell, KinshipEdge } from '../types';

/**
 * Parse relationship from the info string, e.g. "王益 (7082) - Father" → "father"
 */
function parseRelationship(info: string): string {
  const match = info.match(/- (.+)$/);
  if (!match) return 'unknown';
  return match[1].trim().toLowerCase();
}

function parseCoord(s: string): number {
  return parseInt(s.replace(/[xy]/, ''), 10);
}

/**
 * Derive edges between cells based on their grid positions and relationship info.
 * Parent-child: connected by adjacent y-levels.
 * Spouse: same y-level, adjacent x.
 */
export function buildEdges(
  gridData: GridCell[],
  rootPersonID: number | null
): KinshipEdge[] {
  const edges: KinshipEdge[] = [];
  const activeCells = gridData.filter(c => !c.isEmpty && c.personID > 0);

  // Find the ego/root cell
  const rootCell = activeCells.find(c => c.personID === rootPersonID);
  if (!rootCell) return edges;

  const rootY = parseCoord(rootCell.variable);

  for (const cell of activeCells) {
    if (cell.personID === rootPersonID) continue;

    const cellY = parseCoord(cell.variable);
    const rel = parseRelationship(cell.info);

    if (cellY > rootY) {
      // Ancestor → edge from cell down to root
      edges.push({
        sourceID: cell.personID,
        targetID: rootPersonID!,
        relationship: rel,
        sourceGroup: cell.group,
        sourceVariable: cell.variable,
        targetGroup: rootCell.group,
        targetVariable: rootCell.variable,
      });
    } else if (cellY < rootY) {
      // Descendant → edge from root down to cell
      edges.push({
        sourceID: rootPersonID!,
        targetID: cell.personID,
        relationship: rel,
        sourceGroup: rootCell.group,
        sourceVariable: rootCell.variable,
        targetGroup: cell.group,
        targetVariable: cell.variable,
      });
    } else {
      // Same generation: spouse or sibling
      edges.push({
        sourceID: rootPersonID!,
        targetID: cell.personID,
        relationship: rel,
        sourceGroup: rootCell.group,
        sourceVariable: rootCell.variable,
        targetGroup: cell.group,
        targetVariable: cell.variable,
      });
    }
  }

  return edges;
}
