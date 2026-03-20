import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from 'react';
import type { TreeState, GridCell, PersonNode, KinshipEdge } from '../types';

// Actions
export type TreeAction =
  | { type: 'SEARCH_START'; query: string }
  | { type: 'SEARCH_SUCCESS'; personID: number; gridData: GridCell[]; nodes: Map<number, PersonNode>; edges: KinshipEdge[] }
  | { type: 'SEARCH_ERROR'; error: string }
  | { type: 'EXPAND_START'; personID: number }
  | { type: 'EXPAND_SUCCESS'; gridData: GridCell[]; nodes: Map<number, PersonNode>; edges: KinshipEdge[] }
  | { type: 'SELECT_PERSON'; personID: number | null }
  | { type: 'SET_LANGUAGE'; language: 'en' | 'zh' }
  | { type: 'SET_FILTER_MODE'; mode: 'entry' | 'connections' }
  | { type: 'TOGGLE_RELATIONSHIP_FILTER'; relationship: string }
  | { type: 'SET_GENDER_FILTER'; gender: 'all' | 'male' | 'female' }
  | { type: 'ADD_EXPANDED'; personID: number };

interface ExtendedTreeState extends TreeState {
  expandedPersonIDs: Set<number>;
}

const initialState: ExtendedTreeState = {
  rootPersonID: null,
  searchQuery: '',
  nodes: new Map(),
  gridData: [],
  edges: [],
  filters: {
    relationshipTypes: new Set(),
    gender: 'all',
    displayMode: 'entry',
  },
  loading: false,
  error: null,
  selectedPersonID: null,
  language: 'en',
  expandedPersonIDs: new Set(),
};

function toggleInSet(set: Set<string>, item: string): Set<string> {
  const next = new Set(set);
  if (next.has(item)) {
    next.delete(item);
  } else {
    next.add(item);
  }
  return next;
}

function treeReducer(state: ExtendedTreeState, action: TreeAction): ExtendedTreeState {
  switch (action.type) {
    case 'SEARCH_START':
      return {
        ...state,
        loading: true,
        error: null,
        searchQuery: action.query,
        expandedPersonIDs: new Set(),
        selectedPersonID: null,
      };
    case 'SEARCH_SUCCESS':
      return {
        ...state,
        loading: false,
        rootPersonID: action.personID,
        gridData: action.gridData,
        nodes: action.nodes,
        edges: action.edges,
        error: null,
      };
    case 'SEARCH_ERROR':
      return { ...state, loading: false, error: action.error };
    case 'EXPAND_START':
      return { ...state, loading: true };
    case 'EXPAND_SUCCESS':
      return {
        ...state,
        loading: false,
        gridData: action.gridData,
        nodes: action.nodes,
        edges: action.edges,
      };
    case 'ADD_EXPANDED': {
      const next = new Set(state.expandedPersonIDs);
      next.add(action.personID);
      return { ...state, expandedPersonIDs: next };
    }
    case 'SELECT_PERSON':
      return { ...state, selectedPersonID: action.personID };
    case 'SET_LANGUAGE':
      return { ...state, language: action.language };
    case 'SET_FILTER_MODE':
      return {
        ...state,
        filters: { ...state.filters, displayMode: action.mode },
      };
    case 'TOGGLE_RELATIONSHIP_FILTER':
      return {
        ...state,
        filters: {
          ...state.filters,
          relationshipTypes: toggleInSet(state.filters.relationshipTypes, action.relationship),
        },
      };
    case 'SET_GENDER_FILTER':
      return {
        ...state,
        filters: { ...state.filters, gender: action.gender },
      };
    default:
      return state;
  }
}

const TreeStateContext = createContext<ExtendedTreeState>(initialState);
const TreeDispatchContext = createContext<Dispatch<TreeAction>>(() => {});

export function TreeProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(treeReducer, initialState);
  return (
    <TreeStateContext.Provider value={state}>
      <TreeDispatchContext.Provider value={dispatch}>
        {children}
      </TreeDispatchContext.Provider>
    </TreeStateContext.Provider>
  );
}

export function useTreeState() {
  return useContext(TreeStateContext);
}

export function useTreeDispatch() {
  return useContext(TreeDispatchContext);
}
