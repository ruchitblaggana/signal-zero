// Dependency rules + cascading failure propagation.
// Pure logic. Given a graph + runtime state, evaluate which nodes degrade/fail.

import type {
  CityGraph,
  InfrastructureNode,
  NodeRuntimeState,
  ConnectionRuntimeState,
  SimEvent,
  SimulationState,
  FailureSeed,
  Requirement,
  NodeState,
} from '@/types';
import { buildAdjacency, connectionById, nodeById } from './graph';

let _id = 0;
function eid(): string {
  _id += 1;
  return `evt-${Date.now().toString(36)}-${_id}`;
}

/** Evaluate whether a single requirement is satisfied, and return the effective capacity contribution. */
export function evalRequirement(
  graph: CityGraph,
  req: Requirement,
  nodes: Record<string, NodeRuntimeState>,
  connections: Record<string, ConnectionRuntimeState>,
): { satisfied: boolean; capacity: number; source: string | null } {
  let bestCap = 0;
  let source: string | null = null;
  for (const srcId of req.sources) {
    const srcNode = nodeById(graph, srcId);
    const srcState = nodes[srcId];
    if (!srcNode || !srcState) continue;
    if (srcState.state === 'failed' || srcState.state === 'isolated' || srcState.state === 'under_repair') {
      continue;
    }
    // operational or restored or degraded may satisfy (degraded only if tolerated)
    if (srcState.state === 'degraded' && !req.tolerateDegraded) {
      // degraded source: counts only partially if tolerated; here not tolerated => not satisfied strongly
      // but we still consider it as a partial candidate
    }
    // Check a connection from src -> this node of matching type exists and is usable
    const adj = buildAdjacency(graph);
    const entry = adj.get(srcId);
    if (!entry) continue;
    let connected = false;
    let connLoad = 100;
    const candidateConnIds = [
      ...(entry.out.get(req.sources.includes(srcId) ? req.sources[0] : '') ?? []),
    ];
    // Look at all connections from src to the consuming node (we don't have target here, so scan)
    // Actually we need the target node — caller knows it. To keep this function self-contained,
    // we scan connections from src of the right type and check the destination's state.
    for (const c of graph.connections) {
      if (c.type !== req.type) continue;
      const matches = c.from === srcId || (!c.directed && c.to === srcId);
      if (!matches) continue;
      const cs = connections[c.id];
      if (cs && (cs.state === 'severed' || cs.state === 'disabled')) continue;
      // Connection must reach a node that is in a valid state; for our purposes, presence of usable edge counts.
      connected = true;
      const load = cs?.effectiveLoad ?? c.load;
      connLoad = Math.min(connLoad, load);
      break;
    }
    if (!connected) continue;
    const srcCap = srcState.effectiveCapacity;
    const cap = Math.min(srcCap, connLoad);
    if (cap > bestCap) {
      bestCap = cap;
      source = srcId;
    }
    void candidateConnIds;
  }
  const satisfied = bestCap > 0;
  return { satisfied, capacity: bestCap, source };
}

export interface EvalResult {
  state: NodeState;
  capacity: number;
  satisfiedReqs: boolean[];
  reason: string;
}

/** Evaluate the correct state for a single node given current upstream states. */
export function evaluateNode(
  graph: CityGraph,
  node: InfrastructureNode,
  nodes: Record<string, NodeRuntimeState>,
  connections: Record<string, ConnectionRuntimeState>,
): EvalResult {
  // If under repair or manually failed, don't override.
  const cur = nodes[node.id];
  if (cur && (cur.state === 'under_repair' || cur.state === 'isolated')) {
    return {
      state: cur.state,
      capacity: cur.effectiveCapacity,
      satisfiedReqs: cur.satisfiedReqs,
      reason: cur.reason,
    };
  }
  if (node.requires.length === 0) {
    // No dependencies: operational unless externally failed.
    if (cur && cur.state === 'failed') {
      return { state: 'failed', capacity: 0, satisfiedReqs: [], reason: cur.reason };
    }
    return { state: 'operational', capacity: node.capacity, satisfiedReqs: [], reason: 'No dependencies — nominal.' };
  }
  const satisfiedReqs: boolean[] = [];
  let minCap = 100;
  let unsatisfied: string[] = [];
  for (const req of node.requires) {
    const r = evalRequirement(graph, req, nodes, connections);
    satisfiedReqs.push(r.satisfied);
    if (!r.satisfied) {
      unsatisfied.push(req.type);
    } else {
      minCap = Math.min(minCap, r.capacity);
    }
  }
  if (unsatisfied.length === 0) {
    // All satisfied. Operational if cap >= 60, degraded if 1..59.
    if (minCap >= 60) {
      return { state: 'operational', capacity: minCap, satisfiedReqs, reason: 'All dependencies satisfied.' };
    }
    return { state: 'degraded', capacity: minCap, satisfiedReqs, reason: `Partial dependency capacity (${minCap}%).` };
  }
  if (unsatisfied.length === node.requires.length) {
    return { state: 'failed', capacity: 0, satisfiedReqs, reason: `All dependencies unavailable: ${unsatisfied.join(', ')}.` };
  }
  // Some deps satisfied, some not => degraded or failed depending on criticality
  return {
    state: 'degraded',
    capacity: minCap,
    satisfiedReqs,
    reason: `Missing: ${unsatisfied.join(', ')}.`,
  };
}

