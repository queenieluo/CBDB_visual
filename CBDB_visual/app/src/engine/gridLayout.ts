import * as d3 from 'd3';
import { GRID } from '../utils/constants';
import type { GridCell } from '../types';

export interface GridScales {
  x: d3.ScaleBand<string>;
  y: d3.ScaleBand<string>;
  groups: string[];
  vars: string[];
  width: number;
  height: number;
}

/**
 * Build D3 scaleBand axes from grid data.
 */
export function buildGridScales(
  data: GridCell[],
  width: number = GRID.DEFAULT_WIDTH,
  height: number = GRID.DEFAULT_HEIGHT,
): GridScales {
  const innerWidth = width - GRID.MARGIN.left - GRID.MARGIN.right;
  const innerHeight = height - GRID.MARGIN.top - GRID.MARGIN.bottom;

  const groups = [...new Set(data.map(d => d.group))].sort(
    (a, b) => parseInt(a.replace('x', '')) - parseInt(b.replace('x', ''))
  );
  const vars = [...new Set(data.map(d => d.variable))].sort(
    (a, b) => parseInt(a.replace('y', '')) - parseInt(b.replace('y', ''))
  );

  const x = d3.scaleBand<string>()
    .range([0, innerWidth])
    .domain(groups)
    .padding(GRID.CELL_PADDING);

  const y = d3.scaleBand<string>()
    .range([innerHeight, 0])
    .domain(vars)
    .padding(GRID.CELL_PADDING);

  return { x, y, groups, vars, width: innerWidth, height: innerHeight };
}
