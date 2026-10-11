/**
 * GED Scout - Top Navigation Bar
 * Conforms to Top Bar Contract: Brand Wordmark | Nav Tabs | Primary Actions & Undo/Redo
 */

import React from 'react';
import {
  ShieldAlert,
  RotateCcw,
  RotateCw,
  Download,
  FileText,
  SlidersHorizontal,
  GitMerge,
  Users,
  UploadCloud,
} from 'lucide-react';
import { ChangeLogEntry } from '../types';

export type ActiveTab = 'upload' | 'audit' | 'editor' | 'merge' | 'normalize' | 'export';

interface TopBarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  fileName: string | null;
  individualCount: number;
  integrityScore: number | null;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  lastAction?: ChangeLogEntry;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  setActiveTab,
  fileName,
  individualCount,
  integrityScore,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  lastAction,
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 8.5) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    if (score >= 6.5) return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0a0d14]/90 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark (single text element) */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setActiveTab('upload')}
            className="flex items-center gap-2.5 text-left focus:outline-none group"
          >
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:border-cyan-400/50 transition-colors">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <span className="text-base font-bold tracking-tight text-white whitespace-nowrap">
              GED Scout
            </span>
          </button>

          {fileName && (
            <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-white/10 text-xs text-slate-400">
              <span className="font-mono text-slate-300 max-w-[140px] truncate">{fileName}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{individualCount} individuals</span>
            </div>
          )}
        </div>

        {/* Zone 2: Navigation Links (single line, no pill enclosures) */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-400">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeTab === 'upload' ? 'text-cyan-400 font-semibold' : 'hover:text-slate-200'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload & File</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            disabled={!fileName}
            className={`flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 py-1 ${
              !fileName
                ? 'opacity-40 cursor-not-allowed'
                : activeTab === 'audit'
                ? 'text-cyan-400 font-semibold'
                : 'hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Audit Report</span>
          </button>

          <button
            onClick={() => setActiveTab('editor')}
            disabled={!fileName}
            className={`flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 py-1 ${
              !fileName
                ? 'opacity-40 cursor-not-allowed'
                : activeTab === 'editor'
                ? 'text-cyan-400 font-semibold'
                : 'hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Tree Editor</span>
          </button>

          <button
            onClick={() => setActiveTab('merge')}
            disabled={!fileName}
            className={`flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 py-1 ${
              !fileName
                ? 'opacity-40 cursor-not-allowed'
                : activeTab === 'merge'
                ? 'text-cyan-400 font-semibold'
                : 'hover:text-slate-200'
            }`}
          >
            <GitMerge className="w-3.5 h-3.5" />
            <span>Merge Review</span>
          </button>

          <button
            onClick={() => setActiveTab('normalize')}
            disabled={!fileName}
            className={`flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 py-1 ${
              !fileName
                ? 'opacity-40 cursor-not-allowed'
                : activeTab === 'normalize'
                ? 'text-cyan-400 font-semibold'
                : 'hover:text-slate-200'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Normalize Tools</span>
          </button>

          <button
            onClick={() => setActiveTab('export')}
            disabled={!fileName}
            className={`flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 py-1 ${
              !fileName
                ? 'opacity-40 cursor-not-allowed'
                : activeTab === 'export'
                ? 'text-cyan-400 font-semibold'
                : 'hover:text-slate-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Cleaned Export</span>
          </button>
        </nav>

        {/* Zone 3: Primary Actions & Undo/Redo */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Undo/Redo Stack Controls */}
          {fileName && (
            <div className="flex items-center gap-1 pr-2 border-r border-white/10">
              <button
                onClick={onUndo}
                disabled={!canUndo}
                title={canUndo ? `Undo: ${lastAction?.summary || 'last action'}` : 'Nothing to undo'}
                className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                aria-label="Undo"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={onRedo}
                disabled={!canRedo}
                title={canRedo ? 'Redo action' : 'Nothing to redo'}
                className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                aria-label="Redo"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Integrity Score indicator */}
          {integrityScore !== null && (
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-2.5 py-1 text-xs font-mono tabular-nums rounded border font-semibold ${getScoreColor(
                integrityScore
              )}`}
              title="Click to view full integrity breakdown"
            >
              {integrityScore.toFixed(1)} / 10
            </button>
          )}

          {/* Primary CTA */}
          {fileName && (
            <button
              onClick={() => setActiveTab('export')}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-md transition-colors whitespace-nowrap shrink-0 shadow-sm"
            >
              Export .ged
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
