// Scenario Archive — predefined missions, custom scenarios, past attempts, replay.

import { useState, useMemo } from 'react';
import { useStore } from '@/store/StoreContext';
import { Panel, Button, Badge, EmptyState, Field, Input, Select } from '@/components/ui';
import { missions, missionById } from '@/data/city';
import type { Difficulty, FailureSeed } from '@/types';
import { Archive, Play, Plus, Trash2, Award, Clock, Coins, CheckCircle2, XCircle, Download, Upload } from 'lucide-react';

const difficultyTone: Record<Difficulty, 'teal' | 'amber' | 'coral' | 'default'> = {
  introductory: 'teal',
  standard: 'amber',
  advanced: 'coral',
  compound: 'default',
};

export function ArchiveView() {
  const { state, dispatch } = useStore();
  const [tab, setTab] = useState<'missions' | 'custom' | 'attempts'>('missions');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1">
        {(['missions', 'custom', 'attempts'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
              tab === t ? 'bg-signal-amber/15 text-signal-amber border border-signal-amber/30' : 'text-text-dim hover:text-text border border-transparent'
            }`}
          >
            {t === 'missions' ? 'Predefined Missions' : t === 'custom' ? 'Custom Scenarios' : 'Past Attempts'}
          </button>
        ))}
      </div>

      {tab === 'missions' && <MissionsTab />}
      {tab === 'custom' && <CustomTab />}
      {tab === 'attempts' && <AttemptsTab />}
    </div>
  );
}

function MissionsTab() {
  const { state, dispatch } = useStore();
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {missions.map((m) => {
        const isActive = state.sim.missionId === m.id;
        const attempts = state.persisted.scenarioSummaries.filter((s) => s.missionId === m.id);
        const best = attempts.find((a) => a.success);
        return (
          <Panel key={m.id} title={m.title} subtitle={`${m.code} · ${m.districtFocus}`} right={<Badge tone={difficultyTone[m.difficulty]}>{m.difficulty}</Badge>}>
            <div className="space-y-2.5">
              <p className="text-[11px] text-text-dim leading-snug">{m.narrative}</p>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-text-faint mb-0.5">Primary Objective</p>
                <p className="text-[11px] text-text">{m.primaryObjective}</p>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-text-faint">
                <span className="flex items-center gap-1"><Coins className="w-3 h-3" /> {m.initialCredits} cr</span>
                <span className="flex items-center gap-1"><Award className="w-3 h-3" /> {m.initialCrews} crews</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {attempts.length} attempts</span>
              </div>
              {best && (
                <p className="text-[10px] text-signal-teal flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Best: completed in {best.timeElapsed} min, {best.creditsSpent} cr spent</p>
              )}
              <Button size="sm" variant={isActive ? 'ghost' : 'primary'} onClick={() => dispatch({ type: 'START_MISSION', missionId: m.id })} className="w-full">
                <Play className="w-3.5 h-3.5" /> {isActive ? 'Restart Mission' : 'Start Mission'}
              </Button>
            </div>
          </Panel>
        );
      })}
    </div>
  );
}

function CustomTab() {
  const { state, dispatch } = useStore();
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [seedKind, setSeedKind] = useState<FailureSeed['kind']>('node_failure');
  const [target, setTarget] = useState('');
  const [seeds, setSeeds] = useState<FailureSeed[]>([]);
  const [credits, setCredits] = useState(500);
  const [crews, setCrews] = useState(2);

  const targets = seedKind === 'connection_sever'
    ? state.sim.graph.connections.map((c) => ({ id: c.id, label: `${c.id} · ${c.from}↔${c.to}` }))
    : state.sim.graph.nodes.map((n) => ({ id: n.id, label: `${n.code} · ${n.name}` }));

  const addSeed = () => {
    if (!target) return;
    setSeeds((s) => [...s, { kind: seedKind, targetId: target, ...(seedKind === 'node_overload' ? { factor: 1.5 } : {}) }]);
    setTarget('');
  };

  const save = () => {
    if (!name || seeds.length === 0) return;
    dispatch({ type: 'ADD_SCENARIO', scenario: {
      id: `cs-${Date.now().toString(36)}`,
      name, description: desc, createdAt: Date.now(),
      seeds, initialCredits: credits, initialCrews: crews,
    }});
    setName(''); setDesc(''); setSeeds([]);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Panel title="Create Custom Scenario" subtitle="Define failures, budget, and crews">
        <div className="space-y-3">
          <Field label="Name"><Input value={name} onChange={setName} placeholder="e.g. Triple substation failure" /></Field>
          <Field label="Description"><Input value={desc} onChange={setDesc} placeholder="What this scenario tests" /></Field>

          <div className="border border-ink-500/30 rounded-lg p-3 bg-ink-900/30 space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-text-faint">Add Failure Seed</p>
            <div className="grid grid-cols-2 gap-2">
              <Select value={seedKind} onChange={(v) => setSeedKind(v as FailureSeed['kind'])}>
                <option value="node_failure">Node Failure</option>
                <option value="connection_sever">Sever Connection</option>
                <option value="node_overload">Overload</option>
              </Select>
              <Select value={target} onChange={setTarget}>
                <option value="">— Target —</option>
                {targets.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </Select>
            </div>
            <Button size="sm" variant="outline" onClick={addSeed} disabled={!target}><Plus className="w-3.5 h-3.5" /> Add Seed</Button>
            {seeds.length > 0 && (
              <ul className="space-y-1">
                {seeds.map((s, i) => (
                  <li key={i} className="flex items-center gap-2 text-[11px] px-2 py-1 rounded bg-ink-800/40">
                    <span className="font-mono text-text-faint">{s.kind}</span>
                    <span className="text-text-dim flex-1">{s.targetId}</span>
                    <button onClick={() => setSeeds(seeds.filter((_, j) => j !== i))} className="text-signal-coral hover:underline text-[10px]">remove</button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Credits"><input type="number" value={credits} onChange={(e) => setCredits(Number(e.target.value))} className="w-full bg-ink-900 border border-ink-500/30 rounded-lg px-3 py-2 text-sm text-text" /></Field>
            <Field label="Crews"><input type="number" value={crews} onChange={(e) => setCrews(Number(e.target.value))} min={1} max={5} className="w-full bg-ink-900 border border-ink-500/30 rounded-lg px-3 py-2 text-sm text-text" /></Field>
          </div>

          <Button size="sm" variant="primary" onClick={save} disabled={!name || seeds.length === 0}><Plus className="w-3.5 h-3.5" /> Save Scenario</Button>
        </div>
      </Panel>

      <Panel title="Saved Custom Scenarios" subtitle={`${state.persisted.customScenarios.length} saved`}>
        {state.persisted.customScenarios.length === 0 ? (
          <EmptyState title="No custom scenarios yet" hint="Create one to experiment with your own failure configurations." />
        ) : (
          <div className="space-y-2">
            {state.persisted.customScenarios.map((sc) => (
              <div key={sc.id} className="border border-ink-500/30 rounded-lg p-3 bg-ink-900/30">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold text-text">{sc.name}</h4>
                  <button onClick={() => dispatch({ type: 'DELETE_SCENARIO', id: sc.id })} className="text-text-faint hover:text-signal-coral" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                {sc.description && <p className="text-[11px] text-text-dim mt-1">{sc.description}</p>}
                <div className="flex items-center gap-3 mt-1.5 text-[10px] text-text-faint">
                  <span>{sc.seeds.length} seeds</span>
                  <span className="flex items-center gap-1"><Coins className="w-3 h-3" />{sc.initialCredits} cr</span>
                  <span className="flex items-center gap-1"><Award className="w-3 h-3" />{sc.initialCrews} crews</span>
                </div>
                <Button size="sm" variant="primary" className="mt-2 w-full" onClick={() => dispatch({ type: 'START_EXPERIMENT', seeds: sc.seeds, credits: sc.initialCredits, crews: sc.initialCrews, name: sc.name })}>
                  <Play className="w-3.5 h-3.5" /> Run Scenario
                </Button>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

function AttemptsTab() {
  const { state, dispatch } = useStore();
  const attempts = state.persisted.scenarioSummaries;
  const [filter, setFilter] = useState('all');

  const filtered = useMemo(() => {
    return filter === 'all' ? attempts : attempts.filter((a) => a.missionId === filter);
  }, [attempts, filter]);

  const exportAll = () => {
    const blob = new Blob([JSON.stringify(attempts, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `signal-zero-attempts-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Panel
      title="Past Attempts"
      subtitle={`${attempts.length} recorded`}
      right={
        <div className="flex items-center gap-2">
          <Select value={filter} onChange={setFilter} className="text-xs py-1">
            <option value="all">All missions</option>
            {missions.map((m) => <option key={m.id} value={m.id}>{m.code} — {m.title}</option>)}
          </Select>
          <Button size="sm" variant="outline" onClick={exportAll} disabled={attempts.length === 0}><Download className="w-3.5 h-3.5" /> Export</Button>
        </div>
      }
    >
      {filtered.length === 0 ? (
        <EmptyState title="No attempts recorded" hint="Complete a mission to record your results here." />
      ) : (
        <div className="space-y-2">
          {filtered.map((a) => {
            const m = missionById(a.missionId);
            return (
              <div key={a.attemptId} className="flex items-center gap-3 px-3 py-2 rounded-lg border border-ink-500/30 bg-ink-900/30">
                {a.success ? <CheckCircle2 className="w-4 h-4 text-signal-teal shrink-0" /> : <XCircle className="w-4 h-4 text-signal-coral shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-signal-amber">{m?.code ?? a.missionId}</span>
                    <span className="text-[11px] text-text truncate">{m?.title ?? 'Custom'}</span>
                  </div>
                  <p className="text-[10px] text-text-faint">{new Date(a.completedAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-text-dim font-mono shrink-0">
                  <span title="Time elapsed"><Clock className="w-3 h-3 inline mr-0.5" />{a.timeElapsed}m</span>
                  <span title="Credits spent"><Coins className="w-3 h-3 inline mr-0.5" />{a.creditsSpent}</span>
                  <span title="Reachability">{a.metrics.networkReachability}%</span>
                  {a.strategyUsed && <Badge tone="dim" className="ml-1">{a.strategyUsed.split(' ')[0]}</Badge>}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => dispatch({ type: 'START_MISSION', missionId: a.missionId })}
                  title="Replay mission"
                >
                  <Play className="w-3.5 h-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
