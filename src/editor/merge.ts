/**
 * GED Scout - Ancestry-Style Duplicate Merge Engine
 * Rigorously implements the 6-point Merge Contract:
 * 1. Side-by-side row-by-row comparison
 * 2. Per-field Keep A / Keep B / Custom Write-in
 * 3. Automatic non-conflicting data carry-over
 * 4. Explicit family link reconciliation and repointing
 * 5. Surviving identity selection with global pointer repointing
 * 6. Full preview before commit and atomic single undo unit
 */

import { ChangeLogEntry, Family, GedcomDocument, Individual } from '../types';
import { extractYear } from '../normalization/dateNormalizer';

export type MergeChoice = 'keepA' | 'keepB' | 'custom';

export interface MergeFieldRow {
  key: string;
  label: string;
  valA: string;
  valB: string;
  choice: MergeChoice;
  customVal: string;
  isConflicting: boolean;
}

export interface MergeFamilyLinkItem {
  familyId: string;
  type: 'parent' | 'spouse';
  description: string;
  fromPersonId: string;
  survives: boolean;
}

export interface MergePlan {
  idA: string;
  idB: string;
  survivingId: string; // The ID retained in the tree
  retiredId: string; // The ID merged away and repointed
  rows: MergeFieldRow[];
  familyLinks: MergeFamilyLinkItem[];
  carriedOverSummaries: string[];
}

/**
 * Calculates richness score for an individual to suggest the best surviving ID
 */
export function calculatePersonRichness(ind: Individual): number {
  let score = 0;
  if (ind.name && !ind.name.includes('Unknown')) score += 10;
  if (ind.givenName) score += 5;
  if (ind.surname) score += 5;
  if (ind.sex) score += 5;
  if (ind.birth?.date) score += 15;
  if (ind.birth?.place) score += 10;
  if (ind.death?.date) score += 15;
  if (ind.death?.place) score += 10;
  if (ind.burial?.date || ind.burial?.place) score += 10;
  score += (ind.events?.length || 0) * 10;
  score += (ind.sources?.length || 0) * 15;
  score += (ind.notes?.length || 0) * 5;
  score += (ind.famc?.length || 0) * 10;
  score += (ind.fams?.length || 0) * 10;
  return score;
}

/**
 * Builds the initial merge plan between two records
 */
