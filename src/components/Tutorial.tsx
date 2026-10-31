// First-time tutorial overlay — a short interactive walkthrough.

import { useState } from 'react';
import { Modal, Button } from './ui';
import { useStore } from '@/store/StoreContext';
import { Map as MapIcon, Zap, Wrench, GitBranch, Network, BookOpen, CheckCircle2, ChevronRight } from 'lucide-react';

const steps = [
  {
    icon: MapIcon,
    title: 'Welcome to Signal Zero',
    body: 'This is Meridian — a fictional city of ~32 infrastructure nodes. Every node depends on others for power, communication, water, or road access. Your job is to understand those dependencies, break them on purpose, and repair them intelligently.',
  },
  {
    icon: Zap,
    title: 'Observe · Disrupt · Recover',
    body: 'The three modes are not separate apps — they are phases of the same exercise. In the Laboratory you introduce failures. In City Operations you watch the propagation. In the Recovery Planner you decide what to fix first, with a limited budget and crew.',
  },
  {
    icon: GitBranch,
    title: 'Failures propagate by rules',
    body: 'A node fails only when its explicit requirements are unmet. If a hospital has two power sources, losing one does not disable it. The event timeline shows the exact propagation sequence. Nothing is random — identical conditions produce identical results.',
  },
  {
    icon: Wrench,
    title: 'Repairs cost credits and time',
    body: 'Every repairable node has a cost and a duration. You have a finite budget and a few crews. Queuing a repair occupies a crew until completion. Restoring one node re-evaluates its downstream dependencies — services only return when their requirements are actually satisfied.',
  },
  {
    icon: Network,
    title: 'Algorithms do real work',
    body: 'BFS, DFS, and Dijkstra are functional tools, not decorations. The Criticality table uses a documented composite score. Two recovery strategies disagree on purpose — compare them and inspect the component weights before committing.',
  },
  {
    icon: BookOpen,
    title: 'Everything persists locally',
    body: 'Your notes, custom scenarios, and attempt records are stored in your browser. No account, no server. Export your data from the Scenario Archive. Use the Systems Notebook to record observations and lessons.',
  },
];

export function Tutorial({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const s = steps[step];
  const isLast = step === steps.length - 1;
  const Icon = s.icon;

  const finish = () => {
    onClose();
    setStep(0);
  };

  return (
    <Modal open={open} onClose={finish} title={`Getting Started · ${step + 1} / ${steps.length}`}>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-signal-amber/10 border border-signal-amber/30 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-signal-amber" />
          </div>
          <h3 className="text-base font-semibold text-text">{s.title}</h3>
        </div>
        <p className="text-sm text-text-dim leading-relaxed">{s.body}</p>
        <div className="flex items-center gap-2 pt-2">
          <div className="flex gap-1 flex-1">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`h-1 rounded-full transition-all ${i === step ? 'w-6 bg-signal-amber' : 'w-1.5 bg-ink-500 hover:bg-ink-400'}`}
                aria-label={`Step ${i + 1}`}
              />
            ))}
          </div>
          {step > 0 && <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)}>Back</Button>}
          {isLast ? (
            <Button variant="primary" size="sm" onClick={finish}><CheckCircle2 className="w-3.5 h-3.5" /> Got it</Button>
          ) : (
            <Button variant="primary" size="sm" onClick={() => setStep(step + 1)}>Next <ChevronRight className="w-3.5 h-3.5" /></Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

/** Hook to manage tutorial visibility based on persisted settings. */
export function useTutorial() {
  const { state, dispatch } = useStore();
  const seen = state.persisted.settings.tutorialSeen;
  const [open, setOpen] = useState(!seen);
  const close = () => {
    setOpen(false);
    dispatch({ type: 'PERSIST', data: { ...state.persisted, settings: { ...state.persisted.settings, tutorialSeen: true } } });
  };
  return { open, close };
}
