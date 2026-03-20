import { useState, useCallback, useRef } from 'react';
import { fetchKinshipPath } from '../api';
import { useTreeState } from '../state/TreeContext';

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  info: string;
  kinshipPath: string | null;
  personID: number;
}

export function useTooltip() {
  const { rootPersonID } = useTreeState();
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false, x: 0, y: 0, info: '', kinshipPath: null, personID: -1,
  });
  const kinshipCache = useRef<Map<string, string | null>>(new Map());

  const showTooltip = useCallback(async (
    x: number, y: number, info: string, personID: number
  ) => {
    setTooltip({ visible: true, x, y, info, kinshipPath: null, personID });

    if (rootPersonID && personID > 0) {
      const cacheKey = `${rootPersonID}-${personID}`;
      let path = kinshipCache.current.get(cacheKey);
      if (path === undefined) {
        path = await fetchKinshipPath(rootPersonID, personID);
        kinshipCache.current.set(cacheKey, path);
      }
      setTooltip(prev =>
        prev.personID === personID ? { ...prev, kinshipPath: path ?? null } : prev
      );
    }
  }, [rootPersonID]);

  const moveTooltip = useCallback((x: number, y: number) => {
    setTooltip(prev => ({ ...prev, x, y }));
  }, []);

  const hideTooltip = useCallback(() => {
    setTooltip(prev => ({ ...prev, visible: false }));
  }, []);

  return { tooltip, showTooltip, moveTooltip, hideTooltip };
}
