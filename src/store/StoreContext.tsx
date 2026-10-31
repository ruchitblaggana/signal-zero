// Global app store: simulation state + persisted user data + notifications + UI prefs.
// Plain React context + useReducer — no external state library.

import { createContext, useContext, useEffect, useMemo, useReducer, useRef, useCallback, type ReactNode } from 'react';
import type {
  SimulationState,
  PersistedData,
  SimEvent,
  NotebookEntry,
  CustomScenario,
  ScenarioSummary,
  FailureSeed,
} from '@/types';
import { meridian, missions, missionById } from '@/data/city';
import { freshState } from '@/engine/rules';
import {
  startMission as simStartMission,
  startExperiment as simStartExperiment,
  stepTime as simStepTime,
  resetScenario as simReset,
  requestRepair as simRepair,
  requestCancel as simCancel,
  strategiesFor,
} from '@/engine/sim';
import {
  failNode, severConnection, overload, propagate,
} from '@/engine/rules';
import { computeMetrics, checkMission, summariseAttempt, recoveryScore } from '@/engine/metrics';
import {
  persistence, defaultData, addNotebook, updateNotebook, deleteNotebook,
  addScenario, deleteScenario, addSummary, exportData, importData,
} from './persistence';

export interface Notification {
  id: string;
  kind: 'info' | 'success' | 'warning' | 'error';
  message: string;
  time: number;
}

export type ViewId = 'operations' | 'laboratory' | 'recovery' | 'archive' | 'notebook' | 'developer';

export interface AppState {
  view: ViewId;
  sim: SimulationState;
  persisted: PersistedData;
  selectedNodeId: string | null;
  selectedConnectionId: string | null;
  notifications: Notification[];
  running: boolean;
  speed: number; // sim minutes per tick
  initialReachability: number;
  lastMissionResult: ReturnType<typeof checkMission> | null;
  storageError: string | null;
}

export type Action =
  | { type: 'SET_VIEW'; view: ViewId }
  | { type: 'SELECT_NODE'; id: string | null }
  | { type: 'SELECT_CONNECTION'; id: string | null }
  | { type: 'START_MISSION'; missionId: string }
  | { type: 'START_EXPERIMENT'; seeds: FailureSeed[]; credits: number; crews: number; name: string }
  | { type: 'STEP'; minutes: number }
  | { type: 'TOGGLE_RUN'; running?: boolean }
  | { type: 'SET_SPEED'; speed: number }
  | { type: 'RESET_SIM' }
  | { type: 'FAIL_NODE'; nodeId: string }
  | { type: 'SEVER_CONNECTION'; connectionId: string }
  | { type: 'OVERLOAD'; targetId: string; factor: number }
  | { type: 'REPAIR'; nodeId: string; crew?: number; strategy?: string }
  | { type: 'CANCEL_REPAIR'; jobId: string }
  | { type: 'PERSIST'; data: PersistedData }
  | { type: 'ADD_NOTE'; entry: NotebookEntry }
  | { type: 'UPDATE_NOTE'; id: string; patch: Partial<NotebookEntry> }
  | { type: 'DELETE_NOTE'; id: string }
  | { type: 'ADD_SCENARIO'; scenario: CustomScenario }
  | { type: 'DELETE_SCENARIO'; id: string }
  | { type: 'SAVE_SUMMARY'; summary: ScenarioSummary }
  | { type: 'IMPORT'; data: PersistedData }
  | { type: 'CLEAR_STORAGE' }
  | { type: 'NOTIFY'; n: Notification }
  | { type: 'DISMISS'; id: string }
  | { type: 'SET_STORAGE_ERROR'; msg: string | null }
  | { type: 'SET_PERSISTED'; data: PersistedData };

const initialState: AppState = {
  view: 'operations',
  sim: freshState(meridian, 600, 3, null, null),
  persisted: defaultData,
  selectedNodeId: null,
  selectedConnectionId: null,
  notifications: [],
  running: false,
  speed: 15,
  initialReachability: 100,
  lastMissionResult: null,
  storageError: null,
};

let _n = 0;
function nid(): string { _n += 1; return `n${Date.now().toString(36)}-${_n}`; }

