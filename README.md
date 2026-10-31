# Signal Zero — Urban Systems Resilience Lab

An interactive, browser-based simulation of cascading infrastructure failures in a fictional city called **Meridian**. Built as a deliberate engineering product, not a dashboard template.

**Tagline:** Every signal tells a story.

**Author:** Ruchit Blaggana — Delhi Public School, Vasant Kunj, New Delhi

## What it does

- Observe, disrupt, and recover an interconnected graph of ~32 infrastructure nodes.
- Real dependency rules drive cascading failures (redundancy, partial degradation, prerequisites).
- BFS, DFS, and Dijkstra are exposed as functional tools with documented metrics.
- Criticality analysis and two distinct recovery strategies with explainable comparisons.
- Five playable missions plus a custom experiment mode.
- Finite repair budget and crews with a real repair queue.
- Incident reports exportable as JSON / CSV.
- All data persists locally (IndexedDB + localStorage). No account, no backend, no paid APIs.

## Architecture

```
src/
  types.ts            # All domain types
  data/city.ts        # Meridian graph + missions
  engine/             # Pure simulation logic (no UI)
    graph.ts          # adjacency, BFS, DFS, Dijkstra, reachability
    rules.ts          # dependency rules + cascading propagation
    recovery.ts       # repair queue + two strategies
    criticality.ts    # documented criticality metrics
    metrics.ts        # service availability + recovery score
  store/              # persistence + global state
  components/         # map, panels, views
```

Simulation logic is kept independent of the interface and unit-tested.
