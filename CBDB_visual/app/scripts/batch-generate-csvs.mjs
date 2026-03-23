#!/usr/bin/env node
/**
 * Batch-generate CSV files for CBDB persons from raw JSON data.
 *
 * Usage:
 *   node scripts/batch-generate-csvs.mjs [jsonFile]
 *   (defaults to cdbd_data_1_3000.json)
 *
 * Reads CBDB JSON, builds kinship graph, generates one CSV per person
 * with kinship data, plus kinship path files and a search index.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const DATA_DIR = join(import.meta.dirname, '..', 'public', 'data');
const KINSHIP_DIR = join(DATA_DIR, 'kinship');
const CODES_PATH = join(import.meta.dirname, '..', '..', 'KINSHIP_CODES.csv');
const DEFAULT_JSON = join(import.meta.dirname, '..', '..', '..', 'CBDB', 'cdbd_data', 'cdbd_data_1_3000.json');

const jsonPath = process.argv[2] || DEFAULT_JSON;

// ─── Load kinship codes ──────────────────────────────────────────────────────

function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

function loadKinshipCodes() {
  const text = readFileSync(CODES_PATH, 'utf-8');
  const lines = text.trim().split('\n');
  const headers = parseCSVLine(lines[0]);
  const codes = new Map();
  for (let i = 1; i < lines.length; i++) {
    const vals = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((h, j) => { row[h] = (vals[j] || '').trim(); });
    codes.set(row.c_kincode, {
      code: row.c_kincode,
      chn: row.c_kinrel_chn,
      eng: row.c_kinrel,
      alt: row.c_kinrel_alt,
      simplified: row.c_kinrel_simplified,
      upstep: parseFloat(row.c_upstep) || 0,
      dwnstep: parseFloat(row.c_dwnstep) || 0,
      marstep: parseFloat(row.c_marstep) || 0,
      colstep: parseFloat(row.c_colstep) || 0,
    });
  }
  return codes;
}

// ─── Load CBDB JSON and extract person data ──────────────────────────────────

function loadPersons(jsonPath) {
  console.log(`Loading ${jsonPath}...`);
  const raw = JSON.parse(readFileSync(jsonPath, 'utf-8'));
  const persons = new Map(); // personID -> { basic, kin[], entry, addresses }

  for (const item of raw) {
    let person;
    try {
      person = item?.page?.Package?.PersonAuthority?.PersonInfo?.Person;
      if (!person || typeof person === 'string') continue;
    } catch { continue; }

    const basic = person.BasicInfo || {};
    const pid = parseInt(basic.PersonId);
    if (!pid || pid <= 0) continue;

    // Extract kinship
    let kinList = [];
    const kinInfo = person.PersonKinshipInfo;
    if (kinInfo && typeof kinInfo === 'object') {
      const k = kinInfo.Kinship;
      if (Array.isArray(k)) kinList = k;
      else if (k && typeof k === 'object') kinList = [k];
    }

    // Extract entry/exam info
    let examStatus = '';
    const entryInfo = person.PersonEntryInfo;
    if (entryInfo && typeof entryInfo === 'object') {
      let entries = entryInfo.Entry;
      if (!Array.isArray(entries)) entries = entries ? [entries] : [];
      for (const e of entries) {
        if (e.RuShiType) {
          examStatus = e.RuShiType;
          if (e.RuShiYear && e.RuShiYear !== '0') {
            examStatus += ` (${e.RuShiYear})`;
          }
          break; // take first entry
        }
      }
    }

    // Extract native place
    let nativePlace = '';
    const addrInfo = person.PersonAddresses;
    if (addrInfo && typeof addrInfo === 'object') {
      let addrs = addrInfo.Address;
      if (!Array.isArray(addrs)) addrs = addrs ? [addrs] : [];
      for (const a of addrs) {
        if (a.AddrName) { nativePlace = a.AddrName; break; }
      }
    }

    persons.set(pid, {
      id: pid,
      chName: basic.ChName || '',
      engName: basic.EngName || '',
      dynasty: basic.Dynasty || '',
      yearBirth: basic.YearBirth || '',
      yearDeath: basic.YearDeath || '',
      yearsLived: basic.YearsLived || '',
      gender: basic.Gender || '0',
      examStatus,
      nativePlace,
      indexYear: basic.IndexYear || '',
      kin: kinList,
    });
  }

  console.log(`Loaded ${persons.size} persons`);
  return persons;
}

// ─── Map kinship code to relationship label ─────────────────────────────────

// Map CBDB kinship codes to readable English labels
const CODE_TO_ENGLISH = {
  // Parents
  'F': 'Father', 'M': 'Mother',
  'F*': 'Adoptive father', 'M*': 'Adoptive mother',
  'F^': 'Stepfather', 'M^': 'Stepmother',
  'F°': 'Foster father',
  'M~': 'Nominal mother', 'M(C)': 'Mother (concubine)',
  // Grandparents
  'FF': 'Grandfather', 'FM': 'Grandmother',
  'MF': 'Maternal grandfather', 'MM': 'Maternal grandmother',
  'MFF': "Maternal great-grandfather",
  'FFF': 'Great-grandfather', 'FFM': 'Great-grandmother',
  'FFFF': 'Great-great-grandfather', 'FFFM': 'Great-great-grandmother',
  'FFFB': "Great-grandfather's brother",
  // Sons
  'S': 'Son', 'S1': 'First son', 'S2': 'Second son', 'S3': 'Third son',
  'S4': 'Fourth son', 'S5': 'Fifth son', 'S6': 'Sixth son', 'S7': 'Seventh son',
  'S8': 'Eighth son', 'S9': 'Ninth son', 'S10': 'Tenth son',
  'S11': 'Eleventh son', 'S12': 'Twelfth son',
  'Sn': 'Youngest son',
  'S*': 'Adopted son', 'S^': 'Stepson', 'S°': 'Foster son', 'S!': 'Illegitimate son',
  'S (eldest surviving son)': 'Eldest surviving son',
  'S (only son)': 'Only son',
  'S (only surviving son)': 'Only surviving son',
  'CS': "Son (by concubine)",
  // Daughters
  'D': 'Daughter', 'D1': 'First daughter', 'D5': 'Fifth daughter', 'D8': 'Eighth daughter',
  // Spouses
  'W': 'Wife', 'H': 'Husband', 'C': 'Concubine',
  'W1': 'First wife', 'W2': 'Second wife', 'W3': 'Third wife',
  // Siblings
  'B': 'Brother', 'B+': 'Elder brother', 'B-': 'Younger brother', 'B1': 'Eldest brother',
  'Z': 'Sister', 'Z+': 'Elder sister', 'Z-': 'Younger sister',
  'B½+': 'Elder half-brother', 'B½-': 'Younger half-brother', 'B½': 'Half-brother',
  // Uncles & Aunts
  'FB': "Uncle (father's brother)", 'FB+': "Uncle (father's elder brother)",
  'FB-': "Uncle (father's younger brother)", 'FB–': "Uncle (father's younger brother)",
  'FZ': "Aunt (father's sister)",
  'MB': "Uncle (mother's brother)", 'MZ': "Aunt (mother's sister)",
  'FFB': "Grand-uncle (grandfather's brother)",
  'FFB+': "Grand-uncle (grandfather's elder brother)",
  'FFB-': "Grand-uncle (grandfather's younger brother)",
  'FBW': "Uncle's wife",
  // Cousins
  'FBS': "Cousin (father's brother's son)",
  'FBS+': "Elder cousin (paternal)",
  'FBS-': "Younger cousin (paternal)",
  'FBD': "Cousin (father's brother's daughter)", 'FBD-': "Younger female cousin (paternal)",
  'MBS': "Cousin (mother's brother's son)",
  'FZS': "Cousin (father's sister's son)", 'FZS-': "Younger cousin (father's sister's son)",
  'P-(male)': "Younger male cousin",
  'FFBS': "Second cousin (grandfather's brother's grandson)",
  'FFBSS': "Second cousin's son", 'FFBSS-': "Younger second cousin's son",
  'FBSS': "Cousin's son",
  'FBDH': "Cousin's husband (father's brother's daughter's husband)",
  // Nephews & Nieces
  'BS': "Nephew (brother's son)", 'BD': "Niece (brother's daughter)",
  'ZS': "Nephew (sister's son)", 'ZD': "Niece (sister's daughter)",
  'BSS': "Grand-nephew (brother's grandson)",
  'BDS': "Brother's daughter's son",
  'BSSS': "Great-grand-nephew",
  'BSSSSS': "Brother's 5th-gen descendant",
  // In-laws
  'DH': "Son-in-law", 'D1H': "First daughter's husband", 'D2H': "Second daughter's husband",
  'D3H': "Third daughter's husband", 'D4H': "Fourth daughter's husband",
  'D5H': "Fifth daughter's husband", 'D6H': "Sixth daughter's husband",
  'DH2': "Daughter's second husband", 'DH%': "Betrothed son-in-law",
  'DHF': "Son-in-law's father",
  'DDH': "Granddaughter's husband", 'DDS': "Granddaughter's son",
  'SW': "Daughter-in-law (son's wife)", 'SWF': "Daughter-in-law's father",
  'WF': "Father-in-law (wife's father)", 'WM': "Mother-in-law (wife's mother)",
  'HF': "Father-in-law (husband's father)", 'HM': "Mother-in-law (husband's mother)",
  'W1F': "First wife's father", 'W2F': "Second wife's father", 'W3F': "Third wife's father",
  'W4F': "Fourth wife's father", 'W%F': "Betrothed wife's father",
  'W2FF': "Second wife's grandfather", 'W3FF': "Third wife's grandfather",
  'WFF': "Wife's grandfather", 'WMF': "Wife's maternal grandfather",
  'WB': "Wife's brother", 'WB+': "Wife's elder brother",
  'WFB': "Wife's uncle", 'WFBS': "Wife's cousin", 'WFFB': "Wife's grand-uncle",
  'BW': "Brother's wife",
  'ZH': "Sister's husband", 'Z+H': "Elder sister's husband", 'Z-H': "Younger sister's husband",
  'WZH': "Wife's sister's husband",
  'FZH': "Father's sister's husband",
  'BDH': "Niece's husband", 'BSDH': "Grand-nephew's daughter's husband",
  'BSSDH': "Great-grand-nephew's daughter's husband",
  'SDH': "Granddaughter's husband", 'SDH%': "Betrothed granddaughter's husband",
  'SSD': "Great-granddaughter", 'SSDH': "Great-granddaughter's husband",
  'SSSDH': "Great-great-granddaughter's husband",
  'ZDH': "Sister's daughter's husband",
  // Grandchildren
  'SS': "Grandson", 'SD': "Granddaughter",
  'DS': "Grandson (daughter's son)", 'DD': "Granddaughter (daughter's daughter)",
  'SSS': 'Great-grandson', 'SSSS': 'Great-great-grandson',
  'SS*': 'Adopted grandson',
  // Clan/Lineage relatives
  'A': 'Marriage relative',
  'K(male)': 'Clan brother', 'K-(male)': 'Younger clan brother',
  'K+1(male)': 'Clan nephew', 'K+2(male)': 'Clan grandson',
  'K-1(male)': 'Clan uncle', 'K-2(male)': 'Clan grandfather',
  'K-2(female)': 'Clan grand-aunt',
  'K+5': 'Clan 5th-gen descendant', 'K+6': 'Clan 6th-gen descendant',
  'K-5': 'Clan 5th-gen ancestor', 'K-6': 'Clan 6th-gen ancestor',
  'K+n': 'Clan junior', 'K+nH': "Clan junior's husband",
  'K-n': 'Clan elder', 'Kn': 'Clan relative',
  'KH': "Clan sister's husband",
  // Lineal ancestors/descendants
  'G-n': 'Lineal ancestor', 'G+n': 'Lineal descendant',
  'G-n (claimed)': 'Claimed ancestor',
  'U': 'Unknown relationship',
};

function kinCodeToLabel(kinCode, kinRelName, kinRel, kinCodes) {
  // Try direct English mapping from kinRel code
  if (kinRel && CODE_TO_ENGLISH[kinRel]) {
    return CODE_TO_ENGLISH[kinRel];
  }

  // Try simplified code from kinship codes table
  const codeInfo = kinCodes.get(kinCode);
  if (codeInfo && codeInfo.simplified && CODE_TO_ENGLISH[codeInfo.simplified]) {
    return CODE_TO_ENGLISH[codeInfo.simplified];
  }

  // Try alt field which often has English description
  if (codeInfo && codeInfo.alt) {
    // Extract English description: "B+  Brother, elder" -> "Brother, elder"
    const altMatch = codeInfo.alt.match(/[A-Z]+[+-]?\s+(.+)/);
    if (altMatch) return altMatch[1];
    return codeInfo.alt;
  }

  // Handle generation codes like G+10, G-5
  if (kinRel) {
    const gPlusMatch = kinRel.match(/^G\+(\d+)$/);
    if (gPlusMatch) return `${gPlusMatch[1]}th generation descendant`;
    const gMinusMatch = kinRel.match(/^G-(\d+)$/);
    if (gMinusMatch) return `${gMinusMatch[1]}th generation ancestor`;
  }

  // Fallback: try to build English from kinRel code characters
  if (kinRel) {
    // Try partial matching - strip numbers and special chars
    const base = kinRel.replace(/[0-9+\-()% ]/g, '').replace(/male|female/gi, '');
    if (CODE_TO_ENGLISH[base]) return CODE_TO_ENGLISH[base];
  }

  // Last fallback to Chinese name
  if (kinRelName) return kinRelName;
  return 'Unknown';
}

// ─── Determine grid generation (y-level) from kinship code ──────────────────

function getGeneration(kinCode, kinCodes) {
  const info = kinCodes.get(kinCode);
  if (!info) return 0; // same generation fallback

  const up = info.upstep;
  const down = info.dwnstep;
  const mar = info.marstep;

  // upstep = generations above ego, dwnstep = below
  if (up >= 99 || down >= 99) return 0; // unknown
  return up - down; // positive = ancestor, negative = descendant
}

/**
 * Calculate total kinship step size (closeness measure).
 * Lower = closer kinship.
 */
