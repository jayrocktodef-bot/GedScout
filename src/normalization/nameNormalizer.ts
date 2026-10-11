/**
 * GED Scout - Name Normalization Module
 * Configurable rules for given name and surname standardization:
 * - Surname casing: ALLCAPS vs Title Case
 * - Given-name title casing
 * - Collapsing redundant whitespace
 * - Standardizing unknown-surname placeholders ("---", "Unknown", "[Unknown]", "???")
 */

import { Individual } from '../types';

export interface NameNormalizationConfig {
  surnameCasing: 'TitleCase' | 'ALLCAPS' | 'Preserve';
  givenNameTitleCase: boolean;
  collapseWhitespace: boolean;
  standardizeUnknownSurname: boolean;
  unknownSurnameReplacement: string; // e.g. "Unknown" or "[Unknown]" or "---"
}

export const DEFAULT_NAME_CONFIG: NameNormalizationConfig = {
  surnameCasing: 'TitleCase',
  givenNameTitleCase: true,
  collapseWhitespace: true,
  standardizeUnknownSurname: true,
  unknownSurnameReplacement: 'Unknown',
};

const UNKNOWN_PATTERNS = [
  /^(unknown|\?+|\-+|\.+|n\/a|unidentified|anon|anonymous|\[unknown\]|\(unknown\))$/i,
];

/**
 * Capitalizes a word into Title Case, handling hyphenated and Mc/Mac/O' prefixes thoughtfully
 */
export function toTitleCase(word: string): string {
  if (!word) return '';
  return word
    .toLowerCase()
    .replace(/(^|[\s\-\'’])([a-z])/g, (_, boundary, char) => boundary + char.toUpperCase())
    .replace(/\bMc([a-z])/g, (_, char) => `Mc${char.toUpperCase()}`)
    .replace(/\bMac([a-z])/g, (_, char) => `Mac${char.toUpperCase()}`);
}

/**
 * Checks if a string is a placeholder for an unknown surname
 */
export function isUnknownSurname(s: string): boolean {
  const trimmed = s.trim();
  if (!trimmed) return true;
  return UNKNOWN_PATTERNS.some((pattern) => pattern.test(trimmed));
}

/**
 * Normalizes a full name representation:
 * GEDCOM name standard: "Given Names /SURNAME/"
 */
export function normalizeIndividualName(
  ind: Individual,
  config: NameNormalizationConfig
): {
  changed: boolean;
  name: string;
  givenName: string;
  surname: string;
  reasons: string[];
} {
  let given = ind.givenName || '';
  let surn = ind.surname || '';
  const reasons: string[] = [];

  // Extract from ind.name if given/surn not already populated
  if (!given && !surn && ind.name) {
    const slashMatch = ind.name.match(/^(.*?)(?:\/([^\/]*)\/)?(.*)$/);
    if (slashMatch) {
      given = slashMatch[1].trim();
      surn = slashMatch[2]?.trim() || '';
    }
  }

  // 1. Whitespace collapsing
  if (config.collapseWhitespace) {
    const prevGiven = given;
    const prevSurn = surn;
    given = given.replace(/\s+/g, ' ').trim();
    surn = surn.replace(/\s+/g, ' ').trim();
    if (prevGiven !== given || prevSurn !== surn) {
      reasons.push('Collapsed extra whitespace');
    }
  }

  // 2. Unknown surname standardization
  if (config.standardizeUnknownSurname && isUnknownSurname(surn)) {
    if (surn !== config.unknownSurnameReplacement) {
      surn = config.unknownSurnameReplacement;
      reasons.push(`Standardized unknown surname placeholder to "${config.unknownSurnameReplacement}"`);
    }
  } else {
    // 3. Surname casing
    if (config.surnameCasing === 'ALLCAPS' && surn) {
      const upper = surn.toUpperCase();
      if (surn !== upper) {
        surn = upper;
        reasons.push('Converted surname to ALLCAPS');
      }
    } else if (config.surnameCasing === 'TitleCase' && surn) {
      const titled = toTitleCase(surn);
      if (surn !== titled) {
        surn = titled;
        reasons.push('Converted surname to Title Case');
      }
    }
  }

  // 4. Given name title casing
  if (config.givenNameTitleCase && given) {
    const titled = toTitleCase(given);
    if (given !== titled) {
      given = titled;
      reasons.push('Converted given name to Title Case');
    }
  }

  // Construct full GEDCOM name e.g. "John /Vance/"
  const fullName = surn ? `${given} /${surn}/`.trim() : given;
  const changed = fullName !== ind.name || given !== ind.givenName || surn !== ind.surname;

  return {
    changed,
    name: fullName,
    givenName: given,
    surname: surn,
    reasons,
  };
}
