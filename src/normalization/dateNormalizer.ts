/**
 * GED Scout - Date Normalization Module
 * Converts free-text and nonstandard genealogical date phrases into valid GEDCOM 5.5/5.5.1 forms:
 * ABT, BEF, AFT, BET ... AND ..., CAL, EST
 */

export interface ParsedDateResult {
  year?: number;
  month?: number; // 1-12
  day?: number;
  modifier?: string; // 'ABT' | 'BEF' | 'AFT' | 'BET' | 'CAL' | 'EST'
  secondYear?: number;
  isStandard: boolean;
  raw: string;
}

export interface DateNormalizationResult {
  original: string;
  normalized: string;
  changed: boolean;
  isAmbiguous: boolean;
  reason?: string;
}

const MONTH_MAP: Record<string, { code: string; num: number }> = {
  jan: { code: 'JAN', num: 1 },
  january: { code: 'JAN', num: 1 },
  '01': { code: 'JAN', num: 1 },
  '1': { code: 'JAN', num: 1 },
  feb: { code: 'FEB', num: 2 },
  february: { code: 'FEB', num: 2 },
  '02': { code: 'FEB', num: 2 },
  '2': { code: 'FEB', num: 2 },
  mar: { code: 'MAR', num: 3 },
  march: { code: 'MAR', num: 3 },
  '03': { code: 'MAR', num: 3 },
  '3': { code: 'MAR', num: 3 },
  apr: { code: 'APR', num: 4 },
  april: { code: 'APR', num: 4 },
  '04': { code: 'APR', num: 4 },
  '4': { code: 'APR', num: 4 },
  may: { code: 'MAY', num: 5 },
  '05': { code: 'MAY', num: 5 },
  '5': { code: 'MAY', num: 5 },
  jun: { code: 'JUN', num: 6 },
  june: { code: 'JUN', num: 6 },
  '06': { code: 'JUN', num: 6 },
  '6': { code: 'JUN', num: 6 },
  jul: { code: 'JUL', num: 7 },
  july: { code: 'JUL', num: 7 },
  '07': { code: 'JUL', num: 7 },
  '7': { code: 'JUL', num: 7 },
  aug: { code: 'AUG', num: 8 },
  august: { code: 'AUG', num: 8 },
  '08': { code: 'AUG', num: 8 },
  '8': { code: 'AUG', num: 8 },
  sep: { code: 'SEP', num: 9 },
  sept: { code: 'SEP', num: 9 },
  september: { code: 'SEP', num: 9 },
  '09': { code: 'SEP', num: 9 },
  '9': { code: 'SEP', num: 9 },
  oct: { code: 'OCT', num: 10 },
  october: { code: 'OCT', num: 10 },
  '10': { code: 'OCT', num: 10 },
  nov: { code: 'NOV', num: 11 },
  november: { code: 'NOV', num: 11 },
  '11': { code: 'NOV', num: 11 },
  dec: { code: 'DEC', num: 12 },
  december: { code: 'DEC', num: 12 },
  '12': { code: 'DEC', num: 12 },
};

/**
 * Extracts a numeric 4-digit year from any date string
 */