function getTotalSteps(kinCode, kinCodes) {
  const info = kinCodes.get(kinCode);
  if (!info) return 99;
  const up = info.upstep >= 99 ? 0 : info.upstep;
  const down = info.dwnstep >= 99 ? 0 : info.dwnstep;
  const mar = info.marstep >= 99 ? 0 : info.marstep;
  const col = info.colstep >= 99 ? 0 : info.colstep;
  return up + down + mar + col;
}

// ─── Determine value code for coloring ──────────────────────────────────────

function getValueCode(kinRel, kinCode, kinCodes) {
  const r = (kinRel || '').toUpperCase();
  // Direct relationships
  if (r === 'F' || r.startsWith('F') && !r.includes('B') && !r.includes('Z')) {
    const info = kinCodes.get(kinCode);
    if (info && info.upstep >= 2) return -40; // grandparent+
    return -100; // parent
  }
  if (r === 'M') return -40;
  if (r === 'S' || r.startsWith('S') && !r.includes('W') && !r.includes('Z')) return 40;
  if (r === 'D' || r === 'DH') return 20;
  if (r === 'W' || r === 'H' || r === 'C') return -80; // spouse
  if (r === 'B' || r.startsWith('B+') || r.startsWith('B-') || r === 'B½+' || r === 'B½-') return -20;
  if (r === 'Z' || r.startsWith('Z+') || r.startsWith('Z-')) return -20;
  if (r.includes('S') && !r.startsWith('F') && !r.startsWith('M')) return 40; // son-like
  if (r.includes('D') && !r.startsWith('F')) return 20; // daughter-like
  // In-laws and extended
  if (r === 'WF' || r === 'WM' || r === 'HF' || r === 'HM') return 60;
  if (r === 'DH' || r === 'SW') return 60;
  if (r.includes('FB') || r.includes('MZ') || r.includes('MB') || r.includes('FZ')) return -20;
  if (r === 'SS' || r === 'SD' || r === 'DS' || r === 'DD') return 20; // grandchildren
  if (r === 'FF' || r === 'FM' || r === 'MF' || r === 'MM') return -40; // grandparents
  if (r === 'FFF' || r === 'FFM' || r === 'FFFF' || r === 'FFFM') return -40;
  return -20; // default
}

