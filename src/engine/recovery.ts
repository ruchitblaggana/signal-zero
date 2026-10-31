// Repair queue + two distinct recovery strategies.

import type {
  CityGraph,
  InfrastructureNode,
  NodeRuntimeState,
  ConnectionRuntimeState,
  SimulationState,
  RepairJob,
} from '@/types';
import { nodeById, downstreamDependents } from './graph';
import { recomputeRestoredNode } from './rules';

let _jid = 0;
function jobId(): string {
  _jid += 1;
  return `rj-${Date.now().toString(36)}-${_jid}`;
}

export function canRepair(
  state: SimulationState,
  node: InfrastructureNode,
): { ok: boolean; reason?: string } {
  const rt = state.nodes[node.id];
  if (!rt) return { ok: false, reason: 'Unknown node.' };
  if (rt.state !== 'failed' && rt.state !== 'degraded' && rt.state !== 'isolated') {
    return { ok: false, reason: 'Node is not damaged.' };
  }
  if (state.repairQueue.some((j) => j.nodeId === node.id)) {
    return { ok: false, reason: 'Already queued for repair.' };
  }
  const busyCrews = state.repairQueue.reduce((s, j) => s + j.crew, 0);
  if (busyCrews >= state.crewsTotal) {
    return { ok: false, reason: 'No available repair crews.' };
  }
  if (state.repairCredits < node.repairCost) {
    return { ok: false, reason: `Insufficient credits (need ${node.repairCost}, have ${state.repairCredits}).` };
  }
  return { ok: true };
}

export function queueRepair(
  state: SimulationState,
  nodeId: string,
  crew = 1,
  strategy?: string,
): { ok: boolean; reason?: string; job?: RepairJob } {
  const node = nodeById(state.graph, nodeId);
  if (!node) return { ok: false, reason: 'Unknown node.' };
  const check = canRepair(state, node);
  if (!check.ok) return check;
  const startedAt = state.time;
  const completesAt = startedAt + node.repairDuration;
  const job: RepairJob = {
    id: jobId(),
    nodeId,
    startedAt,
    completesAt,
    cost: node.repairCost,
    crew,
    strategy,
  };
  state.repairQueue.push(job);
  state.repairCredits -= node.repairCost;
  state.nodes[nodeId] = {
    ...state.nodes[nodeId],
    state: 'under_repair',
    reason: `Repair in progress (completes at T+${completesAt}).`,
  };
  state.dirty = true;
  return { ok: true, job };
}

export function cancelRepair(state: SimulationState, jobId: string): { ok: boolean; reason?: string } {
  const job = state.repairQueue.find((j) => j.id === jobId);
  if (!job) return { ok: false, reason: 'Job not found.' };
  if (state.time >= job.completesAt) return { ok: false, reason: 'Job already complete.' };
  state.repairQueue = state.repairQueue.filter((j) => j.id !== jobId);
  state.repairCredits += job.cost;
  // Revert node to failed/degraded (let propagate re-evaluate)
  state.nodes[job.nodeId] = {
    ...state.nodes[job.nodeId],
    state: 'failed',
    effectiveCapacity: 0,
    reason: 'Repair cancelled.',
  };
  return { ok: true };
}

/** Advance time; complete any due repairs and trigger downstream re-evaluation. */
export function advanceRepairs(
  state: SimulationState,
  newTime: number,
): { completed: RepairJob[]; events: { id: string; time: number; kind: 'repair_complete' | 'restored'; nodeId: string; message: string; severity: 1 | 2 | 3 }[] } {
  const completed: RepairJob[] = [];
  const events: { id: string; time: number; kind: 'repair_complete' | 'restored'; nodeId: string; message: string; severity: 1 | 2 | 3 }[] = [];
  const stillQueued: RepairJob[] = [];
  for (const job of state.repairQueue) {
    if (newTime >= job.completesAt && newTime >= job.startedAt) {
      completed.push(job);
      const node = nodeById(state.graph, job.nodeId);
      if (node) {
        // Mark restored and recompute from dependencies.
        state.nodes[job.nodeId] = {
          ...state.nodes[job.nodeId],
          state: 'restored',
          effectiveCapacity: 0,
          reason: 'Repair complete — re-evaluating dependencies.',
        };
        recomputeRestoredNode(state.graph, node, state.nodes, state.connections);
        events.push({
          id: `rc-${job.id}`,
          time: job.completesAt,
          kind: 'repair_complete',
          nodeId: job.nodeId,
          message: `${node.name} repair complete.`,
          severity: 1,
        });
      }
    } else {
      stillQueued.push(job);
    }
  }
  state.repairQueue = stillQueued;
  return { completed, events };
}