function notify(kind: Notification['kind'], message: string): Notification {
  return { id: nid(), kind, message, time: Date.now() };
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_VIEW':
      return { ...state, view: action.view };
    case 'SELECT_NODE':
      return { ...state, selectedNodeId: action.id, selectedConnectionId: null };
    case 'SELECT_CONNECTION':
      return { ...state, selectedConnectionId: action.id, selectedNodeId: null };
    case 'START_MISSION': {
      const m = missionById(action.missionId);
      if (!m) return state;
      const sim = structuredClone(state.sim);
      sim.graph = meridian;
      const events = simStartMission(sim, m);
      const initialReach = computeMetrics(sim).networkReachability;
      return {
        ...state,
        sim,
        view: 'operations',
        running: false,
        selectedNodeId: null,
        selectedConnectionId: null,
        initialReachability: initialReach,
        lastMissionResult: null,
        notifications: [notify('info', `Mission started: ${m.title}`), ...state.notifications].slice(0, 6),
      };
    }
    case 'START_EXPERIMENT': {
      const sim = structuredClone(state.sim);
      sim.graph = meridian;
      simStartExperiment(sim, action.seeds, action.credits, action.crews, action.name);
      const initialReach = computeMetrics(sim).networkReachability;
      return {
        ...state,
        sim,
        view: 'operations',
        running: false,
        selectedNodeId: null,
        selectedConnectionId: null,
        initialReachability: initialReach,
        lastMissionResult: null,
        notifications: [notify('info', `Experiment "${action.name}" started`), ...state.notifications].slice(0, 6),
      };
    }
    case 'STEP': {
      const sim = structuredClone(state.sim);
      const m = sim.missionId ? missionById(sim.missionId) : undefined;
      const out = simStepTime(sim, action.minutes, m);
      let lastMissionResult = state.lastMissionResult;
      if (m && out.missionComplete) {
        lastMissionResult = checkMission(sim, m);
        if (lastMissionResult.success) {
          // record attempt
          const summary = summariseAttempt(sim, m, true, sim.repairQueue.map((j) => j.nodeId));
          addSummary(state.persisted, summary);
          void persistAsync(state.persisted);
        }
      }
      return {
        ...state,
        sim,
        lastMissionResult,
        notifications: out.events.length
          ? [notify(out.events.some((e) => e.severity >= 3) ? 'warning' : 'info',
              out.events[out.events.length - 1].message), ...state.notifications].slice(0, 6)
          : state.notifications,
      };
    }
    case 'TOGGLE_RUN':
      return { ...state, running: action.running ?? !state.running };
    case 'SET_SPEED':
      return { ...state, speed: action.speed };
    case 'RESET_SIM': {
      const sim = structuredClone(state.sim);
      const m = sim.missionId ? missionById(sim.missionId) : undefined;
      const credits = m?.initialCredits ?? sim.repairCreditsInitial;
      const crews = m?.initialCrews ?? sim.crewsTotal;
      simReset(sim, credits, crews, m?.id ?? null, sim.scenarioId);
      return {
        ...state,
        sim,
        running: false,
        selectedNodeId: null,
        selectedConnectionId: null,
        initialReachability: 100,
        lastMissionResult: null,
        notifications: [notify('info', 'Scenario reset to baseline.'), ...state.notifications].slice(0, 6),
      };
    }
    case 'FAIL_NODE': {
      const sim = structuredClone(state.sim);
      const evs = failNode(sim.graph, action.nodeId, sim.nodes, sim.time);
      sim.events.push(...evs);
      const pEvs = propagate(sim.graph, sim.nodes, sim.connections, sim.time);
      sim.events.push(...pEvs);
      sim.dirty = true;
      return {
        ...state,
        sim,
        selectedNodeId: action.nodeId,
        notifications: [notify('warning', evs[0]?.message ?? 'Node failed.'), ...state.notifications].slice(0, 6),
      };
    }
    case 'SEVER_CONNECTION': {
      const sim = structuredClone(state.sim);
      const evs = severConnection(sim.graph, action.connectionId, sim.connections, sim.time);
      sim.events.push(...evs);
      const pEvs = propagate(sim.graph, sim.nodes, sim.connections, sim.time);
      sim.events.push(...pEvs);
      sim.dirty = true;
      return {
        ...state,
        sim,
        selectedConnectionId: action.connectionId,
        notifications: [notify('warning', evs[0]?.message ?? 'Connection severed.'), ...state.notifications].slice(0, 6),
      };
    }
    case 'OVERLOAD': {
      const sim = structuredClone(state.sim);
      const evs = overload(sim.graph, action.targetId, action.factor, sim.nodes, sim.connections, sim.time);
      sim.events.push(...evs);
      const pEvs = propagate(sim.graph, sim.nodes, sim.connections, sim.time);
      sim.events.push(...pEvs);
      sim.dirty = true;
      return {
        ...state,
        sim,
        notifications: [notify('warning', evs[0]?.message ?? 'Overload applied.'), ...state.notifications].slice(0, 6),
      };
    }
    case 'REPAIR': {
      const sim = structuredClone(state.sim);
      const r = simRepair(sim, action.nodeId, action.crew ?? 1, action.strategy);
      if (!r.ok) {
        return {
          ...state,
          notifications: [notify('error', r.reason ?? 'Repair failed.'), ...state.notifications].slice(0, 6),
        };
      }
      sim.events.push({
        id: `rse-${Date.now().toString(36)}`,
        time: sim.time,
        kind: 'repair_start',
        nodeId: action.nodeId,
        message: `Repair queued for ${sim.graph.nodes.find((n) => n.id === action.nodeId)?.name ?? action.nodeId}.`,
        severity: 1,
      });
      return {
        ...state,
        sim,
        notifications: [notify('success', `Repair queued for ${sim.graph.nodes.find((n) => n.id === action.nodeId)?.name ?? action.nodeId}.`), ...state.notifications].slice(0, 6),
      };
    }
    case 'CANCEL_REPAIR': {
      const sim = structuredClone(state.sim);
      const r = simCancel(sim, action.jobId);
      if (!r.ok) {
        return {
          ...state,
          notifications: [notify('error', r.reason ?? 'Cancel failed.'), ...state.notifications].slice(0, 6),
        };
      }
      return {
        ...state,
        sim,
        notifications: [notify('info', 'Repair cancelled, credits refunded.'), ...state.notifications].slice(0, 6),
      };
    }
    case 'PERSIST':
    case 'SET_PERSISTED':
      return { ...state, persisted: action.data };
    case 'ADD_NOTE': {
      const data = addNotebook(state.persisted, action.entry);
      void persistAsync(data);
      return { ...state, persisted: data };
    }
    case 'UPDATE_NOTE': {
      const data = updateNotebook(state.persisted, action.id, action.patch);
      void persistAsync(data);
      return { ...state, persisted: data };
    }
    case 'DELETE_NOTE': {
      const data = deleteNotebook(state.persisted, action.id);
      void persistAsync(data);
      return { ...state, persisted: data };
    }
    case 'ADD_SCENARIO': {
      const data = addScenario(state.persisted, action.scenario);
      void persistAsync(data);
      return { ...state, persisted: data };
    }
    case 'DELETE_SCENARIO': {
      const data = deleteScenario(state.persisted, action.id);
      void persistAsync(data);
      return { ...state, persisted: data };
    }
    case 'SAVE_SUMMARY': {
      const data = addSummary(state.persisted, action.summary);
      void persistAsync(data);
      return { ...state, persisted: data };
    }
    case 'IMPORT': {
      void persistAsync(action.data);
      return { ...state, persisted: action.data,
        notifications: [notify('success', 'Data imported successfully.'), ...state.notifications].slice(0, 6) };
    }
    case 'CLEAR_STORAGE': {
      void persistence.clearAll();
      return { ...state, persisted: { ...defaultData },
        notifications: [notify('info', 'All local data cleared.'), ...state.notifications].slice(0, 6) };
    }
    case 'NOTIFY':
      return { ...state, notifications: [action.n, ...state.notifications].slice(0, 6) };
    case 'DISMISS':
      return { ...state, notifications: state.notifications.filter((n) => n.id !== action.id) };
    case 'SET_STORAGE_ERROR':
      return { ...state, storageError: action.msg };
    default:
      return state;
  }
}

