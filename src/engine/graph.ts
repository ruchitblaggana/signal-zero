// Pure graph operations for the Meridian city network.
// No UI dependencies. All functions take the graph + runtime state and return data.

import type {
  CityGraph,
  InfrastructureConnection,
  InfrastructureNode,
  NodeRuntimeState,
  ConnectionRuntimeState,
  DependencyType,
} from '@/types';

export interface AdjacencyEntry {
  /** outgoing connection ids by destination nodeId */
  out: Map<string, string[]>;
  /** incoming connection ids by source nodeId */
  in: Map<string, string[]>;
  /** all connection ids touching this node */
  incident: Set<string>;
}

export function buildAdjacency(graph: CityGraph): Map<string, AdjacencyEntry> {
  const adj = new Map<string, AdjacencyEntry>();
  for (const n of graph.nodes) {
    adj.set(n.id, { out: new Map(), in: new Map(), incident: new Set() });
  }
  for (const c of graph.connections) {
    const a = adj.get(c.from);
    const b = adj.get(c.to);
    if (!a || !b) continue;
    a.out.set(c.to, [...(a.out.get(c.to) ?? []), c.id]);
    a.incident.add(c.id);
    b.in.set(c.from, [...(b.in.get(c.from) ?? []), c.id]);
    b.incident.add(c.id);
    if (!c.directed) {
      b.out.set(c.from, [...(b.out.get(c.from) ?? []), c.id]);
      a.in.set(c.to, [...(a.in.get(c.to) ?? []), c.id]);
    }
  }
  return adj;
}

export function nodeById(graph: CityGraph, id: string): InfrastructureNode | undefined {
  return graph.nodes.find((n) => n.id === id);
}

export function connectionById(graph: CityGraph, id: string): InfrastructureConnection | undefined {
  return graph.connections.find((c) => c.id === id);
}

/** Direct neighbours (outgoing) of a node, considering directed/undirected edges. */
export function neighbors(graph: CityGraph, nodeId: string): string[] {
  const adj = buildAdjacency(graph);
  const entry = adj.get(nodeId);
  if (!entry) return [];
  return [...new Set([...entry.out.keys(), ...entry.in.keys()])];
}

/** Edges leaving nodeId (or undirected). */
export function outgoingEdges(graph: CityGraph, nodeId: string): InfrastructureConnection[] {
  const adj = buildAdjacency(graph);
  const entry = adj.get(nodeId);
  if (!entry) return [];
  const ids = new Set<string>();
  for (const arr of entry.out.values()) arr.forEach((id) => ids.add(id));
  for (const arr of entry.in.values()) {
    for (const id of arr) {
      const c = connectionById(graph, id);
      if (c && !c.directed) ids.add(id);
    }
  }
  return [...ids].map((id) => connectionById(graph, id)!).filter(Boolean);
}

// ---- BFS ----
export interface TraversalResult {
  order: string[];       // nodeIds in traversal order
  parents: Record<string, string | null>;
  distances: Record<string, number>;
}

/** BFS following directed edges (respecting direction). Undirected edges traversed both ways. */
export function bfs(graph: CityGraph, start: string, opts?: { undirected?: boolean }): TraversalResult {
  const adj = buildAdjacency(graph);
  const order: string[] = [];
  const parents: Record<string, string | null> = {};
  const distances: Record<string, number> = {};
  const visited = new Set<string>([start]);
  const queue: string[] = [start];
  parents[start] = null;
  distances[start] = 0;
  while (queue.length) {
    const cur = queue.shift()!;
    order.push(cur);
    const entry = adj.get(cur);
    if (!entry) continue;
    const next: string[] = [];
    for (const id of entry.out.keys()) next.push(id);
    if (opts?.undirected) {
      for (const id of entry.in.keys()) next.push(id);
    }
    for (const n of next) {
      if (!visited.has(n)) {
        visited.add(n);
        parents[n] = cur;
        distances[n] = distances[cur] + 1;
        queue.push(n);
      }
    }
  }
  return { order, parents, distances };
}

// ---- DFS ----
export function dfs(graph: CityGraph, start: string, opts?: { undirected?: boolean }): TraversalResult {
  const adj = buildAdjacency(graph);
  const order: string[] = [];
  const parents: Record<string, string | null> = {};
  const distances: Record<string, number> = {};
  const visited = new Set<string>();
  parents[start] = null;
  distances[start] = 0;
  function visit(u: string, depth: number) {
    visited.add(u);
    distances[u] = depth;
    order.push(u);
    const entry = adj.get(u);
    if (!entry) return;
    const next: string[] = [];
    for (const id of entry.out.keys()) next.push(id);
    if (opts?.undirected) {
      for (const id of entry.in.keys()) next.push(id);
    }
    for (const n of next) {
      if (!visited.has(n)) {
        parents[n] = u;
        visit(n, depth + 1);
      }
    }
  }
  visit(start, 0);
  return { order, parents, distances };
}

