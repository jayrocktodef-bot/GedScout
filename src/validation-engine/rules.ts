/**
 * GED Scout - Validation Engine Rules
 * 100% pure functions checking family tree integrity.
 * Every check returns structured findings with full evidence and suggested fix actions.
 */

import { Finding, GedcomDocument, Individual } from '../types';
import { extractYear, normalizeDateString, parseGedcomDate } from '../normalization/dateNormalizer';
import { computeNameSimilarity, levenshteinDistance, soundex } from './fuzzy';

/**
 * 1-6. Chronological Impossibilities
 */
export function checkChronology(doc: GedcomDocument): Finding[] {
  const findings: Finding[] = [];

  for (const ind of Object.values(doc.individuals)) {
    const birthYr = ind.birth?.parsedYear;
    const deathYr = ind.death?.parsedYear;
    const burialYr = ind.burial?.parsedYear;

    // 1. Birth after death
    if (birthYr !== undefined && deathYr !== undefined && birthYr > deathYr) {
      findings.push({
        id: `chron_birt_after_deat_${ind.id}`,
        ruleId: 'CHRON_BIRTH_AFTER_DEATH',
        ruleName: 'Birth After Death',
        category: 'chronology',
        severity: 'error',
        personId: ind.id,
        personName: ind.name,
        explanation: `${ind.name} is recorded as born in ${birthYr}, but died in ${deathYr}. Birth cannot occur after death.`,
        evidence: {
          birthDate: ind.birth?.date,
          deathDate: ind.death?.date,
          birthYear: birthYr,
          deathYear: deathYr,
        },
        suggestedFix: 'edit-dates',
      });
    }

    // 2. Burial before death
    if (burialYr !== undefined && deathYr !== undefined && burialYr < deathYr) {
      findings.push({
        id: `chron_buri_before_deat_${ind.id}`,
        ruleId: 'CHRON_BURIAL_BEFORE_DEATH',
        ruleName: 'Burial Before Death',
        category: 'chronology',
        severity: 'error',
        personId: ind.id,
        personName: ind.name,
        explanation: `${ind.name} is recorded as buried in ${burialYr}, but died in ${deathYr}. Burial cannot precede death.`,
        evidence: {
          burialDate: ind.burial?.date,
          deathDate: ind.death?.date,
          burialYear: burialYr,
          deathYear: deathYr,
        },
        suggestedFix: 'edit-dates',
      });
    }
  }

  // Check family marriages and parent-child chronology
  for (const fam of Object.values(doc.families)) {
    const marrYr = fam.marriage?.parsedYear;
    const husb = fam.husb ? doc.individuals[fam.husb] : undefined;
    const wife = fam.wife ? doc.individuals[fam.wife] : undefined;

    // 3. Marriage before birth
    if (marrYr !== undefined) {
      if (husb && husb.birth?.parsedYear && marrYr < husb.birth.parsedYear) {
        findings.push({
          id: `chron_marr_before_birt_husb_${fam.id}_${husb.id}`,
          ruleId: 'CHRON_MARRIAGE_BEFORE_BIRTH',
          ruleName: 'Marriage Before Birth',
          category: 'chronology',
          severity: 'error',
          personId: husb.id,
          personName: husb.name,
          familyId: fam.id,
          explanation: `${husb.name} married in ${marrYr}, but was not born until ${husb.birth.parsedYear}. Marriage cannot precede birth.`,
          evidence: {
            marriageDate: fam.marriage?.date,
            birthDate: husb.birth.date,
            marriageYear: marrYr,
            birthYear: husb.birth.parsedYear,
          },
          suggestedFix: 'edit-dates',
        });
      }

      if (wife && wife.birth?.parsedYear && marrYr < wife.birth.parsedYear) {
        findings.push({
          id: `chron_marr_before_birt_wife_${fam.id}_${wife.id}`,
          ruleId: 'CHRON_MARRIAGE_BEFORE_BIRTH',
          ruleName: 'Marriage Before Birth',
          category: 'chronology',
          severity: 'error',
          personId: wife.id,
          personName: wife.name,
          familyId: fam.id,
          explanation: `${wife.name} married in ${marrYr}, but was not born until ${wife.birth.parsedYear}. Marriage cannot precede birth.`,
          evidence: {
            marriageDate: fam.marriage?.date,
            birthDate: wife.birth.date,
            marriageYear: marrYr,
            birthYear: wife.birth.parsedYear,
          },
          suggestedFix: 'edit-dates',
        });
      }
    }

    // Check children against parents
    for (const childId of fam.children) {
      const child = doc.individuals[childId];
      if (!child || !child.birth?.parsedYear) continue;
      const childBirthYr = child.birth.parsedYear;

      // 4. Parent under 12 years old at child's birth
      if (husb && husb.birth?.parsedYear) {
        const fatherAgeAtBirth = childBirthYr - husb.birth.parsedYear;
        if (fatherAgeAtBirth >= 0 && fatherAgeAtBirth < 12) {
          findings.push({
            id: `chron_parent_under_12_${husb.id}_${child.id}`,
            ruleId: 'CHRON_PARENT_UNDER_12',
            ruleName: 'Parent Under 12 at Child Birth',
            category: 'chronology',
            severity: 'error',
            personId: husb.id,
            personName: husb.name,
            secondaryPersonId: child.id,
            secondaryPersonName: child.name,
            familyId: fam.id,
            explanation: `Father ${husb.name} was only ${fatherAgeAtBirth} years old when child ${child.name} was born in ${childBirthYr}. Biological paternity under age 12 is impossible.`,
            evidence: {
              parentBirthYear: husb.birth.parsedYear,
              childBirthYear: childBirthYr,
              parentAge: fatherAgeAtBirth,
            },
            suggestedFix: 'edit-dates',
          });
        }
      }

      if (wife && wife.birth?.parsedYear) {
        const motherAgeAtBirth = childBirthYr - wife.birth.parsedYear;
        if (motherAgeAtBirth >= 0 && motherAgeAtBirth < 12) {
          findings.push({
            id: `chron_parent_under_12_${wife.id}_${child.id}`,
            ruleId: 'CHRON_PARENT_UNDER_12',
            ruleName: 'Parent Under 12 at Child Birth',
            category: 'chronology',
            severity: 'error',
            personId: wife.id,
            personName: wife.name,
            secondaryPersonId: child.id,
            secondaryPersonName: child.name,
            familyId: fam.id,
            explanation: `Mother ${wife.name} was only ${motherAgeAtBirth} years old when child ${child.name} was born in ${childBirthYr}. Maternal birth under age 12 is impossible.`,
            evidence: {
              parentBirthYear: wife.birth.parsedYear,
              childBirthYear: childBirthYr,
              parentAge: motherAgeAtBirth,
            },
            suggestedFix: 'edit-dates',
          });
        }

        // 5. Mother over 55 at child's birth
        if (motherAgeAtBirth > 55) {
          findings.push({
            id: `chron_mother_over_55_${wife.id}_${child.id}`,
            ruleId: 'CHRON_MOTHER_OVER_55',
            ruleName: 'Mother Over 55 at Child Birth',
            category: 'chronology',
            severity: 'error',
            personId: wife.id,
            personName: wife.name,
            secondaryPersonId: child.id,
            secondaryPersonName: child.name,
            familyId: fam.id,
            explanation: `Mother ${wife.name} was ${motherAgeAtBirth} years old when child ${child.name} was born in ${childBirthYr}. Natural maternal birth over age 55 is an anomaly or error.`,
            evidence: {
              motherBirthYear: wife.birth.parsedYear,
              childBirthYear: childBirthYr,
              motherAge: motherAgeAtBirth,
            },
            suggestedFix: 'edit-dates',
          });
        }
      }

      // 6. Child born > 9 months after father's death
      if (husb && husb.death?.parsedYear) {
        // If child birth year is strictly greater than father's death year + 1 (or > 1 year after)
        const yearsDiff = childBirthYr - husb.death.parsedYear;
        if (yearsDiff > 1) {
          findings.push({
            id: `chron_born_after_father_death_${child.id}_${husb.id}`,
            ruleId: 'CHRON_BORN_AFTER_FATHER_DEATH',
            ruleName: 'Born Posthumously (> 9 Months After Father Death)',
            category: 'chronology',
            severity: 'error',
            personId: child.id,
            personName: child.name,
            secondaryPersonId: husb.id,
            secondaryPersonName: husb.name,
            familyId: fam.id,
            explanation: `${child.name} was born in ${childBirthYr}, ${yearsDiff} years after father ${husb.name} died in ${husb.death.parsedYear}. Child was born more than 9 months after father's death.`,
            evidence: {
              childBirthYear: childBirthYr,
              fatherDeathYear: husb.death.parsedYear,
              yearsDiff,
            },
            suggestedFix: 'edit-dates',
          });
        }
      }
    }
  }

  return findings;
}