export function initializeMergePlan(
  doc: GedcomDocument,
  idA: string,
  idB: string
): MergePlan {
  const pA = doc.individuals[idA];
  const pB = doc.individuals[idB];

  if (!pA || !pB) {
    throw new Error(`Cannot merge: individuals ${idA} or ${idB} not found.`);
  }

  // Suggest richer record as surviving ID
  const richnessA = calculatePersonRichness(pA);
  const richnessB = calculatePersonRichness(pB);
  const survivingId = richnessA >= richnessB ? idA : idB;
  const retiredId = survivingId === idA ? idB : idA;

  // Build field rows
  const makeRow = (key: string, label: string, valA = '', valB = ''): MergeFieldRow => {
    const isConflicting = valA.trim().toLowerCase() !== valB.trim().toLowerCase() && valA !== '' && valB !== '';
    // Default: choose non-empty, or prefer surviving record
    let choice: MergeChoice = 'keepA';
    if (!valA && valB) choice = 'keepB';
    else if (valA && !valB) choice = 'keepA';
    else choice = survivingId === idA ? 'keepA' : 'keepB';

    return {
      key,
      label,
      valA,
      valB,
      choice,
      customVal: valA || valB || '',
      isConflicting,
    };
  };

  const rows: MergeFieldRow[] = [
    makeRow('name', 'Full Name', pA.name, pB.name),
    makeRow('givenName', 'Given Name', pA.givenName, pB.givenName),
    makeRow('surname', 'Surname', pA.surname, pB.surname),
    makeRow('sex', 'Sex (M/F/U)', pA.sex, pB.sex),
    makeRow('birthDate', 'Birth Date', pA.birth?.date, pB.birth?.date),
    makeRow('birthPlace', 'Birth Place', pA.birth?.place, pB.birth?.place),
    makeRow('deathDate', 'Death Date', pA.death?.date, pB.death?.date),
    makeRow('deathPlace', 'Death Place', pA.death?.place, pB.death?.place),
    makeRow('burialDate', 'Burial Date', pA.burial?.date, pB.burial?.date),
    makeRow('burialPlace', 'Burial Place', pA.burial?.place, pB.burial?.place),
  ];

  // Family links
  const familyLinks: MergeFamilyLinkItem[] = [];

  // Parents (FAMC)
  const allFamc = Array.from(new Set([...pA.famc, ...pB.famc]));
  for (const famId of allFamc) {
    const fam = doc.families[famId];
    const husbName = fam?.husb ? doc.individuals[fam.husb]?.name : 'Unknown Father';
    const wifeName = fam?.wife ? doc.individuals[fam.wife]?.name : 'Unknown Mother';
    const from = pA.famc.includes(famId) && pB.famc.includes(famId) ? 'Both' : pA.famc.includes(famId) ? idA : idB;
    familyLinks.push({
      familyId: famId,
      type: 'parent',
      description: `Parents: ${husbName} & ${wifeName} (${famId})`,
      fromPersonId: from,
      survives: true, // Default keep
    });
  }

  // Spouses (FAMS)
  const allFams = Array.from(new Set([...pA.fams, ...pB.fams]));
  for (const famId of allFams) {
    const fam = doc.families[famId];
    const spouseId = fam?.husb === idA || fam?.husb === idB ? fam.wife : fam?.husb;
    const spouseName = spouseId ? doc.individuals[spouseId]?.name : 'Unknown Spouse';
    const childrenCount = fam?.children.length || 0;
    const from = pA.fams.includes(famId) && pB.fams.includes(famId) ? 'Both' : pA.fams.includes(famId) ? idA : idB;
    familyLinks.push({
      familyId: famId,
      type: 'spouse',
      description: `Spouse: ${spouseName} with ${childrenCount} child(ren) (${famId})`,
      fromPersonId: from,
      survives: true,
    });
  }

  // Non-conflicting carry-over summaries
  const carriedOverSummaries: string[] = [];
  const uniqueSources = Array.from(new Set([...pA.sources, ...pB.sources]));
  if (uniqueSources.length > 0) {
    carriedOverSummaries.push(`${uniqueSources.length} source citation(s) automatically combined`);
  }

  const uniqueNotes = Array.from(new Set([...pA.notes, ...pB.notes]));
  if (uniqueNotes.length > 0) {
    carriedOverSummaries.push(`${uniqueNotes.length} note record(s) combined`);
  }

  const uniqueEvents = [...pA.events, ...pB.events];
  if (uniqueEvents.length > 0) {
    carriedOverSummaries.push(`${uniqueEvents.length} secondary life event(s) combined`);
  }

  return {
    idA,
    idB,
    survivingId,
    retiredId,
    rows,
    familyLinks,
    carriedOverSummaries,
  };
}

/**
 * Generates preview of the merged Individual before committing
 */
export function previewMergedIndividual(
  plan: MergePlan,
  doc: GedcomDocument
): Individual {
  const pA = doc.individuals[plan.idA];
  const pB = doc.individuals[plan.idB];

  const getResolvedVal = (key: string): string => {
    const row = plan.rows.find((r) => r.key === key);
    if (!row) return '';
    if (row.choice === 'keepA') return row.valA;
    if (row.choice === 'keepB') return row.valB;
    return row.customVal;
  };

  const name = getResolvedVal('name');
  const givenName = getResolvedVal('givenName');
  const surname = getResolvedVal('surname');
  const sex = (getResolvedVal('sex') as Individual['sex']) || '';

  const birthDate = getResolvedVal('birthDate');
  const birthPlace = getResolvedVal('birthPlace');
  const deathDate = getResolvedVal('deathDate');
  const deathPlace = getResolvedVal('deathPlace');
  const burialDate = getResolvedVal('burialDate');
  const burialPlace = getResolvedVal('burialPlace');

  const survivingFamc = plan.familyLinks
    .filter((l) => l.type === 'parent' && l.survives)
    .map((l) => l.familyId);

  const survivingFams = plan.familyLinks
    .filter((l) => l.type === 'spouse' && l.survives)
    .map((l) => l.familyId);

  const mergedSources = Array.from(
    new Set([
      ...pA.sources,
      ...pB.sources,
      ...(pA.birth?.sources || []),
      ...(pB.birth?.sources || []),
    ])
  );

  const mergedNotes = Array.from(new Set([...pA.notes, ...pB.notes]));

  return {
    id: plan.survivingId,
    name: name || `${givenName} /${surname}/`.trim() || 'Unknown',
    givenName,
    surname,
    sex,
    birth: birthDate || birthPlace ? {
      id: `BIRT_${plan.survivingId}`,
      tag: 'BIRT',
      label: 'Birth',
      date: birthDate,
      parsedYear: extractYear(birthDate),
      place: birthPlace,
      sources: mergedSources,
    } : undefined,
    death: deathDate || deathPlace ? {
      id: `DEAT_${plan.survivingId}`,
      tag: 'DEAT',
      label: 'Death',
      date: deathDate,
      parsedYear: extractYear(deathDate),
      place: deathPlace,
      sources: mergedSources,
    } : undefined,
    burial: burialDate || burialPlace ? {
      id: `BURI_${plan.survivingId}`,
      tag: 'BURI',
      label: 'Burial',
      date: burialDate,
      parsedYear: extractYear(burialDate),
      place: burialPlace,
    } : undefined,
    events: [...pA.events, ...pB.events],
    famc: survivingFamc,
    fams: survivingFams,
    sources: mergedSources,
    notes: mergedNotes,
    customTags: [...pA.customTags, ...pB.customTags],
  };
}

