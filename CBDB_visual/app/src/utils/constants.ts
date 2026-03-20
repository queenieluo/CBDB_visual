// API endpoints
export const API = {
  CSV_BASE: 'https://raw.githubusercontent.com/queenieluo/kinship_visualization/main/data/',
  KINSHIP_PATH_BASE: 'https://raw.githubusercontent.com/queenieluo/kinship_visualization/main/connection_data/',
  FETCH_PERSON: 'https://c8tgyk9ita.execute-api.us-east-2.amazonaws.com/ChinaBiographicalDatabase_FetchPerson',
  APPEND_TREE: 'https://aoq5sx2gi6.execute-api.us-east-2.amazonaws.com/default/ChinaBiographicalDatabase_AppendTree',
} as const;

// Gender-aware generation color palette
// Male: cool slate-blue gradient (lighter = older generation)
// Female: warm rose gradient (lighter = older generation)
export const MALE_GENERATION_COLORS = [
  '#1B4B72', // -2 or lower (grandchild+)
  '#2D6490', // -1 (child)
  '#4A7FA8', //  0 (same generation)
  '#6B9BC0', // +1 (parent)
  '#A8C4D8', // +2 or higher (grandparent+)
];

export const FEMALE_GENERATION_COLORS = [
  '#7A2844', // -2 or lower (grandchild+)
  '#9E3A5C', // -1 (child)
  '#B85070', // +1 (same generation)
  '#CF7B96', // +1 (parent)
  '#E0A8B8', // +2 or higher (grandparent+)
];

export const EGO_COLOR = '#C8952E';
export const UNKNOWN_COLOR = '#B8BCC4';

// Relationships classified by gender
export const FEMALE_RELATIONS = new Set([
  'mother', 'sister', 'daughter', 'wife', 'spouse', 'concubine',
  'mother-in-law', 'daughter-in-law', 'granddaughter',
  'grandmother', 'maternal grandmother',
]);

export const MALE_RELATIONS = new Set([
  'father', 'brother', 'son', 'husband',
  'father-in-law', 'son-in-law', 'grandson',
  'grandfather', 'maternal grandfather',
  'brother-in-law', 'grandson-in-law',
]);

// Grid layout
export const GRID = {
  MARGIN: { top: 40, right: 20, bottom: 30, left: 40 },
  DEFAULT_WIDTH: 900,
  DEFAULT_HEIGHT: 500,
  CELL_PADDING: 0.05,
  CELL_BORDER_RADIUS: 10,
} as const;

// Light text colors for dark backgrounds
export const LIGHT_TEXT_RELATIONS = new Set([
  'father', 'mother', 'brother', 'sister', 'daughter', 'husband', 'wife', 'spouse', 'ancestor', 'dynamic',
]);

// Legend colors keyed by relationship
export const RELATIONSHIP_COLORS: Record<string, string> = {
  ego: EGO_COLOR,
  father: MALE_GENERATION_COLORS[3],
  mother: FEMALE_GENERATION_COLORS[3],
  brother: MALE_GENERATION_COLORS[2],
  sister: FEMALE_GENERATION_COLORS[2],
  son: MALE_GENERATION_COLORS[1],
  daughter: FEMALE_GENERATION_COLORS[1],
  spouse: '#9E3A5C',
  concubine: '#CF7B96',
};
