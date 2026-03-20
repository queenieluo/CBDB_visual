import type { KinshipEdge } from '../../types';
import type { GridScales } from '../../engine/gridLayout';

interface Props {
  edges: KinshipEdge[];
  scales: GridScales;
  dimmedEdges: Set<string>;
}

export function ConnectionLines({ edges, scales, dimmedEdges }: Props) {
  const halfW = scales.x.bandwidth() / 2;
  const halfH = scales.y.bandwidth() / 2;

  return (
    <g className="connection-lines">
      {edges.map((edge, i) => {
        const sx = (scales.x(edge.sourceGroup) ?? 0) + halfW;
        const sy = (scales.y(edge.sourceVariable) ?? 0) + halfH;
        const tx = (scales.x(edge.targetGroup) ?? 0) + halfW;
        const ty = (scales.y(edge.targetVariable) ?? 0) + halfH;

        const isSpouse = edge.relationship.includes('spouse') ||
          edge.relationship.includes('wife') ||
          edge.relationship.includes('husband');

        const edgeKey = `${edge.sourceID}-${edge.targetID}`;
        const isDimmed = dimmedEdges.size > 0 && dimmedEdges.has(edgeKey);

        // Straight line for same-row (spouses/siblings), bezier for vertical
        const isSameRow = edge.sourceVariable === edge.targetVariable;
        const d = isSameRow
          ? `M ${sx} ${sy} L ${tx} ${ty}`
          : `M ${sx} ${sy} C ${sx} ${(sy + ty) / 2}, ${tx} ${(sy + ty) / 2}, ${tx} ${ty}`;

        return (
          <path
            key={i}
            d={d}
            fill="none"
            stroke={isSpouse ? '#e2403b' : '#888'}
            strokeWidth={isSpouse ? 2 : 1.5}
            strokeDasharray={isSpouse ? '6,3' : 'none'}
            opacity={isDimmed ? 0.15 : 0.6}
            className="connection-line"
          />
        );
      })}
    </g>
  );
}