/**
 * Commits the merge: repoints all references from retiredId to survivingId,
 * updates family records, removes retired person, and generates an atomic undo log.
 */
export function executeMerge(
  doc: GedcomDocument,
  plan: MergePlan
): { newDoc: GedcomDocument; logEntry: ChangeLogEntry } {
  const mergedPerson = previewMergedIndividual(plan, doc);
  const survivingId = plan.survivingId;
  const retiredId = plan.retiredId;

  // New individuals map
  const newIndividuals: Record<string, Individual> = {};
  for (const [id, ind] of Object.entries(doc.individuals)) {
    if (id === retiredId) {
      continue; // Merged away
    }
    if (id === survivingId) {
      newIndividuals[id] = mergedPerson;
    } else {
      newIndividuals[id] = {
        ...ind,
        famc: [...ind.famc],
        fams: [...ind.fams],
        sources: [...ind.sources],
        notes: [...ind.notes],
        events: [...ind.events],
      };
    }
  }

  // Surviving and dropped family links
  const survivingFamSet = new Set(
    plan.familyLinks.filter((l) => l.survives).map((l) => l.familyId)
  );
  const droppedFamSet = new Set(
    plan.familyLinks.filter((l) => !l.survives).map((l) => l.familyId)
  );

  // Repoint all families: replace retiredId with survivingId
  const newFamilies: Record<string, Family> = {};
  let repointedCount = 0;

  for (const [fId, fam] of Object.entries(doc.families)) {
    let husb = fam.husb;
    let wife = fam.wife;
    let children = [...fam.children];

    if (husb === retiredId) {
      husb = survivingFamSet.has(fId) ? survivingId : undefined;
      repointedCount++;
    }
    if (wife === retiredId) {
      wife = survivingFamSet.has(fId) ? survivingId : undefined;
      repointedCount++;
    }
    children = children.map((ch) => {
      if (ch === retiredId) {
        repointedCount++;
        return survivingFamSet.has(fId) ? survivingId : '';
      }
      return ch;
    }).filter(Boolean);

    // Deduplicate children in case both records were children in same family
    children = Array.from(new Set(children));

    newFamilies[fId] = {
      ...fam,
      husb,
      wife,
      children,
    };
  }

  const newDoc: GedcomDocument = {
    ...doc,
    individuals: newIndividuals,
    families: newFamilies,
  };

  const choiceDetails = plan.rows
    .filter((r) => r.choice === 'custom' || r.isConflicting)
    .map(
      (r) =>
        `${r.label}: Selected ${r.choice === 'custom' ? `Custom "${r.customVal}"` : r.choice === 'keepA' ? `Record A ("${r.valA}")` : `Record B ("${r.valB}")`}`
    );

  const logEntry: ChangeLogEntry = {
    id: `mrg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    actionType: 'merge',
    summary: `Merged duplicate records: ${plan.idA} & ${plan.idB} into ${survivingId}`,
    details: [
      `Surviving record: ${survivingId} (${mergedPerson.name})`,
      `Retired record: ${retiredId}`,
      `Repointed ${repointedCount} global link pointers.`,
      droppedFamSet.size > 0 ? `Dropped ${droppedFamSet.size} unselected family link(s).` : 'All family links reconciled.',
      ...choiceDetails,
    ],
    affectedRecordIds: [plan.idA, plan.idB, survivingId, retiredId],
  };

  return { newDoc, logEntry };
}
