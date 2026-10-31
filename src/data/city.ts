import type { CityGraph, Mission } from '@/types';

// Meridian — a fictional city graph for the Signal Zero simulation.
// Coordinates are on a 0..1000 x 0..640 schematic. Districts are arranged so the
// graph is visually coherent and the dependency web is non-trivial.

// Node IDs follow a category prefix convention.
//   PWR-* power, TRF-* traffic, MED-* medical, COM-* comms,
//   WTR-* water, SHL-* shelter, RDX-* road interchange

export const meridian: CityGraph = {
  nodes: [
    // --- Power (substations + distribution) ---
    {
      id: 'PWR-01', name: 'Meridian Central Substation', code: 'PWR-01',
      category: 'power', district: 'Central District', x: 500, y: 320,
      criticality: 5, repairCost: 120, repairDuration: 60, capacity: 100,
      role: 'Primary 132kV substation feeding the central grid.',
      requires: [],
      essential: false,
    },
    {
      id: 'PWR-02', name: 'Northline Distribution Node', code: 'PWR-02',
      category: 'power', district: 'Transit Corridor', x: 360, y: 180,
      criticality: 4, repairCost: 80, repairDuration: 45, capacity: 80,
      role: 'Distribution node for the northern feeder.',
      requires: [{ type: 'power_supply', sources: ['PWR-01'] }],
    },
    {
      id: 'PWR-03', name: 'Eastside Distribution Node', code: 'PWR-03',
      category: 'power', district: 'Residential East', x: 720, y: 360,
      criticality: 4, repairCost: 80, repairDuration: 45, capacity: 80,
      role: 'Distribution node for the eastern feeder.',
      requires: [{ type: 'power_supply', sources: ['PWR-01'] }],
    },
    {
      id: 'PWR-04', name: 'Industrial Feeder', code: 'PWR-04',
      category: 'power', district: 'Industrial Zone', x: 220, y: 420,
      criticality: 3, repairCost: 70, repairDuration: 40, capacity: 70,
      role: 'Dedicated industrial supply feeder.',
      requires: [{ type: 'power_supply', sources: ['PWR-01', 'PWR-02'], tolerateDegraded: false }],
    },
    {
      id: 'PWR-05', name: 'Medical Reserve UPS', code: 'PWR-05',
      category: 'power', district: 'Medical Quarter', x: 620, y: 180,
      criticality: 5, repairCost: 100, repairDuration: 50, capacity: 60,
      role: 'Reserve UPS feeding the medical quarter. Redundant to PWR-03.',
      requires: [{ type: 'power_supply', sources: ['PWR-01'] }],
      essential: false,
    },

    // --- Traffic ---
    {
      id: 'TRF-01', name: 'Central Plaza Signals', code: 'TRF-01',
      category: 'traffic', district: 'Central District', x: 540, y: 380,
      criticality: 3, repairCost: 30, repairDuration: 20, capacity: 100,
      role: 'Signal cluster at the central plaza.',
      requires: [{ type: 'power_supply', sources: ['PWR-01'] }, { type: 'control_relay', sources: ['COM-01'] }],
    },
    {
      id: 'TRF-02', name: 'Northline Junction', code: 'TRF-02',
      category: 'traffic', district: 'Transit Corridor', x: 400, y: 250,
      criticality: 3, repairCost: 30, repairDuration: 20, capacity: 100,
      role: 'Signals at the northline junction.',
      requires: [{ type: 'power_supply', sources: ['PWR-02'] }, { type: 'control_relay', sources: ['COM-01'] }],
    },
    {
      id: 'TRF-03', name: 'East Junction', code: 'TRF-03',
      category: 'traffic', district: 'Residential East', x: 760, y: 430,
      criticality: 3, repairCost: 30, repairDuration: 20, capacity: 100,
      role: 'Signals at the eastern residential junction.',
      requires: [{ type: 'power_supply', sources: ['PWR-03'] }, { type: 'control_relay', sources: ['COM-02'] }],
    },
    {
      id: 'TRF-04', name: 'Industrial Gate', code: 'TRF-04',
      category: 'traffic', district: 'Industrial Zone', x: 280, y: 470,
      criticality: 2, repairCost: 25, repairDuration: 15, capacity: 100,
      role: 'Signals at the industrial gate.',
      requires: [{ type: 'power_supply', sources: ['PWR-04'] }, { type: 'control_relay', sources: ['COM-01'] }],
    },
    {
      id: 'TRF-05', name: 'Medical Approach', code: 'TRF-05',
      category: 'traffic', district: 'Medical Quarter', x: 680, y: 240,
      criticality: 4, repairCost: 35, repairDuration: 25, capacity: 100,
      role: 'Signals on the hospital approach route.',
      requires: [{ type: 'power_supply', sources: ['PWR-05', 'PWR-03'] }, { type: 'control_relay', sources: ['COM-02'] }],
    },

    // --- Medical (essential) ---
    {
      id: 'MED-01', name: 'Central Medical Hub', code: 'MED-01',
      category: 'medical', district: 'Medical Quarter', x: 660, y: 160,
      criticality: 5, repairCost: 200, repairDuration: 90, capacity: 100,
      role: 'Primary tertiary-care hospital and emergency department.',
      requires: [
        { type: 'power_supply', sources: ['PWR-05', 'PWR-03'] },
        { type: 'utility', sources: ['WTR-02'] },
        { type: 'road_link', sources: ['RDX-04', 'RDX-02'] },
      ],
      essential: true,
    },
    {
      id: 'MED-02', name: 'Eastside Clinic', code: 'MED-02',
      category: 'medical', district: 'Residential East', x: 800, y: 380,
      criticality: 4, repairCost: 140, repairDuration: 60, capacity: 80,
      role: 'Secondary clinic and triage center.',
      requires: [
        { type: 'power_supply', sources: ['PWR-03'] },
        { type: 'utility', sources: ['WTR-03'] },
        { type: 'road_link', sources: ['RDX-05'] },
      ],
      essential: true,
    },
    {
      id: 'MED-03', name: 'Emergency Dispatch Center', code: 'MED-03',
      category: 'medical', district: 'Central District', x: 560, y: 300,
      criticality: 5, repairCost: 160, repairDuration: 70, capacity: 100,
      role: 'Citywide emergency dispatch and ambulance coordination.',
      requires: [
        { type: 'power_supply', sources: ['PWR-01'] },
        { type: 'data_route', sources: ['COM-01', 'COM-02'] },
      ],
      essential: true,
    },

    // --- Communications ---
    {
      id: 'COM-01', name: 'Central Relay', code: 'COM-01',
      category: 'comms', district: 'Central District', x: 480, y: 250,
      criticality: 5, repairCost: 110, repairDuration: 55, capacity: 100,
      role: 'Primary communication relay. Feeds traffic control & dispatch.',
      requires: [{ type: 'power_supply', sources: ['PWR-01'] }],
    },
    {
      id: 'COM-02', name: 'Northline Relay', code: 'COM-02',
      category: 'comms', district: 'Transit Corridor', x: 540, y: 150,
      criticality: 4, repairCost: 90, repairDuration: 45, capacity: 100,
      role: 'Secondary relay covering the medical quarter.',
      requires: [{ type: 'power_supply', sources: ['PWR-02', 'PWR-05'] }],
    },
    {
      id: 'COM-03', name: 'East Relay Tower', code: 'COM-03',
      category: 'comms', district: 'Residential East', x: 820, y: 280,
      criticality: 3, repairCost: 70, repairDuration: 40, capacity: 90,
      role: 'Eastern residential relay tower.',
      requires: [{ type: 'power_supply', sources: ['PWR-03'] }],
    },
    {
      id: 'COM-04', name: 'Industrial Data Relay', code: 'COM-04',
      category: 'comms', district: 'Industrial Zone', x: 180, y: 350,
      criticality: 2, repairCost: 60, repairDuration: 35, capacity: 80,
      role: 'Industrial telemetry relay.',
      requires: [{ type: 'power_supply', sources: ['PWR-04'] }],
    },

    // --- Water ---
    {
      id: 'WTR-01', name: 'Meridian Treatment Plant', code: 'WTR-01',
      category: 'water', district: 'Waterworks District', x: 140, y: 540,
      criticality: 5, repairCost: 150, repairDuration: 75, capacity: 100,
      role: 'Primary water treatment plant.',
      requires: [{ type: 'power_supply', sources: ['PWR-04', 'PWR-01'] }],
    },
    {
      id: 'WTR-02', name: 'Central Pump Station', code: 'WTR-02',
      category: 'water', district: 'Waterworks District', x: 300, y: 540,
      criticality: 4, repairCost: 90, repairDuration: 45, capacity: 90,
      role: 'Pump station feeding the central + medical districts.',
      requires: [{ type: 'power_supply', sources: ['PWR-01', 'PWR-04'] }, { type: 'utility', sources: ['WTR-01'] }],
    },
    {
      id: 'WTR-03', name: 'East Distribution Hub', code: 'WTR-03',
      category: 'water', district: 'Residential East', x: 740, y: 520,
      criticality: 4, repairCost: 80, repairDuration: 40, capacity: 85,
      role: 'Distribution hub for the eastern residential zone.',
      requires: [{ type: 'power_supply', sources: ['PWR-03'] }, { type: 'utility', sources: ['WTR-02'] }],
    },
    {
      id: 'WTR-04', name: 'North Reservoir Feed', code: 'WTR-04',
      category: 'water', district: 'Transit Corridor', x: 420, y: 110,
      criticality: 3, repairCost: 60, repairDuration: 35, capacity: 80,
      role: 'Reservoir feed serving the transit corridor.',
      requires: [{ type: 'power_supply', sources: ['PWR-02'] }, { type: 'utility', sources: ['WTR-02'] }],
    },

    // --- Shelters (essential) ---
    {
      id: 'SHL-01', name: 'Central Shelter', code: 'SHL-01',
      category: 'shelter', district: 'Central District', x: 600, y: 430,
      criticality: 3, repairCost: 70, repairDuration: 35, capacity: 100,
      role: 'Emergency shelter and public service center.',
      requires: [
        { type: 'power_supply', sources: ['PWR-01'] },
        { type: 'utility', sources: ['WTR-02'] },
        { type: 'road_link', sources: ['RDX-01'] },
      ],
      essential: true,
    },
    {
      id: 'SHL-02', name: 'Eastside Shelter', code: 'SHL-02',
      category: 'shelter', district: 'Residential East', x: 820, y: 480,
      criticality: 3, repairCost: 70, repairDuration: 35, capacity: 100,
      role: 'Residential emergency shelter.',
      requires: [
        { type: 'power_supply', sources: ['PWR-03'] },
        { type: 'utility', sources: ['WTR-03'] },
        { type: 'road_link', sources: ['RDX-05'] },
      ],
      essential: true,
    },
    {
      id: 'SHL-03', name: 'Industrial Welfare Post', code: 'SHL-03',
      category: 'shelter', district: 'Industrial Zone', x: 240, y: 540,
      criticality: 2, repairCost: 55, repairDuration: 30, capacity: 80,
      role: 'Industrial worker welfare and first-aid post.',
      requires: [
        { type: 'power_supply', sources: ['PWR-04'] },
        { type: 'utility', sources: ['WTR-01'] },
        { type: 'road_link', sources: ['RDX-03'] },
      ],
    },

    // --- Roads (interchanges / connectors) ---
    {
      id: 'RDX-01', name: 'Central Interchange', code: 'RDX-01',
      category: 'road', district: 'Central District', x: 560, y: 400,
      criticality: 4, repairCost: 50, repairDuration: 40, capacity: 100,
      role: 'Central road interchange.',
      requires: [],
    },
    {
      id: 'RDX-02', name: 'Northline Interchange', code: 'RDX-02',
      category: 'road', district: 'Transit Corridor', x: 460, y: 200,
      criticality: 4, repairCost: 50, repairDuration: 40, capacity: 100,
      role: 'Northline road interchange connecting medical quarter.',
      requires: [],
    },
    {
      id: 'RDX-03', name: 'Industrial Gate Junction', code: 'RDX-03',
      category: 'road', district: 'Industrial Zone', x: 320, y: 500,
      criticality: 3, repairCost: 40, repairDuration: 30, capacity: 100,
      role: 'Industrial gate road junction.',
      requires: [],
    },
    {
      id: 'RDX-04', name: 'Medical Approach Road', code: 'RDX-04',
      category: 'road', district: 'Medical Quarter', x: 620, y: 220,
      criticality: 4, repairCost: 45, repairDuration: 35, capacity: 100,
      role: 'Approach road to the central medical hub.',
      requires: [],
    },
    {
      id: 'RDX-05', name: 'East Connector', code: 'RDX-05',
      category: 'road', district: 'Residential East', x: 780, y: 460,
      criticality: 3, repairCost: 40, repairDuration: 30, capacity: 100,
      role: 'Eastern residential connector road.',
      requires: [],
    },
    {
      id: 'RDX-06', name: 'Transit Corridor Link', code: 'RDX-06',
      category: 'road', district: 'Transit Corridor', x: 400, y: 120,
      criticality: 3, repairCost: 35, repairDuration: 25, capacity: 100,
      role: 'Transit corridor arterial link.',
      requires: [],
    },

    // --- a couple of extra load points for cascade richness ---
    {
      id: 'TRF-06', name: 'Waterworks Crossing', code: 'TRF-06',
      category: 'traffic', district: 'Waterworks District', x: 220, y: 560,
      criticality: 2, repairCost: 25, repairDuration: 15, capacity: 100,
      role: 'Signals at the waterworks crossing.',
      requires: [{ type: 'power_supply', sources: ['PWR-04'] }, { type: 'control_relay', sources: ['COM-04'] }],
    },
    {
      id: 'SHL-04', name: 'Transit Shelter', code: 'SHL-04',
      category: 'shelter', district: 'Transit Corridor', x: 440, y: 150,
      criticality: 2, repairCost: 55, repairDuration: 30, capacity: 80,
      role: 'Shelter serving the transit corridor.',
      requires: [
        { type: 'power_supply', sources: ['PWR-02'] },
        { type: 'utility', sources: ['WTR-04'] },
        { type: 'road_link', sources: ['RDX-06'] },
      ],
      essential: true,
    },
  ],

  connections: [
    // Power distribution (directed power_supply edges)
    { id: 'E-001', from: 'PWR-01', to: 'PWR-02', type: 'power_supply', load: 70, distance: 18, travelTime: 2, repairCost: 30, directed: true },
    { id: 'E-002', from: 'PWR-01', to: 'PWR-03', type: 'power_supply', load: 70, distance: 22, travelTime: 2, repairCost: 30, directed: true },
    { id: 'E-003', from: 'PWR-02', to: 'PWR-04', type: 'power_supply', load: 50, distance: 16, travelTime: 2, repairCost: 25, directed: true },
    { id: 'E-004', from: 'PWR-01', to: 'PWR-04', type: 'power_supply', load: 50, distance: 24, travelTime: 3, repairCost: 30, directed: true },
    { id: 'E-005', from: 'PWR-01', to: 'PWR-05', type: 'power_supply', load: 40, distance: 18, travelTime: 2, repairCost: 25, directed: true },
    { id: 'E-006', from: 'PWR-03', to: 'PWR-05', type: 'power_supply', load: 40, distance: 14, travelTime: 2, repairCost: 20, directed: true },

    // Comms control edges (control_relay / data_route)
    { id: 'E-007', from: 'COM-01', to: 'TRF-01', type: 'control_relay', load: 60, distance: 8, travelTime: 1, repairCost: 20, directed: true },
    { id: 'E-008', from: 'COM-01', to: 'TRF-02', type: 'control_relay', load: 60, distance: 12, travelTime: 1, repairCost: 20, directed: true },
    { id: 'E-009', from: 'COM-01', to: 'TRF-04', type: 'control_relay', load: 40, distance: 18, travelTime: 2, repairCost: 20, directed: true },
    { id: 'E-010', from: 'COM-02', to: 'TRF-03', type: 'control_relay', load: 50, distance: 16, travelTime: 1, repairCost: 20, directed: true },
    { id: 'E-011', from: 'COM-02', to: 'TRF-05', type: 'control_relay', load: 50, distance: 10, travelTime: 1, repairCost: 20, directed: true },
    { id: 'E-012', from: 'COM-04', to: 'TRF-06', type: 'control_relay', load: 40, distance: 14, travelTime: 1, repairCost: 15, directed: true },

    // Comms data routes to dispatch
    { id: 'E-013', from: 'COM-01', to: 'MED-03', type: 'data_route', load: 80, distance: 10, travelTime: 1, repairCost: 25, directed: true },
    { id: 'E-014', from: 'COM-02', to: 'MED-03', type: 'data_route', load: 80, distance: 16, travelTime: 1, repairCost: 25, directed: true },

    // Comms upstream: relay chain
    { id: 'E-015', from: 'COM-01', to: 'COM-02', type: 'data_route', load: 60, distance: 12, travelTime: 1, repairCost: 20, directed: false },
    { id: 'E-016', from: 'COM-03', to: 'COM-02', type: 'data_route', load: 50, distance: 20, travelTime: 2, repairCost: 20, directed: false },

    // Water utility edges (directed)
    { id: 'E-017', from: 'WTR-01', to: 'WTR-02', type: 'utility', load: 80, distance: 16, travelTime: 3, repairCost: 25, directed: true },
    { id: 'E-018', from: 'WTR-02', to: 'WTR-03', type: 'utility', load: 70, distance: 28, travelTime: 4, repairCost: 30, directed: true },
    { id: 'E-019', from: 'WTR-02', to: 'WTR-04', type: 'utility', load: 50, distance: 24, travelTime: 3, repairCost: 25, directed: true },

    // Road links (undirected)
    { id: 'E-020', from: 'RDX-01', to: 'RDX-02', type: 'road_link', load: 80, distance: 14, travelTime: 4, repairCost: 20, directed: false },
    { id: 'E-021', from: 'RDX-01', to: 'RDX-03', type: 'road_link', load: 70, distance: 18, travelTime: 5, repairCost: 20, directed: false },
    { id: 'E-022', from: 'RDX-02', to: 'RDX-04', type: 'road_link', load: 80, distance: 10, travelTime: 3, repairCost: 18, directed: false },
    { id: 'E-023', from: 'RDX-01', to: 'RDX-05', type: 'road_link', load: 70, distance: 22, travelTime: 6, repairCost: 22, directed: false },
    { id: 'E-024', from: 'RDX-03', to: 'RDX-04', type: 'road_link', load: 60, distance: 26, travelTime: 7, repairCost: 22, directed: false },
    { id: 'E-025', from: 'RDX-02', to: 'RDX-06', type: 'road_link', load: 60, distance: 10, travelTime: 3, repairCost: 16, directed: false },
    { id: 'E-026', from: 'RDX-05', to: 'RDX-06', type: 'road_link', load: 50, distance: 30, travelTime: 8, repairCost: 24, directed: false },

    // Road links binding road interchanges to the facilities that depend on them
    { id: 'E-027', from: 'RDX-01', to: 'SHL-01', type: 'road_link', load: 60, distance: 6, travelTime: 2, repairCost: 12, directed: false },
    { id: 'E-028', from: 'RDX-04', to: 'MED-01', type: 'road_link', load: 80, distance: 6, travelTime: 2, repairCost: 14, directed: false },
    { id: 'E-029', from: 'RDX-02', to: 'MED-01', type: 'road_link', load: 70, distance: 12, travelTime: 3, repairCost: 14, directed: false },
    { id: 'E-030', from: 'RDX-05', to: 'MED-02', type: 'road_link', load: 70, distance: 6, travelTime: 2, repairCost: 14, directed: false },
    { id: 'E-031', from: 'RDX-05', to: 'SHL-02', type: 'road_link', load: 60, distance: 8, travelTime: 2, repairCost: 12, directed: false },
    { id: 'E-032', from: 'RDX-03', to: 'SHL-03', type: 'road_link', load: 50, distance: 8, travelTime: 2, repairCost: 12, directed: false },
    { id: 'E-033', from: 'RDX-06', to: 'SHL-04', type: 'road_link', load: 50, distance: 6, travelTime: 2, repairCost: 12, directed: false },

    // Power feeds into facilities (so power failures can hit them directly too)
    { id: 'E-034', from: 'PWR-01', to: 'MED-03', type: 'power_supply', load: 60, distance: 8, travelTime: 1, repairCost: 18, directed: true },
    { id: 'E-035', from: 'PWR-01', to: 'SHL-01', type: 'power_supply', load: 40, distance: 10, travelTime: 1, repairCost: 16, directed: true },
    { id: 'E-036', from: 'PWR-03', to: 'MED-02', type: 'power_supply', load: 60, distance: 8, travelTime: 1, repairCost: 18, directed: true },
    { id: 'E-037', from: 'PWR-04', to: 'SHL-03', type: 'power_supply', load: 30, distance: 8, travelTime: 1, repairCost: 14, directed: true },
    { id: 'E-038', from: 'PWR-05', to: 'MED-01', type: 'power_supply', load: 70, distance: 6, travelTime: 1, repairCost: 18, directed: true },
    { id: 'E-039', from: 'PWR-03', to: 'MED-01', type: 'power_supply', load: 70, distance: 10, travelTime: 1, repairCost: 18, directed: true },
    { id: 'E-040', from: 'PWR-02', to: 'SHL-04', type: 'power_supply', load: 30, distance: 8, travelTime: 1, repairCost: 14, directed: true },

    // Water utility into facilities
    { id: 'E-041', from: 'WTR-02', to: 'SHL-01', type: 'utility', load: 50, distance: 14, travelTime: 3, repairCost: 18, directed: true },
    { id: 'E-042', from: 'WTR-02', to: 'MED-01', type: 'utility', load: 80, distance: 20, travelTime: 4, repairCost: 22, directed: true },
    { id: 'E-043', from: 'WTR-03', to: 'MED-02', type: 'utility', load: 70, distance: 10, travelTime: 2, repairCost: 18, directed: true },
    { id: 'E-044', from: 'WTR-03', to: 'SHL-02', type: 'utility', load: 50, distance: 8, travelTime: 2, repairCost: 14, directed: true },
    { id: 'E-045', from: 'WTR-04', to: 'SHL-04', type: 'utility', load: 40, distance: 12, travelTime: 3, repairCost: 16, directed: true },
    { id: 'E-046', from: 'WTR-01', to: 'SHL-03', type: 'utility', load: 40, distance: 10, travelTime: 2, repairCost: 14, directed: true },
  ],
};

