// Shared simulation panels used across views: node inspector, metrics bar,
// event timeline, simulation controls, algorithm laboratory, criticality table.

import { useMemo, useState } from 'react';
import { useStore } from '@/store/StoreContext';
import type { NodeCategory, NodeState, InfrastructureNode } from '@/types';
import {
  bfs, dfs, dijkstra, downstreamDependents, upstreamDependencies,
  neighbors, nodeById, connectionById, type DijkstraMetric,
} from '@/engine/graph';
import { criticalityTable, criticalityFormula } from '@/engine/criticality';
import { canRepairNode } from '@/engine/sim';
import { stateMeta, categoryMeta, stateTone } from './visuals';
import { Panel, Stat, Badge, Button, EmptyState, Select, useDebounced } from './ui';
import { Play, Pause, SkipForward, RotateCcw, Zap, Activity, Gauge, GitBranch, Network, Clock, Wrench, ChevronRight, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

// ---------- Simulation controls ----------

export function SimControls({ compact = false }: { compact?: boolean }) {
  const { state, dispatch } = useStore();
  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant={state.running ? 'danger' : 'primary'}
        onClick={() => dispatch({ type: 'TOGGLE_RUN' })}
        title={state.running ? 'Pause simulation' : 'Run simulation'}
      >
        {state.running ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        {state.running ? 'Pause' : 'Run'}
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => dispatch({ type: 'STEP', minutes: state.speed })}
        title="Advance one step"
      >
        <SkipForward className="w-3.5 h-3.5" />
        Step
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => dispatch({ type: 'RESET_SIM' })}
        title="Reset scenario to baseline"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        Reset
      </Button>
      {!compact && (
        <label className="flex items-center gap-1.5 text-[11px] text-text-faint ml-1">
          <Clock className="w-3 h-3" />
          <span>speed</span>
          <select
            value={state.speed}
            onChange={(e) => dispatch({ type: 'SET_SPEED', speed: Number(e.target.value) })}
            className="bg-ink-900 border border-ink-500/30 rounded px-1.5 py-1 text-xs text-text"
          >
            <option value={5}>5 min/tick</option>
            <option value={15}>15 min/tick</option>
            <option value={30}>30 min/tick</option>
            <option value={60}>60 min/tick</option>
          </select>
        </label>
      )}
      <div className="ml-auto flex items-center gap-1.5 text-[11px] font-mono text-text-dim">
        <Clock className="w-3 h-3 text-text-faint" />
        <span className="tnum">T+{state.sim.time}</span>
        <span className="text-text-faint">min</span>
      </div>
    </div>
  );
}

// ---------- Metrics bar ----------

export function MetricsBar() {
  const { metrics, state } = useStore();
  const phaseLabel = { observe: 'Observe', disrupt: 'Disrupt', recover: 'Recover', complete: 'Complete' }[state.sim.phase];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 bg-ink-800/60 border border-ink-500/30 rounded-xl px-4 py-3">
      <Stat label="Phase" value={phaseLabel} mono={false} tone="amber" />
      <Stat label="Operational" value={metrics.operational} sub={`/ ${metrics.total}`} tone="teal" />
      <Stat label="Degraded" value={metrics.degraded} tone="amber" />
      <Stat label="Failed" value={metrics.failed} tone="coral" />
      <Stat label="Essential" value={`${metrics.essentialAvailable}/${metrics.essentialTotal}`} tone={metrics.essentialAvailable < metrics.essentialTotal ? 'coral' : 'teal'} />
      <Stat label="Reachability" value={`${metrics.networkReachability}%`} tone={metrics.networkReachability < 60 ? 'coral' : metrics.networkReachability < 85 ? 'amber' : 'teal'} />
      <Stat label="Credits" value={state.sim.repairCredits} sub={`spent ${metrics.repairCreditsSpent}`} tone={state.sim.repairCredits < 50 ? 'coral' : 'default'} />
      <Stat label="Crews" value={`${metrics.crewsAvailable}/${state.sim.crewsTotal}`} sub={`${metrics.crewsBusy} busy`} tone={metrics.crewsAvailable === 0 ? 'amber' : 'default'} />
    </div>
  );
}

// ---------- Node inspector ----------

