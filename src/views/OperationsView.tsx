// City Operations — the main simulation workspace: map + panels.

import { useState } from 'react';
import { useStore } from '@/store/StoreContext';
import { missions } from '@/data/city';
import { CityMap, type MapFilters } from '@/components/CityMap';
import { SimControls, MetricsBar, NodeInspector, ConnectionInspector, EventTimeline, NodeInventoryList } from '@/components/panels';
import { Panel } from '@/components/ui';
import { Activity, Map as MapIcon, List } from 'lucide-react';

export function OperationsView() {
  const { state } = useStore();
  const [filters, setFilters] = useState<MapFilters>({
    categories: new Set(),
    states: new Set(),
    search: '',
    highlightMode: 'direct',
    showLabels: true,
  });
  const [highlightMode, setHighlightMode] = useState<'none' | 'direct' | 'upstream' | 'downstream'>('direct');
  const [mobileList, setMobileList] = useState(false);

  const mergedFilters: MapFilters = { ...filters, highlightMode };

  return (
    <div className="space-y-4">
      {/* Control row */}
      <div className="flex flex-wrap items-center gap-3">
        <SimControls />
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-text-faint mr-1">Highlight</span>
          {(['none', 'direct', 'upstream', 'downstream'] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setHighlightMode(m); setFilters({ ...filters, highlightMode: m }); }}
              className={`px-2 py-1 rounded-lg text-[10px] border transition-colors ${
                highlightMode === m ? 'border-signal-amber/40 text-signal-amber bg-signal-amber/10' : 'border-ink-500/30 text-text-faint hover:text-text-dim'
              }`}
            >
              {m === 'none' ? 'None' : m === 'direct' ? 'Direct' : m === 'upstream' ? 'Upstream' : 'Downstream'}
            </button>
          ))}
        </div>
        <button
          onClick={() => setMobileList((v) => !v)}
          className="lg:hidden ml-auto inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-ink-500/30 text-xs text-text-dim hover:text-text"
        >
          {mobileList ? <MapIcon className="w-3.5 h-3.5" /> : <List className="w-3.5 h-3.5" />}
          {mobileList ? 'Map' : 'List'}
        </button>
      </div>

      <MetricsBar />

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
        {/* Map + mobile list */}
        <div className="space-y-4">
          {mobileList ? (
            <Panel title="Infrastructure" subtitle="Browse the Meridian network">
              <NodeInventoryList />
            </Panel>
          ) : (
            <CityMap filters={mergedFilters} onFiltersChange={setFilters} height={560} />
          )}
          <div className="lg:hidden">
            <NodeInspector />
          </div>
        </div>

        {/* Side column */}
        <div className="space-y-4">
          <div className="hidden lg:block">
            <NodeInspector />
          </div>
          {state.selectedConnectionId && <ConnectionInspector />}
          <EventTimeline max={50} />
        </div>
      </div>

      {/* Active mission banner */}
      {state.sim.missionId && (
        <Panel title="Active Mission" subtitle={`Phase: ${state.sim.phase}`}>
          <MissionBanner />
        </Panel>
      )}
    </div>
  );
}

function MissionBanner() {
  const { state } = useStore();
  const m = state.sim.missionId;
  if (!m) return null;
  const mission = missions.find((x) => x.id === m);
  if (!mission) return null;
  const result = state.lastMissionResult;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[11px] text-signal-amber">{mission.code}</span>
        <h3 className="text-sm font-semibold text-text">{mission.title}</h3>
      </div>
      <p className="text-[11px] text-text-dim leading-snug">{mission.narrative}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-text-faint mb-1">Primary Objective</p>
          <p className="text-[11px] text-text">{mission.primaryObjective}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-text-faint mb-1">Secondary Objectives</p>
          <ul className="text-[11px] text-text-dim list-disc list-inside space-y-0.5">
            {mission.secondaryObjectives.map((o, i) => <li key={i}>{o}</li>)}
          </ul>
        </div>
      </div>
      {result && (
        <div className={`mt-2 p-2 rounded-lg border ${result.success ? 'border-signal-teal/40 bg-signal-teal/5' : 'border-signal-coral/40 bg-signal-coral/5'}`}>
          <p className={`text-[11px] font-semibold flex items-center gap-1.5 ${result.success ? 'text-signal-teal' : 'text-signal-coral'}`}>
            <Activity className="w-3.5 h-3.5" />
            {result.success ? 'Mission Complete' : 'Objectives not yet met'}
          </p>
              {result.failures.length > 0 && (
            <ul className="text-[10px] text-text-dim mt-1 list-disc list-inside">
              {result.failures.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