// ─── Place relatives on grid ────────────────────────────────────────────────

function buildGrid(egoID, persons, kinCodes) {
  const ego = persons.get(egoID);
  if (!ego || ego.kin.length === 0) return null;

  // Grid: y3=grandparent, y2=parent, y1=ego, y0=child (we'll use y4,y3,y2,y1)
  // Actually match existing format: y4=grandparent+, y3=parent, y2=ego, y1=children
  const cells = [];
  const egoY = 2; // ego row

  // Place ego at center
  const egoCell = {
    group: 'x5', variable: `y${egoY}`,
    personID: egoID, value: 100,
    text: ego.chName, info: `${ego.chName} (${egoID}) - Ego`,
    entry: 'entry', assoc_num: ego.kin.length,
    dynasty: ego.dynasty,
    yearBirth: ego.yearBirth,
    yearDeath: ego.yearDeath,
    examStatus: ego.examStatus,
    nativePlace: ego.nativePlace,
    indexYear: ego.indexYear,
  };
  cells.push(egoCell);

  // Sort kin by generation, then by relationship type
  const relatives = [];
  for (const k of ego.kin) {
    const kinPID = parseInt(k.KinPersonId);
    if (!kinPID || kinPID <= 0) continue;
    const gen = getGeneration(k.KinCode, kinCodes);
    const kinRel = k.KinRel || '';
    const label = kinCodeToLabel(k.KinCode, k.KinRelName, kinRel, kinCodes);
    const valueCode = getValueCode(kinRel, k.KinCode, kinCodes);
    const kinPerson = persons.get(kinPID);
    relatives.push({
      personID: kinPID,
      name: k.KinPersonName || (kinPerson ? kinPerson.chName : `Person ${kinPID}`),
      kinRel,
      label,
      gen,
      valueCode,
      person: kinPerson,
      totalSteps: getTotalSteps(k.KinCode, kinCodes),
    });
  }

  // Group by generation level
  const byGen = new Map();
  for (const r of relatives) {
    // Use actual generation delta from kinship codes (c_upstep - c_dwnstep)
    const yLevel = egoY + r.gen;

    if (!byGen.has(yLevel)) byGen.set(yLevel, []);
    byGen.get(yLevel).push(r);
  }

  // Helper: find nearest unoccupied x position radiating from center
  const occupiedPositions = new Set(); // "x:y" keys
  occupiedPositions.add(`5:${egoY}`); // ego position

  function findNearestX(centerX, yLevel) {
    if (!occupiedPositions.has(`${centerX}:${yLevel}`)) return centerX;
    for (let d = 1; d <= 50; d++) {
      if (!occupiedPositions.has(`${centerX - d}:${yLevel}`)) return centerX - d;
      if (!occupiedPositions.has(`${centerX + d}:${yLevel}`)) return centerX + d;
    }
    return centerX + 51;
  }

  // Place each generation row, sorted by closeness (closest kin nearest to ego)
  // Ego gen: ego at x5, spouses to right, others to left
  const egoGenRelatives = byGen.get(egoY) || [];

  // Spouses go right of ego, sorted by closeness
  const spouses = egoGenRelatives.filter(r =>
    ['W', 'H', 'C', 'W1', 'W2', 'W3'].includes(r.kinRel.replace(/[0-9]/g, '').toUpperCase()) ||
    r.kinRel.toUpperCase() === 'W' || r.kinRel.toUpperCase() === 'H' || r.kinRel.toUpperCase() === 'C'
  );
  const others = egoGenRelatives.filter(r => !spouses.includes(r));

  spouses.sort((a, b) => a.totalSteps - b.totalSteps);
  others.sort((a, b) => a.totalSteps - b.totalSteps);

  let rightX = 6;
  for (const s of spouses) {
    while (occupiedPositions.has(`${rightX}:${egoY}`)) rightX++;
    cells.push(makeCell(s, `x${rightX}`, `y${egoY}`, egoID));
    occupiedPositions.add(`${rightX}:${egoY}`);
    rightX++;
  }
  let leftX = 4;
  for (const o of others) {
    while (occupiedPositions.has(`${leftX}:${egoY}`)) leftX--;
    cells.push(makeCell(o, `x${leftX}`, `y${egoY}`, egoID));
    occupiedPositions.add(`${leftX}:${egoY}`);
    leftX--;
  }

  // Non-ego generations: sort by closeness, radiate from ego column (x5)
  for (const [yLevel, rels] of byGen) {
    if (yLevel === egoY) continue;
    rels.sort((a, b) => a.totalSteps - b.totalSteps);
    for (const r of rels) {
      const xPos = findNearestX(5, yLevel);
      cells.push(makeCell(r, `x${xPos}`, `y${yLevel}`, egoID));
      occupiedPositions.add(`${xPos}:${yLevel}`);
    }
  }

  // Ensure rectangular grid: fill all y-levels with empty cells
  const yLevels = [...new Set(cells.map(c => c.variable))].sort();
  const xPositions = [...new Set(cells.map(c => c.group))].sort(
    (a, b) => parseInt(a.replace('x', '')) - parseInt(b.replace('x', ''))
  );

  const occupied = new Set(cells.map(c => `${c.group}:${c.variable}`));
  for (const y of yLevels) {
    for (const x of xPositions) {
      const key = `${x}:${y}`;
      if (!occupied.has(key)) {
        cells.push({
          group: x, variable: y,
          personID: '', value: 0,
          text: '', info: '',
          entry: '', assoc_num: 0,
          dynasty: '', yearBirth: '', yearDeath: '', examStatus: '',
          nativePlace: '', indexYear: '',
        });
      }
    }
  }

  // Sort cells by y (descending) then x (ascending) to match existing format
  cells.sort((a, b) => {
    const ay = parseInt(a.variable.replace('y', ''));
    const by = parseInt(b.variable.replace('y', ''));
    if (by !== ay) return by - ay; // higher y first
    const ax = parseInt(a.group.replace('x', ''));
    const bx = parseInt(b.group.replace('x', ''));
    return ax - bx;
  });

  return cells;
}

