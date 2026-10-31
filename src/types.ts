// Signal Zero — Domain Types
// All simulation types. Kept free of UI concerns so the engine stays testable.

export type NodeCategory =
  | 'power'       // substations, distribution nodes
  | 'traffic'     // signals, intersections
  | 'medical'     // hospitals, emergency centers
  | 'comms'       // relays, towers
  | 'water'       // treatment, distribution
  | 'shelter'     // shelters, public services
  | 'road';       // road intersections / connectors

export type NodeState =
  | 'operational'
  | 'degraded'
  | 'failed'
  | 'under_repair'
  | 'restored'
  | 'isolated';

export type DependencyType =
  | 'power_supply'   // node requires power from source
  | 'control_relay'  // comms control dependency
  | 'utility'        // water / generic utility feed
  | 'road_link'      // physical road connection
  | 'data_route';    // communication data route

export type ConnectionState = 'active' | 'degraded' | 'severed' | 'disabled';

// A node's requirement: a list of alternative sources; ANY one satisfies.
export interface Requirement {
  /** kind of dependency this requirement represents */
  type: DependencyType;
  /** candidate sources; at least one must be operational & connected to satisfy */
  sources: string[];
  /** if true, partial/degraded sources count toward satisfaction (at reduced capacity) */
  tolerateDegraded?: boolean;
}

export interface InfrastructureNode {
  id: string;
  name: string;
  category: NodeCategory;
  district: string;
  /** SVG coordinates on the city schematic (0..1000 x, 0..640 y) */
  x: number;
  y: number;
  /** short code shown on the map, e.g. PWR-01 */
  code: string;
  /** criticality 1..5 (5 = most critical) */
  criticality: number;
  /** repair cost in credits */
  repairCost: number;
  /** repair duration in simulation minutes */
  repairDuration: number;
  /** service capacity 0..100 (used for degraded modelling) */
  capacity: number;
  /** requirements: ALL must be satisfied for the node to be operational */
  requires: Requirement[];
  /** whether this node is an essential service endpoint (hospital, shelter, etc.) */
  essential?: boolean;
  /** human-readable role */
  role: string;
}

export interface InfrastructureConnection {
  id: string;
  from: string;
  to: string;
  type: DependencyType;
  /** load / capacity weight 0..100 */
  load: number;
  /** distance weight used by Dijkstra "distance" metric, in schematic units */
  distance: number;
  /** travel-time weight (minutes) used by "travel time" metric */
  travelTime: number;
  /** repair cost if this connection itself is severed */
  repairCost: number;
  /** whether this connection is directed (from->to) or undirected */
  directed: boolean;
}

export interface CityGraph {
  nodes: InfrastructureNode[];
  connections: InfrastructureConnection[];
}

// ---- Simulation state ----

export interface NodeRuntimeState {
  nodeId: string;
  state: NodeState;
  /** current effective capacity 0..100 */
  effectiveCapacity: number;
  /** which requirements are currently satisfied (indices into node.requires) */
  satisfiedReqs: boolean[];
  /** reason for current state, human-readable */
  reason: string;
}

export interface ConnectionRuntimeState {
  connectionId: string;
  state: ConnectionState;
  /** effective load 0..100 after degradation */
  effectiveLoad: number;
}

export interface SimEvent {
  id: string;
  /** simulation minute timestamp */
  time: number;
  kind: 'incident' | 'degradation' | 'failure' | 'isolation' | 'repair_start' | 'repair_complete' | 'restored' | 'manual' | 'system';
  nodeId?: string;
  connectionId?: string;
  message: string;
  /** severity 1..3 */
  severity: 1 | 2 | 3;
}

export interface RepairJob {
  id: string;
  nodeId: string;
  startedAt: number;       // sim minutes
  completesAt: number;      // sim minutes
  cost: number;
  crew: number;
  strategy?: string;
}

export interface SimMetrics {
  total: number;
  operational: number;
  degraded: number;
  failed: number;
  underRepair: number;
  restored: number;
  isolated: number;
  essentialTotal: number;
  essentialAvailable: number;
  reachableCritical: number;
  propagationEvents: number;
  repairCreditsSpent: number;
  repairCreditsRemaining: number;
  crewsAvailable: number;
  crewsBusy: number;
  networkReachability: number; // 0..100
}

export type SimPhase = 'observe' | 'disrupt' | 'recover' | 'complete';

export interface SimulationState {
  graph: CityGraph;
  nodes: Record<string, NodeRuntimeState>;
  connections: Record<string, ConnectionRuntimeState>;
  events: SimEvent[];
  time: number;              // sim minutes elapsed
  phase: SimPhase;
  repairCredits: number;
  repairCreditsInitial: number;
  crewsTotal: number;
  repairQueue: RepairJob[];
  scenarioId: string | null;
  missionId: string | null;
  dirty: boolean;            // unsaved changes present
  metricsHistory: { time: number; metrics: SimMetrics }[];
}

// ---- Scenarios & missions ----

export type Difficulty = 'introductory' | 'standard' | 'advanced' | 'compound';

export interface FailureSeed {
  kind: 'node_failure' | 'connection_sever' | 'node_overload';
  targetId: string;
  /** overload multiplier applied to load (for node_overload) */
  factor?: number;
}

export interface Mission {
  id: string;
  code: string;          // e.g. 'M01'
  title: string;
  narrative: string;
  difficulty: Difficulty;
  districtFocus: string;
  seeds: FailureSeed[];
  initialCredits: number;
  initialCrews: number;
  primaryObjective: string;
  secondaryObjectives: string[];
  /** completion condition description (evaluated by engine.checkMissionComplete) */
  completion: {
    /** node ids that must be operational */
    operationalNodes?: string[];
    /** essential services that must be available (count) */
    minEssentialAvailable: number;
    /** max remaining failed nodes */
    maxFailed: number;
    /** budget must remain non-negative */
    budgetNonNegative: boolean;
    /** time limit in sim minutes, if any */
    timeLimit?: number;
  };
}

export interface ScenarioSummary {
  missionId: string;
  attemptId: string;
  startedAt: number; // epoch ms
  completedAt: number;
  success: boolean;
  metrics: SimMetrics;
  repairOrder: string[]; // node ids in repair order
  creditsSpent: number;
  timeElapsed: number;
  strategyUsed?: string;
}

// ---- Notebook ----

export interface NotebookEntry {
  id: string;
  createdAt: number;
  updatedAt: number;
  title: string;
  body: string;
  tags: string[];
  scenarioId?: string;
}

// ---- Custom scenarios ----

export interface CustomScenario {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  seeds: FailureSeed[];
  initialCredits: number;
  initialCrews: number;
}

// ---- Persistence ----

export interface PersistedData {
  schemaVersion: number;
  notebook: NotebookEntry[];
  customScenarios: CustomScenario[];
  scenarioSummaries: ScenarioSummary[];
  settings: {
    tutorialSeen: boolean;
    reducedMotion: boolean;
    lastMissionId?: string;
  };
}