/** Initialize runtime state for a fresh graph: everything operational. */
export function initRuntime(graph: CityGraph): {
  nodes: Record<string, NodeRuntimeState>;
  connections: Record<string, ConnectionRuntimeState>;
} {
  const nodes: Record<string, NodeRuntimeState> = {};
  const connections: Record<string, ConnectionRuntimeState> = {};
  for (const n of graph.nodes) {
    nodes[n.id] = {
      nodeId: n.id,
      state: 'operational',
      effectiveCapacity: n.capacity,
      satisfiedReqs: n.requires.map(() => true),
      reason: 'Nominal.',
    };
  }
  for (const c of graph.connections) {
    connections[c.id] = {
      connectionId: c.id,
      state: 'active',
      effectiveLoad: c.load,
    };
  }
  return { nodes, connections };
}

/** Re-evaluate the entire graph, iterating to fixpoint. Returns events generated. */
export function propagate(
  graph: CityGraph,
  nodes: Record<string, NodeRuntimeState>,
  connections: Record<string, ConnectionRuntimeState>,
  time: number,
  maxIter = 12,
): SimEvent[] {
  const events: SimEvent[] = [];
  for (let iter = 0; iter < maxIter; iter++) {
    let changed = false;
    for (const node of graph.nodes) {
      const cur = nodes[node.id];
      if (!cur) continue;
      if (cur.state === 'under_repair' || cur.state === 'isolated') continue;
      const result = evaluateNode(graph, node, nodes, connections);
      if (result.state !== cur.state || result.capacity !== cur.effectiveCapacity) {
        changed = true;
        const prevState = cur.state;
        nodes[node.id] = {
          nodeId: node.id,
          state: result.state,
          effectiveCapacity: result.capacity,
          satisfiedReqs: result.satisfiedReqs,
          reason: result.reason,
        };
        // Emit an event for meaningful transitions only.
        if (result.state !== prevState && result.state !== 'operational') {
          const kind: SimEvent['kind'] =
            result.state === 'failed' ? 'failure' :
            result.state === 'degraded' ? 'degradation' :
            result.state === 'restored' ? 'restored' : 'system';
          const sev: SimEvent['severity'] = result.state === 'failed' ? 3 : result.state === 'degraded' ? 2 : 1;
          events.push({
            id: eid(),
            time,
            kind,
            nodeId: node.id,
            message: `${node.name} transitioned ${prevState} → ${result.state}. ${result.reason}`,
            severity: sev,
          });
        }
      }
    }
    if (!changed) break;
  }
  return events;
}

