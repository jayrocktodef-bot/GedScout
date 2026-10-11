/**
 * GED Scout - Normalization Workbench
 * Batch date standardization (unambiguous batch fix + ambiguous review queue)
 * and configurable name normalization with live preview before commit.
 */

import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Type,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sliders,
  Sparkles,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { ChangeLogEntry, GedcomDocument, Individual } from '../types';
import { normalizeDateString } from '../normalization/dateNormalizer';
import {
  DEFAULT_NAME_CONFIG,
  NameNormalizationConfig,
  normalizeIndividualName,
} from '../normalization/nameNormalizer';

interface BatchNormalizationViewProps {
  doc: GedcomDocument;
  onApplyDateNormalization: (updates: Array<{ personId?: string; familyId?: string; factTag: string; newDate: string; eventId?: string; originalDate?: string }>, summary: string) => void;
  onApplyNameNormalization: (updates: Array<{ personId: string; newGiven: string; newSurname: string; newFullName: string }>, summary: string) => void;
}

export const BatchNormalizationView: React.FC<BatchNormalizationViewProps> = ({
  doc,
  onApplyDateNormalization,
  onApplyNameNormalization,
}) => {
  const [activeTab, setActiveTab] = useState<'dates' | 'names'>('dates');

  // ----------------------------------------------------
  // DATE NORMALIZATION STATE & SCAN
  // ----------------------------------------------------
  const dateCandidates = useMemo(() => {
    const unambiguous: Array<{
      id: string;
      personId?: string;
      familyId?: string;
      ownerName: string;
      tag: string;
      label: string;
      original: string;
      normalized: string;
      reason: string;
      eventId?: string;
    }> = [];

    const ambiguous: Array<{
      id: string;
      personId?: string;
      familyId?: string;
      ownerName: string;
      tag: string;
      label: string;
      original: string;
      suggestedA: string;
      suggestedB: string;
      selected: string;
      eventId?: string;
    }> = [];

    // Scan individuals
    for (const ind of Object.values(doc.individuals)) {
      const testFact = (tag: string, label: string, dateStr?: string, eventSuffix?: string | number) => {
        if (!dateStr) return;
        const res = normalizeDateString(dateStr);
        const suffix = eventSuffix !== undefined ? `_${eventSuffix}` : '';
        const uniqueKey = `${ind.id}_${tag}${suffix}`;

        if (res.changed && !res.isAmbiguous) {
          unambiguous.push({
            id: uniqueKey,
            personId: ind.id,
            ownerName: ind.name,
            tag,
            label,
            original: dateStr,
            normalized: res.normalized,
            reason: res.reason || 'Converted to standard GEDCOM format',
            eventId: typeof eventSuffix === 'string' ? eventSuffix : undefined,
          });
        } else if (res.isAmbiguous) {
          // e.g. 04/05/1880
          const match = dateStr.match(/^(\d{1,2})[\/\.](\d{1,2})[\/\.](\d{4})$/);
          let a = dateStr;
          let b = dateStr;
          if (match) {
            const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
            const mA = months[parseInt(match[2], 10) - 1] || 'JAN';
            const mB = months[parseInt(match[1], 10) - 1] || 'JAN';
            a = `${parseInt(match[1], 10)} ${mA} ${match[3]}`;
            b = `${parseInt(match[2], 10)} ${mB} ${match[3]}`;
          }
          ambiguous.push({
            id: uniqueKey,
            personId: ind.id,
            ownerName: ind.name,
            tag,
            label,
            original: dateStr,
            suggestedA: a,
            suggestedB: b,
            selected: a,
            eventId: typeof eventSuffix === 'string' ? eventSuffix : undefined,
          });
        }
      };

      if (ind.birth?.date) testFact('BIRT', 'Birth', ind.birth.date, ind.birth.id || 'birth');
      if (ind.death?.date) testFact('DEAT', 'Death', ind.death.date, ind.death.id || 'death');
      if (ind.burial?.date) testFact('BURI', 'Burial', ind.burial.date, ind.burial.id || 'burial');
      ind.events.forEach((ev, idx) => {
        if (ev.date) testFact(ev.tag, ev.label, ev.date, ev.id || idx);
      });
    }

    // Scan families
    for (const fam of Object.values(doc.families)) {
      if (fam.marriage?.date) {
        const res = normalizeDateString(fam.marriage.date);
        const famName = `Family ${fam.id}`;
        if (res.changed && !res.isAmbiguous) {
          unambiguous.push({
            id: `${fam.id}_MARR`,
            familyId: fam.id,
            ownerName: famName,
            tag: 'MARR',
            label: 'Marriage',
            original: fam.marriage.date,
            normalized: res.normalized,
            reason: res.reason || 'Converted to standard GEDCOM format',
          });
        }
      }
    }

    return { unambiguous, ambiguous };
  }, [doc]);

  const [ambiguousChoices, setAmbiguousChoices] = useState<Record<string, string>>({});

  const handleApplyUnambiguousDates = () => {
    const updates = dateCandidates.unambiguous.map((item) => ({
      personId: item.personId,
      familyId: item.familyId,
      factTag: item.tag,
      newDate: item.normalized,
      eventId: item.eventId,
      originalDate: item.original,
    }));

    onApplyDateNormalization(
      updates,
      `Batch normalized ${updates.length} non-standard date(s) into GEDCOM standard form`
    );
  };

  const handleApplyAmbiguousChoice = (item: typeof dateCandidates.ambiguous[0]) => {
    const chosen = ambiguousChoices[item.id] || item.suggestedA;
    const update = [
      {
        personId: item.personId,
        familyId: item.familyId,
        factTag: item.tag,
        newDate: chosen,
        eventId: item.eventId,
        originalDate: item.original,
      },
    ];
    onApplyDateNormalization(update, `Resolved ambiguous date for ${item.ownerName} to "${chosen}"`);
  };

  // ----------------------------------------------------
  // NAME NORMALIZATION STATE & SCAN
  // ----------------------------------------------------
  const [nameConfig, setNameConfig] = useState<NameNormalizationConfig>(DEFAULT_NAME_CONFIG);

  const namePreview = useMemo(() => {
    const list: Array<{
      personId: string;
      originalName: string;
      newGiven: string;
      newSurname: string;
      newFullName: string;
      reasons: string[];
    }> = [];

    for (const ind of Object.values(doc.individuals)) {
      const res = normalizeIndividualName(ind, nameConfig);
      if (res.changed) {
        list.push({
          personId: ind.id,
          originalName: ind.name,
          newGiven: res.givenName,
          newSurname: res.surname,
          newFullName: res.name,
          reasons: res.reasons,
        });
      }
    }

    return list;
  }, [doc.individuals, nameConfig]);

  const handleApplyNames = () => {
    const updates = namePreview.map((item) => ({
      personId: item.personId,
      newGiven: item.newGiven,
      newSurname: item.newSurname,
      newFullName: item.newFullName,
    }));

    onApplyNameNormalization(
      updates,
      `Standardized name formatting across ${updates.length} individual(s) (${nameConfig.surnameCasing} surnames)`
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* View Header */}
      <div className="space-y-2">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
          Data Normalization Tools
        </h2>
        <p className="text-sm text-slate-400 max-w-2xl">
          Clean inconsistent historical date phrases and standardize genealogical name casing.
          Every bulk action is previewed and can be fully undone with a single click.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        <button
          onClick={() => setActiveTab('dates')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'dates'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'text-slate-400 hover:text-white bg-white/5'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Normalize Dates ({dateCandidates.unambiguous.length + dateCandidates.ambiguous.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('names')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'names'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'text-slate-400 hover:text-white bg-white/5'
          }`}
        >
          <Type className="w-4 h-4" />
          <span>Normalize Names ({namePreview.length})</span>
        </button>
      </div>

      {/* DATES TAB */}
      {activeTab === 'dates' && (
        <div className="space-y-6">
          {/* Unambiguous Section */}
          <div className="rounded-2xl border border-white/10 bg-[#0f1420]/80 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Unambiguous Dates ({dateCandidates.unambiguous.length})
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[11px] border border-emerald-500/30">
                    Safe to Auto-Apply
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Standardizes phrases like "Abt 1843", "circa 1865?", and "between 1835-1840" into standard GEDCOM form (ABT, BEF, AFT, BET ... AND ...).
                </p>
              </div>

              {dateCandidates.unambiguous.length > 0 && (
                <button
                  onClick={handleApplyUnambiguousDates}
                  className="shrink-0 px-4 py-2 text-xs font-semibold text-slate-900 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors flex items-center gap-2 shadow-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Apply All {dateCandidates.unambiguous.length} Date Fixes</span>
                </button>
              )}
            </div>

            {dateCandidates.unambiguous.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-white/10 rounded-xl text-xs text-slate-500">
                All unambiguous dates in your file already match standard GEDCOM 5.5 formatting.
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {dateCandidates.unambiguous.map((item, idx) => (
                  <div
                    key={`${item.id}_${idx}`}
                    className="p-3 rounded-lg border border-white/5 bg-black/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-200">{item.ownerName}</span>
                      <span className="text-slate-500 ml-2 font-mono">({item.label})</span>
                      <div className="text-[11px] text-slate-400 mt-0.5">{item.reason}</div>
                    </div>

                    <div className="flex items-center gap-3 font-mono">
                      <span className="text-rose-400 line-through bg-rose-500/10 px-2 py-0.5 rounded">
                        {item.original}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-bold">
                        {item.normalized}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ambiguous Review Queue */}
          {dateCandidates.ambiguous.length > 0 && (
            <div className="rounded-2xl border border-amber-500/30 bg-[#0f1420]/80 p-6 space-y-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                    Ambiguous Dates Review Queue ({dateCandidates.ambiguous.length})
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[11px] border border-amber-500/30">
                    User Review Required
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  These dates contain ambiguous slash format (e.g. 04/05/1880 where both day and month are under 12). Select the correct interpretation for each:
                </p>
              </div>

              <div className="space-y-3">
                {dateCandidates.ambiguous.map((item, idx) => {
                  const currentChoice = ambiguousChoices[item.id] || item.suggestedA;

                  return (
                    <div
                      key={`${item.id}_${idx}`}
                      className="p-4 rounded-xl border border-white/10 bg-black/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                    >
                      <div>
                        <span className="font-semibold text-white">{item.ownerName}</span>
                        <span className="text-slate-400 ml-2 font-mono">
                          {item.label}: "{item.original}"
                        </span>
                      </div>

                      <div className="flex items-center gap-3 flex-wrap">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name={`amb_${item.id}`}
                            checked={currentChoice === item.suggestedA}
                            onChange={() =>
                              setAmbiguousChoices((prev) => ({ ...prev, [item.id]: item.suggestedA }))
                            }
                            className="text-cyan-500 focus:ring-0"
                          />
                          <span className="font-mono text-slate-200">{item.suggestedA} (DD/MM)</span>
                        </label>

                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name={`amb_${item.id}`}
                            checked={currentChoice === item.suggestedB}
                            onChange={() =>
                              setAmbiguousChoices((prev) => ({ ...prev, [item.id]: item.suggestedB }))
                            }
                            className="text-cyan-500 focus:ring-0"
                          />
                          <span className="font-mono text-slate-200">{item.suggestedB} (MM/DD)</span>
                        </label>

                        <button
                          onClick={() => handleApplyAmbiguousChoice(item)}
                          className="px-3 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold rounded transition-colors text-xs ml-2"
                        >
                          Resolve
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* NAMES TAB */}
      {activeTab === 'names' && (
        <div className="space-y-6">
          {/* Rules Configuration Bar */}
          <div className="p-5 rounded-2xl border border-white/10 bg-[#0f1420]/80 space-y-4">
            <span className="text-xs font-bold text-white uppercase tracking-wider block">
              Configurable Normalization Rules
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              {/* Surname Casing */}
              <div className="space-y-1.5">
                <label className="block text-slate-400">Surname Casing</label>
                <select
                  value={nameConfig.surnameCasing}
                  onChange={(e) =>
                    setNameConfig((prev) => ({
                      ...prev,
                      surnameCasing: e.target.value as any,
                    }))
                  }
                  className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="TitleCase">Title Case (e.g. Vance)</option>
                  <option value="ALLCAPS">ALLCAPS (e.g. VANCE)</option>
                  <option value="Preserve">Preserve Existing Casing</option>
                </select>
              </div>

              {/* Given Name Title Case */}
              <div className="space-y-1.5">
                <label className="block text-slate-400">Given Name Casing</label>
                <select
                  value={nameConfig.givenNameTitleCase ? 'yes' : 'no'}
                  onChange={(e) =>
                    setNameConfig((prev) => ({
                      ...prev,
                      givenNameTitleCase: e.target.value === 'yes',
                    }))
                  }
                  className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="yes">Convert to Title Case</option>
                  <option value="no">Preserve Original</option>
                </select>
              </div>

              {/* Collapse whitespace */}
              <div className="space-y-1.5">
                <label className="block text-slate-400">Whitespace Hygiene</label>
                <select
                  value={nameConfig.collapseWhitespace ? 'yes' : 'no'}
                  onChange={(e) =>
                    setNameConfig((prev) => ({
                      ...prev,
                      collapseWhitespace: e.target.value === 'yes',
                    }))
                  }
                  className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="yes">Collapse extra spaces</option>
                  <option value="no">Leave as-is</option>
                </select>
              </div>

              {/* Unknown placeholder */}
              <div className="space-y-1.5">
                <label className="block text-slate-400">Unknown Surname Placeholder</label>
                <select
                  value={nameConfig.unknownSurnameReplacement}
                  onChange={(e) =>
                    setNameConfig((prev) => ({
                      ...prev,
                      unknownSurnameReplacement: e.target.value,
                    }))
                  }
                  className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="Unknown">Standardize to "Unknown"</option>
                  <option value="[Unknown]">Standardize to "[Unknown]"</option>
                  <option value="---">Standardize to "---"</option>
                </select>
              </div>
            </div>
          </div>

          {/* Preview & Apply Card */}
          <div className="p-6 rounded-2xl border border-white/10 bg-[#0f1420]/80 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Live Preview of Changes ({namePreview.length} Individuals Affected)
                </h3>
                <p className="text-xs text-slate-400">
                  Review the exact proposed name changes before committing to your tree.
                </p>
              </div>

              {namePreview.length > 0 && (
                <button
                  onClick={handleApplyNames}
                  className="px-4 py-2 text-xs font-semibold text-slate-900 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors flex items-center gap-2 shadow-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Apply Name Normalization ({namePreview.length})</span>
                </button>
              )}
            </div>

            {namePreview.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-white/10 rounded-xl text-xs text-slate-500">
                All individual names already adhere to your selected casing and placeholder rules.
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {namePreview.map((item, idx) => (
                  <div
                    key={`${item.personId}_${idx}`}
                    className="p-3 rounded-lg border border-white/5 bg-black/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <span className="font-mono text-cyan-400 font-semibold">{item.personId}</span>
                      <span className="text-slate-500 ml-2 text-[11px]">
                        {item.reasons.join(', ')}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 font-mono">
                      <span className="text-rose-400 line-through bg-rose-500/10 px-2 py-0.5 rounded">
                        {item.originalName}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-bold">
                        {item.newFullName}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
