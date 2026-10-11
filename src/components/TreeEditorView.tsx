/**
 * GED Scout - Tree Editor View
 * Searchable, filterable list of all individuals in the GEDCOM file.
 * Supports multi-selection, filtered batch deletion (governed by the Deletion Contract),
 * quick filtering for unlinked floating records, and opening the Person Detail Drawer.
 */

import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Trash2,
  UserCheck,
  AlertOctagon,
  AlertTriangle,
  Users,
  Calendar,
  ExternalLink,
  CheckSquare,
  Square,
} from 'lucide-react';
import { Finding, GedcomDocument, Individual } from '../types';

interface TreeEditorViewProps {
  doc: GedcomDocument;
  findings: Finding[];
  onSelectPerson: (personId: string) => void;
  onRequestBatchDelete: (personIds: string[]) => void;
  onRequestSingleDelete: (personId: string) => void;
}

export const TreeEditorView: React.FC<TreeEditorViewProps> = ({
  doc,
  findings,
  onSelectPerson,
  onRequestBatchDelete,
  onRequestSingleDelete,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'hasIssues' | 'unlinked' | 'missingDates'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Map findings by person ID for instant issue counting
  const findingsByPerson = useMemo(() => {
    const map = new Map<string, { errors: number; warnings: number; info: number }>();
    for (const f of findings) {
      if (f.personId) {
        const entry = map.get(f.personId) || { errors: 0, warnings: 0, info: 0 };
        if (f.severity === 'error') entry.errors++;
        else if (f.severity === 'warning') entry.warnings++;
        else if (f.severity === 'info') entry.info++;
        map.set(f.personId, entry);
      }
      if (f.secondaryPersonId) {
        const entry = map.get(f.secondaryPersonId) || { errors: 0, warnings: 0, info: 0 };
        if (f.severity === 'error') entry.errors++;
        else if (f.severity === 'warning') entry.warnings++;
        else if (f.severity === 'info') entry.info++;
        map.set(f.secondaryPersonId, entry);
      }
    }
    return map;
  }, [findings]);

  // Filter individuals
  const individuals = useMemo(() => {
    return Object.values(doc.individuals).filter((ind) => {
      // 1. Filter type
      if (filterType === 'hasIssues') {
        const counts = findingsByPerson.get(ind.id);
        if (!counts || (counts.errors === 0 && counts.warnings === 0)) return false;
      } else if (filterType === 'unlinked') {
        if (ind.famc.length > 0 || ind.fams.length > 0) return false;
      } else if (filterType === 'missingDates') {
        if (ind.birth?.date || ind.death?.date) return false;
      }

      // 2. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = ind.name.toLowerCase().includes(q);
        const matchId = ind.id.toLowerCase().includes(q);
        const matchGiven = ind.givenName.toLowerCase().includes(q);
        const matchSurn = ind.surname.toLowerCase().includes(q);
        return matchName || matchId || matchGiven || matchSurn;
      }

      return true;
    });
  }, [doc.individuals, filterType, searchQuery, findingsByPerson]);

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    if (selectedIds.size === individuals.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(individuals.map((ind) => ind.id)));
    }
  };

  const handleBatchDelete = () => {
    if (selectedIds.size > 0) {
      onRequestBatchDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  const countUnlinked = useMemo(() => {
    return Object.values(doc.individuals).filter(
      (ind) => ind.famc.length === 0 && ind.fams.length === 0
    ).length;
  }, [doc.individuals]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Title & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Tree Editor</h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Browse and edit all {Object.keys(doc.individuals).length} individuals in your family tree.
          </p>
        </div>

        {/* Batch Delete Trigger */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 bg-rose-500/10 border border-rose-500/30 p-2 px-3 rounded-xl">
            <span className="text-xs text-rose-300 font-semibold font-mono tabular-nums">
              {selectedIds.size} selected
            </span>
            <button
              onClick={handleBatchDelete}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Batch Delete Selected</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl border border-white/10 bg-[#0f1420]/80 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search individuals by name, surname, or ID..."
              className="w-full pl-10 pr-4 py-2 text-xs bg-black/40 border border-white/15 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto text-xs">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                filterType === 'all'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                  : 'text-slate-400 hover:text-white bg-white/5'
              }`}
            >
              All ({Object.keys(doc.individuals).length})
            </button>

            <button
              onClick={() => setFilterType('hasIssues')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                filterType === 'hasIssues'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-semibold'
                  : 'text-slate-400 hover:text-white bg-white/5'
              }`}
            >
              Has Audit Issues
            </button>

            <button
              onClick={() => setFilterType('unlinked')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                filterType === 'unlinked'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                  : 'text-slate-400 hover:text-white bg-white/5'
              }`}
            >
              Unlinked Floating ({countUnlinked})
            </button>
          </div>
        </div>

        {/* Multi-select Header Control */}
        <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-slate-400">
          <button
            onClick={selectAllFiltered}
            className="flex items-center gap-2 hover:text-white transition-colors"
          >
            {selectedIds.size === individuals.length && individuals.length > 0 ? (
              <CheckSquare className="w-4 h-4 text-cyan-400" />
            ) : (
              <Square className="w-4 h-4 text-slate-500" />
            )}
            <span>
              {selectedIds.size === individuals.length && individuals.length > 0
                ? 'Deselect all filtered'
                : `Select all in view (${individuals.length})`}
            </span>
          </button>

          {countUnlinked > 0 && filterType !== 'unlinked' && (
            <button
              onClick={() => setFilterType('unlinked')}
              className="text-amber-400 hover:underline"
            >
              View {countUnlinked} unlinked floating records
            </button>
          )}
        </div>
      </div>

      {/* High-Density Data Grid (SaaS/Dashboard Guidelines) */}
      <div className="rounded-xl border border-white/10 bg-[#0f1420]/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-black/30 text-slate-400 font-semibold">
                <th className="py-3 px-4 w-10 text-center">
                  <span className="sr-only">Select</span>
                </th>
                <th className="py-3 px-4 w-24 font-mono">Record ID</th>
                <th className="py-3 px-4">Full Name</th>
                <th className="py-3 px-4 w-16">Sex</th>
                <th className="py-3 px-4">Birth Date & Place</th>
                <th className="py-3 px-4">Death Date & Place</th>
                <th className="py-3 px-4">Family Links</th>
                <th className="py-3 px-4">Audit Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {individuals.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 italic">
                    No individuals found matching current filter.
                  </td>
                </tr>
              ) : (
                individuals.map((ind) => {
                  const isSelected = selectedIds.has(ind.id);
                  const issueCounts = findingsByPerson.get(ind.id);
                  const isUnlinked = ind.famc.length === 0 && ind.fams.length === 0;

                  return (
                    <tr
                      key={ind.id}
                      onClick={() => onSelectPerson(ind.id)}
                      className={`cursor-pointer hover:bg-white/5 transition-colors ${
                        isSelected ? 'bg-cyan-950/20' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td
                        className="py-3 px-4 text-center"
                        onClick={(e) => toggleSelect(ind.id, e)}
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-cyan-400 mx-auto" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-600 mx-auto hover:text-slate-400" />
                        )}
                      </td>

                      {/* ID */}
                      <td className="py-3 px-4 font-mono text-cyan-400 font-medium">
                        {ind.id}
                      </td>

                      {/* Name */}
                      <td className="py-3 px-4 font-semibold text-white">
                        {ind.name}
                      </td>

                      {/* Sex */}
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {ind.sex || '—'}
                      </td>

                      {/* Birth */}
                      <td className="py-3 px-4 text-slate-300 font-mono">
                        {ind.birth?.date || '—'}{' '}
                        {ind.birth?.place && (
                          <span className="text-slate-500 text-[11px] font-sans">
                            ({ind.birth.place})
                          </span>
                        )}
                      </td>

                      {/* Death */}
                      <td className="py-3 px-4 text-slate-300 font-mono">
                        {ind.death?.date || '—'}{' '}
                        {ind.death?.place && (
                          <span className="text-slate-500 text-[11px] font-sans">
                            ({ind.death.place})
                          </span>
                        )}
                      </td>

                      {/* Links */}
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {isUnlinked ? (
                          <span className="text-amber-400 font-medium">Unlinked</span>
                        ) : (
                          <span>
                            {ind.famc.length > 0 && `${ind.famc.length} parent`}{' '}
                            {ind.fams.length > 0 && `${ind.fams.length} spouse`}
                          </span>
                        )}
                      </td>

                      {/* Audit Status */}
                      <td className="py-3 px-4">
                        {issueCounts?.errors ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-rose-400 font-semibold">
                            <AlertOctagon className="w-3.5 h-3.5" />
                            <span>{issueCounts.errors} error(s)</span>
                          </span>
                        ) : issueCounts?.warnings ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 font-medium">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>{issueCounts.warnings} warn</span>
                          </span>
                        ) : (
                          <span className="text-slate-600 text-[11px]">Pass</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onSelectPerson(ind.id)}
                            className="px-2 py-1 text-[11px] text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 rounded transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => onRequestSingleDelete(ind.id)}
                            className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                            title="Delete person"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