/**
 * 7-8. Lifespan Anomalies
 * Age > 110 is an error; age 101-110 is a warning.
 */
export function checkLifespans(doc: GedcomDocument): Finding[] {
  const findings: Finding[] = [];
  const currentYear = 2026;

  for (const ind of Object.values(doc.individuals)) {
    const birthYr = ind.birth?.parsedYear;
    if (!birthYr) continue;

    let calculatedAge: number;
    let isLiving = false;

    if (ind.death?.parsedYear) {
      calculatedAge = ind.death.parsedYear - birthYr;
    } else {
      calculatedAge = currentYear - birthYr;
      isLiving = true;
    }

    if (calculatedAge < 0) continue; // Captured by birth-after-death

    // Age over 110 is an error
    if (calculatedAge > 110) {
      findings.push({
        id: `lifespan_over_110_${ind.id}`,
        ruleId: 'LIFESPAN_OVER_110',
        ruleName: 'Lifespan Over 110 Years',
        category: 'lifespan',
        severity: 'error',
        personId: ind.id,
        personName: ind.name,
        explanation: `${ind.name} has a recorded lifespan of ${calculatedAge} years (${birthYr} to ${ind.death?.parsedYear || 'living'}). Verified lifespans beyond 110 are extremely rare and almost always denote a conflated identity.`,
        evidence: {
          calculatedAge,
          birthYear: birthYr,
          deathYear: ind.death?.parsedYear,
          isLiving,
        },
        suggestedFix: 'edit-dates',
      });
    } else if (calculatedAge >= 101 && calculatedAge <= 110) {
      // Age 101-110 is a warning
      findings.push({
        id: `lifespan_centenarian_${ind.id}`,
        ruleId: 'LIFESPAN_CENTENARIAN_101_110',
        ruleName: 'Centenarian Lifespan (101-110 Years)',
        category: 'lifespan',
        severity: 'warning',
        personId: ind.id,
        personName: ind.name,
        explanation: `${ind.name} is recorded with an age of ${calculatedAge} years (${birthYr} to ${ind.death?.parsedYear || 'living'}). Centenarian lifespans warrant corroborating census or death evidence.`,
        evidence: {
          calculatedAge,
          birthYear: birthYr,
          deathYear: ind.death?.parsedYear,
          isLiving,
        },
        suggestedFix: 'inspect-person',
      });
    }
  }

  return findings;
}

