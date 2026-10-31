// Notification toasts — compact, dismissible, auto-expire.

import { useEffect } from 'react';
import { useStore } from '@/store/StoreContext';
import { Info, CheckCircle2, AlertTriangle, AlertCircle, X } from 'lucide-react';

const iconFor = { info: Info, success: CheckCircle2, warning: AlertTriangle, error: AlertCircle };
const toneFor = {
  info: 'border-ink-400/40 text-text-dim',
  success: 'border-signal-teal/40 text-signal-teal',
  warning: 'border-signal-amber/40 text-signal-amber',
  error: 'border-signal-coral/40 text-signal-coral',
};

export function Notifications() {
  const { state, dispatch } = useStore();
  return (
    <div className="fixed bottom-4 right-4 z-[55] flex flex-col gap-2 max-w-sm pointer-events-none">
      {state.notifications.map((n) => {
        const Icon = iconFor[n.kind];
        return (
          <Toast key={n.id} id={n.id} message={n.message} kind={n.kind} Icon={Icon} onDismiss={(id) => dispatch({ type: 'DISMISS', id })} />
        );
      })}
    </div>
  );
}

function Toast({ id, message, kind, Icon, onDismiss }: { id: string; message: string; kind: keyof typeof iconFor; Icon: React.ComponentType<{ className?: string }>; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(id), kind === 'error' ? 6000 : 4000);
    return () => clearTimeout(t);
  }, [id, kind, onDismiss]);
  return (
    <div className={`pointer-events-auto flex items-start gap-2.5 px-3 py-2.5 rounded-lg border bg-ink-800/95 backdrop-blur shadow-xl animate-slide-in-right ${toneFor[kind]}`}>
      <Icon className="w-4 h-4 shrink-0 mt-0.5" />
      <p className="text-xs text-text leading-snug flex-1">{message}</p>
      <button onClick={() => onDismiss(id)} className="text-text-faint hover:text-text shrink-0" aria-label="Dismiss"><X className="w-3.5 h-3.5" /></button>
    </div>
  );
}