let _persistTimer: ReturnType<typeof setTimeout> | null = null;
function persistAsync(data: PersistedData): Promise<void> {
  if (_persistTimer) clearTimeout(_persistTimer);
  return new Promise((resolve) => {
    _persistTimer = setTimeout(async () => {
      await persistence.save(data);
      resolve();
    }, 250);
  });
}

interface StoreContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  metrics: ReturnType<typeof computeMetrics>;
  strategies: ReturnType<typeof strategiesFor>;
  recoveryScore: number;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load persisted data on mount.
  useEffect(() => {
    persistence.load().then((data) => {
      dispatch({ type: 'SET_PERSISTED', data });
    }).catch(() => {
      dispatch({ type: 'SET_STORAGE_ERROR', msg: 'Browser storage is unavailable; changes will not persist.' });
    });
  }, []);

  // Simulation tick loop.
  useEffect(() => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    if (state.running) {
      tickRef.current = setInterval(() => {
        dispatch({ type: 'STEP', minutes: state.speed });
      }, 600);
    }
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [state.running, state.speed]);

  const metrics = useMemo(() => computeMetrics(state.sim), [state.sim]);
  const strategies = useMemo(() => strategiesFor(state.sim), [state.sim]);
  const score = useMemo(() => recoveryScore(state.sim, state.initialReachability), [state.sim, state.initialReachability]);

  const value = useMemo(() => ({ state, dispatch, metrics, strategies, recoveryScore: score }), [state, metrics, strategies, score]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}

export { missions, persistence, exportData, importData };
export type { SimEvent };