export function extractYear(dateStr?: string): number | undefined {
  if (!dateStr) return undefined;
  // Match first 4-digit year or 3-digit year
  const match = dateStr.match(/\b(1\d{3}|20\d{2}|[5-9]\d{2})\b/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return undefined;
}

/**
 * Parses and breaks down a GEDCOM date string
 */
export function parseGedcomDate(dateStr?: string): ParsedDateResult {
  if (!dateStr || !dateStr.trim()) {
    return { isStandard: false, raw: '' };
  }

  const raw = dateStr.trim();
  const year = extractYear(raw);

  // Check if already completely standard GEDCOM
  // Standard format: [ABT|BEF|AFT|CAL|EST]? (DAY)? (MON)? YEAR
  // or BET YYYY AND YYYY
  const standardModifierMatch = raw.match(/^(ABT|BEF|AFT|CAL|EST)\s+(.+)$/i);
  const betweenMatch = raw.match(/^BET\s+(\d{4})\s+AND\s+(\d{4})$/i);

  if (betweenMatch) {
    return {
      modifier: 'BET',
      year: parseInt(betweenMatch[1], 10),
      secondYear: parseInt(betweenMatch[2], 10),
      isStandard: true,
      raw,
    };
  }

  // Exact standard date: 12 MAY 1880, or MAY 1880, or 1880
  const standardExactMatch = raw.match(/^(?:(\d{1,2})\s+)?([A-Z]{3})\s+(\d{3,4})$/);
  if (standardExactMatch) {
    const day = standardExactMatch[1] ? parseInt(standardExactMatch[1], 10) : undefined;
    const monStr = standardExactMatch[2].toLowerCase();
    const mon = MONTH_MAP[monStr]?.num;
    return {
      day,
      month: mon,
      year: parseInt(standardExactMatch[3], 10),
      isStandard: true,
      raw,
    };
  }

  if (/^\d{3,4}$/.test(raw)) {
    return {
      year: parseInt(raw, 10),
      isStandard: true,
      raw,
    };
  }

  if (standardModifierMatch) {
    const mod = standardModifierMatch[1].toUpperCase();
    const rest = standardModifierMatch[2];
    const y = extractYear(rest);
    return {
      modifier: mod,
      year: y,
      isStandard: true,
      raw,
    };
  }

  return {
    year,
    isStandard: false,
    raw,
  };
}

/**
 * Normalizes free-text phrases into standardized GEDCOM date strings.
 */
export function normalizeDateString(input: string): DateNormalizationResult {
  if (!input || !input.trim()) {
    return { original: input, normalized: '', changed: false, isAmbiguous: false };
  }

  const trimmed = input.trim();

  // 1. Between ranges e.g. "between 1840-1850", "between 1840 and 1850", "bet 1840 and 1850", "1840-1850"
  const betMatch = trimmed.match(
    /(?:between|bet\.?)\s+(\d{4})\s*(?:-|and|to)\s*(\d{4})/i
  );
  if (betMatch) {
    const norm = `BET ${betMatch[1]} AND ${betMatch[2]}`;
    return {
      original: trimmed,
      normalized: norm,
      changed: norm !== trimmed,
      isAmbiguous: false,
      reason: 'Standardized range to BET ... AND ...',
    };
  }

  const hyphenRange = trimmed.match(/^(\d{4})\s*-\s*(\d{4})$/);
  if (hyphenRange) {
    const norm = `BET ${hyphenRange[1]} AND ${hyphenRange[2]}`;
    return {
      original: trimmed,
      normalized: norm,
      changed: true,
      isAmbiguous: false,
      reason: 'Converted hyphenated years to BET ... AND ...',
    };
  }

  // 2. Circa / About variations: "Abt 1843", "circa 1843", "c. 1843", "ca 1843", "~1843", "around 1843"
  const abtMatch = trimmed.match(/^(?:about|abt\.?|circa|c\.?|ca\.?|around|~)\s*(\d{1,2}\s+[a-z]+|\d{4}|.+)$/i);
  if (abtMatch) {
    const sub = abtMatch[1].trim();
    const cleanSub = cleanInnerDate(sub);
    const norm = `ABT ${cleanSub}`;
    return {
      original: trimmed,
      normalized: norm,
      changed: norm !== trimmed,
      isAmbiguous: false,
      reason: 'Standardized approximate date prefix to ABT',
    };
  }

  // 3. Question mark suffix: "1843?" or "May 1843?"
  if (trimmed.endsWith('?')) {
    const sub = trimmed.replace(/\?+$/, '').trim();
    const cleanSub = cleanInnerDate(sub);
    const norm = `ABT ${cleanSub}`;
    return {
      original: trimmed,
      normalized: norm,
      changed: true,
      isAmbiguous: false,
      reason: 'Converted uncertain ? to ABT',
    };
  }

  // 4. Before variations: "before 1900", "bef. 1900", "< 1900"
  const befMatch = trimmed.match(/^(?:before|bef\.?|<)\s*(.+)$/i);
  if (befMatch) {
    const cleanSub = cleanInnerDate(befMatch[1].trim());
    const norm = `BEF ${cleanSub}`;
    return {
      original: trimmed,
      normalized: norm,
      changed: norm !== trimmed,
      isAmbiguous: false,
      reason: 'Standardized prefix to BEF',
    };
  }

  // 5. After variations: "after 1900", "aft. 1900", "> 1900"
  const aftMatch = trimmed.match(/^(?:after|aft\.?|>)\s*(.+)$/i);
  if (aftMatch) {
    const cleanSub = cleanInnerDate(aftMatch[1].trim());
    const norm = `AFT ${cleanSub}`;
    return {
      original: trimmed,
      normalized: norm,
      changed: norm !== trimmed,
      isAmbiguous: false,
      reason: 'Standardized prefix to AFT',
    };
  }

  // 6. Calculated / Estimated
  const calMatch = trimmed.match(/^(?:calc\.?|calculated)\s*(.+)$/i);
  if (calMatch) {
    const cleanSub = cleanInnerDate(calMatch[1].trim());
    const norm = `CAL ${cleanSub}`;
    return {
      original: trimmed,
      normalized: norm,
      changed: norm !== trimmed,
      isAmbiguous: false,
      reason: 'Standardized prefix to CAL',
    };
  }

  const estMatch = trimmed.match(/^(?:est\.?|estimated)\s*(.+)$/i);
  if (estMatch) {
    const cleanSub = cleanInnerDate(estMatch[1].trim());
    const norm = `EST ${cleanSub}`;
    return {
      original: trimmed,
      normalized: norm,
      changed: norm !== trimmed,
      isAmbiguous: false,
      reason: 'Standardized prefix to EST',
    };
  }

  // 7. Slash dates / numeric dates e.g. "12/05/1880" or "1880-05-12"
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const y = isoMatch[1];
    const mNum = parseInt(isoMatch[2], 10);
    const d = parseInt(isoMatch[3], 10);
    const monCode = Object.values(MONTH_MAP).find((x) => x.num === mNum)?.code || 'JAN';
    const norm = `${d} ${monCode} ${y}`;
    return {
      original: trimmed,
      normalized: norm,
      changed: true,
      isAmbiguous: false,
      reason: 'Converted ISO YYYY-MM-DD to standard GEDCOM format',
    };
  }

  // Slashes e.g. 10/12/1880 is ambiguous between MM/DD and DD/MM if both <= 12
  const slashMatch = trimmed.match(/^(\d{1,2})[\/\.](\d{1,2})[\/\.](\d{4})$/);
  if (slashMatch) {
    const p1 = parseInt(slashMatch[1], 10);
    const p2 = parseInt(slashMatch[2], 10);
    const y = slashMatch[3];
    if (p1 > 12 && p2 <= 12) {
      // p1 is day, p2 is month
      const monCode = Object.values(MONTH_MAP).find((x) => x.num === p2)?.code || 'JAN';
      const norm = `${p1} ${monCode} ${y}`;
      return {
        original: trimmed,
        normalized: norm,
        changed: true,
        isAmbiguous: false,
        reason: 'Converted DD/MM/YYYY to standard GEDCOM format',
      };
    } else if (p2 > 12 && p1 <= 12) {
      // p1 is month, p2 is day
      const monCode = Object.values(MONTH_MAP).find((x) => x.num === p1)?.code || 'JAN';
      const norm = `${p2} ${monCode} ${y}`;
      return {
        original: trimmed,
        normalized: norm,
        changed: true,
        isAmbiguous: false,
        reason: 'Converted MM/DD/YYYY to standard GEDCOM format',
      };
    } else {
      // Ambiguous! Both <= 12
      return {
        original: trimmed,
        normalized: trimmed,
        changed: false,
        isAmbiguous: true,
        reason: 'Ambiguous day/month in slash format (both numbers <= 12)',
      };
    }
  }

  // 8. Plain date with spelled out month e.g. "January 14, 1890" or "14 Jan 1890"
  const cleaned = cleanInnerDate(trimmed);
  if (cleaned !== trimmed) {
    return {
      original: trimmed,
      normalized: cleaned,
      changed: true,
      isAmbiguous: false,
      reason: 'Formatted month name and capitalization to standard GEDCOM form',
    };
  }

  return {
    original: trimmed,
    normalized: trimmed,
    changed: false,
    isAmbiguous: false,
  };
}