/**
 * 9. Duplicate Detection
 * Same or near-identical name with birth year within 2 years,
 * including phonetic and edit-distance fuzzy matching for variant spellings.
 */
export function checkDuplicates(doc: GedcomDocument): Finding[] {
  const findings: Finding[] = [];
  const indList = Object.values(doc.individuals);

  for (let i = 0; i < indList.length; i++) {
    const a = indList[i];
    for (let j = i + 1; j < indList.length; j++) {
      const b = indList[j];

      // Avoid matching nameless individuals
      const nameA = (a.givenName + ' ' + a.surname).trim() || a.name;
      const nameB = (b.givenName + ' ' + b.surname).trim() || b.name;
      if (!nameA || !nameB) continue;

      const birthA = a.birth?.parsedYear;
      const birthB = b.birth?.parsedYear;

      // Check birth year closeness (within 2 years) or identical spouses if birth missing
      let birthClose = false;
      let birthDiff = 0;
      if (birthA !== undefined && birthB !== undefined) {
        birthDiff = Math.abs(birthA - birthB);
        if (birthDiff <= 2) {
          birthClose = true;
        }
      } else if (birthA === undefined && birthB === undefined) {
        // Both missing birth years: check if they share a spouse or surname
        if (a.surname && b.surname && a.surname.toLowerCase() === b.surname.toLowerCase()) {
          birthClose = true;
        }
      }

      if (!birthClose) continue;

      // Compute name similarity
      const sim = computeNameSimilarity(nameA, nameB);
      const sndSurnameMatch = soundex(a.surname || '') === soundex(b.surname || '');
      const lev = levenshteinDistance(nameA, nameB);

      // Duplicate match criteria:
      // High similarity (>= 75) or exact surname soundex with close given name
      if (sim >= 75 || (sndSurnameMatch && lev <= 3)) {
        findings.push({
          id: `dup_${a.id}_${b.id}`,
          ruleId: 'DUPLICATE_CANDIDATE',
          ruleName: 'Potential Duplicate Person',
          category: 'duplicates',
          severity: 'warning',
          personId: a.id,
          personName: a.name,
          secondaryPersonId: b.id,
          secondaryPersonName: b.name,
          explanation: `${a.name} (${a.id}${birthA ? `, b. ${birthA}` : ''}) and ${b.name} (${b.id}${birthB ? `, b. ${birthB}` : ''}) share near-identical names and matching birth years. Phonetic and edit-distance similarity is ${sim}%.`,
          evidence: {
            personA: { id: a.id, name: a.name, birth: a.birth?.date },
            personB: { id: b.id, name: b.name, birth: b.birth?.date },
            similarityScore: sim,
            birthYearDifference: birthDiff,
          },
          suggestedFix: 'merge-duplicates',
        });
      }
    }
  }

  return findings;
}

