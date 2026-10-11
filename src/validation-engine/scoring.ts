/**
 * GED Scout - Integrity Scoring Engine
 * Computes an overall integrity score from 0.0 to 10.0
 * with an explainable, transparent penalty breakdown.
 */

import { Finding, GedcomDocument, IntegrityReport } from '../types';

export function calculateIntegrityScore(
  doc: GedcomDocument,
  findings: Finding[]
): IntegrityReport {
  const individualCount = Object.keys(doc.individuals).length;
  const familyCount = Object.keys(doc.families).length;
  const sourceCount = Object.keys(doc.sources).length;

  let errorCount = 0;
  let warningCount = 0;
  let infoCount = 0;

  for (const f of findings) {
    if (f.severity === 'error') errorCount++;
    else if (f.severity === 'warning') warningCount++;
    else if (f.severity === 'info') infoCount++;
  }

  // Scoring math:
  // Base 10.0
  // Errors are critical logical breaks: -0.65 per error
  // Warnings are ambiguities and likely duplicates: -0.20 per warning
  // Info are minor hygiene and formatting issues: -0.04 per info
  // Normalized slightly for larger databases
  const scale = individualCount > 50 ? Math.max(0.3, 50 / individualCount) : 1;

  const rawErrorPenalty = errorCount * 0.65 * scale;
  const rawWarningPenalty = warningCount * 0.20 * scale;
  const rawInfoPenalty = infoCount * 0.04 * scale;

  const errorPenalties = Math.round(Math.min(6.5, rawErrorPenalty) * 10) / 10;
  const warningPenalties = Math.round(Math.min(3.0, rawWarningPenalty) * 10) / 10;
  const infoPenalties = Math.round(Math.min(1.5, rawInfoPenalty) * 10) / 10;

  const totalDeductions = errorPenalties + warningPenalties + infoPenalties;
  const score = Math.max(0.0, Math.min(10.0, Math.round((10.0 - totalDeductions) * 10) / 10));

  let grade: IntegrityReport['grade'] = 'F';
  if (score >= 9.0) grade = 'A';
  else if (score >= 8.0) grade = 'B';
  else if (score >= 6.5) grade = 'C';
  else if (score >= 5.0) grade = 'D';

  const explanations: string[] = [
    `Base perfect score: 10.0 points.`,
    errorCount > 0
      ? `-${errorPenalties.toFixed(1)} points: ${errorCount} fatal chronological or biological impossible errors.`
      : `0 error deductions. No chronological or biological impossibilities detected.`,
    warningCount > 0
      ? `-${warningPenalties.toFixed(1)} points: ${warningCount} warnings (duplicates, non-standard dates, unlinked individuals).`
      : `0 warning deductions. Duplicates and dates are cleanly structured.`,
    infoCount > 0
      ? `-${infoPenalties.toFixed(1)} points: ${infoCount} informational citation hygiene and missing attribute notices.`
      : `0 citation hygiene deductions.`,
  ];

  return {
    score,
    grade,
    scoreBreakdown: {
      baseScore: 10.0,
      errorPenalties,
      warningPenalties,
      infoPenalties,
      totalFindings: findings.length,
      explanation: explanations,
    },
    stats: {
      individualCount,
      familyCount,
      sourceCount,
      errorCount,
      warningCount,
      infoCount,
    },
    findings,
  };
}
