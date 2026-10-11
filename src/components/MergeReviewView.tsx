/**
 * GED Scout - Merge Review Queue View
 * Lists duplicate candidates found by validation engine + manual two-person merge selector.
 */

import React, { useState } from 'react';
import {
  GitMerge,
  Search,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Users,
} from 'lucide-react';
import { GedcomDocument, IntegrityReport } from '../types';

interface MergeReviewViewProps {
  doc: GedcomDocument;
  report: IntegrityReport;
  onOpenMerge: (idA: string, idB: string) => void;
}

export const MergeReviewView: React.FC<MergeReviewViewProps> = ({
  doc,
  report,
  onOpenMerge,
}) => {
  const [manualIdA, setManualIdA] = useState('');
  const [manualIdB, setManualIdB] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  // Extract all duplicate findings from the report
  const duplicateFindings = report.findings.filter(
    (f) => f.category === 'duplicates' && f.personId && f.secondaryPersonId
  );

  const filteredDuplicates = duplicateFindings.filter((f) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      f.personName?.toLowerCase().includes(q) ||
      f.secondaryPersonName?.toLowerCase().includes(q) ||
      f.personId?.toLowerCase().includes(q) ||
      f.secondaryPersonId?.toLowerCase().includes(q)
    );
  });

  const allIndividuals = Object.values(doc.individuals).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const handleStartManualMerge = () => {
    if (manualIdA && manualIdB && manualIdA !== manualIdB) {
      onOpenMerge(manualIdA, manualIdB);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Title & Overview */}
      <div className="space-y-2">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
          <GitMerge className="w-7 h-7 text-amber-400" />
          <span>Duplicate Person Merge Review</span>
        </h2>
        <p className="text-sm text-slate-400 max-w-2xl">
          Fuzzy and phonetic algorithms scanned your tree for near-identical names and matching birth dates.
          Every merge lets you align every field side-by-side with full write-in ability.
        </p>
      </div>

      {/* Manual Merge Selector Tool */}
      <div className="rounded-2xl border border-white/10 bg-[#0f1420]/70 p-5 space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
          <Users className="w-4 h-4 text-cyan-400" />
          <span>Manual Side-by-Side Merge Selector</span>
        </div>
        <p className="text-xs text-slate-400">
          Want to merge two individuals not flagged automatically? Select any two records from your tree:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">First Person (Record A)</label>
            <select
              value={manualIdA}
              onChange={(e) => setManualIdA(e.target.value)}
              className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
            >
              <option value="">Select individual...</option>
              {allIndividuals.map((ind) => (
                <option key={ind.id} value={ind.id}>
                  {ind.name} ({ind.id}) {ind.birth?.parsedYear ? `b. ${ind.birth.parsedYear}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Second Person (Record B)</label>
            <select
              value={manualIdB}
              onChange={(e) => setManualIdB(e.target.value)}
              className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
            >
              <option value="">Select individual...</option>
              {allIndividuals.map((ind) => (
                <option key={ind.id} value={ind.id}>
                  {ind.name} ({ind.id}) {ind.birth?.parsedYear ? `b. ${ind.birth.parsedYear}` : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleStartManualMerge}
            disabled={!manualIdA || !manualIdB || manualIdA === manualIdB}
            className="w-full px-4 py-2 text-xs font-semibold text-slate-900 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 disabled:hover:bg-cyan-400 rounded-lg transition-colors flex items-center justify-center gap-2 h-9 shadow-sm"
          >
            <span>Open Merge Workbench</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Detected Duplicate Queue */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Detected Duplicate Candidates ({duplicateFindings.length})
            </h3>
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filter candidate names..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#0f1420] border border-white/15 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>
        </div>

        {filteredDuplicates.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-[#0f1420]/40 p-12 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <h4 className="text-sm font-semibold text-white">No duplicate candidates found</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Your tree contains no detected identical or phonetic duplicate identities.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDuplicates.map((finding) => {
              const idA = finding.personId!;
              const idB = finding.secondaryPersonId!;
              const pA = doc.individuals[idA];
              const pB = doc.individuals[idB];
              const sim = finding.evidence?.similarityScore || 85;

              return (
                <div
                  key={finding.id}
                  className="rounded-xl border border-amber-500/30 bg-[#0f1420]/90 p-5 hover:border-amber-500/50 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-xs font-bold border border-amber-500/30">
                        {sim}% Similarity
                      </span>
                      <span className="text-xs text-slate-400">
                        Phonetic & Levenshtein Variant Match
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                      <div className="p-2.5 rounded-lg bg-black/30 border border-white/5 space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-white">{pA?.name || idA}</span>
                          <span className="font-mono text-slate-500 text-[11px]">{idA}</span>
                        </div>
                        <div className="text-slate-400 text-[11px]">
                          <span>Birth: {pA?.birth?.date || 'Unknown'}</span>
                          {pA?.birth?.place && <span> in {pA.birth.place}</span>}
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-black/30 border border-white/5 space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-white">{pB?.name || idB}</span>
                          <span className="font-mono text-slate-500 text-[11px]">{idB}</span>
                        </div>
                        <div className="text-slate-400 text-[11px]">
                          <span>Birth: {pB?.birth?.date || 'Unknown'}</span>
                          {pB?.birth?.place && <span> in {pB.birth.place}</span>}
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed">
                      {finding.explanation}
                    </p>
                  </div>

                  <div className="shrink-0 self-end md:self-center">
                    <button
                      onClick={() => onOpenMerge(idA, idB)}
                      className="px-4 py-2 text-xs font-semibold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <GitMerge className="w-3.5 h-3.5" />
                      <span>Compare & Merge</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