export function NodeInspector() {
  const { state, dispatch, metrics } = useStore();
  const id = state.selectedNodeId;
  const node = id ? nodeById(state.sim.graph, id) : null;

  if (!node || !id) {
    return (
      <Panel title="Node Inspector" subtitle="Select a node on the map or from the list">
        <EmptyState title="No node selected" hint="Click any node to inspect its dependencies, state, and repair options." />
      </Panel>
    );
  }

  const rt = state.sim.nodes[id];
  const meta = stateMeta[rt?.state ?? 'operational'];
  const cat = categoryMeta[node.category];
  const deps = useMemo(() => {
    const up = upstreamDependencies(state.sim.graph, id);
    const down = downstreamDependents(state.sim.graph, id);
    const direct = neighbors(state.sim.graph, id);
    return { up, down, direct };
  }, [state.sim.graph, id]);
  void metrics;

  const repairCheck = canRepairNode(state.sim, id);

  return (
    <Panel
      title={node.name}
      subtitle={`${cat.label} · ${node.district}`}
      right={<Badge tone={stateTone(rt?.state ?? 'operational')}><span style={{ color: meta.color }}>{meta.glyph}</span>{meta.label}</Badge>}
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Code" value={node.code} />
          <Stat label="Criticality" value={node.criticality} tone={node.criticality >= 4 ? 'amber' : 'default'} />
          <Stat label="Repair Cost" value={`${node.repairCost} cr`} />
          <Stat label="Repair Time" value={`${node.repairDuration} min`} />
          <Stat label="Capacity" value={`${rt?.effectiveCapacity ?? 0}%`} tone={rt && rt.effectiveCapacity < 50 ? 'coral' : 'teal'} />
          <Stat label="Essential" value={node.essential ? 'Yes' : 'No'} tone={node.essential ? 'amber' : 'dim'} />
        </div>

        <p className="text-[11px] text-text-dim leading-snug italic border-l-2 border-ink-500/40 pl-2">{node.role}</p>
        {rt && <p className="text-[11px] text-text-faint">{rt.reason}</p>}

        {/* Dependencies */}
        <div>
          <h4 className="text-[10px] uppercase tracking-wider text-text-faint mb-1.5">Requirements</h4>
          {node.requires.length === 0 ? (
            <p className="text-[11px] text-text-faint">No dependencies — operates autonomously.</p>
          ) : (
            <ul className="space-y-1">
              {node.requires.map((req, i) => {
                const satisfied = rt?.satisfiedReqs[i] ?? false;
                return (
                  <li key={i} className="flex items-center gap-2 text-[11px]">
                    {satisfied ? <CheckCircle2 className="w-3 h-3 text-signal-teal" /> : <XCircle className="w-3 h-3 text-signal-coral" />}
                    <span className="text-text-dim">{req.type}</span>
                    <span className="text-text-faint">←</span>
                    <span className="font-mono text-text-faint">{req.sources.join(' | ')}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Dependency highlights */}
        <div className="grid grid-cols-3 gap-2">
          <DepBadge label="Direct" count={deps.direct.length} tone="dim" />
          <DepBadge label="Upstream" count={deps.up.length} tone="amber" />
          <DepBadge label="Downstream" count={deps.down.length} tone="coral" />
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            size="sm"
            variant="primary"
            disabled={!repairCheck.ok}
            onClick={() => dispatch({ type: 'REPAIR', nodeId: id })}
            title={repairCheck.ok ? `Queue repair (${node.repairCost} cr, ${node.repairDuration} min)` : repairCheck.reason}
          >
            <Wrench className="w-3.5 h-3.5" />
            Repair
          </Button>
          <Button size="sm" variant="danger" onClick={() => dispatch({ type: 'FAIL_NODE', nodeId: id })} title="Manually fail this node">
            <Zap className="w-3.5 h-3.5" />
            Fail
          </Button>
          <Button size="sm" variant="ghost" onClick={() => dispatch({ type: 'SELECT_NODE', id: null })}>
            Deselect
          </Button>
        </div>
        {!repairCheck.ok && repairCheck.reason && rt?.state !== 'operational' && rt?.state !== 'restored' && (
          <p className="text-[10px] text-signal-coral flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{repairCheck.reason}</p>
        )}
      </div>
    </Panel>
  );
}

function DepBadge({ label, count, tone }: { label: string; count: number; tone: 'dim' | 'amber' | 'coral' }) {
  return (
    <div className="flex flex-col items-center justify-center py-1.5 rounded-lg border border-ink-500/30 bg-ink-900/40">
      <span className={`text-lg font-mono font-semibold ${tone === 'amber' ? 'text-signal-amber' : tone === 'coral' ? 'text-signal-coral' : 'text-text-dim'}`}>{count}</span>
      <span className="text-[9px] uppercase tracking-wider text-text-faint">{label}</span>
    </div>
  );
}

// ---------- Connection inspector ----------

export function ConnectionInspector() {
  const { state, dispatch } = useStore();
  const id = state.selectedConnectionId;
  const conn = id ? connectionById(state.sim.graph, id) : null;
  if (!conn || !id) return null;
  const cs = state.sim.connections[id];
  const a = nodeById(state.sim.graph, conn.from);
  const b = nodeById(state.sim.graph, conn.to);
  return (
    <Panel title="Connection" subtitle={`${a?.code ?? conn.from} ↔ ${b?.code ?? conn.to}`}>
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Type" value={conn.type} />
          <Stat label="State" value={cs?.state ?? 'active'} tone={cs?.state === 'severed' ? 'coral' : cs?.state === 'degraded' ? 'amber' : 'teal'} />
          <Stat label="Load" value={`${cs?.effectiveLoad ?? conn.load}%`} />
          <Stat label="Directed" value={conn.directed ? 'Yes' : 'No'} />
          <Stat label="Distance" value={conn.distance} />
          <Stat label="Travel Time" value={`${conn.travelTime} min`} />
        </div>
        <Button size="sm" variant="danger" onClick={() => dispatch({ type: 'SEVER_CONNECTION', connectionId: id })}>
          Sever Connection
        </Button>
      </div>
    </Panel>
  );
}

// ---------- Event timeline ----------

export function EventTimeline({ max = 60 }: { max?: number }) {
  const { state } = useStore();
  const events = state.sim.events.slice(-max).reverse();
  return (
    <Panel title="Event Timeline" subtitle={`${state.sim.events.length} events logged`}>
      {events.length === 0 ? (
        <EmptyState title="No events yet" hint="Start a mission or introduce a failure to populate the timeline." />
      ) : (
        <ol className="space-y-1 max-h-72 overflow-y-auto pr-1">
          {events.map((e) => {
            const sevColor = e.severity === 3 ? 'text-signal-coral' : e.severity === 2 ? 'text-signal-amber' : 'text-text-dim';
            const dot = e.severity === 3 ? 'bg-signal-coral' : e.severity === 2 ? 'bg-signal-amber' : 'bg-ink-400';
            return (
              <li key={e.id} className="flex gap-2 text-[11px] py-1 border-b border-ink-500/15 last:border-0">
                <span className="font-mono text-text-faint tnum shrink-0">T+{e.time}</span>
                <span className={`shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full ${dot}`} />
                <span className={`${sevColor} shrink-0 capitalize`}>{e.kind}</span>
                <span className="text-text-dim leading-snug">{e.message}</span>
              </li>
            );
          })}
        </ol>
      )}
    </Panel>
  );
}

// ---------- Algorithm laboratory ----------

export function AlgorithmLab() {
  const { state } = useStore();
  const [algo, setAlgo] = useState<'bfs' | 'dfs' | 'dijkstra' | 'criticality'>('bfs');
  const [startNode, setStartNode] = useState<string>(state.sim.graph.nodes[0]?.id ?? '');
  const [targetNode, setTargetNode] = useState<string>(state.sim.graph.nodes[1]?.id ?? '');
  const [metric, setMetric] = useState<DijkstraMetric>('distance');
  const [undirected, setUndirected] = useState(false);

  const result = useMemo(() => {
    const g = state.sim.graph;
    if (!startNode) return null;
    if (algo === 'bfs') return { kind: 'bfs', data: bfs(g, startNode, { undirected }) };
    if (algo === 'dfs') return { kind: 'dfs', data: dfs(g, startNode, { undirected }) };
    if (algo === 'dijkstra') {
      const d = dijkstra(g, startNode, metric, { undirected, connectionStates: state.sim.connections });
      const path = targetNode ? d.pathTo(targetNode) : null;
      return { kind: 'dijkstra', data: d, path };
    }
    if (algo === 'criticality') return { kind: 'criticality', data: criticalityTable(state.sim) };
    return null;
  }, [algo, startNode, targetNode, metric, undirected, state.sim]);

  return (
    <Panel
      title="Algorithm Laboratory"
      subtitle="BFS · DFS · Dijkstra · Criticality"
      right={<Badge tone="dim"><GitBranch className="w-3 h-3" />{algo.toUpperCase()}</Badge>}
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <label className="text-[10px] uppercase tracking-wider text-text-faint">
            Algorithm
            <Select value={algo} onChange={setAlgo as any}>
              <option value="bfs">BFS — Breadth-First</option>
              <option value="dfs">DFS — Depth-First</option>
              <option value="dijkstra">Dijkstra — Shortest Path</option>
              <option value="criticality">Criticality Analysis</option>
            </Select>
          </label>
          {algo !== 'criticality' && (
            <label className="text-[10px] uppercase tracking-wider text-text-faint">
              Start Node
              <Select value={startNode} onChange={setStartNode}>
                {state.sim.graph.nodes.map((n) => <option key={n.id} value={n.id}>{n.code} — {n.name}</option>)}
              </Select>
            </label>
          )}
        </div>

        {algo === 'dijkstra' && (
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[10px] uppercase tracking-wider text-text-faint">
              Target
              <Select value={targetNode} onChange={setTargetNode}>
                {state.sim.graph.nodes.map((n) => <option key={n.id} value={n.id}>{n.code} — {n.name}</option>)}
              </Select>
            </label>
            <label className="text-[10px] uppercase tracking-wider text-text-faint">
              Metric
              <Select value={metric} onChange={(v) => setMetric(v as DijkstraMetric)}>
                <option value="distance">Distance</option>
                <option value="travelTime">Travel Time</option>
                <option value="repairCost">Repair Cost</option>
              </Select>
            </label>
          </div>
        )}

        {algo !== 'criticality' && (
          <label className="flex items-center gap-2 text-[11px] text-text-dim cursor-pointer">
            <input type="checkbox" checked={undirected} onChange={(e) => setUndirected(e.target.checked)} className="accent-signal-amber" />
            Traverse undirected (ignore edge direction)
          </label>
        )}

        {/* Results */}
        <div className="mt-2">
          {!result && <p className="text-[11px] text-text-faint">Select a start node to run.</p>}
          {result?.kind === 'bfs' && <TraversalResultView label="BFS" data={result.data as ReturnType<typeof bfs>} />}
          {result?.kind === 'dfs' && <TraversalResultView label="DFS" data={result.data as ReturnType<typeof dfs>} />}
          {result?.kind === 'dijkstra' && <DijkstraResultView data={result.data as ReturnType<typeof dijkstra>} path={result.path ?? null} metric={metric} />}
          {result?.kind === 'criticality' && <CriticalityResultView data={result.data as ReturnType<typeof criticalityTable>} />}
        </div>
      </div>
    </Panel>
  );
}

function TraversalResultView({ label, data }: { label: string; data: ReturnType<typeof bfs> }) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] text-text-dim">
        <span className="text-signal-amber font-semibold">{label}</span> visited <span className="font-mono text-text">{data.order.length}</span> nodes in {data.order.length - 1} hops (max).
      </p>
      <div className="flex flex-wrap gap-1">
        {data.order.map((id, i) => (
          <span key={id} className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-ink-900/60 border border-ink-500/30 text-text-dim">
            <span className="text-text-faint mr-1">{i}</span>{id}
          </span>
        ))}
      </div>
      <p className="text-[10px] text-text-faint italic">
        {label === 'BFS'
          ? 'Visits nodes layer by layer — shortest hop-count paths.'
          : 'Explores each branch fully before backtracking — useful for finding connected components.'}
      </p>
    </div>
  );
}

function DijkstraResultView({ data, path, metric }: { data: ReturnType<typeof dijkstra>; path: string[] | null; metric: DijkstraMetric }) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] text-text-dim">
        Settled <span className="font-mono text-text">{data.order.length}</span> nodes. Metric: <span className="text-signal-amber">{metric}</span>.
      </p>
      {path && path.length > 0 ? (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-text-faint mb-1">Shortest path</p>
          <div className="flex flex-wrap items-center gap-1">
            {path.map((id, i) => (
              <span key={id} className="flex items-center gap-1">
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-signal-amber/10 border border-signal-amber/30 text-signal-amber">{id}</span>
                {i < path.length - 1 && <ChevronRight className="w-3 h-3 text-text-faint" />}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-text-dim mt-1">
            Total {metric}: <span className="font-mono text-text">{data.distances[path[path.length - 1]]}</span>
          </p>
        </div>
      ) : (
        <p className="text-[11px] text-signal-coral">No path found to target.</p>
      )}
      <p className="text-[10px] text-text-faint italic">
        Non-negative edge weights; the metric determines what "shortest" means. Do not call a distance-optimized path "fastest."
      </p>
    </div>
  );
}

function CriticalityResultView({ data }: { data: ReturnType<typeof criticalityTable> }) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] text-text-faint font-mono">{criticalityFormula}</p>
      <div className="max-h-56 overflow-y-auto rounded-lg border border-ink-500/20">
        <table className="w-full text-[10px]">
          <thead className="sticky top-0 bg-ink-800 text-text-faint uppercase tracking-wider">
            <tr>
              <th className="text-left px-2 py-1.5 font-medium">Node</th>
              <th className="text-right px-1 py-1.5 font-medium">Crit</th>
              <th className="text-right px-1 py-1.5 font-medium">Down</th>
              <th className="text-right px-1 py-1.5 font-medium">Ess</th>
              <th className="text-right px-1 py-1.5 font-medium">Deg</th>
              <th className="text-right px-1 py-1.5 font-medium">AP</th>
              <th className="text-right px-1 py-1.5 font-medium">RLoss</th>
              <th className="text-right px-2 py-1.5 font-medium text-signal-amber">Score</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 15).map((r) => (
              <tr key={r.nodeId} className="border-t border-ink-500/10 hover:bg-ink-700/30">
                <td className="px-2 py-1 text-text-dim font-mono">{r.nodeId}</td>
                <td className="px-1 py-1 text-right text-text-dim tnum">{r.criticality}</td>
                <td className="px-1 py-1 text-right text-text-dim tnum">{r.downstreamCount}</td>
                <td className="px-1 py-1 text-right tnum">{r.essentialDownstream > 0 ? <span className="text-signal-coral">{r.essentialDownstream}</span> : '0'}</td>
                <td className="px-1 py-1 text-right text-text-dim tnum">{r.degree}</td>
                <td className="px-1 py-1 text-right">{r.isArticulation ? <span className="text-signal-amber">●</span> : <span className="text-text-faint">·</span>}</td>
                <td className="px-1 py-1 text-right text-text-dim tnum">{r.reachabilityLoss}</td>
                <td className="px-2 py-1 text-right font-mono text-signal-amber tnum">{r.composite}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-text-faint italic">
        AP = articulation point (removal disconnects the graph). RLoss = reachability drop if this node fails.
      </p>
    </div>
  );
}