/**
 * Cleans the date contents: standardizes month to 3-letter uppercase (JAN, FEB, etc.)
 */
function cleanInnerDate(sub: string): string {
  // If e.g. "January 14, 1890" -> "14 JAN 1890"
  const m1 = sub.match(/^([a-z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})$/i);
  if (m1) {
    const mon = MONTH_MAP[m1[1].toLowerCase()]?.code || m1[1].toUpperCase().slice(0, 3);
    const day = parseInt(m1[2], 10);
    const yr = m1[3];
    return `${day} ${mon} ${yr}`;
  }

  // If e.g. "14 January 1890" or "14 Jan. 1890" -> "14 JAN 1890"
  const m2 = sub.match(/^(\d{1,2})\s+([a-z]+)\.?,?\s+(\d{4})$/i);
  if (m2) {
    const day = parseInt(m2[1], 10);
    const mon = MONTH_MAP[m2[2].toLowerCase()]?.code || m2[2].toUpperCase().slice(0, 3);
    const yr = m2[3];
    return `${day} ${mon} ${yr}`;
  }

  // If e.g. "January 1890" -> "JAN 1890"
  const m3 = sub.match(/^([a-z]+)\.?,?\s+(\d{4})$/i);
  if (m3) {
    const mon = MONTH_MAP[m3[1].toLowerCase()]?.code || m3[1].toUpperCase().slice(0, 3);
    const yr = m3[2];
    return `${mon} ${yr}`;
  }

  // If already standard uppercase 3-letter month e.g. "12 MAY 1880"
  return sub.trim();
}