// ---- Dijkstra ----
export type DijkstraMetric = 'distance' | 'travelTime' | 'repairCost';

export interface DijkstraResult {
  distances: Record<string, number>;
  parents: Record<string, string | null>;
  /** node ids in settled order */
  order: string[];
  /** reconstruct path to a target */
  pathTo: (target: string) => string[] | null;
}

export function dijkstra(
  graph: CityGraph,
  start: string,
  metric: DijkstraMetric = 'distance',
  opts?: { undirected?: boolean; connectionStates?: Record<string, ConnectionRuntimeState> },
): DijkstraResult {
  const adj = buildAdjacency(graph);
  const dist: Record<string, number> = {};
  const parents: Record<string, string | null> = {};
  const settled = new Set<string>();
  const order: string[] = [];
  for (const n of graph.nodes) dist[n.id] = Infinity;
  dist[start] = 0;
  parents[start] = null;
  // Naive O(V^2) — fine for ~32 nodes, deterministic and dependency-free.
  while (settled.size < graph.nodes.length) {
    let u: string | null = null;
    let best = Infinity;
    for (const n of graph.nodes) {
      if (!settled.has(n.id) && dist[n.id] < best) {
        best = dist[n.id];
        u = n.id;
      }
    }
    if (u === null || best === Infinity) break;
    settled.add(u);
    order.push(u);
    const entry = adj.get(u);
    if (!entry) continue;
    const candidates: { to: string; w: number }[] = [];
    for (const [to, ids] of entry.out.entries()) {
      for (const id of ids) {
        const c = connectionById(graph, id)!;
        const cs = opts?.connectionStates?.[id];
        // Severed / disabled connections are impassable
        if (cs && (cs.state === 'severed' || cs.state === 'disabled')) continue;
        const w = weight(c, metric);
        candidates.push({ to, w });
      }
    }
    if (opts?.undirected) {
      for (const [from, ids] of entry.in.entries()) {
        for (const id of ids) {
          const c = connectionById(graph, id)!;
          if (!c.directed) {
            const cs = opts?.connectionStates?.[id];
            if (cs && (cs.state === 'severed' || cs.state === 'disabled')) continue;
            const w = weight(c, metric);
            candidates.push({ to: from, w });
          }
        }
      }
    }
    for (const { to, w } of candidates) {
      if (settled.has(to)) continue;
      const nd = dist[u] + w;
      if (nd < dist[to]) {
        dist[to] = nd;
        parents[to] = u;
      }
    }
  }
  function pathTo(target: string): string[] | null {
    if (dist[target] === Infinity) return null;
    const path: string[] = [];
    let cur: string | null = target;
    while (cur) {
      path.unshift(cur);
      cur = parents[cur] ?? null;
    }
    return path[0] === start ? path : null;
  }
  return { distances: dist, parents, order, pathTo };
}

function weight(c: InfrastructureConnection, metric: DijkstraMetric): number {
  switch (metric) {
    case 'distance': return c.distance;
    case 'travelTime': return c.travelTime;
    case 'repairCost': return c.repairCost;
  }
}

// ---- Reachability & connectivity ----

/** Set of node ids reachable from start (following directed edges). */
export function reachable(graph: CityGraph, start: string): Set<string> {
  const r = bfs(graph, start);
  return new Set(r.order);
}

/** Upstream dependencies: nodes that `nodeId` depends on (transitive, via directed edges reversed). */
export function upstreamDependencies(graph: CityGraph, nodeId: string): string[] {
  const adj = buildAdjacency(graph);
  const visited = new Set<string>();
  const stack = [nodeId];
  while (stack.length) {
    const cur = stack.pop()!;
    const entry = adj.get(cur);
    if (!entry) continue;
    for (const src of entry.in.keys()) {
      if (!visited.has(src)) {
        visited.add(src);
        stack.push(src);
      }
    }
  }
  visited.delete(nodeId);
  return [...visited];
}

/** Downstream dependents: nodes that depend on `nodeId` (transitive, via directed edges forward). */
export function downstreamDependents(graph: CityGraph, nodeId: string): string[] {
  const adj = buildAdjacency(graph);
  const visited = new Set<string>();
  const stack = [nodeId];
  while (stack.length) {
    const cur = stack.pop()!;
    const entry = adj.get(cur);
    if (!entry) continue;
    for (const dst of entry.out.keys()) {
      if (!visited.has(dst)) {
        visited.add(dst);
        stack.push(dst);
      }
    }
  }
  visited.delete(nodeId);
  return [...visited];
}

