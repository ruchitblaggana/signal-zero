// Metrics & mission completion checks.

import type { SimMetrics, SimulationState, Mission, ScenarioSummary } from '@/types';
import { nodeById } from './graph';
import { networkReachability, isolatedNodes } from './graph';

export function computeMetrics(state: SimulationState): SimMetrics {
  let operational = 0, degraded = 0, failed = 0, underRepair = 0, restored = 0, isolated = 0;
  let essentialTotal = 0, essentialAvailable = 0;
  for (const n of state.graph.nodes) {
    const s = state.nodes[n.id];
    if (!s) continue;
    switch (s.state) {
      case 'operational': operational++; break;
      case 'degraded': degraded++; break;
      case 'failed': failed++; break;
      case 'under_repair': underRepair++; break;
      case 'restored': restored++; break;
      case 'isolated': isolated++; break;
    }
    if (n.essential) {
      essentialTotal++;
      if (s.state === 'operational' || s.state === 'restored') essentialAvailable++;
    }
  }
  const reach = networkReachability(state.graph, state.connections);
  const iso = isolatedNodes(state.graph, state.connections);
  const reachableCritical = state.graph.nodes.filter((n) => {
    if (n.criticality >= 4) {
      const s = state.nodes[n.id];
      return s && (s.state === 'operational' || s.state === 'restored');
    }
    return false;
  }).length;

  const busyCrews = state.repairQueue.reduce((s, j) => s + j.crew, 0);

  return {
    total: state.graph.nodes.length,
    operational, degraded, failed, underRepair, restored, isolated,
    essentialTotal,
    essentialAvailable,
    reachableCritical,
    propagationEvents: state.events.filter((e) => e.kind === 'degradation' || e.kind === 'failure' || e.kind === 'isolation').length,
    repairCreditsSpent: state.repairCreditsInitial - state.repairCredits,
    repairCreditsRemaining: state.repairCredits,
    crewsAvailable: state.crewsTotal - busyCrews,
    crewsBusy: busyCrews,
    networkReachability: reach,
  };
}

export interface MissionResult {
  complete: boolean;
  success: boolean;
  reasons: string[];
  failures: string[];
}

export function checkMission(state: SimulationState, mission: Mission): MissionResult {
  const reasons: string[] = [];
  const failures: string[] = [];
  const c = mission.completion;
  if (c.operationalNodes) {
    for (const id of c.operationalNodes) {
      const s = state.nodes[id];
      const node = nodeById(state.graph, id);
      if (!s || (s.state !== 'operational' && s.state !== 'restored')) {
        failures.push(`${node?.name ?? id} is not operational (state: ${s?.state ?? 'missing'}).`);
      } else {
        reasons.push(`${node?.name ?? id} is operational.`);
      }
    }
  }
  const m = computeMetrics(state);
  if (m.essentialAvailable < c.minEssentialAvailable) {
    failures.push(`Only ${m.essentialAvailable}/${c.minEssentialAvailable} essential services available.`);
  } else {
    reasons.push(`${m.essentialAvailable} essential services available (≥ ${c.minEssentialAvailable}).`);
  }
  if (m.failed > c.maxFailed) {
    failures.push(`${m.failed} failed nodes remain (max ${c.maxFailed}).`);
  } else {
    reasons.push(`${m.failed} failed nodes (≤ ${c.maxFailed}).`);
  }
  if (c.budgetNonNegative && state.repairCredits < 0) {
    failures.push('Budget exceeded.');
  }
  if (c.timeLimit && state.time > c.timeLimit) {
    failures.push(`Time limit exceeded (${state.time} > ${c.timeLimit}).`);
  }
  return {
    complete: failures.length === 0,
    success: failures.length === 0,
    reasons,
    failures,
  };
}

/** Documented recovery score formula. */
export function recoveryScore(state: SimulationState, initialReachability: number): number {
  const m = computeMetrics(state);
  const serviceScore = m.essentialTotal > 0
    ? (m.essentialAvailable / m.essentialTotal) * 50
    : 50;
  const budgetRatio = state.repairCreditsInitial > 0
    ? (state.repairCredits / state.repairCreditsInitial) * 25
    : 25;
  const reachRatio = initialReachability > 0
    ? Math.min(1, m.networkReachability / Math.max(1, initialReachability)) * 25
    : (m.networkReachability / 100) * 25;
  return Math.round(serviceScore + budgetRatio + reachRatio);
}

export const recoveryScoreFormula =
  'recoveryScore = 50·(essentialAvailable/essentialTotal) + 25·(creditsRemaining/creditsInitial) + 25·(reachability/initialReachability)';

export function summariseAttempt(
  state: SimulationState,
  mission: Mission,
  success: boolean,
  repairOrder: string[],
  strategy?: string,
): ScenarioSummary {
  const m = computeMetrics(state);
  return {
    missionId: mission.id,
    attemptId: `att-${Date.now().toString(36)}`,
    startedAt: 0,
    completedAt: Date.now(),
    success,
    metrics: m,
    repairOrder,
    creditsSpent: m.repairCreditsSpent,
    timeElapsed: state.time,
    strategyUsed: strategy,
  };
}
