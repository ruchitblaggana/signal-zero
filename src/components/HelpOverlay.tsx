// Help overlay — explains symbols, algorithms, and simulation controls.

import { Modal, Badge } from './ui';
import { stateMeta, categoryMeta, connectionStateMeta } from './visuals';
import { Play, Pause, SkipForward, RotateCcw, MousePointer2, Search, ZoomIn, Wrench, Zap, Scissors } from 'lucide-react';

export function HelpOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Signal Zero — Reference Guide" wide>
      <div className="space-y-6 text-sm">
        <section>
          <h3 className="text-xs uppercase tracking-wider text-signal-amber font-semibold mb-2">What is this?</h3>
          <p className="text-text-dim leading-relaxed">
            Signal Zero is a fictional urban systems resilience laboratory. The city of <strong className="text-text">Meridian</strong>
            {' '}is a graph of ~32 infrastructure nodes connected by power, communication, water, and road dependencies.
            You introduce failures, observe how they propagate according to explicit dependency rules, and repair
            infrastructure with a limited budget and crew. All cities, scenarios, and results are fictional and
            simulated locally in your browser. This does not monitor real infrastructure.
          </p>
        </section>

        <section>
          <h3 className="text-xs uppercase tracking-wider text-signal-amber font-semibold mb-2">Node states</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(stateMeta).map(([key, m]) => (
              <div key={key} className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-ink-500/30 bg-ink-900/30">
                <span style={{ color: m.color }} className="text-base">{m.glyph}</span>
                <span className="text-xs text-text">{m.label}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-text-faint mt-2">Color is never the only indicator — every state has a glyph and a text label.</p>
        </section>

        <section>
          <h3 className="text-xs uppercase tracking-wider text-signal-amber font-semibold mb-2">Node categories</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Object.entries(categoryMeta).map(([key, c]) => (
              <div key={key} className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-ink-500/30 bg-ink-900/30">
                <span className="text-xs text-text">{c.label}</span>
                <Badge tone="dim">{c.shape}</Badge>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-text-faint mt-2">Essential services (hospitals, shelters, dispatch) are marked with an amber dot and restore the recovery score.</p>
        </section>

        <section>
          <h3 className="text-xs uppercase tracking-wider text-signal-amber font-semibold mb-2">Connection states</h3>
          <div className="space-y-1">
            {Object.entries(connectionStateMeta).map(([key, m]) => (
              <div key={key} className="flex items-center gap-3">
                <svg width="48" height="8"><line x1="0" y1="4" x2="48" y2="4" stroke={m.color} strokeWidth="2" strokeDasharray={m.dash === 'none' ? undefined : m.dash} /></svg>
                <span className="text-xs text-text">{m.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-xs uppercase tracking-wider text-signal-amber font-semibold mb-2">Simulation controls</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Control icon={Play} label="Run — start the simulation clock" />
            <Control icon={Pause} label="Pause — stop the clock; repairs in progress still complete when stepped" />
            <Control icon={SkipForward} label="Step — advance by the selected tick (5–60 min)" />
            <Control icon={RotateCcw} label="Reset — restore scenario baseline without deleting notes" />
            <Control icon={Wrench} label="Repair — queue a job; costs credits and occupies a crew until complete" />
            <Control icon={Zap} label="Fail — manually force a node into the failed state" />
            <Control icon={Scissors} label="Sever — cut a connection; propagation re-evaluates" />
          </div>
        </section>

        <section>
          <h3 className="text-xs uppercase tracking-wider text-signal-amber font-semibold mb-2">Map interactions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-text-dim">
            <div className="flex items-center gap-2"><MousePointer2 className="w-3.5 h-3.5 text-text-faint" /> Click a node to inspect it</div>
            <div className="flex items-center gap-2"><Search className="w-3.5 h-3.5 text-text-faint" /> Search by name or code</div>
            <div className="flex items-center gap-2"><ZoomIn className="w-3.5 h-3.5 text-text-faint" /> Scroll or +/- to zoom; drag to pan</div>
            <div className="flex items-center gap-2"><span className="font-mono text-text-faint w-3.5 text-center">0</span> Press 0 to fit the view</div>
          </div>
        </section>

        <section>
          <h3 className="text-xs uppercase tracking-wider text-signal-amber font-semibold mb-2">Algorithms</h3>
          <ul className="space-y-1.5 text-xs text-text-dim list-disc list-inside">
            <li><strong className="text-text">BFS</strong> — visits nodes layer by layer; gives shortest hop-count paths.</li>
            <li><strong className="text-text">DFS</strong> — explores each branch fully before backtracking; finds connected components.</li>
            <li><strong className="text-text">Dijkstra</strong> — least-cost path with non-negative weights. Switch metrics: distance, travel time, repair cost. A distance-optimised path is not "fastest" unless time was the metric.</li>
            <li><strong className="text-text">Criticality</strong> — documented composite: 2·criticality + 1.5·downstream + 3·essentialDownstream + 2·articulation + 0.05·reachabilityLoss. Articulation points are nodes whose removal disconnects the graph.</li>
          </ul>
        </section>

        <section>
          <h3 className="text-xs uppercase tracking-wider text-signal-amber font-semibold mb-2">Recovery strategies</h3>
          <p className="text-text-dim leading-relaxed">
            Two heuristics that produce different orders when conditions warrant:
            <strong className="text-text"> Critical Services First</strong> prioritises essential-service restoration;
            <strong className="text-text"> Network Connectivity First</strong> prioritises reachability and degree.
            Both are heuristics — neither is guaranteed globally optimal. Inspect each score's components before committing.
          </p>
        </section>

        <section>
          <h3 className="text-xs uppercase tracking-wider text-signal-amber font-semibold mb-2">Keyboard shortcuts</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <Shortcut keys="Cmd/Ctrl+K" label="Command palette" />
            <Shortcut keys="?" label="This help" />
            <Shortcut keys="Space" label="Run / Pause" />
            <Shortcut keys="S" label="Step forward" />
            <Shortcut keys="R" label="Reset" />
            <Shortcut keys="Esc" label="Deselect / close" />
          </div>
        </section>

        <section>
          <h3 className="text-xs uppercase tracking-wider text-signal-amber font-semibold mb-2">Data & privacy</h3>
          <p className="text-text-dim leading-relaxed">
            All your notes, custom scenarios, and attempt records are stored locally in your browser (IndexedDB with a
            localStorage fallback). Nothing leaves your device. No account, no backend, no paid APIs. You can export
            or clear all data from the Scenario Archive and Recovery Planner.
          </p>
        </section>
      </div>
    </Modal>
  );
}

function Control({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-text-dim">
      <Icon className="w-3.5 h-3.5 text-signal-amber shrink-0" />
      <span>{label}</span>
    </div>
  );
}

function Shortcut({ keys, label }: { keys: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <kbd className="font-mono text-[10px] text-text border border-ink-500/40 rounded px-1.5 py-0.5">{keys}</kbd>
      <span className="text-text-faint">{label}</span>
    </div>
  );
}
