/**
 * GED Scout - Person Detail & Quick Editor Drawer
 * Shows vital facts, parents, spouses, children, attached citations,
 * active validation findings, and inline editing with save & delete actions.
 */

import React, { useState } from 'react';
import {
  X,
  User,
  Trash2,
  Calendar,
  MapPin,
  ShieldAlert,
  GitBranch,
  BookOpen,
  Check,
  Save,
  Plus,
} from 'lucide-react';
import { FactEvent, Finding, GedcomDocument, Individual } from '../types';
import { extractYear, normalizeDateString } from '../normalization/dateNormalizer';

interface PersonDetailDrawerProps {
  personId: string | null;
  onClose: () => void;
  doc: GedcomDocument;
  findings: Finding[];
  onSavePerson: (updatedPerson: Individual) => void;
  onRequestDelete: (personId: string) => void;
  onNavigatePerson: (personId: string) => void;
}

export const PersonDetailDrawer: React.FC<PersonDetailDrawerProps> = ({
  personId,
  onClose,
  doc,
  findings,
  onSavePerson,
  onRequestDelete,
  onNavigatePerson,
}) => {
  if (!personId || !doc.individuals[personId]) return null;

  const ind = doc.individuals[personId];
  const personFindings = findings.filter(
    (f) => f.personId === personId || f.secondaryPersonId === personId
  );

  // Editable local state
  const [givenName, setGivenName] = useState(ind.givenName || '');
  const [surname, setSurname] = useState(ind.surname || '');
  const [sex, setSex] = useState<Individual['sex']>(ind.sex || '');
  const [birthDate, setBirthDate] = useState(ind.birth?.date || '');
  const [birthPlace, setBirthPlace] = useState(ind.birth?.place || '');
  const [deathDate, setDeathDate] = useState(ind.death?.date || '');
  const [deathPlace, setDeathPlace] = useState(ind.death?.place || '');
  const [burialDate, setBurialDate] = useState(ind.burial?.date || '');
  const [burialPlace, setBurialPlace] = useState(ind.burial?.place || '');
  const [hasChanges, setHasChanges] = useState(false);

  const markChanged = () => setHasChanges(true);

  const handleNormalizeFieldDate = (field: 'birth' | 'death') => {
    if (field === 'birth') {
      const res = normalizeDateString(birthDate);
      if (res.changed) {
        setBirthDate(res.normalized);
        markChanged();
      }
    } else {
      const res = normalizeDateString(deathDate);
      if (res.changed) {
        setDeathDate(res.normalized);
        markChanged();
      }
    }
  };

  const handleSave = () => {
    const updated: Individual = {
      ...ind,
      givenName,
      surname,
      name: surname ? `${givenName} /${surname}/`.trim() : givenName,
      sex,
      birth: birthDate || birthPlace ? {
        id: ind.birth?.id || `BIRT_${ind.id}`,
        tag: 'BIRT',
        label: 'Birth',
        date: birthDate,
        parsedYear: extractYear(birthDate),
        place: birthPlace,
        sources: ind.birth?.sources || [],
        notes: ind.birth?.notes || [],
      } : undefined,
      death: deathDate || deathPlace ? {
        id: ind.death?.id || `DEAT_${ind.id}`,
        tag: 'DEAT',
        label: 'Death',
        date: deathDate,
        parsedYear: extractYear(deathDate),
        place: deathPlace,
        sources: ind.death?.sources || [],
        notes: ind.death?.notes || [],
      } : undefined,
      burial: burialDate || burialPlace ? {
        id: ind.burial?.id || `BURI_${ind.id}`,
        tag: 'BURI',
        label: 'Burial',
        date: burialDate,
        parsedYear: extractYear(burialDate),
        place: burialPlace,
        sources: ind.burial?.sources || [],
        notes: ind.burial?.notes || [],
      } : undefined,
    };

    onSavePerson(updated);
    setHasChanges(false);
  };

  // Resolve parents
  const parentsList: Array<{ id: string; name: string; role: string }> = [];
  for (const famcId of ind.famc) {
    const fam = doc.families[famcId];
    if (fam) {
      if (fam.husb && doc.individuals[fam.husb]) {
        parentsList.push({
          id: fam.husb,
          name: doc.individuals[fam.husb].name,
          role: 'Father',
        });
      }
      if (fam.wife && doc.individuals[fam.wife]) {
        parentsList.push({
          id: fam.wife,
          name: doc.individuals[fam.wife].name,
          role: 'Mother',
        });
      }
    }
  }

  // Resolve spouses and children
  const spousesList: Array<{ id: string; name: string }> = [];
  const childrenList: Array<{ id: string; name: string }> = [];
  for (const famsId of ind.fams) {
    const fam = doc.families[famsId];
    if (fam) {
      const spouseId = fam.husb === personId ? fam.wife : fam.husb;
      if (spouseId && doc.individuals[spouseId]) {
        spousesList.push({ id: spouseId, name: doc.individuals[spouseId].name });
      }
      for (const chId of fam.children) {
        if (doc.individuals[chId]) {
          childrenList.push({ id: chId, name: doc.individuals[chId].name });
        }
      }
    }
  }

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-[#0f1420] border-l border-white/15 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#0a0d14]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white leading-tight">{ind.name}</h3>
            <span className="text-xs font-mono text-cyan-400">{ind.id}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasChanges && (
            <button
              onClick={handleSave}
              className="px-3 py-1.5 text-xs font-semibold text-slate-900 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save</span>
            </button>
          )}

          <button
            onClick={() => onRequestDelete(ind.id)}
            className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors"
            title="Delete this individual (follows deletion contract)"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs">
        {/* Active Findings Against This Person */}
        {personFindings.length > 0 && (
          <div className="space-y-2">
            <span className="font-semibold text-rose-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Active Audit Findings ({personFindings.length})</span>
            </span>
            <div className="space-y-2">
              {personFindings.map((f) => (
                <div
                  key={f.id}
                  className={`p-3 rounded-lg border text-xs leading-relaxed ${
                    f.severity === 'error'
                      ? 'border-rose-500/40 bg-rose-950/20 text-rose-200'
                      : f.severity === 'warning'
                      ? 'border-amber-500/40 bg-amber-950/20 text-amber-200'
                      : 'border-sky-500/40 bg-sky-950/20 text-sky-200'
                  }`}
                >
                  <div className="font-bold mb-0.5">{f.ruleName}</div>
                  <p>{f.explanation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Identity & Name Details */}
        <div className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-3">
          <span className="font-semibold text-slate-200 text-xs">Identity & Names</span>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 text-[11px] mb-1">Given Name</label>
              <input
                type="text"
                value={givenName}
                onChange={(e) => {
                  setGivenName(e.target.value);
                  markChanged();
                }}
                className="w-full bg-black/30 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-slate-400 text-[11px] mb-1">Surname</label>
              <input
                type="text"
                value={surname}
                onChange={(e) => {
                  setSurname(e.target.value);
                  markChanged();
                }}
                className="w-full bg-black/30 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 text-[11px] mb-1">Sex</label>
            <div className="flex gap-2">
              {(['M', 'F', 'U'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setSex(s);
                    markChanged();
                  }}
                  className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                    sex === s
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                      : 'bg-black/30 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  {s === 'M' ? 'Male (M)' : s === 'F' ? 'Female (F)' : 'Unknown (U)'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Vital Events (Birth, Death, Burial) */}
        <div className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-4">
          <span className="font-semibold text-slate-200 text-xs">Vital Events & Dates</span>

          {/* Birth */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-slate-300 text-xs font-medium flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                <span>Birth Date</span>
              </label>
              <button
                type="button"
                onClick={() => handleNormalizeFieldDate('birth')}
                className="text-[11px] text-cyan-400 hover:underline"
              >
                Normalize Date
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={birthDate}
                onChange={(e) => {
                  setBirthDate(e.target.value);
                  markChanged();
                }}
                placeholder="e.g. 12 MAY 1880"
                className="bg-black/30 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
              />
              <input
                type="text"
                value={birthPlace}
                onChange={(e) => {
                  setBirthPlace(e.target.value);
                  markChanged();
                }}
                placeholder="Place (e.g. London)"
                className="bg-black/30 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          {/* Death */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-slate-300 text-xs font-medium flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-rose-400" />
                <span>Death Date</span>
              </label>
              <button
                type="button"
                onClick={() => handleNormalizeFieldDate('death')}
                className="text-[11px] text-cyan-400 hover:underline"
              >
                Normalize Date
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={deathDate}
                onChange={(e) => {
                  setDeathDate(e.target.value);
                  markChanged();
                }}
                placeholder="e.g. 14 JAN 1945"
                className="bg-black/30 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
              />
              <input
                type="text"
                value={deathPlace}
                onChange={(e) => {
                  setDeathPlace(e.target.value);
                  markChanged();
                }}
                placeholder="Place of death"
                className="bg-black/30 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          {/* Burial */}
          <div className="space-y-1.5">
            <label className="text-slate-300 text-xs font-medium flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              <span>Burial Date & Place</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={burialDate}
                onChange={(e) => {
                  setBurialDate(e.target.value);
                  markChanged();
                }}
                placeholder="Burial date"
                className="bg-black/30 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
              />
              <input
                type="text"
                value={burialPlace}
                onChange={(e) => {
                  setBurialPlace(e.target.value);
                  markChanged();
                }}
                placeholder="Cemetery / Place"
                className="bg-black/30 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>
        </div>

        {/* Family Graph Links */}
        <div className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-3">
          <span className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
            <GitBranch className="w-3.5 h-3.5 text-cyan-400" />
            <span>Family Graph Relationships</span>
          </span>

          {/* Parents */}
          <div className="space-y-1">
            <span className="text-slate-400 text-[11px] font-medium">Parents:</span>
            {parentsList.length === 0 ? (
              <p className="text-slate-500 italic">No parent family linked.</p>
            ) : (
              <div className="space-y-1">
                {parentsList.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => onNavigatePerson(p.id)}
                    className="w-full text-left p-1.5 rounded-lg bg-black/20 hover:bg-white/5 flex justify-between items-center text-slate-300 transition-colors"
                  >
                    <span>
                      {p.name} ({p.role})
                    </span>
                    <span className="font-mono text-cyan-400 text-[11px]">{p.id}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Spouses */}
          <div className="space-y-1 pt-2 border-t border-white/5">
            <span className="text-slate-400 text-[11px] font-medium">Spouse(s):</span>
            {spousesList.length === 0 ? (
              <p className="text-slate-500 italic">No spouse linked.</p>
            ) : (
              <div className="space-y-1">
                {spousesList.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => onNavigatePerson(s.id)}
                    className="w-full text-left p-1.5 rounded-lg bg-black/20 hover:bg-white/5 flex justify-between items-center text-slate-300 transition-colors"
                  >
                    <span>{s.name}</span>
                    <span className="font-mono text-cyan-400 text-[11px]">{s.id}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Children */}
          <div className="space-y-1 pt-2 border-t border-white/5">
            <span className="text-slate-400 text-[11px] font-medium">Children:</span>
            {childrenList.length === 0 ? (
              <p className="text-slate-500 italic">No children linked.</p>
            ) : (
              <div className="space-y-1">
                {childrenList.map((ch) => (
                  <button
                    key={ch.id}
                    onClick={() => onNavigatePerson(ch.id)}
                    className="w-full text-left p-1.5 rounded-lg bg-black/20 hover:bg-white/5 flex justify-between items-center text-slate-300 transition-colors"
                  >
                    <span>{ch.name}</span>
                    <span className="font-mono text-cyan-400 text-[11px]">{ch.id}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Citations & Sources */}
        <div className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-2">
          <span className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-sky-400" />
            <span>Attached Source Citations</span>
          </span>
          {ind.sources.length === 0 ? (
            <p className="text-slate-500 italic">No citations attached directly to record.</p>
          ) : (
            <div className="space-y-1">
              {ind.sources.map((sId) => (
                <div
                  key={sId}
                  className="p-1.5 rounded bg-black/20 text-slate-300 font-mono text-[11px] flex justify-between"
                >
                  <span>{doc.sources[sId]?.title || 'Untitled Source'}</span>
                  <span className="text-slate-500">{sId}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