// ---------- Node list (mobile-friendly searchable inventory) ----------

export function NodeInventoryList({ onSelect, filter }: { onSelect?: (id: string) => void; filter?: (n: InfrastructureNode, s: NodeState) => boolean }) {
  const { state, dispatch } = useStore();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<NodeCategory | 'all'>('all');
  const debounced = useDebounced(search, 180);

  const list = useMemo(() => {
    return state.sim.graph.nodes.filter((n) => {
      if (catFilter !== 'all' && n.category !== catFilter) return false;
      if (debounced) {
        const q = debounced.toLowerCase();
        if (!n.name.toLowerCase().includes(q) && !n.code.toLowerCase().includes(q)) return false;
      }
      const s = state.sim.nodes[n.id]?.state ?? 'operational';
      if (filter && !filter(n, s)) return false;
      return true;
    });
  }, [state.sim, catFilter, debounced, filter]);

  return (
    <Panel title="Infrastructure Inventory" subtitle={`${list.length} nodes`}>
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="flex-1 bg-ink-900 border border-ink-500/30 rounded-lg px-2.5 py-1.5 text-xs text-text placeholder:text-text-faint"
          />
          <select value={catFilter} onChange={(e) => setCatFilter(e.target.value as any)} className="bg-ink-900 border border-ink-500/30 rounded-lg px-2 py-1.5 text-xs text-text">
            <option value="all">All</option>
 {(Object.keys(categoryMeta) as NodeCategory[]).map((c) => <option key={c} value={c}>{categoryMeta[c].label}</option>)}
          </select>
        </div>
        <ul className="max-h-64 overflow-y-auto space-y-0.5">
          {list.map((n) => {
            const s = state.sim.nodes[n.id]?.state ?? 'operational';
            const meta = stateMeta[s];
            return (
              <li key={n.id}>
                <button
                  onClick={() => { onSelect?.(n.id); dispatch({ type: 'SELECT_NODE', id: n.id }); }}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors ${
                    state.selectedNodeId === n.id ? 'bg-signal-amber/10 border border-signal-amber/30' : 'border border-transparent hover:bg-ink-700/30'
                  }`}
                >
                  <span style={{ color: meta.color }} className="text-sm leading-none">{meta.glyph}</span>
                  <span className="font-mono text-[10px] text-text-faint shrink-0">{n.code}</span>
                  <span className="text-[11px] text-text-dim truncate flex-1">{n.name}</span>
                  {n.essential && <span className="text-[9px] text-signal-amber">★</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </Panel>
  );
}
