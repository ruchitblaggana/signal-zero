// Documented criticality analysis.

import type { CityGraph, NodeRuntimeState, ConnectionRuntimeState, SimulationState } from '@/types';
import {
  degree,
  downstreamDependents,
  articulationPoints,
  reachable,
  networkReachability,
} from './graph';
import { nodeById } from './graph';

export interface CriticalityRow {
  nodeId: string;
  name: string;
  category: string;
  criticality: number;        // configured 1..5
  downstreamCount: number;    // # of nodes that depend on this one
  essentialDownstream: number; // # of essential services downstream
  degree: number;
  isArticulation: boolean;
  reachabilityLoss: number;   // % drop in network reachability if this node fails (undirected)
  composite: number;          // documented weighted score
  components: Record<string, number | boolean>;
}

const W = { crit: 2, downstream: 1.5, essentialDown: 3, articulation: 2, reachabilityLoss: 0.05 };

/** Compute a full criticality table for all nodes. */
export function criticalityTable(state: SimulationState): CriticalityRow[] {
  const aps = new Set(articulationPoints(state.graph));
  const baseReach = networkReachability(state.graph, state.connections);
  const rows: CriticalityRow[] = state.graph.nodes.map((n) => {
    const downstream = downstreamDependents(state.graph, n.id);
    const essentialDown = downstream.filter((d) => nodeById(state.graph, d)?.essential).length;
    const dg = degree(state.graph, n.id).total;
    const isAp = aps.has(n.id);
    // Reachability loss: simulate undirected reachability with this node removed.
    const reachWithout = reachabilityWithoutNode(state, n.id);
    const reachLoss = Math.max(0, baseReach - reachWithout);
    const composite =
      W.crit * n.criticality +
      W.downstream * downstream.length +
      W.essentialDown * essentialDown +
      W.articulation * (isAp ? 1 : 0) +
      W.reachabilityLoss * reachLoss;
    return {
      nodeId: n.id,
      name: n.name,
      category: n.category,
      criticality: n.criticality,
      downstreamCount: downstream.length,
      essentialDownstream: essentialDown,
      degree: dg,
      isArticulation: isAp,
      reachabilityLoss: Number(reachLoss.toFixed(1)),
      composite: Number(composite.toFixed(2)),
      components: {
        criticality: n.criticality,
        downstreamCount: downstream.length,
        essentialDownstream: essentialDown,
        degree: dg,
        isArticulation: isAp,
        reachabilityLoss: Number(reachLoss.toFixed(1)),
      },
    };
  });
  rows.sort((a, b) => b.composite - a.composite);
  return rows;
}

function reachabilityWithoutNode(state: SimulationState, removeId: string): number {
  const adj = new Map<string, Set<string>>();
  for (const n of state.graph.nodes) adj.set(n.id, new Set());
  for (const c of state.graph.connections) {
    const cs = state.connections[c.id];
    if (cs && (cs.state === 'severed' || cs.state === 'disabled')) continue;
    if (c.from === removeId || c.to === removeId) continue;
    adj.get(c.from)?.add(c.to);
    if (!c.directed) adj.get(c.to)?.add(c.from);
  }
  const nodes = state.graph.nodes.filter((n) => n.id !== removeId);
  const n = nodes.length;
  if (n <= 1) return 100;
  let pairs = 0;
  for (const start of nodes) {
    const visited = new Set<string>([start.id]);
    const q = [start.id];
    while (q.length) {
      const cur = q.shift()!;
      for (const nx of adj.get(cur) ?? []) {
        if (!visited.has(nx)) { visited.add(nx); q.push(nx); }
      }
    }
    pairs += visited.size - 1;
  }
  return Math.round((pairs / (n * (n - 1))) * 100);
}

export const criticalityFormula =
  'composite = 2·criticality + 1.5·downstreamCount + 3·essentialDownstream + 2·isArticulation + 0.05·reachabilityLoss';
