import { type MouseEvent, useRef, useMemo } from 'react';
import { buildGridScales } from '../../engine/gridLayout';
import { GRID } from '../../utils/constants';
import { GridCellComponent } from './GridCell';
import { ConnectionLines } from './ConnectionLines';
import { MiniMap } from './MiniMap';
import { useD3Zoom } from '../../hooks/useD3Zoom';
import type { GridCell, KinshipEdge } from '../../types';

interface Props {
  data: GridCell[];
  edges: KinshipEdge[];
  expandedIDs: Set<number>;
  dimmedCells: Set<number>;
  dimmedEdges: Set<string>;
  selectedPersonID: number | null;
  egoVariable: string | null;
  onCellHover: (e: MouseEvent, cell: GridCell) => void;
  onCellMove: (e: MouseEvent) => void;
  onCellLeave: () => void;
  onCellClick: (cell: GridCell) => void;
  width?: number;
  height?: number;
}

function parseY(v: string): number {
  return parseInt(v.replace('y', ''), 10);
}

export function Grid({
  data, edges, expandedIDs, dimmedCells, dimmedEdges, selectedPersonID, egoVariable,
  onCellHover, onCellMove, onCellLeave, onCellClick,
  width = GRID.DEFAULT_WIDTH, height = GRID.DEFAULT_HEIGHT,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const { transform, zoomIn, zoomOut, resetZoom } = useD3Zoom(svgRef);
  const scales = buildGridScales(data, width, height);

  const egoY = egoVariable ? parseY(egoVariable) : null;

  // Precompute generation deltas
  const genDeltas = useMemo(() => {
    const map = new Map<string, number>();
    if (egoY === null) return map;
    for (const cell of data) {
      const key = `${cell.group}:${cell.variable}`;
      map.set(key, parseY(cell.variable) - egoY);
    }
    return map;
  }, [data, egoY]);

  return (
    <div className="grid-wrapper">
      <div className="zoom-controls">
        <button className="zoom-btn" onClick={zoomIn} title="Zoom in">+</button>
        <button className="zoom-btn" onClick={zoomOut} title="Zoom out">&minus;</button>
        <button className="zoom-btn zoom-btn--reset" onClick={resetZoom} title="Reset">&#8634;</button>
      </div>
      <svg
        ref={svgRef}
        className="grid-svg"
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
      >
        <g className="zoom-group">
          <g transform={`translate(${GRID.MARGIN.left},${GRID.MARGIN.top})`}>
            {/* Connection lines (behind cells) */}
            <ConnectionLines edges={edges} scales={scales} dimmedEdges={dimmedEdges} />

            {/* Y axis labels — generation relative to ego */}
            {scales.vars.map(v => {
              const delta = egoY !== null ? parseY(v) - egoY : null;
              const label = delta === null ? v
                : delta === 0 ? 'Ego Gen'
                : delta > 0 ? `Gen +${delta}`
                : `Gen ${delta}`;
              return (
                <text
                  key={v}
                  x={-10}
                  y={(scales.y(v) ?? 0) + scales.y.bandwidth() / 2}
                  textAnchor="end"
                  dominantBaseline="central"
                  className="axis-label"
                  fontWeight={delta === 0 ? 600 : 400}
                >
                  {label}
                </text>
              );
            })}

            {/* Cells */}
            {data.map(cell => {
              const cx = scales.x(cell.group);
              const cy = scales.y(cell.variable);
              if (cx === undefined || cy === undefined) return null;
              const key = `${cell.group}:${cell.variable}`;
              return (
                <GridCellComponent
                  key={key}
                  cell={cell}
                  x={cx}
                  y={cy}
                  width={scales.x.bandwidth()}
                  height={scales.y.bandwidth()}
                  generationDelta={genDeltas.get(key) ?? 0}
                  isExpanded={expandedIDs.has(cell.personID)}
                  isDimmed={dimmedCells.has(cell.personID)}
                  isSelected={cell.personID === selectedPersonID}
                  onMouseEnter={onCellHover}
                  onMouseMove={onCellMove}
                  onMouseLeave={onCellLeave}
                  onClick={onCellClick}
                />
              );
            })}
          </g>
        </g>
      </svg>
      <MiniMap
        data={data}
        viewTransform={transform}
        fullWidth={width}
        fullHeight={height}
      />
    </div>
  );
}
