import { API } from '../utils/constants';
import type { GridCell, RawCSVRow, TreePerson } from '../types';

function parseCSVRow(row: RawCSVRow): GridCell {
  const personID = row.personID ? Math.round(Number(row.personID)) : -1;
  return {
    personID,
    group: row.group,
    variable: row.variable,
    value: Number(row.value) || 0,
    text: row.text || '',
    info: row.info || '',
    entry: row.entry || '',
    assoc_num: Number(row.assoc_num) || 0,
    isEmpty: personID < 0 || !row.personID,
    dynasty: row.dynasty || '',
    yearBirth: row.yearBirth || '',
    yearDeath: row.yearDeath || '',
    examStatus: row.examStatus || '',
  };
}

function parseCSVText(text: string): GridCell[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = (values[i] || '').trim();
    });
    return parseCSVRow(row as unknown as RawCSVRow);
  });
}

/**
 * Returns true if text looks like HTML rather than CSV/plain text.
 */
function isHTML(text: string): boolean {
  return text.trimStart().startsWith('<!') || text.trimStart().startsWith('<html') || text.includes('<div');
}

/**
 * Try local data first (public/data/), then fall back to remote GitHub.
 */
export async function fetchPersonCSV(personID: number): Promise<GridCell[]> {
  // Try local data first
  const localUrl = `${import.meta.env.BASE_URL}data/${personID}.csv`;
  try {
    const localResponse = await fetch(localUrl);
    if (localResponse.ok) {
      const text = await localResponse.text();
      if (!isHTML(text)) {
        const cells = parseCSVText(text);
        if (cells.length > 0) {
          console.log(`[CBDB] Loaded local data for person ${personID}`);
          return cells;
        }
      }
    }
  } catch {
    // local not available, try remote
  }

  // Fall back to remote GitHub
  const remoteUrl = `${API.CSV_BASE}${personID}.csv`;
  const response = await fetch(remoteUrl);
  if (!response.ok) {
    throw new Error(`No data found for person ${personID}. Try person ID 1762 (王安石) which has local sample data.`);
  }
  const text = await response.text();
  if (isHTML(text)) {
    throw new Error(`No data found for person ${personID}.`);
  }
  return parseCSVText(text);
}

/**
 * Try local kinship path first, then remote.
 */
export async function fetchKinshipPath(rootID: number, targetID: number): Promise<string | null> {
  // Try local
  const localUrl = `${import.meta.env.BASE_URL}data/kinship/${rootID}-${targetID}.txt`;
  try {
    const localResponse = await fetch(localUrl);
    if (localResponse.ok) {
      const text = await localResponse.text();
      if (text && text.trim() && !isHTML(text)) return text.trim();
    }
  } catch {
    // fall through
  }

  // Try remote
  const remoteUrl = `${API.KINSHIP_PATH_BASE}${rootID}-${targetID}.txt`;
  try {
    const response = await fetch(remoteUrl);
    if (!response.ok) return null;
    const text = await response.text();
    return text && text !== 'null' ? text.trim() : null;
  } catch {
    return null;
  }
}

export interface SearchEntry {
  id: number;
  name: string;
  en: string;
  dynasty: string;
  hasKin: boolean;
}

let searchIndexCache: SearchEntry[] | null = null;

export async function fetchSearchIndex(): Promise<SearchEntry[]> {
  if (searchIndexCache) return searchIndexCache;
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}data/search-index.json`);
    if (!response.ok) return [];
    searchIndexCache = await response.json();
    return searchIndexCache!;
  } catch {
    return [];
  }
}

export async function fetchPersonByName(name: string): Promise<TreePerson | null> {
  const url = `${API.FETCH_PERSON}?name=${encodeURIComponent(name)}`;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export async function appendTree(
  personID: number,
  direction: 'ancestor' | 'descendant'
): Promise<TreePerson | null> {
  const url = `${API.APPEND_TREE}?direction=${direction}&personID=${personID}`;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}
