#!/usr/bin/env node
/**
 * Recompute all CSV info fields so relationships are relative to the ego (1762).
 *
 * Usage:
 *   node scripts/recompute-relationships.mjs [egoID]
 *   (defaults to 1762)
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const DATA_DIR = join(import.meta.dirname, '..', 'public', 'data');
const CODES_PATH = join(import.meta.dirname, '..', '..', 'KINSHIP_CODES.csv');
const EGO_ID = parseInt(process.argv[2] || '1762', 10);

// ─── Readable label for a relationship chain ────────────────────────────────
// Given a chain like ["Father", "Brother"], produce "Father's brother"

// Well-known composed relationships (chain key → readable label)
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
  "Son|Son": "Grandson (son's son)",
  "Son|Daughter": "Granddaughter (son's daughter)",
  "Daughter|Son": "Grandson (daughter's son)",
  "Daughter|Daughter": "Granddaughter (daughter's daughter)",
  "Son|Son|Son": "Great-grandson",
  "Son|Spouse": "Son's wife",
  "Daughter|Spouse": "Son-in-law",
  "Brother|Spouse": "Brother's wife",
  "Sister|Spouse": "Sister's husband",
  "Spouse|Father": "Father-in-law",
  "Spouse|Mother": "Mother-in-law",
  "Spouse|Brother": "Brother-in-law",
  "Spouse|Sister": "Sister-in-law",
  "Ancestor|Father": "Great-grandfather (maternal)",
  "Ancestor|Brother": "Great-uncle (maternal)",
  "Ancestor|Spouse": "Maternal grandmother",
  "Ancestor|Spouse|Father": "Maternal great-grandfather",
  "Grandson|Son": "Great-grandson",
  "Grandson|Spouse": "Grandson's wife",
};

function chainToLabel(chain) {
  if (chain.length === 0) return 'Ego';
  if (chain.length === 1) return chain[0];

  // Normalize chain for lookup (strip gender-specific qualifiers)
  const normalized = chain.map(r => {
    const l = r.toLowerCase();
    // Normalize to base relations for lookup
    if (l === 'wife' || l === 'husband' || l === 'concubine') return 'Spouse';
    if (l.includes('brother')) return 'Brother';
    if (l.includes('sister')) return 'Sister';
    return r.charAt(0).toUpperCase() + r.slice(1).toLowerCase();
  });

  // Try exact match
  const key = normalized.join('|');
  if (COMPOSED_LABELS[key]) return COMPOSED_LABELS[key];

  // Try with simplified chain (collapse redundant "Son-in-law" etc)
  // Fall back to possessive chain: "Father's brother's son"
  return normalized.map((r, i) => {
    if (i === normalized.length - 1) return r.toLowerCase();
    return r + "'s";
  }).join(' ');
}

// ─── Detect gender from info/relationship ───────────────────────────────────

const FEMALE_RELS = new Set([
  'mother', 'sister', 'daughter', 'wife', 'spouse', 'concubine',
  'grandmother', 'granddaughter', 'mother-in-law', 'daughter-in-law',
  'niece', 'aunt',
]);

function detectGender(rel, name) {
  const l = rel.toLowerCase();
  if (FEMALE_RELS.has(l)) return 'F';
  if (l.includes('mother') || l.includes('daughter') || l.includes('sister')
      || l.includes('wife') || l.includes('concubine') || l.includes('niece')
      || l.includes('aunt')) return 'F';
  if (name && name.includes('氏')) return 'F';
  return 'M';
}

// ─── CSV I/O ────────────────────────────────────────────────────────────────

function readCSV(personID) {
  const path = join(DATA_DIR, `${personID}.csv`);
  if (!existsSync(path)) return null;
  const text = readFileSync(path, 'utf-8');
  const lines = text.trim().split('\n');
  if (lines.length < 2) return null;
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = lines.slice(1).map(line => {
    const vals = line.split(',');
    const row = {};
    headers.forEach((h, i) => { row[h] = (vals[i] || '').trim(); });
    return row;
  });
  return { headers, rows, path };
}

function writeCSV(csvData) {
  const lines = [csvData.headers.join(',')];
  for (const row of csvData.rows) {
    lines.push(csvData.headers.map(h => row[h] || '').join(','));
  }
  writeFileSync(csvData.path, lines.join('\n') + '\n');
}

function parseRel(info) {
  const match = info.match(/- (.+)$/);
  return match ? match[1].trim() : '';
}

// ─── Normalize local relationship to ego-path-friendly label ────────────────
// E.g. in X's CSV, "Father" means X's father; "Spouse" means X's spouse.
// We want the base relationship type regardless of the local context.

function normalizeLocalRel(rel) {
  const l = rel.toLowerCase();
  if (l === 'ego') return null; // skip ego rows
  if (l.includes('father-in-law')) return 'Father-in-law';
  if (l.includes('mother-in-law')) return 'Mother-in-law';
  if (l.includes('son-in-law')) return 'Son-in-law';
  if (l.includes('daughter-in-law')) return 'Daughter-in-law';
  if (l.includes('grandson-in-law')) return 'Grandson-in-law';
  if (l.includes('brother-in-law')) return 'Brother-in-law';
  if (l.includes('great-grandfather')) return 'Great-grandfather';
  if (l.includes('great-grandmother')) return 'Great-grandmother';
  if (l.includes('grandfather')) return 'Grandfather';
  if (l.includes('grandmother')) return 'Grandmother';
  if (l.includes('grandson')) return 'Grandson';
  if (l.includes('granddaughter')) return 'Granddaughter';
  if (l.includes('father')) return 'Father';
  if (l.includes('mother')) return 'Mother';
  if (l.includes('brother')) return 'Brother';
  if (l.includes('sister')) return 'Sister';
  if (l.includes('son')) return 'Son';
  if (l.includes('daughter')) return 'Daughter';
  if (l.includes('spouse') || l.includes('wife') || l.includes('husband')) return 'Spouse';
  if (l.includes('concubine')) return 'Concubine';
  if (l.includes('ancestor')) return 'Ancestor';
  if (l.includes('descendant')) return 'Descendant';
  return rel; // keep as-is
}

// ─── BFS to resolve all relationships ───────────────────────────────────────

function computeAllRelationships(egoID) {
  // personID → { label, chain, gender }
  const resolved = new Map();
  resolved.set(egoID, { label: 'Ego', chain: [], gender: 'M' });

  // Read ego CSV — these are direct relatives, already correct
  const egoCSV = readCSV(egoID);
  if (!egoCSV) {
    console.error(`Cannot read ego CSV for ${egoID}`);
    return resolved;
  }

  const queue = [];

  for (const row of egoCSV.rows) {
    const pid = parseInt(row.personID);
    if (!pid || pid <= 0 || pid === egoID) continue;
    const rel = parseRel(row.info);
    if (!rel) continue;
    const gender = detectGender(rel, row.text);
    resolved.set(pid, {
      label: rel,
      chain: [rel],
      gender,
    });
    queue.push({ personID: pid, chain: [rel] });
  }

  // BFS through linked CSVs
  const visited = new Set([egoID]);
  while (queue.length > 0) {
    const { personID, chain: parentChain } = queue.shift();
    if (visited.has(personID)) continue;
    visited.add(personID);

    const csv = readCSV(personID);
    if (!csv) continue;

    for (const row of csv.rows) {
      const pid = parseInt(row.personID);
      if (!pid || pid <= 0 || resolved.has(pid)) continue;

      const rawRel = parseRel(row.info);
      const localRel = normalizeLocalRel(rawRel);
      if (!localRel) continue;

      const newChain = [...parentChain, localRel];
      const composedLabel = chainToLabel(newChain);
      const gender = detectGender(rawRel, row.text);

      resolved.set(pid, {
        label: composedLabel,
        chain: newChain,
        gender,
      });

      queue.push({ personID: pid, chain: newChain });
    }
  }

  return resolved;
}

// ─── Rewrite all CSVs ──────────────────────────────────────────────────────

function rewriteCSVs(egoID, resolved) {
  const allFiles = new Set();
  for (const [pid] of resolved) {
    if (existsSync(join(DATA_DIR, `${pid}.csv`))) allFiles.add(pid);
  }
  allFiles.add(egoID);

  let totalUpdated = 0;

  for (const fileID of allFiles) {
    const csv = readCSV(fileID);
    if (!csv) continue;

    let changed = false;
    for (const row of csv.rows) {
      const pid = parseInt(row.personID);
      if (!pid || pid <= 0) continue;

      const resolution = resolved.get(pid);
      if (!resolution) continue;

      const name = row.text || '';
      const newInfo = `${name} (${pid}) - ${resolution.label}`;

      if (row.info !== newInfo) {
        row.info = newInfo;
        changed = true;
      }
    }

    if (changed) {
      writeCSV(csv);
      totalUpdated++;
    }
  }

  return totalUpdated;
}

// ─── Main ───────────────────────────────────────────────────────────────────

console.log(`\n=== Recomputing relationships relative to ego ${EGO_ID} ===\n`);

const resolved = computeAllRelationships(EGO_ID);
console.log(`Resolved ${resolved.size} people relative to ego ${EGO_ID}:\n`);

// Collect names for display
function findName(pid) {
  for (const [otherPid] of resolved) {
    const csv = readCSV(otherPid);
    if (!csv) continue;
    for (const row of csv.rows) {
      if (parseInt(row.personID) === pid) return row.text;
    }
  }
  return '?';
}

// Print table
console.log('ID'.padEnd(8) + 'Name'.padEnd(8) + 'Label'.padEnd(40) + 'Chain');
console.log('─'.repeat(90));
for (const [pid, info] of [...resolved.entries()].sort((a, b) => a[0] - b[0])) {
  const name = findName(pid);
  console.log(
    String(pid).padEnd(8) +
    (name || '?').padEnd(8) +
    info.label.padEnd(40) +
    (info.chain.length > 0 ? info.chain.join(' → ') : '(ego)')
  );
}

console.log(`\nRewriting CSV files...`);
const updated = rewriteCSVs(EGO_ID, resolved);
console.log(`Updated ${updated} CSV files.\n`);
