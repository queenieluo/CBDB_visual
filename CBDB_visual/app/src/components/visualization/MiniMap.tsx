import { useMemo } from 'react';
import { getCellColor } from '../../engine/colorScale';
import type { GridCell } from '../../types';

interface Props {
  data: GridCell[];
  viewTransform: { k: number; x: number; y: number };
  fullWidth: number;
  fullHeight: number;
}

const MINI_W = 160;
const MINI_H = 90;

export function MiniMap({ data, viewTransform, fullWidth, fullHeight }: Props) {
  const activeCells = useMemo(
    () => data.filter(c => !c.isEmpty && c.personID > 0),
    [data]
  );

  if (activeCells.length === 0) return null;

  // Compute bounds of all cells by parsing group/variable
  const coords = useMemo(() => {
    const xs = data.map(c => parseInt(c.group.replace('x', ''), 10));
    const ys = data.map(c => parseInt(c.variable.replace('y', ''), 10));
    return {
      minX: Math.min(...xs), maxX: Math.max(...xs),
      minY: Math.min(...ys), maxY: Math.max(...ys),
    };
  }, [data]);

  const rangeX = coords.maxX - coords.minX + 1;
  const rangeY = coords.maxY - coords.minY + 1;
  const cellW = MINI_W / rangeX;
  const cellH = MINI_H / rangeY;

  // Viewport rect in minimap coordinates
  const vw = MINI_W / viewTransform.k;
  const vh = MINI_H / viewTransform.k;
  const vx = -viewTransform.x / viewTransform.k / fullWidth * MINI_W;
  const vy = -viewTransform.y / viewTransform.k / fullHeight * MINI_H;

  return (
    <div className="minimap">
      <svg width={MINI_W} height={MINI_H} className="minimap-svg">
        {/* Background */}
        <rect width={MINI_W} height={MINI_H} fill="#ecedf1" rx={4} />

        {/* Cell dots */}
        {activeCells.map(cell => {
          const cx = (parseInt(cell.group.replace('x', ''), 10) - coords.minX) * cellW;
          const cy = MINI_H - (parseInt(cell.variable.replace('y', ''), 10) - coords.minY + 1) * cellH;
          return (
            <rect
              key={`${cell.group}:${cell.variable}`}
              x={cx + 1}
              y={cy + 1}
              width={Math.max(cellW - 2, 3)}
              height={Math.max(cellH - 2, 3)}
              rx={2}
              fill={getCellColor(cell.value) || '#ccc'}
              opacity={0.8}
            />
          );
        })}

        {/* Viewport indicator */}
        {viewTransform.k !== 1 && (
          <rect
            x={Math.max(0, vx)}
            y={Math.max(0, vy)}
            width={Math.min(vw, MINI_W)}
            height={Math.min(vh, MINI_H)}
            fill="none"
            stroke="var(--color-primary, #4656b5)"
            strokeWidth={1.5}
            rx={2}
          />
        )}
      </svg>
    </div>
  );
}
