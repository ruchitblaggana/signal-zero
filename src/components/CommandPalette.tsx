// Command palette — keyboard-accessible quick navigation + actions.

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useStore, type ViewId } from '@/store/StoreContext';
import { missions } from '@/data/city';
import { Search, CornerDownLeft } from 'lucide-react';

interface CommandItem {
  id: string;
  label: string;
  hint: string;
  group: string;
  action: () => void;
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, dispatch } = useStore();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const items = useMemo<CommandItem[]>(() => {
    const nav: CommandItem[] = ([
      ['operations', 'City Operations'],
      ['laboratory', 'Incident Laboratory'],
      ['recovery', 'Recovery Planner'],
      ['archive', 'Scenario Archive'],
      ['notebook', 'Systems Notebook'],
      ['developer', 'Developer / About'],
    ] as [ViewId, string][]).map(([id, label]) => ({
      id: `nav-${id}`, label, hint: 'Navigate', group: 'Navigation',
      action: () => { dispatch({ type: 'SET_VIEW', view: id }); onClose(); },
    }));
    const missionItems: CommandItem[] = missions.map((m) => ({
      id: `m-${m.id}`, label: `${m.code} — ${m.title}`, hint: m.difficulty, group: 'Start Mission',
      action: () => { dispatch({ type: 'START_MISSION', missionId: m.id }); onClose(); },
    }));
    const actions: CommandItem[] = [
      { id: 'run', label: 'Run / Pause simulation', hint: 'Space', group: 'Actions', action: () => { dispatch({ type: 'TOGGLE_RUN' }); onClose(); } },
      { id: 'step', label: 'Step forward', hint: 'S', group: 'Actions', action: () => { dispatch({ type: 'STEP', minutes: state.speed }); onClose(); } },
      { id: 'reset', label: 'Reset scenario', hint: 'R', group: 'Actions', action: () => { dispatch({ type: 'RESET_SIM' }); onClose(); } },
      { id: 'deselect', label: 'Deselect node', hint: 'Esc', group: 'Actions', action: () => { dispatch({ type: 'SELECT_NODE', id: null }); onClose(); } },
    ];
    return [...nav, ...missionItems, ...actions];
  }, [dispatch, onClose, state.speed]);

  const filtered = useMemo(() => {
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter((it) => it.label.toLowerCase().includes(q) || it.group.toLowerCase().includes(q));
  }, [items, query]);

  useEffect(() => { setActive(0); }, [query]);
  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const onKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); filtered[active]?.action(); }
    else if (e.key === 'Escape') { onClose(); }
  }, [filtered, active, onClose]);

  useEffect(() => {
    if (listRef.current) {
      const el = listRef.current.children[active] as HTMLElement | undefined;
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [active]);

  if (!open) return null;
  let lastGroup = '';
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[12vh] px-4 animate-fade-in" role="dialog" aria-label="Command palette">
      <div className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-ink-800 border border-ink-500/40 rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-ink-500/20">
          <Search className="w-4 h-4 text-text-faint" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKey}
            placeholder="Search commands, views, missions…"
            className="flex-1 bg-transparent text-sm text-text placeholder:text-text-faint outline-none"
            aria-label="Command search"
          />
          <kbd className="font-mono text-[10px] text-text-faint border border-ink-500/40 rounded px-1.5 py-0.5">ESC</kbd>
        </div>
        <ul ref={listRef} className="max-h-80 overflow-y-auto py-1">
          {filtered.length === 0 && <li className="px-4 py-3 text-sm text-text-faint">No matches.</li>}
          {filtered.map((it, i) => {
            const showGroup = it.group !== lastGroup;
            lastGroup = it.group;
            return (
              <li key={it.id}>
                {showGroup && <div className="px-4 pt-2 pb-1 text-[10px] uppercase tracking-wider text-text-faint">{it.group}</div>}
                <button
                  onMouseEnter={() => setActive(i)}
                  onClick={it.action}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${i === active ? 'bg-signal-amber/10' : 'hover:bg-ink-700/30'}`}
                >
                  <span className={`text-sm flex-1 ${i === active ? 'text-signal-amber' : 'text-text-dim'}`}>{it.label}</span>
                  {it.hint && <span className="font-mono text-[10px] text-text-faint">{it.hint}</span>}
                  {i === active && <CornerDownLeft className="w-3 h-3 text-signal-amber" />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