export const districts = [
  'Central District',
  'Medical Quarter',
  'Industrial Zone',
  'Residential East',
  'Transit Corridor',
  'Waterworks District',
] as const;

// ---- Missions ----

export const missions: Mission[] = [
  {
    id: 'M01',
    code: 'M01',
    title: 'The Silent Junction',
    narrative:
      'At 07:42 the Central Relay went dark. Traffic control across the central and industrial corridors stopped responding, and the Emergency Dispatch Center lost its primary data route. ' +
      'Ambulance dispatch is degraded. Identify every affected signal and restore essential communication with the least repair expenditure.',
    difficulty: 'introductory',
    districtFocus: 'Central District',
    seeds: [{ kind: 'node_failure', targetId: 'COM-01' }],
    initialCredits: 320,
    initialCrews: 2,
    primaryObjective: 'Restore the Emergency Dispatch Center (MED-03) to operational status.',
    secondaryObjectives: [
      'Restore at least 3 of the 5 traffic signals affected by the relay loss.',
      'Spend no more than 200 repair credits.',
    ],
    completion: {
      operationalNodes: ['MED-03'],
      minEssentialAvailable: 3,
      maxFailed: 4,
      budgetNonNegative: true,
    },
  },
  {
    id: 'M02',
    code: 'M02',
    title: 'Blackout Meridian',
    narrative:
      'The Meridian Central Substation tripped offline during a surge. Power distribution across the city is collapsing in sequence. ' +
      'Hospitals are running on reserves, shelters are dark, and water pumps are losing pressure. Restore essential facilities while avoiding unnecessary repairs to unaffected infrastructure.',
    difficulty: 'standard',
    districtFocus: 'Central District',
    seeds: [{ kind: 'node_failure', targetId: 'PWR-01' }],
    initialCredits: 600,
    initialCrews: 3,
    primaryObjective: 'Restore power distribution so that all essential medical and shelter services are operational.',
    secondaryObjectives: [
      'Do not exceed 480 repair credits.',
      'Complete recovery within 240 simulation minutes.',
    ],
    completion: {
      operationalNodes: ['MED-01', 'MED-02', 'MED-03', 'SHL-01', 'SHL-02'],
      minEssentialAvailable: 5,
      maxFailed: 3,
      budgetNonNegative: true,
      timeLimit: 240,
    },
  },
  {
    id: 'M03',
    code: 'M03',
    title: 'The Broken Lifeline',
    narrative:
      'A structural failure has severed the Medical Approach Road (RDX-04) and the Northline Interchange (RDX-02) is degraded. ' +
      'The Central Medical Hub can no longer be reached by emergency vehicles. Identify alternative routes and restore emergency accessibility.',
    difficulty: 'standard',
    districtFocus: 'Medical Quarter',
    seeds: [
      { kind: 'connection_sever', targetId: 'E-028' },
      { kind: 'connection_sever', targetId: 'E-029' },
    ],
    initialCredits: 420,
    initialCrews: 2,
    primaryObjective: 'Restore at least one usable emergency access route to MED-01 and return the hospital to operational.',
    secondaryObjectives: [
      'Use Dijkstra to identify the least-cost alternative route before repairing.',
      'Keep remaining failed nodes at or below 2.',
    ],
    completion: {
      operationalNodes: ['MED-01'],
      minEssentialAvailable: 4,
      maxFailed: 2,
      budgetNonNegative: true,
    },
  },
  {
    id: 'M04',
    code: 'M04',
    title: 'Water Under Pressure',
    narrative:
      'The Meridian Treatment Plant has failed and the Central Pump Station is degraded. Water distribution to the medical and residential districts is collapsing. ' +
      'Hospitals and shelters are losing water pressure. Restore water service while prioritizing critical facilities.',
    difficulty: 'advanced',
    districtFocus: 'Waterworks District',
    seeds: [
      { kind: 'node_failure', targetId: 'WTR-01' },
      { kind: 'node_overload', targetId: 'WTR-02', factor: 1.4 },
    ],
    initialCredits: 520,
    initialCrews: 3,
    primaryObjective: 'Restore water service to MED-01, MED-02, SHL-01 and SHL-02.',
    secondaryObjectives: [
      'Do not exceed 460 repair credits.',
      'Restore the East Distribution Hub (WTR-03) to operational.',
    ],
    completion: {
      operationalNodes: ['MED-01', 'MED-02', 'SHL-01', 'SHL-02'],
      minEssentialAvailable: 4,
      maxFailed: 2,
      budgetNonNegative: true,
    },
  },
  {
    id: 'M05',
    code: 'M05',
    title: 'Cascade Zero',
    narrative:
      'A compound incident: the Central Relay has failed, the Northline Distribution Node is overloaded, and the Central Pump Station connection is severed. ' +
      'Multiple infrastructure categories are affected. Recover the city within a constrained repair budget and time limit. ' +
      'Compare your repair order against both suggested strategies before committing.',
    difficulty: 'compound',
    districtFocus: 'Central District',
    seeds: [
      { kind: 'node_failure', targetId: 'COM-01' },
      { kind: 'node_overload', targetId: 'PWR-02', factor: 1.5 },
      { kind: 'connection_sever', targetId: 'E-017' },
    ],
    initialCredits: 720,
    initialCrews: 3,
    primaryObjective: 'Restore all essential services (medical + shelters) to operational within budget and time limit.',
    secondaryObjectives: [
      'Spend no more than 640 repair credits.',
      'Complete within 360 simulation minutes.',
      'Restore network reachability above 75%.',
    ],
    completion: {
      operationalNodes: ['MED-01', 'MED-02', 'MED-03', 'SHL-01', 'SHL-02', 'SHL-04'],
      minEssentialAvailable: 6,
      maxFailed: 4,
      budgetNonNegative: true,
      timeLimit: 360,
    },
  },
];

export const missionById = (id: string): Mission | undefined =>
  missions.find((m) => m.id === id);
