import { useEffect, useRef, useCallback, useState } from 'react';
import * as d3 from 'd3';

interface ZoomState {
  k: number;
  x: number;
  y: number;
}

export function useD3Zoom(svgRef: React.RefObject<SVGSVGElement | null>) {
  const zoomBehavior = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [transform, setTransform] = useState<ZoomState>({ k: 1, x: 0, y: 0 });

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 4])
      .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        const { k, x, y } = event.transform;
        setTransform({ k, x, y });
        const g = svg.querySelector<SVGGElement>('.zoom-group');
        if (g) {
          g.setAttribute('transform', `translate(${x},${y}) scale(${k})`);
        }
      });

    zoomBehavior.current = zoom;
    d3.select(svg).call(zoom);

    return () => {
      d3.select(svg).on('.zoom', null);
    };
  }, [svgRef]);

  const zoomIn = useCallback(() => {
    const svg = svgRef.current;
    if (!svg || !zoomBehavior.current) return;
    d3.select(svg).transition().duration(300).call(
      zoomBehavior.current.scaleBy, 1.4
    );
  }, [svgRef]);

  const zoomOut = useCallback(() => {
    const svg = svgRef.current;
    if (!svg || !zoomBehavior.current) return;
    d3.select(svg).transition().duration(300).call(
      zoomBehavior.current.scaleBy, 1 / 1.4
    );
  }, [svgRef]);

  const resetZoom = useCallback(() => {
    const svg = svgRef.current;
    if (!svg || !zoomBehavior.current) return;
    d3.select(svg).transition().duration(300).call(
      zoomBehavior.current.transform, d3.zoomIdentity
    );
  }, [svgRef]);

  return { transform, zoomIn, zoomOut, resetZoom };
}
