import {
  MALE_GENERATION_COLORS,
  FEMALE_GENERATION_COLORS,
  FEMALE_RELATIONS,
  MALE_RELATIONS,
  EGO_COLOR,
} from '../utils/constants';

/**
 * Parse relationship string from info: "王益 (7082) - Father" → "father"
 */
function parseRel(info: string): string {
  const match = info.match(/- (.+)$/);
  return match ? match[1].trim().toLowerCase() : '';
}

/**
 * Determine gender from relationship string.
 * Returns 'male', 'female', or 'unknown'.
 */
export function getGender(info: string): 'male' | 'female' | 'unknown' {
  const rel = parseRel(info);
  if (rel === 'ego') return 'unknown'; // ego gets special color

  // Check English keywords
  if (FEMALE_RELATIONS.has(rel)) return 'female';
  if (MALE_RELATIONS.has(rel)) return 'male';
  for (const f of FEMALE_RELATIONS) {
    if (rel.includes(f)) return 'female';
  }
  for (const m of MALE_RELATIONS) {
    if (rel.includes(m)) return 'male';
  }

  // Check Chinese kinship terms and CBDB codes in the info string
  const FEMALE_CHN = ['母', '妻', '女', '妹', '姊', '姐', '妾', '媳', '嫂', '姑', '姨'];
  const FEMALE_CODES = [' M ', ' M,', ' W ', ' W,', ' D ', ' D,', ' Z ', ' Z,', ' C ', ' C,',
    ' FM', ' MM', ' FFM', ' FFFM', ' SW', ' BD', ' ZD', ' FZ', ' MZ', ' WM', ' HM',
    ' SD', ' DD', ' DS'];
  for (const ch of FEMALE_CHN) {
    if (info.includes(ch)) return 'female';
  }
  for (const code of FEMALE_CODES) {
    if (info.includes(code)) return 'female';
  }
  // Names ending in 氏 are typically female
  if (info.includes('氏')) return 'female';

  // Default to male
  return 'male';
}

/**
 * Get cell color based on gender and generation delta from ego.
 * generationDelta: positive = older (parent, grandparent), negative = younger (child, grandchild)
 */
export function getCellColorByGeneration(
  info: string,
  generationDelta: number
): string {
  const rel = parseRel(info);
  if (rel === 'ego' || info.toLowerCase().includes('ego')) return EGO_COLOR;

  const gender = getGender(info);
  const palette = gender === 'female' ? FEMALE_GENERATION_COLORS :
                  gender === 'male' ? MALE_GENERATION_COLORS :
                  MALE_GENERATION_COLORS; // default to cool for unknown

  // Map generation delta to palette index (0=youngest, 4=oldest)
  // delta: -2 or lower → 0, -1 → 1, 0 → 2, +1 → 3, +2 or higher → 4
  const idx = Math.min(4, Math.max(0, generationDelta + 2));
  return palette[idx];
}

/**
 * Legacy getCellColor for backward compat (used by MiniMap, DetailSidebar badge).
 * Returns a reasonable color from the value code.
 */
export function getCellColor(value: number): string {
  if (!value || value === 0) return 'transparent';
  if (value === 100) return EGO_COLOR;
  if (value < 0) return MALE_GENERATION_COLORS[3]; // cool blue for ancestors
  return MALE_GENERATION_COLORS[1]; // darker blue for descendants
}

/**
 * Should text be white on this background?
 */
export function shouldUseLightText(info: string, generationDelta: number): boolean {
  const rel = parseRel(info);
  if (rel === 'ego') return false;
  // Darker colors (younger generations) need light text
  return generationDelta <= 0;
}
