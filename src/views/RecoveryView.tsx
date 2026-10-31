// Recovery Planner — repair queue + strategy comparison + incident report.

import { useMemo, useState } from 'react';
import { useStore } from '@/store/StoreContext';
import { SimControls, MetricsBar, EventTimeline, NodeInspector } from '@/components/panels';
import { Panel, Button, Badge, Stat, EmptyState } from '@/components/ui';
import { recoveryScoreFormula } from '@/engine/metrics';
import { nodeById } from '@/engine/graph';
import { canRepairNode } from '@/engine/sim';
import { Wrench, TrendingUp, Network, FileDown, CheckCircle2, Clock, Coins, ListOrdered, ArrowRight } from 'lucide-react';

export function RecoveryView() {
  const { state, dispatch, strategies, recoveryScore, metrics } = useStore();
  const [selectedStrategy, setSelectedStrategy] = useState<'critical' | 'connectivity'>('critical');

  const damagedNodes = useMemo(() => {
    return state.sim.graph.nodes.filter((n) => {
      const s = state.sim.nodes[n.id]?.state;
      return s === 'failed' || s === 'degraded' || s === 'isolated';
    });
  }, [state.sim]);

  const strategy = selectedStrategy === 'critical' ? strategies.critical : strategies.connectivity;

  const executeStrategy = () => {
    // Queue repairs in the recommended order, up to budget/crew limits.
    for (const nodeId of strategy.order) {
      const check = canRepairNode(state.sim, nodeId);
      if (check.ok) {
        dispatch({ type: 'REPAIR', nodeId, strategy: strategy.name });
      }
    }
  };

  return (
    <div className="space-y-4">
      <SimControls />
      <MetricsBar />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-4">
        {/* Left: damaged nodes + repair queue */}
        <div className="space-y-4">
          <Panel
            title="Damaged Infrastructure"
            subtitle={`${damagedNodes.length} nodes require attention`}
            right={<Badge tone="coral"><Wrench className="w-3 h-3" />{damagedNodes.length}</Badge>}
          >
            {damagedNodes.length === 0 ? (
              <EmptyState title="No damaged nodes" hint="Introduce a failure or start a mission to populate this list." />
            ) : (
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {damagedNodes.map((n) => {
                  const s = state.sim.nodes[n.id];
                  const check = canRepairNode(state.sim, n.id);
                  const inQueue = state.sim.repairQueue.some((j) => j.nodeId === n.id);
                  const stratScore = strategy.scores.find((sc) => sc.nodeId === n.id);
                  return (
                    <div key={n.id} className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-ink-500/30 bg-ink-900/30">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-text-faint">{n.code}</span>
                          <span className="text-[11px] text-text truncate">{n.name}</span>
                          {n.essential && <span className="text-[9px] text-signal-amber">★</span>}
                        </div>
                        <p className="text-[10px] text-text-faint">{s?.reason}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className="text-[10px] text-text-faint">{n.repairCost} cr</p>
                          <p className="text-[10px] text-text-faint">{n.repairDuration}m</p>
                        </div>
                        {stratScore && (
                          <span className="font-mono text-[11px] text-signal-amber tnum w-10 text-right" title={stratScore.rationale}>
                            {stratScore.score.toFixed(1)}
                          </span>
                        )}
                        <Button
                          size="sm"
                          variant="primary"
                          disabled={!check.ok || inQueue}
                          onClick={() => dispatch({ type: 'REPAIR', nodeId: n.id, strategy: strategy.name })}
                          title={check.ok ? `Repair for ${n.repairCost} cr` : check.reason}
                        >
                          {inQueue ? <CheckCircle2 className="w-3.5 h-3.5 text-signal-teal" /> : <Wrench className="w-3.5 h-3.5" />}
                          {inQueue ? 'Queued' : 'Repair'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          {/* Repair queue */}
          <Panel title="Repair Queue" subtitle={`${state.sim.repairQueue.length} active jobs · ${metrics.crewsAvailable}/${state.sim.crewsTotal} crews free`}>
            {state.sim.repairQueue.length === 0 ? (
              <EmptyState title="Queue empty" hint="Select damaged nodes and queue repairs." />
            ) : (
              <div className="space-y-1.5">
                {state.sim.repairQueue.map((job) => {
                  const node = nodeById(state.sim.graph, job.nodeId);
                  const remaining = Math.max(0, job.completesAt - state.sim.time);
                  const progress = Math.min(100, Math.round(((state.sim.time - job.startedAt) / (job.completesAt - job.startedAt)) * 100));
                  return (
                    <div key={job.id} className="px-2.5 py-2 rounded-lg border border-ink-500/30 bg-ink-900/30">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-text-faint">{node?.code}</span>
                        <span className="text-[11px] text-text flex-1 truncate">{node?.name}</span>
                        <span className="text-[10px] text-text-dim font-mono">{remaining}m left</span>
                        <button
                          onClick={() => dispatch({ type: 'CANCEL_REPAIR', jobId: job.id })}
                          className="text-[10px] text-signal-coral hover:underline"
                        >
                          Cancel
                        </button>
                      </div>
                      <div className="mt-1.5 h-1 bg-ink-700 rounded-full overflow-hidden">
                        <div className="h-full bg-signal-teal transition-all duration-300" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          <NodeInspector />
        </div>

        {/* Right: strategy comparison */}
        <div className="space-y-4">
          <Panel title="Recovery Score" subtitle="Current operational health">
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20">
                <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                  <circle cx={40} cy={40} r={34} fill="none" stroke="#2A3A47" strokeWidth={6} />
                  <circle
                    cx={40} cy={40} r={34} fill="none"
                    stroke={recoveryScore >= 75 ? '#4BC6B0' : recoveryScore >= 40 ? '#F4B942' : '#F06A61'}
                    strokeWidth={6}
                    strokeDasharray={`${(recoveryScore / 100) * 214} 214`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-mono font-semibold text-text tnum">{recoveryScore}</span>
                </div>
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-[10px] font-mono text-text-faint">{recoveryScoreFormula}</p>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <Stat label="Essential" value={`${metrics.essentialAvailable}/${metrics.essentialTotal}`} tone="teal" />
                  <Stat label="Reachability" value={`${metrics.networkReachability}%`} tone="amber" />
                </div>
              </div>
            </div>
          </Panel>

          {/* Strategy selector */}
          <Panel title="Recovery Strategies" subtitle="Compare and execute an algorithmic repair order">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => setSelectedStrategy('critical')}
                  className={`flex flex-col items-start gap-1 px-3 py-2 rounded-lg border text-left transition-colors ${
                    selectedStrategy === 'critical' ? 'border-signal-amber/40 bg-signal-amber/10' : 'border-ink-500/30 hover:border-ink-400/40'
                  }`}
                >
                  <span className={`flex items-center gap-1.5 text-[11px] font-semibold ${selectedStrategy === 'critical' ? 'text-signal-amber' : 'text-text-dim'}`}>
                    <TrendingUp className="w-3.5 h-3.5" /> Critical Services First
                  </span>
                  <span className="text-[10px] text-text-faint leading-tight">Essential services prioritised</span>
                </button>
                <button
                  onClick={() => setSelectedStrategy('connectivity')}
                  className={`flex flex-col items-start gap-1 px-3 py-2 rounded-lg border text-left transition-colors ${
                    selectedStrategy === 'connectivity' ? 'border-signal-amber/40 bg-signal-amber/10' : 'border-ink-500/30 hover:border-ink-400/40'
                  }`}
                >
                  <span className={`flex items-center gap-1.5 text-[11px] font-semibold ${selectedStrategy === 'connectivity' ? 'text-signal-amber' : 'text-text-dim'}`}>
                    <Network className="w-3.5 h-3.5" /> Connectivity First
                  </span>
                  <span className="text-[10px] text-text-faint leading-tight">Maximise network reachability</span>
                </button>
              </div>

              <div className="p-3 rounded-lg bg-ink-900/50 border border-ink-500/20">
                <p className="text-[10px] uppercase tracking-wider text-text-faint mb-1">Formula</p>
                <p className="text-[10px] font-mono text-text-dim">{strategy.formula}</p>
                <p className="text-[10px] text-text-faint mt-1.5 leading-snug">{strategy.description}</p>
              </div>

              {/* Suggested order */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-text-faint mb-1.5">Suggested Repair Order</p>
                {strategy.order.length === 0 ? (
                  <p className="text-[11px] text-text-faint">No damaged nodes to prioritise.</p>
                ) : (
                  <ol className="space-y-1">
                    {strategy.order.slice(0, 8).map((id, i) => {
                      const n = nodeById(state.sim.graph, id);
                      const sc = strategy.scores[i];
                      if (!n) return null;
                      return (
                        <li key={id} className="flex items-center gap-2 text-[11px] px-2 py-1 rounded bg-ink-900/30 border border-ink-500/20">
                          <span className="font-mono text-[10px] text-text-faint w-4">{i + 1}.</span>
                          <span className="font-mono text-[10px] text-text-faint">{n.code}</span>
                          <span className="text-text-dim truncate flex-1">{n.name}</span>
                          <span className="font-mono text-[10px] text-signal-amber tnum">{sc.score.toFixed(1)}</span>
                        </li>
                      );
                    })}
                  </ol>
                )}
                <p className="text-[10px] text-text-faint mt-1.5 italic">
                  Heuristic strategies are not guaranteed to be globally optimal. Inspect each score's components before committing.
                </p>
              </div>

              <Button size="sm" variant="primary" onClick={executeStrategy} disabled={strategy.order.length === 0} className="w-full">
                <ListOrdered className="w-3.5 h-3.5" /> Queue Entire {strategy.name} Order
              </Button>
            </div>
          </Panel>

          {/* Resource summary */}
          <Panel title="Resource Ledger" subtitle="Repair budget and crews">
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Remaining" value={`${state.sim.repairCredits} cr`} tone={state.sim.repairCredits < 50 ? 'coral' : 'teal'} />
              <Stat label="Spent" value={`${metrics.repairCreditsSpent} cr`} tone="amber" />
              <Stat label="Crews Free" value={`${metrics.crewsAvailable}/${state.sim.crewsTotal}`} />
            </div>
          </Panel>

          {/* Incident report */}
          <IncidentReport />
        </div>
      </div>

      <EventTimeline max={40} />
    </div>
  );
}

function IncidentReport() {
  const { state, metrics } = useStore();
  const [exported, setExported] = useState(false);

  const report = useMemo(() => {
    return {
      generatedAt: new Date().toISOString(),
      scenarioId: state.sim.scenarioId,
      missionId: state.sim.missionId,
      simulationTime: state.sim.time,
      phase: state.sim.phase,
      initialReachability: state.initialReachability,
      finalMetrics: metrics,
      repairQueue: state.sim.repairQueue.map((j) => ({
        nodeId: j.nodeId, cost: j.cost, startedAt: j.startedAt, completesAt: j.completesAt,
      })),
      eventCount: state.sim.events.length,
      events: state.sim.events.slice(-30),
    };
  }, [state.sim, state.initialReachability, metrics]);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `signal-zero-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExported(true);
    setTimeout(() => setExported(false), 2000);
  };

  const exportCsv = () => {
    const rows = [
      ['nodeId', 'state', 'capacity', 'reason'],
      ...state.sim.graph.nodes.map((n) => {
        const s = state.sim.nodes[n.id];
        return [n.id, s?.state ?? '', String(s?.effectiveCapacity ?? ''), s?.reason ?? ''];
      }),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `signal-zero-state-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Panel title="Incident Report" subtitle="Export the current simulation state" right={<FileDown className="w-4 h-4 text-text-dim" />}>
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2 text-[10px]">
          <div className="flex items-center gap-1 text-text-faint"><Clock className="w-3 h-3" /> Sim time: <span className="font-mono text-text-dim">T+{state.sim.time}</span></div>
          <div className="flex items-center gap-1 text-text-faint"><Coins className="w-3 h-3" /> Spent: <span className="font-mono text-text-dim">{metrics.repairCreditsSpent} cr</span></div>
        </div>
        <div className="flex gap-2 pt-1">
          <Button size="sm" variant="outline" onClick={exportJson}>
            <FileDown className="w-3.5 h-3.5" /> {exported ? 'Exported!' : 'Export JSON'}
          </Button>
          <Button size="sm" variant="outline" onClick={exportCsv}>
            <FileDown className="w-3.5 h-3.5" /> Export CSV
          </Button>
        </div>
      </div>
    </Panel>
  );
}
