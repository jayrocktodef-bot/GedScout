/**
 * GED Scout - Audit Report Dashboard
 * Overall integrity score out of 10 with transparent penalty deduction breakdown,
 * filterable findings grouped by severity, explainable evidence, and working quick fix actions.
 */

import React, { useState } from 'react';
import {
  AlertTriangle,
  AlertOctagon,
  Info,
  Search,
  Filter,
  ArrowRight,
  GitMerge,
  Calendar,
  Trash2,
  Edit3,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import { Finding, FindingCategory, GedcomDocument, IntegrityReport, Severity } from '../types';

interface AuditReportViewProps {
  report: IntegrityReport;
  doc: GedcomDocument;
  onQuickFix: (finding: Finding) => void;
  onSelectPerson: (personId: string) => void;
  onOpenMerge: (idA: string, idB: string) => void;
}

export const AuditReportView: React.FC<AuditReportViewProps> = ({
  report,
  doc,
  onQuickFix,
  onSelectPerson,
  onOpenMerge,
}) => {
  const [selectedSeverity, setSelectedSeverity] = useState<Severity | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<FindingCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showScoreExplainer, setShowScoreExplainer] = useState(false);

  // Filter findings
  const filteredFindings = report.findings.filter((f) => {
    if (selectedSeverity !== 'all' && f.severity !== selectedSeverity) return false;
    if (selectedCategory !== 'all' && f.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = f.personName?.toLowerCase().includes(q);
      const matchId = f.personId?.toLowerCase().includes(q);
      const matchRule = f.ruleName.toLowerCase().includes(q);
      const matchExp = f.explanation.toLowerCase().includes(q);
      return matchName || matchId || matchRule || matchExp;
    }
    return true;
  });

  const getScoreBadgeColor = (score: number) => {
    if (score >= 8.5) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    if (score >= 6.5) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
  };

  const getSeverityBadge = (severity: Severity) => {
    switch (severity) {
      case 'error':
        return {
          label: 'Error',
          icon: <AlertOctagon className="w-3.5 h-3.5" />,
          classes: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
        };
      case 'warning':
        return {
          label: 'Warning',
          icon: <AlertTriangle className="w-3.5 h-3.5" />,
          classes: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
        };
      case 'info':
        return {
          label: 'Notice',
          icon: <Info className="w-3.5 h-3.5" />,
          classes: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
        };
    }
  };

  const categories: Array<{ id: FindingCategory | 'all'; label: string }> = [
    { id: 'all', label: 'All Categories' },
    { id: 'chronology', label: 'Chronology' },
    { id: 'lifespan', label: 'Lifespan' },
    { id: 'duplicates', label: 'Duplicates' },
    { id: 'structural', label: 'Structural' },
    { id: 'citation', label: 'Citation Hygiene' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Integrity Score Hero & Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Score Card */}
        <div className="rounded-2xl border border-white/10 bg-[#0f1420]/80 p-6 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
              Integrity Score
            </span>
            <span
              className={`px-2 py-0.5 rounded text-xs font-mono font-bold border ${getScoreBadgeColor(
                report.score
              )}`}
            >
              Grade {report.grade}
            </span>
          </div>

          <div className="space-y-1">
            <div className="text-4xl sm:text-5xl font-extrabold font-mono tracking-tight text-white flex items-baseline gap-2">
              <span className={report.score >= 7.0 ? 'text-emerald-400' : report.score >= 5.0 ? 'text-amber-400' : 'text-rose-400'}>
                {report.score.toFixed(1)}
              </span>
              <span className="text-slate-500 text-xl font-normal">/ 10.0</span>
            </div>
            <p className="text-xs text-slate-400">
              Computed across {report.stats.individualCount} individuals and {report.findings.length} audit points.
            </p>
          </div>

          <button
            onClick={() => setShowScoreExplainer(!showScoreExplainer)}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 transition-colors pt-2 border-t border-white/5"
          >
            <span>{showScoreExplainer ? 'Hide calculation breakdown' : 'How this score was calculated'}</span>
            <ArrowRight className={`w-3 h-3 transition-transform ${showScoreExplainer ? 'rotate-90' : ''}`} />
          </button>
        </div>

        {/* Severity Summary Stat Cards */}
        <div className="lg:col-span-2 grid grid-cols-3 gap-4">
          {/* Errors */}
          <button
            onClick={() => setSelectedSeverity(selectedSeverity === 'error' ? 'all' : 'error')}
            className={`p-5 rounded-2xl border text-left transition-all ${
              selectedSeverity === 'error'
                ? 'border-rose-500 bg-rose-950/20 shadow-md shadow-rose-950/20'
                : 'border-white/10 bg-[#0f1420]/60 hover:border-rose-500/40'
            }`}
          >
            <div className="flex items-center justify-between text-rose-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Fatal Errors</span>
              <AlertOctagon className="w-4 h-4" />
            </div>
            <div className="text-3xl font-bold font-mono text-white tabular-nums">
              {report.stats.errorCount}
            </div>
            <p className="text-xs text-slate-400 mt-1">Impossible chronology & biological limits</p>
          </button>

          {/* Warnings */}
          <button
            onClick={() => setSelectedSeverity(selectedSeverity === 'warning' ? 'all' : 'warning')}
            className={`p-5 rounded-2xl border text-left transition-all ${
              selectedSeverity === 'warning'
                ? 'border-amber-500 bg-amber-950/20 shadow-md shadow-amber-950/20'
                : 'border-white/10 bg-[#0f1420]/60 hover:border-amber-500/40'
            }`}
          >
            <div className="flex items-center justify-between text-amber-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Warnings</span>
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="text-3xl font-bold font-mono text-white tabular-nums">
              {report.stats.warningCount}
            </div>
            <p className="text-xs text-slate-400 mt-1">Duplicates, malformed dates, floating links</p>
          </button>

          {/* Notices */}
          <button
            onClick={() => setSelectedSeverity(selectedSeverity === 'info' ? 'all' : 'info')}
            className={`p-5 rounded-2xl border text-left transition-all ${
              selectedSeverity === 'info'
                ? 'border-sky-500 bg-sky-950/20 shadow-md shadow-sky-950/20'
                : 'border-white/10 bg-[#0f1420]/60 hover:border-sky-500/40'
            }`}
          >
            <div className="flex items-center justify-between text-sky-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Notices</span>
              <Info className="w-4 h-4" />
            </div>
            <div className="text-3xl font-bold font-mono text-white tabular-nums">
              {report.stats.infoCount}
            </div>
            <p className="text-xs text-slate-400 mt-1">Citation hygiene & missing attributes</p>
          </button>
        </div>
      </div>

      {/* Score Deduction Explainer Panel */}
      {showScoreExplainer && (
        <div className="rounded-xl border border-white/10 bg-[#0f1420] p-6 space-y-3 animate-in fade-in duration-200">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
            Scoring Formula & Transparent Penalties
          </h4>
          <div className="space-y-1.5 text-xs text-slate-300 font-mono">
            {report.scoreBreakdown.explanation.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="text-cyan-400">·</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 pt-2 border-t border-white/5">
            Fixing errors, merging duplicate records, and standardizing dates restores points to your file score.
          </p>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
          {/* Search box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by person name, ID, or rule..."
              className="w-full pl-10 pr-4 py-2 text-xs bg-[#0f1420] border border-white/15 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
            />
          </div>

          {/* Reset filters shortcut */}
          {(selectedSeverity !== 'all' || selectedCategory !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedSeverity('all');
                setSelectedCategory('all');
                setSearchQuery('');
              }}
              className="text-xs text-slate-400 hover:text-cyan-300 underline underline-offset-4 self-center"
            >
              Reset active filters ({filteredFindings.length} showing)
            </button>
          )}
        </div>

        {/* Category segment tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-transparent'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Findings List */}
      <div className="space-y-3">
        {filteredFindings.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-[#0f1420]/40 p-12 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <h4 className="text-sm font-semibold text-white">No findings matched your filter</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {report.findings.length === 0
                ? 'Your GEDCOM file passed all integrity tests with zero findings. Perfect pedigree health!'
                : 'Try adjusting your search query or category filters to view remaining issues.'}
            </p>
          </div>
        ) : (
          filteredFindings.map((finding, idx) => {
            const badge = getSeverityBadge(finding.severity);
            return (
              <div
                key={`${finding.id}_${idx}`}
                className="rounded-xl border border-white/10 bg-[#0f1420]/80 p-4 sm:p-5 hover:border-white/20 transition-colors space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-medium border ${badge.classes}`}
                    >
                      {badge.icon}
                      <span>{badge.label}</span>
                    </span>

                    <span className="text-xs font-bold text-slate-200">
                      {finding.ruleName}
                    </span>

                    {finding.personId && (
                      <button
                        onClick={() => onSelectPerson(finding.personId!)}
                        className="text-xs font-mono text-cyan-400 hover:text-cyan-300 underline underline-offset-2 flex items-center gap-1"
                        title="View individual in tree editor"
                      >
                        <span>{finding.personName || finding.personId}</span>
                        <span className="text-slate-500">({finding.personId})</span>
                      </button>
                    )}

                    {finding.secondaryPersonId && (
                      <div className="text-xs text-slate-400 flex items-center gap-1">
                        <span>and</span>
                        <button
                          onClick={() => onSelectPerson(finding.secondaryPersonId!)}
                          className="font-mono text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
                        >
                          {finding.secondaryPersonName || finding.secondaryPersonId}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Fix Action Button */}
                  <div className="shrink-0 pt-1 sm:pt-0">
                    {finding.category === 'duplicates' && finding.personId && finding.secondaryPersonId ? (
                      <button
                        onClick={() => onOpenMerge(finding.personId!, finding.secondaryPersonId!)}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                      >
                        <GitMerge className="w-3.5 h-3.5" />
                        <span>Compare & Merge</span>
                      </button>
                    ) : finding.ruleId === 'STRUCT_MALFORMED_DATE' ? (
                      <button
                        onClick={() => onQuickFix(finding)}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-900 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Normalize Date</span>
                      </button>
                    ) : finding.ruleId === 'STRUCT_UNLINKED_INDIVIDUAL' ? (
                      <button
                        onClick={() => onQuickFix(finding)}
                        className="px-3 py-1.5 text-xs font-semibold text-rose-300 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Person</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => onQuickFix(finding)}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-200 bg-white/10 hover:bg-white/15 border border-white/15 rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Fix in Editor</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Plain-English Explanation */}
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {finding.explanation}
                </p>

                {/* Evidence breakdown */}
                {finding.evidence && Object.keys(finding.evidence).length > 0 && (
                  <div className="p-2.5 rounded-lg bg-black/30 border border-white/5 text-xs font-mono text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
                    {Object.entries(finding.evidence).map(([key, val]) => {
                      if (val === undefined || typeof val === 'object') return null;
                      return (
                        <div key={key}>
                          <span className="text-slate-500">{key}: </span>
                          <span className="text-slate-300">{String(val)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
