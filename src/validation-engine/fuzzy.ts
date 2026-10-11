/**
 * Stand-in Rust/WASM Core: Fuzzy Matching & Phonetics
 * 100% dependency-free pure algorithms for duplicate person detection.
 */

/**
 * Standard Levenshtein edit distance between two strings
 */
export function levenshteinDistance(a: string, b: string): number {
  const s1 = a.toLowerCase().trim();
  const s2 = b.toLowerCase().trim();

  if (s1 === s2) return 0;
  if (!s1.length) return s2.length;
  if (!s2.length) return s1.length;

  const d: number[][] = [];
  for (let i = 0; i <= s1.length; i++) {
    d[i] = [i];
  }
  for (let j = 0; j <= s2.length; j++) {
    d[0][j] = j;
  }

  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1, // deletion
        d[i][j - 1] + 1, // insertion
        d[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return d[s1.length][s2.length];
}

/**
 * American Soundex phonetic encoding (e.g. Vance -> V520, Vancey -> V520)
 */
export function soundex(s: string): string {
  if (!s) return '';
  const clean = s.toUpperCase().replace(/[^A-Z]/g, '');
  if (!clean) return '';

  const firstLetter = clean[0];
  const mapping: Record<string, string> = {
    B: '1', F: '1', P: '1', V: '1',
    C: '2', G: '2', J: '2', K: '2', Q: '2', S: '2', X: '2', Z: '2',
    D: '3', T: '3',
    L: '4',
    M: '5', N: '5',
    R: '6',
  };

  let coded = firstLetter;
  let prevCode = mapping[firstLetter] || '0';

  for (let i = 1; i < clean.length; i++) {
    const char = clean[i];
    const code = mapping[char] || '0';

    if (code !== '0' && code !== prevCode) {
      coded += code;
    }
    prevCode = code;
    if (coded.length >= 4) break;
  }

  return (coded + '000').slice(0, 4);
}

/**
 * Computes name similarity percentage (0-100) combining edit distance and phonetics
 */
export function computeNameSimilarity(nameA: string, nameB: string): number {
  const cleanA = nameA.replace(/[\/\,\.\s]+/g, ' ').trim().toLowerCase();
  const cleanB = nameB.replace(/[\/\,\.\s]+/g, ' ').trim().toLowerCase();

  if (cleanA === cleanB) return 100;
  if (!cleanA || !cleanB) return 0;

  const maxLen = Math.max(cleanA.length, cleanB.length);
  const dist = levenshteinDistance(cleanA, cleanB);
  const ratio = (1 - dist / maxLen) * 100;

  const sndA = soundex(cleanA);
  const sndB = soundex(cleanB);
  const soundexBonus = sndA === sndB ? 15 : 0;

  return Math.min(100, Math.max(0, Math.round(ratio * 0.85 + soundexBonus)));
}
