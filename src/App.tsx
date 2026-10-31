// Signal Zero — urban systems resilience laboratory.
// Every signal tells a story. Built by Ruchit Blaggana.

import { useEffect, useState, useCallback } from 'react';
import { StoreProvider, useStore } from '@/store/StoreContext';
import { Header } from '@/components/Header';
import { Notifications } from '@/components/Notifications';
import { CommandPalette } from '@/components/CommandPalette';
import { HelpOverlay } from '@/components/HelpOverlay';
import { Tutorial, useTutorial } from '@/components/Tutorial';
import { OperationsView } from '@/views/OperationsView';
import { LaboratoryView } from '@/views/LaboratoryView';
import { RecoveryView } from '@/views/RecoveryView';
import { ArchiveView } from '@/views/ArchiveView';
import { NotebookView } from '@/views/NotebookView';
import { DeveloperView } from '@/views/DeveloperView';

function AppShell() {
  const { state, dispatch } = useStore();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const tutorial = useTutorial();

  // Keyboard shortcuts
  const onKey = useCallback((e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement)?.tagName;
    const inField = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      setPaletteOpen((v) => !v);
      return;
    }
    if (inField) return;
    if (e.key === '?') { e.preventDefault(); setHelpOpen((v) => !v); }
    if (e.key === ' ') {
      e.preventDefault();
      dispatch({ type: 'TOGGLE_RUN' });
    }
    if (e.key.toLowerCase() === 's') {
      e.preventDefault();
      dispatch({ type: 'STEP', minutes: state.speed });
    }
    if (e.key.toLowerCase() === 'r') {
      e.preventDefault();
      dispatch({ type: 'RESET_SIM' });
    }
    if (e.key === 'Escape') {
      if (paletteOpen) { setPaletteOpen(false); return; }
      if (helpOpen) { setHelpOpen(false); return; }
      dispatch({ type: 'SELECT_NODE', id: null });
    }
  }, [dispatch, paletteOpen, helpOpen, state.speed]);

  useEffect(() => { window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [onKey]);

  return (
    <div className="min-h-screen bg-ink-900 text-text flex flex-col">
      <Header onCommandPalette={() => setPaletteOpen(true)} onHelp={() => setHelpOpen(true)} />
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-3 sm:px-5 py-4 sm:py-6">
        {state.view === 'operations' && <OperationsView />}
        {state.view === 'laboratory' && <LaboratoryView />}
        {state.view === 'recovery' && <RecoveryView />}
        {state.view === 'archive' && <ArchiveView />}
        {state.view === 'notebook' && <NotebookView />}
        {state.view === 'developer' && <DeveloperView />}
      </main>
      <footer className="border-t border-ink-500/15 py-3 px-4">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between text-[10px] text-text-faint">
          <span className="font-mono uppercase tracking-wider">Signal Zero · Meridian City Grid</span>
          <span>All cities, scenarios & results are fictional. Data persists locally in your browser.</span>
        </div>
      </footer>
      <Notifications />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <HelpOverlay open={helpOpen} onClose={() => setHelpOpen(false)} />
      <Tutorial open={tutorial.open} onClose={tutorial.close} />
      {state.storageError && (
        <div className="fixed bottom-4 left-4 z-50 max-w-sm p-3 rounded-lg border border-signal-amber/40 bg-ink-800/95 text-xs text-signal-amber">
          {state.storageError}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <AppShell />
    </StoreProvider>
  );
}
