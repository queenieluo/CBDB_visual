export interface PersonNode {
  personID: number;
  name: string;
  chineseName: string;
  group: string;       // x-position label, e.g. "x5"
  variable: string;    // y-position label, e.g. "y3"
  value: number;       // color-mapped relationship code
  text: string;        // display text in cell
  info: string;        // tooltip info
  entry: string;       // entry info string
  assoc_num: number;   // association count
  kinshipClass: string; // e.g. "father", "mother", "son", "root"
}

export interface GridCell {
  personID: number;
  group: string;
  variable: string;
  value: number;
  text: string;
  info: string;
  entry: string;
  assoc_num: number;
  isEmpty: boolean;
  dynasty?: string;
  yearBirth?: string;
  yearDeath?: string;
  examStatus?: string;
}

export interface KinshipEdge {
  sourceID: number;
  targetID: number;
  relationship: string;
  sourceGroup: string;
  sourceVariable: string;
  targetGroup: string;
  targetVariable: string;
}

export interface FilterState {
  relationshipTypes: Set<string>;
  gender: 'all' | 'male' | 'female';
  displayMode: 'entry' | 'connections';
}

export interface TreeState {
  rootPersonID: number | null;
  searchQuery: string;
  nodes: Map<number, PersonNode>;
  gridData: GridCell[];
  edges: KinshipEdge[];
  filters: FilterState;
  loading: boolean;
  error: string | null;
  selectedPersonID: number | null;
  language: 'en' | 'zh';
}

// Raw CSV row from the data files
export interface RawCSVRow {
  group: string;
  variable: string;
  personID: string;
  value: string;
  text: string;
  info: string;
  entry: string;
  assoc_num: string;
  dynasty?: string;
  yearBirth?: string;
  yearDeath?: string;
  examStatus?: string;
}

// Tree JSON shape (from demo/test2.json / Lambda API)
export interface TreePerson {
  name: string;
  class: string;
  textClass: string;
  extra: { personID: number };
  children?: TreePerson[];
  ancestors?: TreePerson[];
  marriages?: { spouse: TreePerson }[];
}