/**
 * 10-14. Structural Problems
 * - Individuals with no family links
 * - Families missing spouses
 * - Children linked to no parents
 * - Missing sex
 * - Malformed or ambiguous dates
 */
export function checkStructural(doc: GedcomDocument): Finding[] {
  const findings: Finding[] = [];

  // 10. Individuals with no family links
  for (const ind of Object.values(doc.individuals)) {
    if (ind.famc.length === 0 && ind.fams.length === 0) {
      findings.push({
        id: `struct_unlinked_indi_${ind.id}`,
        ruleId: 'STRUCT_UNLINKED_INDIVIDUAL',
        ruleName: 'Unlinked Floating Individual',
        category: 'structural',
        severity: 'warning',
        personId: ind.id,
        personName: ind.name,
        explanation: `${ind.name} (${ind.id}) has no parents (FAMC) and no spouse or children (FAMS) linked. This is a floating island record in the tree graph.`,
        evidence: {
          famcCount: 0,
          famsCount: 0,
        },
        suggestedFix: 'delete-person',
      });
    }

    // 13. Missing sex
    if (!ind.sex || ind.sex === 'U') {
      findings.push({
        id: `struct_missing_sex_${ind.id}`,
        ruleId: 'STRUCT_MISSING_SEX',
        ruleName: 'Missing or Unknown Sex',
        category: 'structural',
        severity: 'info',
        personId: ind.id,
        personName: ind.name,
        explanation: `${ind.name} (${ind.id}) does not have an explicit SEX marker ('M' or 'F').`,
        evidence: {
          sex: ind.sex || 'Not specified',
        },
        suggestedFix: 'edit-person',
      });
    }

    // 14. Malformed or ambiguous dates on individual facts
    const checkDate = (tag: string, label: string, dateStr?: string, eventSuffix?: string | number) => {
      if (!dateStr) return;
      const parsed = parseGedcomDate(dateStr);
      const norm = normalizeDateString(dateStr);

      if (!parsed.isStandard || norm.changed || norm.isAmbiguous) {
        const suffixStr = eventSuffix !== undefined ? `_${eventSuffix}` : '';
        findings.push({
          id: `struct_malformed_date_${ind.id}_${tag}${suffixStr}`,
          ruleId: 'STRUCT_MALFORMED_DATE',
          ruleName: `Malformed Date (${label})`,
          category: 'structural',
          severity: 'warning',
          personId: ind.id,
          personName: ind.name,
          explanation: `${ind.name} has a non-standard ${label.toLowerCase()} date "${dateStr}". ${norm.reason || 'Not compliant with GEDCOM standard date format.'}`,
          evidence: {
            field: label,
            originalDate: dateStr,
            suggestedNormalization: norm.normalized,
            isAmbiguous: norm.isAmbiguous,
            eventSuffix: suffixStr || undefined,
          },
          suggestedFix: 'normalize-date',
        });
      }
    };

    if (ind.birth?.date) checkDate('BIRT', 'Birth', ind.birth.date, ind.birth.id || 'birth');
    if (ind.death?.date) checkDate('DEAT', 'Death', ind.death.date, ind.death.id || 'death');
    if (ind.burial?.date) checkDate('BURI', 'Burial', ind.burial.date, ind.burial.id || 'burial');
    ind.events.forEach((ev, idx) => {
      if (ev.date) checkDate(ev.tag, ev.label, ev.date, ev.id || idx);
    });
  }

  // Families
  for (const fam of Object.values(doc.families)) {
    // 11. Families missing spouses
    if (!fam.husb && !fam.wife) {
      findings.push({
        id: `struct_fam_no_spouses_${fam.id}`,
        ruleId: 'STRUCT_FAMILY_NO_SPOUSES',
        ruleName: 'Family Missing Both Spouses',
        category: 'structural',
        severity: 'warning',
        familyId: fam.id,
        explanation: `Family ${fam.id} contains neither a husband nor a wife record, yet exists in the tree.`,
        evidence: {
          familyId: fam.id,
          childrenCount: fam.children.length,
        },
        suggestedFix: 'relink-family',
      });
    } else if (!fam.husb || !fam.wife) {
      findings.push({
        id: `struct_fam_single_spouse_${fam.id}`,
        ruleId: 'STRUCT_FAMILY_SINGLE_SPOUSE',
        ruleName: 'Family Missing One Spouse',
        category: 'structural',
        severity: 'info',
        familyId: fam.id,
        personId: fam.husb || fam.wife,
        personName: fam.husb ? doc.individuals[fam.husb]?.name : fam.wife ? doc.individuals[fam.wife]?.name : undefined,
        explanation: `Family ${fam.id} is missing a ${!fam.husb ? 'husband' : 'wife'} record.`,
        evidence: {
          familyId: fam.id,
          existingSpouse: fam.husb || fam.wife,
        },
        suggestedFix: 'inspect-person',
      });
    }

    // 12. Children linked to no parents
    if (!fam.husb && !fam.wife && fam.children.length > 0) {
      for (const chId of fam.children) {
        const child = doc.individuals[chId];
        findings.push({
          id: `struct_child_no_parents_${chId}_${fam.id}`,
          ruleId: 'STRUCT_CHILD_NO_PARENTS',
          ruleName: 'Child Linked to Parentless Family',
          category: 'structural',
          severity: 'warning',
          personId: chId,
          personName: child?.name,
          familyId: fam.id,
          explanation: `${child?.name || chId} is assigned to family ${fam.id} as a child, but that family has neither a father nor a mother record.`,
          evidence: {
            childId: chId,
            familyId: fam.id,
          },
          suggestedFix: 'relink-family',
        });
      }
    }

    // Marriage date format check
    if (fam.marriage?.date) {
      const parsed = parseGedcomDate(fam.marriage.date);
      const norm = normalizeDateString(fam.marriage.date);
      if (!parsed.isStandard || norm.changed || norm.isAmbiguous) {
        findings.push({
          id: `struct_malformed_marr_date_${fam.id}`,
          ruleId: 'STRUCT_MALFORMED_DATE',
          ruleName: 'Malformed Marriage Date',
          category: 'structural',
          severity: 'warning',
          familyId: fam.id,
          explanation: `Family ${fam.id} marriage date "${fam.marriage.date}" is non-standard. ${norm.reason || 'Needs normalization.'}`,
          evidence: {
            originalDate: fam.marriage.date,
            suggestedNormalization: norm.normalized,
            isAmbiguous: norm.isAmbiguous,
          },
          suggestedFix: 'normalize-date',
        });
      }
    }
  }

  return findings;
}