/** Apply a failure seed to runtime state (before propagation). */
export function applySeed(
  graph: CityGraph,
  seed: FailureSeed,
  nodes: Record<string, NodeRuntimeState>,
  connections: Record<string, ConnectionRuntimeState>,
  time: number,
): SimEvent[] {
  const events: SimEvent[] = [];
  if (seed.kind === 'node_failure') {
    const n = nodeById(graph, seed.targetId);
    if (n) {
      nodes[seed.targetId] = {
        nodeId: seed.targetId,
        state: 'failed',
        effectiveCapacity: 0,
        satisfiedReqs: nodes[seed.targetId]?.satisfiedReqs ?? [],
        reason: 'Primary failure — manually triggered.',
      };
      events.push({
        id: eid(), time, kind: 'incident', nodeId: seed.targetId,
        message: `${n.name} failed.`, severity: 3,
      });
    }
  } else if (seed.kind === 'connection_sever') {
    const c = connectionById(graph, seed.targetId);
    if (c) {
      connections[seed.targetId] = {
        connectionId: seed.targetId,
        state: 'severed',
        effectiveLoad: 0,
      };
      events.push({
        id: eid(), time, kind: 'incident', connectionId: seed.targetId,
        message: `Connection ${c.from} ↔ ${c.to} (${c.type}) severed.`, severity: 3,
      });
    }
  } else if (seed.kind === 'node_overload') {
    const n = nodeById(graph, seed.targetId);
    const c = connectionById(graph, seed.targetId);
    const factor = seed.factor ?? 1.3;
    if (n) {
      // Overload a node: degrade its capacity.
      const curCap = nodes[seed.targetId]?.effectiveCapacity ?? n.capacity;
      nodes[seed.targetId] = {
        nodeId: seed.targetId,
        state: 'degraded',
        effectiveCapacity: Math.max(10, Math.round(curCap / factor)),
        satisfiedReqs: nodes[seed.targetId]?.satisfiedReqs ?? n.requires.map(() => true),
        reason: `Overloaded by factor ${factor.toFixed(1)} — reduced capacity.`,
      };
      events.push({
        id: eid(), time, kind: 'incident', nodeId: seed.targetId,
        message: `${n.name} overloaded (×${factor.toFixed(1)}).`, severity: 2,
      });
    } else if (c) {
      connections[seed.targetId] = {
        connectionId: seed.targetId,
        state: 'degraded',
        effectiveLoad: Math.min(100, Math.round(c.load / factor)),
      };
      events.push({
        id: eid(), time, kind: 'incident', connectionId: seed.targetId,
        message: `Connection ${c.from} ↔ ${c.to} overloaded (×${factor.toFixed(1)}).`, severity: 2,
      });
    }
  }
  return events;
}

/** Manual action: fail a node. */
export function failNode(
  graph: CityGraph,
  nodeId: string,
  nodes: Record<string, NodeRuntimeState>,
  time: number,
): SimEvent[] {
  const n = nodeById(graph, nodeId);
  if (!n) return [];
  nodes[nodeId] = {
    nodeId, state: 'failed', effectiveCapacity: 0,
    satisfiedReqs: nodes[nodeId]?.satisfiedReqs ?? [],
    reason: 'Manually failed.',
  };
  return [{
    id: eid(), time, kind: 'manual', nodeId,
    message: `${n.name} manually failed.`, severity: 3,
  }];
}

/** Manual action: sever a connection. */
export function severConnection(
  graph: CityGraph,
  connectionId: string,
  connections: Record<string, ConnectionRuntimeState>,
  time: number,
): SimEvent[] {
  const c = connectionById(graph, connectionId);
  if (!c) return [];
  connections[connectionId] = { connectionId, state: 'severed', effectiveLoad: 0 };
  return [{
    id: eid(), time, kind: 'manual', connectionId,
    message: `Connection ${c.from} ↔ ${c.to} severed.`, severity: 3,
  }];
}

/** Manual action: overload a node or connection. */
export function overload(
  graph: CityGraph,
  targetId: string,
  factor: number,
  nodes: Record<string, NodeRuntimeState>,
  connections: Record<string, ConnectionRuntimeState>,
  time: number,
): SimEvent[] {
  return applySeed(graph, { kind: 'node_overload', targetId, factor }, nodes, connections, time);
}

/** Reset a single node to be re-evaluated (used after a repair completes). */
export function clearManualFailure(
  nodeId: string,
  nodes: Record<string, NodeRuntimeState>,
): void {
  // mark for re-evaluation: set to "restored" tentative; propagate will recompute
  const cur = nodes[nodeId];
  if (cur && cur.state === 'failed') {
    nodes[nodeId] = {
      ...cur,
      state: 'restored',
      effectiveCapacity: 0,
      reason: 'Cleared for re-evaluation.',
    };
  }
}

/** Build a fresh simulation state from a scenario. */
export function freshState(
  graph: CityGraph,
  initialCredits: number,
  initialCrews: number,
  missionId: string | null,
  scenarioId: string | null,
): SimulationState {
  const { nodes, connections } = initRuntime(graph);
  return {
    graph,
    nodes,
    connections,
    events: [],
    time: 0,
    phase: 'observe',
    repairCredits: initialCredits,
    repairCreditsInitial: initialCredits,
    crewsTotal: initialCrews,
    repairQueue: [],
    scenarioId,
    missionId,
    dirty: false,
    metricsHistory: [],
  };
}

/** Recompute capacity for a restored node based on its dependencies. */
export function recomputeRestoredNode(
  graph: CityGraph,
  node: InfrastructureNode,
  nodes: Record<string, NodeRuntimeState>,
  connections: Record<string, ConnectionRuntimeState>,
): void {
  const r = evaluateNode(graph, node, nodes, connections);
  nodes[node.id] = {
    nodeId: node.id,
    state: r.state,
    effectiveCapacity: r.capacity,
    satisfiedReqs: r.satisfiedReqs,
    reason: r.reason,
  };
}
