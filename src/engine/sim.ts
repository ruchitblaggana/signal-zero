// Simulation controller: orchestrates time, repairs, propagation, and mission logic.
// UI-agnostic. The store consumes this to update SimulationState.

import type { SimulationState, SimEvent, FailureSeed, Mission } from '@/types';
import { applySeed, propagate, initRuntime } from './rules';
import { advanceRepairs } from './recovery';
import { bothStrategies, queueRepair, cancelRepair, canRepair } from './recovery';
import { computeMetrics, checkMission } from './metrics';
import type { StrategyResult } from './recovery';

let _sid = 0;
function sid(): string {
  _sid += 1;
  return `sim-${Date.now().toString(36)}-${_sid}`;
}

export interface StepOutcome {
  events: SimEvent[];
  metrics: ReturnType<typeof computeMetrics>;
  missionComplete?: boolean;
  missionSuccess?: boolean;
  missionReasons?: string[];
  missionFailures?: string[];
}

/** Initialise a simulation from a mission. Applies seeds and propagates. */
export function startMission(state: SimulationState, mission: Mission): SimEvent[] {
  // reset to baseline first
  resetScenario(state, mission.initialCredits, mission.initialCrews, mission.id, null);
  state.events = [];
  state.time = 0;
  state.phase = 'disrupt';
  let events: SimEvent[] = [];
  for (const seed of mission.seeds) {
    const seedEvents = applySeed(state.graph, seed, state.nodes, state.connections, state.time);
    events = events.concat(seedEvents);
  }
  state.events.push(...events);
  const propEvents = propagate(state.graph, state.nodes, state.connections, state.time);
  state.events.push(...propEvents);
  state.phase = 'recover';
  state.dirty = false;
  return [...events, ...propEvents];
}

/** Start a custom experiment with given seeds. */
export function startExperiment(
  state: SimulationState,
  seeds: FailureSeed[],
  credits: number,
  crews: number,
  scenarioId: string,
): SimEvent[] {
  resetScenario(state, credits, crews, null, scenarioId);
  state.events = [];
  state.time = 0;
  state.phase = 'disrupt';
  let events: SimEvent[] = [];
  for (const seed of seeds) {
    events = events.concat(applySeed(state.graph, seed, state.nodes, state.connections, state.time));
  }
  state.events.push(...events);
  const propEvents = propagate(state.graph, state.nodes, state.connections, state.time);
  state.events.push(...propEvents);
  state.phase = 'recover';
  state.dirty = false;
  return [...events, ...propEvents];
}

/** Reset to baseline runtime, preserving scenario id/credits. */
export function resetScenario(
  state: SimulationState,
  credits: number,
  crews: number,
  missionId: string | null,
  scenarioId: string | null,
): void {
  const { nodes, connections } = initRuntime(state.graph);
  state.nodes = nodes;
  state.connections = connections;
  state.events = [];
  state.time = 0;
  state.phase = 'observe';
  state.repairCredits = credits;
  state.repairCreditsInitial = credits;
  state.crewsTotal = crews;
  state.repairQueue = [];
  state.missionId = missionId;
  state.scenarioId = scenarioId;
  state.dirty = false;
  state.metricsHistory = [];
}

/** Advance simulation time by minutes; process due repairs and propagate. */
export function stepTime(state: SimulationState, minutes: number, mission?: Mission): StepOutcome {
  const newTime = state.time + minutes;
  const { completed, events: repairEvents } = advanceRepairs(state, newTime);
  state.time = newTime;
  // After a repair completes, recompute restored node and propagate.
  const propEvents = propagate(state.graph, state.nodes, state.connections, state.time);
  const allEvents = [...repairEvents as SimEvent[], ...propEvents];
  // cap event log size to avoid unbounded growth
  state.events.push(...allEvents);
  if (state.events.length > 500) {
    state.events = state.events.slice(-500);
  }
  state.metricsHistory.push({ time: state.time, metrics: computeMetrics(state) });
  if (state.metricsHistory.length > 200) state.metricsHistory = state.metricsHistory.slice(-200);
  const outcome: StepOutcome = { events: allEvents, metrics: computeMetrics(state) };
  if (mission) {
    const r = checkMission(state, mission);
    outcome.missionComplete = r.complete;
    outcome.missionSuccess = r.success;
    outcome.missionReasons = r.reasons;
    outcome.missionFailures = r.failures;
    if (r.complete && state.phase !== 'complete') state.phase = 'complete';
  }
  return outcome;
}

export function strategiesFor(state: SimulationState): { critical: StrategyResult; connectivity: StrategyResult } {
  return bothStrategies(state);
}

export function requestRepair(state: SimulationState, nodeId: string, crew = 1, strategy?: string) {
  return queueRepair(state, nodeId, crew, strategy);
}

export function requestCancel(state: SimulationState, jobId: string) {
  return cancelRepair(state, jobId);
}

export function canRepairNode(state: SimulationState, nodeId: string) {
  const node = state.graph.nodes.find((n) => n.id === nodeId);
  if (!node) return { ok: false, reason: 'Unknown node.' };
  return canRepair(state, node);
}

export { sid };
