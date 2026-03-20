import { type MouseEvent } from 'react';
import { getCellColorByGeneration, shouldUseLightText } from '../../engine/colorScale';
import { GRID } from '../../utils/constants';
import type { GridCell as GridCellType } from '../../types';

interface Props {
  cell: GridCellType;
  x: number;
  y: number;
  width: number;
  height: number;
  generationDelta: number;
  isExpanded: boolean;
  isDimmed: boolean;
  isSelected: boolean;
  onMouseEnter: (e: MouseEvent, cell: GridCellType) => void;
  onMouseMove: (e: MouseEvent) => void;
  onMouseLeave: () => void;
  onClick: (cell: GridCellType) => void;
}

export function GridCellComponent({
  cell, x, y, width, height, generationDelta, isExpanded, isDimmed, isSelected,
  onMouseEnter, onMouseMove, onMouseLeave, onClick,
}: Props) {
  const hasContent = !cell.isEmpty && cell.personID > 0;
  const fillColor = hasContent ? getCellColorByGeneration(cell.info, generationDelta) : 'transparent';
  const lightText = hasContent && shouldUseLightText(cell.info, generationDelta);

  return (
    <g
      className={`grid-cell ${hasContent ? 'grid-cell--active' : ''}`}
      style={{ transition: 'transform 0.3s ease' }}
    >
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={GRID.CELL_BORDER_RADIUS}
        ry={GRID.CELL_BORDER_RADIUS}
        fill={fillColor}
        stroke={isSelected ? '#1a1a2e' : hasContent ? 'rgba(0,0,0,0.12)' : 'transparent'}
        strokeWidth={isSelected ? 2.5 : hasContent ? 1 : 0}
        opacity={hasContent ? (isDimmed ? 0.25 : 0.92) : 0}
        className="cell-rect"
        style={{ cursor: hasContent ? 'pointer' : 'default' }}
        onMouseEnter={hasContent ? (e) => onMouseEnter(e, cell) : undefined}
        onMouseMove={hasContent ? onMouseMove : undefined}
        onMouseLeave={hasContent ? onMouseLeave : undefined}
        onClick={hasContent ? () => onClick(cell) : undefined}
      />
      {hasContent && (
        <text
          x={x + width / 2}
          y={y + height / 2}
          textAnchor="middle"
          dominantBaseline="central"
          className="cell-text"
          pointerEvents="none"
          opacity={isDimmed ? 0.3 : 1}
          fill={lightText ? '#fff' : '#1a1a2e'}
        >
          {cell.text}
        </text>
      )}
      {/* Expand indicator */}
      {hasContent && !isExpanded && (
        <g pointerEvents="none">
          <circle
            cx={x + width - 8}
            cy={y + 8}
            r={7}
            fill="rgba(0,0,0,0.35)"
            opacity={isDimmed ? 0.2 : 0.85}
            className="expand-badge"
          />
          <text
            x={x + width - 8}
            y={y + 8}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#fff"
            fontSize={11}
            fontWeight={700}
            opacity={isDimmed ? 0.2 : 1}
          >
            +
          </text>
        </g>
      )}
    </g>
  );
}
