import { useCallback } from 'react';
import { useTreeState, useTreeDispatch } from '../state/TreeContext';
import { fetchPersonCSV } from '../api';
import { mergeNodes } from '../engine/mergeNodes';
import { buildEdges } from '../engine/edgeBuilder';
import type { PersonNode, GridCell } from '../types';

function gridCellsToNodes(cells: GridCell[]): Map<number, PersonNode> {
  const nodes = new Map<number, PersonNode>();
  for (const cell of cells) {
    if (!cell.isEmpty && cell.personID > 0) {
      nodes.set(cell.personID, {
        personID: cell.personID,
        name: cell.text,
        chineseName: cell.text,
        group: cell.group,
        variable: cell.variable,
        value: cell.value,
        text: cell.text,
        info: cell.info,
        entry: cell.entry,
        assoc_num: cell.assoc_num,
        kinshipClass: '',
      });
    }
  }
  return nodes;
}

export function usePersonData() {
  const state = useTreeState();
  const dispatch = useTreeDispatch();

  const searchPerson = useCallback(async (personID: number) => {
    dispatch({ type: 'SEARCH_START', query: String(personID) });
    try {
      const gridData = await fetchPersonCSV(personID);
      const nodes = gridCellsToNodes(gridData);
      const edges = buildEdges(gridData, personID);
      dispatch({ type: 'SEARCH_SUCCESS', personID, gridData, nodes, edges });
      console.log(`[CBDB] Loaded ${gridData.length} cells, ${edges.length} edges for person ${personID}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch data';
      dispatch({ type: 'SEARCH_ERROR', error: message });
    }
  }, [dispatch]);

  const expandPerson = useCallback(async (cell: GridCell) => {
    if (cell.isEmpty || cell.personID <= 0) return;

    dispatch({ type: 'EXPAND_START', personID: cell.personID });
    try {
      const newData = await fetchPersonCSV(cell.personID);
      if (newData.length === 0) {
        // No data for this person, just mark as expanded
        dispatch({ type: 'ADD_EXPANDED', personID: cell.personID });
        dispatch({
          type: 'EXPAND_SUCCESS',
          gridData: state.gridData,
          nodes: state.nodes,
          edges: state.edges,
        });
        return;
      }

      const existingNodeIDs = new Set(
        state.gridData.filter(c => !c.isEmpty && c.personID > 0).map(c => c.personID)
      );
      const merged = mergeNodes(state.gridData, existingNodeIDs, newData, cell);
      const nodes = gridCellsToNodes(merged);
      const edges = buildEdges(merged, state.rootPersonID);

      dispatch({ type: 'ADD_EXPANDED', personID: cell.personID });
      dispatch({ type: 'EXPAND_SUCCESS', gridData: merged, nodes, edges });
      console.log(`[CBDB] Expanded person ${cell.personID}, now ${merged.length} cells, ${edges.length} edges`);
    } catch (err) {
      console.warn(`[CBDB] Failed to expand person ${cell.personID}:`, err);
      // Don't show error banner for failed expansion, just mark expanded
      dispatch({ type: 'ADD_EXPANDED', personID: cell.personID });
      dispatch({
        type: 'EXPAND_SUCCESS',
        gridData: state.gridData,
        nodes: state.nodes,
        edges: state.edges,
      });
    }
  }, [dispatch, state.gridData, state.nodes, state.edges, state.rootPersonID]);

  return { ...state, searchPerson, expandPerson };
}
