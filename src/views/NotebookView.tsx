// Systems Notebook — persistent engineering journal.

import { useState } from 'react';
import { useStore } from '@/store/StoreContext';
import { Panel, Button, Badge, EmptyState, Field, Input, Modal } from '@/components/ui';
import { missions } from '@/data/city';
import type { NotebookEntry } from '@/types';
import { BookOpen, Plus, Trash2, Edit3, Save, X, Tag } from 'lucide-react';

export function NotebookView() {
  const { state, dispatch } = useStore();
  const [editing, setEditing] = useState<NotebookEntry | null>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState('');
  const [scenario, setScenario] = useState('');
  const [filter, setFilter] = useState('');

  const entries = state.persisted.notebook;
  const filtered = filter
    ? entries.filter((e) =>
        e.title.toLowerCase().includes(filter.toLowerCase()) ||
        e.body.toLowerCase().includes(filter.toLowerCase()) ||
        e.tags.some((t) => t.toLowerCase().includes(filter.toLowerCase())))
    : entries;

  const openNew = () => {
    setEditing(null);
    setTitle(''); setBody(''); setTags(''); setScenario('');
    setOpen(true);
  };

  const openEdit = (e: NotebookEntry) => {
    setEditing(e);
    setTitle(e.title); setBody(e.body); setTags(e.tags.join(', '));
    setScenario(e.scenarioId ?? '');
    setOpen(true);
  };

  const save = () => {
    if (!title.trim()) return;
    const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean);
    if (editing) {
      dispatch({ type: 'UPDATE_NOTE', id: editing.id, patch: { title, body, tags: tagList, scenarioId: scenario || undefined } });
    } else {
      const entry: NotebookEntry = {
        id: `nb-${Date.now().toString(36)}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        title, body, tags: tagList,
        scenarioId: scenario || undefined,
      };
      dispatch({ type: 'ADD_NOTE', entry });
    }
    setOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input value={filter} onChange={setFilter} placeholder="Search notes…" className="flex-1" />
        <Button variant="primary" onClick={openNew}><Plus className="w-3.5 h-3.5" /> New Entry</Button>
      </div>

      {filtered.length === 0 ? (
        <Panel title="Systems Notebook" subtitle="Your engineering observations, hypotheses, and lessons">
          <EmptyState title="No notebook entries yet" hint="Record observations, hypotheses, expected failure paths, and recovery decisions. Notes persist in your browser across sessions.">
            <Button variant="outline" onClick={openNew} className="mt-3"><Plus className="w-3.5 h-3.5" /> Write First Entry</Button>
          </EmptyState>
        </Panel>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((e) => {
            const m = missions.find((mm) => mm.id === e.scenarioId);
            return (
              <Panel key={e.id} title={e.title} subtitle={new Date(e.createdAt).toLocaleString()} right={
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(e)} className="text-text-faint hover:text-signal-amber" title="Edit"><Edit3 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => dispatch({ type: 'DELETE_NOTE', id: e.id })} className="text-text-faint hover:text-signal-coral" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              }>
                <p className="text-[11px] text-text-dim leading-snug whitespace-pre-wrap line-clamp-6">{e.body}</p>
                <div className="flex flex-wrap items-center gap-1 mt-2">
                  {e.tags.map((t) => <Badge key={t} tone="dim"><Tag className="w-2.5 h-2.5" />{t}</Badge>)}
                  {m && <Badge tone="amber">{m.code}</Badge>}
                </div>
              </Panel>
            );
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Entry' : 'New Notebook Entry'} wide>
        <div className="space-y-3">
          <Field label="Title"><Input value={title} onChange={setTitle} placeholder="e.g. Cascade from COM-01 failure" /></Field>
          <Field label="Body">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              placeholder="Observations, hypotheses, expected vs actual outcomes, recovery decisions, lessons learned…"
              className="w-full bg-ink-900 border border-ink-500/30 rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-faint resize-y"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tags (comma-separated)"><Input value={tags} onChange={setTags} placeholder="cascade, comms, recovery" /></Field>
            <Field label="Associated mission">
              <select value={scenario} onChange={(e) => setScenario(e.target.value)} className="w-full bg-ink-900 border border-ink-500/30 rounded-lg px-3 py-2 text-sm text-text">
                <option value="">— None —</option>
                {missions.map((m) => <option key={m.id} value={m.id}>{m.code} — {m.title}</option>)}
              </select>
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setOpen(false)}><X className="w-3.5 h-3.5" /> Cancel</Button>
            <Button variant="primary" onClick={save}><Save className="w-3.5 h-3.5" /> Save Entry</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