function makeCell(relative, group, variable, egoID) {
  const p = relative.person;
  return {
    group,
    variable,
    personID: relative.personID,
    value: relative.valueCode,
    text: relative.name,
    info: `${relative.name} (${relative.personID}) - ${relative.label}`,
    entry: '',
    assoc_num: p ? p.kin.length : 0,
    dynasty: p ? p.dynasty : '',
    yearBirth: p ? p.yearBirth : '',
    yearDeath: p ? p.yearDeath : '',
    examStatus: p ? p.examStatus : '',
    nativePlace: p ? p.nativePlace : '',
    indexYear: p ? p.indexYear : '',
  };
}

// ─── Write CSV ──────────────────────────────────────────────────────────────

const CSV_HEADERS = ['group', 'variable', 'personID', 'value', 'text', 'info', 'entry', 'assoc_num', 'dynasty', 'yearBirth', 'yearDeath', 'examStatus', 'nativePlace', 'indexYear'];

function escapeCSVField(val) {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function writeGridCSV(personID, cells) {
  const lines = [CSV_HEADERS.join(',')];
  for (const cell of cells) {
    lines.push(CSV_HEADERS.map(h => escapeCSVField(cell[h])).join(','));
  }
  writeFileSync(join(DATA_DIR, `${personID}.csv`), lines.join('\n') + '\n');
}

// ─── Compose multi-hop relationship labels ──────────────────────────────────

const COMPOSED_LABELS = {
  "Father|Father": "Paternal grandfather",
  "Father|Mother": "Paternal grandmother",
  "Mother|Father": "Maternal grandfather",
  "Mother|Mother": "Maternal grandmother",
  "Father|Father|Father": "Paternal great-grandfather",
  "Father|Father|Mother": "Paternal great-grandmother",
  "Father|Brother": "Uncle (father's brother)",
  "Father|Sister": "Aunt (father's sister)",
  "Mother|Brother": "Uncle (mother's brother)",
  "Mother|Sister": "Aunt (mother's sister)",
  "Father|Brother|Son": "Cousin (father's brother's son)",
  "Father|Brother|Daughter": "Cousin (father's brother's daughter)",
  "Brother|Son": "Nephew (brother's son)",
  "Brother|Daughter": "Niece (brother's daughter)",
  "Sister|Son": "Nephew (sister's son)",
  "Sister|Daughter": "Niece (sister's daughter)",
  "Son|Son": "Grandson",
  "Son|Daughter": "Granddaughter",
  "Daughter|Son": "Grandson (daughter's son)",
  "Daughter|Daughter": "Granddaughter (daughter's daughter)",
  "Son|Son|Son": "Great-grandson",
  "Son|Spouse": "Daughter-in-law",
  "Daughter|Spouse": "Son-in-law",
  "Brother|Spouse": "Sister-in-law",
  "Sister|Spouse": "Brother-in-law",
  "Spouse|Father": "Father-in-law",
  "Spouse|Mother": "Mother-in-law",
  "Spouse|Brother": "Brother-in-law",
  "Spouse|Sister": "Sister-in-law",
};

function normalizeForChain(rel) {
  const l = rel.toLowerCase();
  if (l === 'wife' || l === 'husband' || l === 'concubine') return 'Spouse';
  if (l.includes('brother')) return 'Brother';
  if (l.includes('sister')) return 'Sister';
  if (l.includes('father')) return 'Father';
  if (l.includes('mother')) return 'Mother';
  if (l.includes('son')) return 'Son';
  if (l.includes('daughter')) return 'Daughter';
  if (l.includes('grandson')) return 'Grandson';
  if (l.includes('granddaughter')) return 'Granddaughter';
  return rel.charAt(0).toUpperCase() + rel.slice(1).toLowerCase();
}

function chainToLabel(chain) {
  if (chain.length === 0) return 'Ego';
  if (chain.length === 1) return chain[0];
  const normalized = chain.map(normalizeForChain);
  const key = normalized.join('|');
  if (COMPOSED_LABELS[key]) return COMPOSED_LABELS[key];
  return normalized.map((r, i) => {
    if (i === normalized.length - 1) return r.toLowerCase();
    return r + "'s";
  }).join(' ');
}

// ─── Generate kinship path files ────────────────────────────────────────────

function writeKinshipPaths(egoID, cells, persons, kinCodes) {
  const ego = persons.get(egoID);
  if (!ego) return;
  const egoName = ego.chName;

  // Build a map of direct relatives from cells (single-hop)
  const directRelatives = new Map();
  for (const cell of cells) {
    if (!cell.personID || cell.personID === egoID || cell.value === 0) continue;
    const relMatch = cell.info.match(/- (.+)$/);
    const rel = relMatch ? relMatch[1] : 'Unknown';
    directRelatives.set(cell.personID, { name: cell.text, rel });
  }

  // Write single-hop paths for direct relatives
  for (const [pid, { name, rel }] of directRelatives) {
    const path = `${egoName} → ${name}(${rel})`;
    writeFileSync(join(KINSHIP_DIR, `${egoID}-${pid}.txt`), path);
  }

  // BFS to find multi-hop relatives (through other persons' kinship data)
  const resolved = new Map(); // personID → { chain: [{name, localRel, personID}] }
  const visited = new Set([egoID]);

  // Seed with direct relatives
  for (const [pid, { name, rel }] of directRelatives) {
    resolved.set(pid, { chain: [{ name, localRel: rel, personID: pid }] });
  }

  const queue = [...directRelatives.entries()].map(([pid, { name, rel }]) => ({
    personID: pid,
    chain: [{ name, localRel: rel, personID: pid }],
  }));

  while (queue.length > 0) {
    const { personID, chain: parentChain } = queue.shift();
    if (visited.has(personID)) continue;
    visited.add(personID);

    const person = persons.get(personID);
    if (!person) continue;

    for (const k of person.kin) {
      const kinPID = parseInt(k.KinPersonId);
      if (!kinPID || kinPID <= 0 || resolved.has(kinPID) || kinPID === egoID) continue;

      const kinRel = k.KinRel || '';
      const label = kinCodeToLabel(k.KinCode, k.KinRelName, kinRel, kinCodes);
      const kinPerson = persons.get(kinPID);
      const name = k.KinPersonName || (kinPerson ? kinPerson.chName : `Person ${kinPID}`);

      const newChain = [...parentChain, { name, localRel: label, personID: kinPID }];
      resolved.set(kinPID, { chain: newChain });
      queue.push({ personID: kinPID, chain: newChain });
    }
  }

  // Write multi-hop kinship paths (skip single-hop ones already written)
  for (const [pid, { chain }] of resolved) {
    if (chain.length <= 1) continue; // already written above

    // Build path: Root → Intermediate(RelToRoot) → ... → Target(RelToPrev of PrevName and RelToRoot of RootName)
    const parts = [egoName];

    for (let i = 0; i < chain.length - 1; i++) {
      // Compute composed relationship to root for intermediate persons
      const composedRel = chainToLabel(chain.slice(0, i + 1).map(c => c.localRel));
      parts.push(`${chain[i].name}(${composedRel})`);
    }

    // Last person: show both relationship to previous person and to root
    const lastStep = chain[chain.length - 1];
    const prevStep = chain[chain.length - 2];
    const composedRelToRoot = chainToLabel(chain.map(c => c.localRel));
    parts.push(`${lastStep.name}(${lastStep.localRel} of ${prevStep.name} and ${composedRelToRoot} of ${egoName})`);

    const path = parts.join(' → ');
    writeFileSync(join(KINSHIP_DIR, `${egoID}-${pid}.txt`), path);
  }
}

// ─── Generate search index ──────────────────────────────────────────────────

function writeSearchIndex(persons) {
  const index = [];
  for (const [id, p] of persons) {
    index.push({
      id,
      name: p.chName,
      en: p.engName,
      dynasty: p.dynasty,
      hasKin: p.kin.length > 0,
    });
  }
  index.sort((a, b) => a.id - b.id);
  writeFileSync(join(DATA_DIR, 'search-index.json'), JSON.stringify(index));
  console.log(`Wrote search index with ${index.length} entries`);
}

// ─── Main ───────────────────────────────────────────────────────────────────

console.log('\n=== CBDB Batch CSV Generator ===\n');

// Ensure output dirs exist
mkdirSync(DATA_DIR, { recursive: true });
mkdirSync(KINSHIP_DIR, { recursive: true });

const kinCodes = loadKinshipCodes();
console.log(`Loaded ${kinCodes.size} kinship codes`);

const persons = loadPersons(jsonPath);

let generated = 0;
let skipped = 0;

for (const [pid, person] of persons) {
  if (person.kin.length === 0) {
    skipped++;
    continue;
  }

  const cells = buildGrid(pid, persons, kinCodes);
  if (!cells || cells.length === 0) {
    skipped++;
    continue;
  }

  writeGridCSV(pid, cells);
  writeKinshipPaths(pid, cells, persons, kinCodes);
  generated++;
}

writeSearchIndex(persons);

console.log(`\nDone!`);
console.log(`  Generated: ${generated} CSV files`);
console.log(`  Skipped: ${skipped} persons (no kinship data)`);
console.log(`  Output: ${DATA_DIR}`);
