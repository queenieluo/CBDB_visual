#!/usr/bin/env node
/**
 * Fix all CSV files so that info fields show relationships
 * relative to the LOCAL ego (value=100) of each file.
 *
 * Uses only grid position + gender detection. No knowledge of 1762.
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const DATA_DIR = join(import.meta.dirname, '..', 'public', 'data');

function isFemale(name) {
  return name.includes('氏');
}

function parseY(v) {
  return parseInt(v.replace('y', ''), 10);
}

function getLocalRelationship(row, egoRow) {
  const pid = parseInt(row.personID);
  if (!pid || pid <= 0) return null;

  const name = row.text || '';
  const value = parseInt(row.value) || 0;
  const rowY = parseY(row.variable);
  const egoY = parseY(egoRow.variable);
  const genDelta = rowY - egoY; // positive = older
  const female = isFemale(name);

  if (value === 100) return 'Ego';

  // Same generation
  if (genDelta === 0) {
    if (value === -80 || value === 80) return 'Spouse';
    if (value === 60 || value === -60) return female ? 'Sister-in-law' : 'Brother-in-law';
    if (female) return 'Sister';
    return 'Brother';
  }

  // Older generation (+1, +2, etc.)
  if (genDelta > 0) {
    if (genDelta === 1) {
      if (value === -100) return female ? 'Mother' : 'Father';
      if (value === -80) return 'Spouse'; // shouldn't happen
      if (female) return 'Mother';
      return 'Father';
    }
    if (genDelta === 2) {
      return female ? 'Grandmother' : 'Grandfather';
    }
    return female ? 'Great-grandmother' : 'Great-grandfather';
  }

  // Younger generation (-1, -2, etc.)
  if (genDelta < 0) {
    if (genDelta === -1) {
      if (value === 60) return female ? 'Daughter-in-law' : 'Son-in-law';
      if (value === 20 || value === -20) {
        return female ? 'Daughter' : 'Son';
      }
      if (value === 40) return 'Son';
      return female ? 'Daughter' : 'Son';
    }
    if (genDelta === -2) {
      return female ? 'Granddaughter' : 'Grandson';
    }
    return female ? 'Great-granddaughter' : 'Great-grandson';
  }

  return 'Unknown';
}

// Process all CSV files
const files = readdirSync(DATA_DIR).filter(f => f.endsWith('.csv'));
let totalFixed = 0;

for (const file of files) {
  const path = join(DATA_DIR, file);
  const text = readFileSync(path, 'utf-8');
  const lines = text.trim().split('\n');
  if (lines.length < 2) continue;

  const headers = lines[0].split(',').map(h => h.trim());
  const rows = lines.slice(1).map(line => {
    const vals = line.split(',');
    const row = {};
    headers.forEach((h, i) => { row[h] = (vals[i] || '').trim(); });
    return row;
  });

  // Find ego
  const egoRow = rows.find(r => parseInt(r.value) === 100);
  if (!egoRow) continue;

  let changed = false;
  for (const row of rows) {
    const pid = parseInt(row.personID);
    if (!pid || pid <= 0) continue;

    const rel = getLocalRelationship(row, egoRow);
    if (!rel) continue;

    const name = row.text || '';
    const newInfo = `${name} (${pid}) - ${rel}`;

    if (row.info !== newInfo) {
      row.info = newInfo;
      changed = true;
    }
  }

  if (changed) {
    const outLines = [headers.join(',')];
    for (const row of rows) {
      outLines.push(headers.map(h => row[h] || '').join(','));
    }
    writeFileSync(path, outLines.join('\n') + '\n');
    totalFixed++;
  }
}

console.log(`Fixed local labels in ${totalFixed} CSV files.`);

// Verify a few
console.log('\n=== Verification ===');
for (const id of ['1762', '7082', '3968', '1649', '5134']) {
  const path = join(DATA_DIR, `${id}.csv`);
  const text = readFileSync(path, 'utf-8');
  const nonEmpty = text.split('\n').filter(l => !l.includes(',,0,,,,') && !l.startsWith('group'));
  console.log(`\n--- ${id}.csv ---`);
  nonEmpty.forEach(l => console.log('  ' + l));
}
