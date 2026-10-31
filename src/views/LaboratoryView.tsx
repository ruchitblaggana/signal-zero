// Incident Laboratory — controlled failure experimentation.

import { useState } from 'react';
import { useStore } from '@/store/StoreContext';
import { CityMap, type MapFilters } from '@/components/CityMap';
import { SimControls, MetricsBar, EventTimeline, NodeInspector, AlgorithmLab } from '@/components/panels';
import { Panel, Button, Select, Field, Badge, EmptyState } from '@/components/ui';
import { missions } from '@/data/city';
import type { FailureSeed, NodeCategory } from '@/types';
import { Zap, Scissors, TrendingUp, FlaskConical, Play, Layers } from 'lucide-react';

const failureKinds = [
  { kind: 'node_failure', label: 'Node Failure', icon: Zap, desc: 'Completely disable a node.' },
  { kind: 'connection_sever', label: 'Sever Connection', icon: Scissors, desc: 'Cut a specific connection.' },
  { kind: 'node_overload', label: 'Overload', icon: TrendingUp, desc: 'Reduce capacity by a factor.' },
] as const;

export function LaboratoryView() {
  const { state, dispatch } = useStore();
  const [filters, setFilters] = useState<MapFilters>({
    categories: new Set(), states: new Set(), search: '', highlightMode: 'none', showLabels: true,
  });
  const [failureKind, setFailureKind] = useState<FailureSeed['kind']>('node_failure');
  const [target, setTarget] = useState<string>('');
  const [factor, setFactor] = useState(1.5);
  const [experimentName, setExperimentName] = useState('');
  const [credits, setCredits] = useState(500);
  const [crews, setCrews] = useState(2);

  // Build target options based on failure kind.
  const targets = failureKind === 'connection_sever'
    ? state.sim.graph.connections.map((c) => ({ id: c.id, label: `${c.id} · ${c.from} ↔ ${c.to} (${c.type})` }))
    : state.sim.graph.nodes.map((n) => ({ id: n.id, label: `${n.code} · ${n.name}` }));

  const applyFailure = () => {
    if (!target) return;
    if (failureKind === 'node_failure') dispatch({ type: 'FAIL_NODE', nodeId: target });
    else if (failureKind === 'connection_sever') dispatch({ type: 'SEVER_CONNECTION', connectionId: target });
    else dispatch({ type: 'OVERLOAD', targetId: target, factor });
  };

  const startExperiment = () => {
    if (!target) return;
    const seeds: FailureSeed[] = [{
      kind: failureKind,
      targetId: target,
      ...(failureKind === 'node_overload' ? { factor } : {}),
    }];
    dispatch({ type: 'START_EXPERIMENT', seeds, credits, crews, name: experimentName || `Experiment ${new Date().toLocaleTimeString()}` });
  };

  return (
    <div className="space-y-4">
      <SimControls />
      <MetricsBar />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
        <div className="space-y-4">
          <CityMap filters={filters} onFiltersChange={setFilters} height={500} />
        </div>

        <div className="space-y-4">
          {/* Experiment builder */}
          <Panel title="Experiment Builder" subtitle="Configure a failure and run it" right={<FlaskConical className="w-4 h-4 text-signal-amber" />}>
            <div className="space-y-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-text-faint mb-1.5">Failure Type</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {failureKinds.map((f) => {
                    const Icon = f.icon;
                    const active = failureKind === f.kind;
                    return (
                      <button
                        key={f.kind}
                        onClick={() => setFailureKind(f.kind)}
                        className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg border text-center transition-colors ${
                          active ? 'border-signal-amber/40 bg-signal-amber/10 text-signal-amber' : 'border-ink-500/30 text-text-dim hover:text-text'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-[10px] leading-tight">{f.label}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-text-faint mt-1">{failureKinds.find((f) => f.kind === failureKind)?.desc}</p>
              </div>

              <Field label="Target">
                <Select value={target} onChange={setTarget}>
                  <option value="">— Select target —</option>
                  {targets.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </Select>
              </Field>

              {failureKind === 'node_overload' && (
                <Field label="Overload Factor" hint="Higher = more capacity reduction. 1.5 = 33% capacity loss.">
                  <input
                    type="range" min={1.1} max={3} step={0.1} value={factor}
                    onChange={(e) => setFactor(Number(e.target.value))}
                    className="w-full accent-signal-amber"
                  />
                  <span className="text-[11px] font-mono text-text-dim">×{factor.toFixed(1)}</span>
                </Field>
              )}

              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="danger" onClick={applyFailure} disabled={!target}>
                  <Zap className="w-3.5 h-3.5" /> Apply Now
                </Button>
              </div>
              <p className="text-[10px] text-text-faint">"Apply Now" adds the failure to the current simulation. "Start Fresh" resets and runs a clean experiment.</p>
            </div>
          </Panel>

          {/* Fresh experiment */}
          <Panel title="Start Fresh Experiment" subtitle="Reset and run from baseline">
            <div className="space-y-3">
              <Field label="Experiment Name">
                <input
                  value={experimentName}
                  onChange={(e) => setExperimentName(e.target.value)}
                  placeholder="e.g. Relay cascade test"
                  className="w-full bg-ink-900 border border-ink-500/30 rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-faint"
                />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Credits">
                  <input type="number" value={credits} onChange={(e) => setCredits(Number(e.target.value))} min={0} className="w-full bg-ink-900 border border-ink-500/30 rounded-lg px-3 py-2 text-sm text-text" />
                </Field>
                <Field label="Crews">
                  <input type="number" value={crews} onChange={(e) => setCrews(Number(e.target.value))} min={1} max={5} className="w-full bg-ink-900 border border-ink-500/30 rounded-lg px-3 py-2 text-sm text-text" />
                </Field>
              </div>
              <Button size="sm" variant="primary" onClick={startExperiment} disabled={!target}>
                <Play className="w-3.5 h-3.5" /> Start Fresh Experiment
              </Button>
            </div>
          </Panel>

          {/* Mission quick-launch */}
          <Panel title="Predefined Missions" subtitle="Quick-launch a structured scenario" right={<Layers className="w-4 h-4 text-text-dim" />}>
            <div className="space-y-1.5">
              {missions.map((m) => (
                <button
                  key={m.id}
                  onClick={() => dispatch({ type: 'START_MISSION', missionId: m.id })}
                  className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg border text-left transition-colors ${
                    state.sim.missionId === m.id ? 'border-signal-amber/40 bg-signal-amber/10' : 'border-ink-500/30 hover:border-ink-400/40 hover:bg-ink-700/20'
                  }`}
                >
                  <span className="font-mono text-[10px] text-signal-amber shrink-0">{m.code}</span>
                  <div className="min-w-0">
                    <p className="text-[11px] text-text truncate">{m.title}</p>
                    <p className="text-[10px] text-text-faint capitalize">{m.difficulty}</p>
                  </div>
                </button>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      {/* Lower row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <NodeInspector />
        <AlgorithmLab />
      </div>
      <EventTimeline max={60} />
    </div>
  );
}
