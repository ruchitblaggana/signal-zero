// App header with navigation, branding, and global controls.

import { useStore, type ViewId } from '@/store/StoreContext';
import { Badge, Button, Tooltip } from './ui';
import { Command, HelpCircle, Radio, Save, AlertTriangle } from 'lucide-react';

const navItems: { id: ViewId; label: string }[] = [
  { id: 'operations', label: 'City Operations' },
  { id: 'laboratory', label: 'Incident Lab' },
  { id: 'recovery', label: 'Recovery' },
  { id: 'archive', label: 'Archive' },
  { id: 'notebook', label: 'Notebook' },
  { id: 'developer', label: 'Developer' },
];

export function Header({
  onCommandPalette,
  onHelp,
}: {
  onCommandPalette: () => void;
  onHelp: () => void;
}) {
  const { state, dispatch, metrics } = useStore();
  const phaseLabel = { observe: 'Observe', disrupt: 'Disrupt', recover: 'Recover', complete: 'Complete' }[state.sim.phase];
  const health = metrics.networkReachability;
  const healthTone = health >= 85 ? 'teal' : health >= 60 ? 'amber' : 'coral';

  return (
    <header className="sticky top-0 z-40 bg-ink-900/85 backdrop-blur-md border-b border-ink-500/20">
      <div className="max-w-[1400px] mx-auto px-3 sm:px-5">
        <div className="flex items-center gap-3 h-14">
          {/* Brand */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="relative w-8 h-8">
              <svg viewBox="0 0 32 32" className="w-full h-full">
                <circle cx="16" cy="16" r="9" fill="none" stroke="#4BC6B0" strokeWidth="1.5" opacity="0.4" />
                <circle cx="16" cy="16" r="5.5" fill="none" stroke="#F4B942" strokeWidth="1.5" />
                <circle cx="16" cy="16" r="2" fill="#F06A61" />
              </svg>
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-2">
                <span className="font-display text-base font-semibold text-text leading-none">Signal Zero</span>
                <Badge tone={healthTone} className="!text-[9px]"><Radio className="w-2.5 h-2.5" />{phaseLabel}</Badge>
              </div>
              <span className="text-[10px] text-text-faint tracking-wider uppercase">Every signal tells a story</span>
            </div>
          </div>

          {/* Nav — desktop */}
          <nav className="hidden md:flex items-center gap-0.5 ml-2" aria-label="Main navigation">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => dispatch({ type: 'SET_VIEW', view: item.id })}
                aria-current={state.view === item.id ? 'page' : undefined}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  state.view === item.id
                    ? 'bg-signal-amber/15 text-signal-amber'
                    : 'text-text-dim hover:text-text hover:bg-ink-700/40'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex-1" />

          {/* Status indicators */}
          <div className="hidden lg:flex items-center gap-3 text-[11px]">
            <StatusPill label="Reach" value={`${metrics.networkReachability}%`} tone={healthTone} />
            <StatusPill label="Essential" value={`${metrics.essentialAvailable}/${metrics.essentialTotal}`} tone={metrics.essentialAvailable < metrics.essentialTotal ? 'coral' : 'teal'} />
            <StatusPill label="Credits" value={`${state.sim.repairCredits}`} tone={state.sim.repairCredits < 50 ? 'coral' : 'default'} />
          </div>

          {state.sim.dirty && (
            <Tooltip label="Unsaved scenario changes">
              <span className="inline-flex items-center gap-1 text-[10px] text-signal-amber"><AlertTriangle className="w-3.5 h-3.5" />Unsaved</span>
            </Tooltip>
          )}

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={onCommandPalette} title="Command palette (Ctrl+K)" className="!px-2">
              <Command className="w-4 h-4" />
              <kbd className="hidden sm:inline font-mono text-[10px] text-text-faint ml-1">⌘K</kbd>
            </Button>
            <Button variant="ghost" size="sm" onClick={onHelp} title="Help & reference" className="!px-2">
              <HelpCircle className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Nav — mobile scrollable */}
        <nav className="md:hidden flex items-center gap-0.5 pb-2 overflow-x-auto" aria-label="Mobile navigation">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => dispatch({ type: 'SET_VIEW', view: item.id })}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors ${
                state.view === item.id ? 'bg-signal-amber/15 text-signal-amber' : 'text-text-dim hover:text-text'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}

function StatusPill({ label, value, tone }: { label: string; value: string; tone: 'default' | 'amber' | 'coral' | 'teal' }) {
  const color = { default: 'text-text-dim', amber: 'text-signal-amber', coral: 'text-signal-coral', teal: 'text-signal-teal' }[tone];
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-text-faint uppercase tracking-wider text-[9px]">{label}</span>
      <span className={`font-mono tnum font-semibold ${color}`}>{value}</span>
    </div>
  );
}