/** Detect isolated nodes: no usable incident connections. */
export function isolatedNodes(
  graph: CityGraph,
  connectionStates: Record<string, ConnectionRuntimeState>,
): string[] {
  const adj = buildAdjacency(graph);
  const out: string[] = [];
  for (const n of graph.nodes) {
    const entry = adj.get(n.id);
    if (!entry || entry.incident.size === 0) {
      out.push(n.id);
      continue;
    }
    let anyUsable = false;
    for (const cid of entry.incident) {
      const cs = connectionStates[cid];
      if (!cs || cs.state === 'active' || cs.state === 'degraded') {
        anyUsable = true;
        break;
      }
    }
    if (!anyUsable) out.push(n.id);
  }
  return out;
}

/** Network reachability: fraction of ordered node pairs connected (directed), 0..100. */
export function networkReachability(
  graph: CityGraph,
  connectionStates: Record<string, ConnectionRuntimeState>,
): number {
  const n = graph.nodes.length;
  if (n <= 1) return 100;
  // For each node, count reachable nodes using directed traversal respecting severed edges.
  let reachablePairs = 0;
  const adj = buildAdjacency(graph);
  for (const start of graph.nodes) {
    const visited = new Set<string>([start.id]);
    const queue = [start.id];
    while (queue.length) {
      const cur = queue.shift()!;
      const entry = adj.get(cur);
      if (!entry) continue;
      for (const [to, ids] of entry.out.entries()) {
        if (visited.has(to)) continue;
        let usable = false;
        for (const id of ids) {
          const cs = connectionStates[id];
          if (!cs || cs.state === 'active' || cs.state === 'degraded') { usable = true; break; }
        }
        if (usable) { visited.add(to); queue.push(to); }
      }
      for (const [from, ids] of entry.in.entries()) {
        if (visited.has(from)) continue;
        for (const id of ids) {
          const c = connectionById(graph, id);
          if (c && !c.directed) {
            const cs = connectionStates[id];
            if (!cs || cs.state === 'active' || cs.state === 'degraded') {
              visited.add(from); queue.push(from); break;
            }
          }
        }
      }
    }
    reachablePairs += visited.size - 1;
  }
  const maxPairs = n * (n - 1);
  return Math.round((reachablePairs / maxPairs) * 100);
}

/** Articulation points (undirected connectivity). Returns node ids whose removal disconnects the graph. */
export function articulationPoints(graph: CityGraph): string[] {
  // Tarjan's algorithm on the undirected projection.
  const adj = buildAdjacency(graph);
  const udj = new Map<string, Set<string>>();
  for (const n of graph.nodes) {
    udj.set(n.id, new Set());
    const entry = adj.get(n.id);
    if (!entry) continue;
    for (const to of entry.out.keys()) udj.get(n.id)!.add(to);
    for (const from of entry.in.keys()) udj.get(n.id)!.add(from);
  }
  const visited = new Set<string>();
  const disc: Record<string, number> = {};
  const low: Record<string, number> = {};
  const parent: Record<string, string | null> = {};
  const ap = new Set<string>();
  let timer = 0;
  function dfs(u: string) {
    visited.add(u);
    disc[u] = low[u] = timer++;
    let children = 0;
    for (const v of udj.get(u) ?? []) {
      if (!visited.has(v)) {
        children++;
        parent[v] = u;
        dfs(v);
        low[u] = Math.min(low[u], low[v]);
        if (parent[u] === null && children > 1) ap.add(u);
        if (parent[u] !== null && low[v] >= disc[u]) ap.add(u);
      } else if (v !== parent[u]) {
        low[u] = Math.min(low[u], disc[v]);
      }
    }
  }
  for (const n of graph.nodes) {
    if (!visited.has(n.id)) {
      parent[n.id] = null;
      dfs(n.id);
    }
  }
  return [...ap];
}

/** Count dependencies (degree) of a node. */
export function degree(graph: CityGraph, nodeId: string): { inDeg: number; outDeg: number; total: number } {
  const adj = buildAdjacency(graph);
  const e = adj.get(nodeId);
  if (!e) return { inDeg: 0, outDeg: 0, total: 0 };
  let inDeg = 0;
  for (const arr of e.in.values()) inDeg += arr.length;
  let outDeg = 0;
  for (const arr of e.out.values()) outDeg += arr.length;
  return { inDeg, outDeg, total: inDeg + outDeg };
}

/** Group nodes by category. */
export function byCategory(graph: CityGraph): Record<string, InfrastructureNode[]> {
  const m: Record<string, InfrastructureNode[]> = {};
  for (const n of graph.nodes) (m[n.category] ??= []).push(n);
  return m;
}

/** Filter connections by type helper. */
export function connectionsOfType(graph: CityGraph, type: DependencyType): InfrastructureConnection[] {
  return graph.connections.filter((c) => c.type === type);
}