// ---- Strategies ----

export interface StrategyScore {
  nodeId: string;
  score: number;
  components: Record<string, number>;
  rationale: string;
}

export interface StrategyResult {
  name: string;
  description: string;
  order: string[];           // recommended repair order (nodeIds)
  scores: StrategyScore[];
  formula: string;
}

/** Strategy 1 — Critical Services First.
 *  Score = w1 * essentialDownstream + w2 * criticality + w3 * (1/cost)
 *  Essential nodes weighted heavily; cheaper repairs preferred as tiebreak.
 */
export function strategyCriticalFirst(state: SimulationState): StrategyResult {
  const damaged = state.graph.nodes.filter((n) => {
    const s = state.nodes[n.id]?.state;
    return s === 'failed' || s === 'degraded' || s === 'isolated';
  });
  const scores: StrategyScore[] = damaged.map((n) => {
    const downstream = downstreamDependents(state.graph, n.id);
    const essentialDown = downstream.filter((d) => {
      const dn = nodeById(state.graph, d);
      const ds = state.nodes[d]?.state;
      return dn?.essential && (ds === 'failed' || ds === 'degraded');
    }).length;
    const isEssential = n.essential ? 1 : 0;
    const crit = n.criticality;
    const costFactor = 1 / Math.max(1, n.repairCost);
    const score = 3 * essentialDown + 2 * isEssential + 1.5 * crit + costFactor;
    return {
      nodeId: n.id,
      score,
      components: {
        essentialDownstreamAffected: essentialDown,
        isEssential: isEssential,
        criticality: crit,
        costFactor: Number(costFactor.toFixed(4)),
      },
      rationale: `${n.name}: affects ${essentialDown} essential service(s) downstream; criticality ${crit}; cost ${n.repairCost}.`,
    };
  });
  scores.sort((a, b) => b.score - a.score);
  return {
    name: 'Critical Services First',
    description:
      'Prioritises repairs that restore the most essential (medical, shelter) services per credit spent. ' +
      'Weights: essential downstream ×3, node is essential ×2, criticality ×1.5, inverse cost ×1.',
    formula: 'score = 3·essentialDownstream + 2·isEssential + 1.5·criticality + 1/cost',
    order: scores.map((s) => s.nodeId),
    scores,
  };
}

/** Strategy 2 — Network Connectivity First.
 *  Score = w1 * downstreamCount + w2 * degree + w3 * (1/duration)
 *  Prefers high-degree connector nodes that restore large reachable regions quickly.
 */
export function strategyConnectivityFirst(state: SimulationState): StrategyResult {
  const damaged = state.graph.nodes.filter((n) => {
    const s = state.nodes[n.id]?.state;
    return s === 'failed' || s === 'degraded' || s === 'isolated';
  });
  const scores: StrategyScore[] = damaged.map((n) => {
    const downstream = downstreamDependents(state.graph, n.id).length;
    // degree via adjacency count
    let degree = 0;
    for (const c of state.graph.connections) {
      if (c.from === n.id || c.to === n.id) degree += 1;
    }
    const durFactor = 1 / Math.max(1, n.repairDuration);
    const score = 2 * downstream + 1.5 * degree + 2 * durFactor;
    return {
      nodeId: n.id,
      score,
      components: {
        downstreamDependents: downstream,
        degree,
        durationFactor: Number(durFactor.toFixed(4)),
      },
      rationale: `${n.name}: restores ${downstream} downstream dependents; degree ${degree}; duration ${n.repairDuration} min.`,
    };
  });
  scores.sort((a, b) => b.score - a.score);
  return {
    name: 'Network Connectivity First',
    description:
      'Prioritises repairs that restore the most downstream connections and reachable regions, preferring quick repairs. ' +
      'Weights: downstream dependents ×2, degree ×1.5, inverse duration ×2.',
    formula: 'score = 2·downstreamDependents + 1.5·degree + 2/duration',
    order: scores.map((s) => s.nodeId),
    scores,
  };
}

/** Compute both strategies. */
export function bothStrategies(state: SimulationState): { critical: StrategyResult; connectivity: StrategyResult } {
  return {
    critical: strategyCriticalFirst(state),
    connectivity: strategyConnectivityFirst(state),
  };
}