/**
 * 15. Citation Hygiene
 * Facts with no source attached, flagged per person.
 */
export function checkCitationHygiene(doc: GedcomDocument): Finding[] {
  const findings: Finding[] = [];

  for (const ind of Object.values(doc.individuals)) {
    const hasIndLevelSources = ind.sources.length > 0;

    // Check birth source
    if (ind.birth && (!ind.birth.sources || ind.birth.sources.length === 0) && !hasIndLevelSources) {
      findings.push({
        id: `cite_no_source_birt_${ind.id}`,
        ruleId: 'CITE_FACT_WITHOUT_SOURCE',
        ruleName: 'Birth Fact Missing Source Citation',
        category: 'citation',
        severity: 'info',
        personId: ind.id,
        personName: ind.name,
        explanation: `${ind.name} has a recorded birth fact (${ind.birth.date || 'date unknown'}), but no primary source or citation is attached to support it.`,
        evidence: {
          fact: 'Birth',
          date: ind.birth.date,
          place: ind.birth.place,
        },
        suggestedFix: 'add-source',
      });
    }

    // Check death source
    if (ind.death && (!ind.death.sources || ind.death.sources.length === 0) && !hasIndLevelSources) {
      findings.push({
        id: `cite_no_source_deat_${ind.id}`,
        ruleId: 'CITE_FACT_WITHOUT_SOURCE',
        ruleName: 'Death Fact Missing Source Citation',
        category: 'citation',
        severity: 'info',
        personId: ind.id,
        personName: ind.name,
        explanation: `${ind.name} has a recorded death fact (${ind.death.date || 'date unknown'}), but no primary source citation is attached.`,
        evidence: {
          fact: 'Death',
          date: ind.death.date,
          place: ind.death.place,
        },
        suggestedFix: 'add-source',
      });
    }
  }

  return findings;
}
