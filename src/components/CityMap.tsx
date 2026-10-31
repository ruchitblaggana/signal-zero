// The Signal Zero city dependency map — interactive SVG with pan/zoom,
// node inspection, dependency highlights, filters, search.

import { useMemo, useRef, useState, useCallback } from 'react';
import { useStore } from '@/store/StoreContext';
import type { NodeCategory, NodeState, InfrastructureNode } from '@/types';
import { nodeById, downstreamDependents, upstreamDependencies } from '@/engine/graph';
import { categoryMeta, stateMeta, connectionStateMeta, categoryIconName } from './visuals';
import * as Lucide from 'lucide-react';
import { Minus, Plus, Maximize, Eye, EyeOff } from 'lucide-react';
import { useDebounced } from './ui';

const W = 1000;
const H = 640;
const NODE_R = 11;

export type HighlightMode = 'none' | 'direct' | 'upstream' | 'downstream';

export interface MapFilters {
  categories: Set<NodeCategory>;
  states: Set<NodeState>;
  search: string;
  highlightMode: HighlightMode;
  showLabels: boolean;
}

interface Props {
  filters: MapFilters;
  onFiltersChange: (f: MapFilters) => void;
  height?: number;
  className?: string;
}

export function CityMap({ filters, onFiltersChange, height = 560, className = '' }: Props) {
  const { state, dispatch } = useStore();
  const svgRef = useRef<SVGSVGElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);

  const allCategories = Object.keys(categoryMeta) as NodeCategory[];
  const allStates: NodeState[] = ['operational', 'degraded', 'failed', 'under_repair', 'restored', 'isolated'];

  const selectedId = state.selectedNodeId;
  const selectedConn = state.selectedConnectionId;

  const debouncedSearch = useDebounced(filters.search, 180);

  const visibleNodes = useMemo(() => {
    return state.sim.graph.nodes.filter((n) => {
      if (filters.categories.size > 0 && !filters.categories.has(n.category)) return false;
      const s = state.sim.nodes[n.id]?.state;
      if (filters.states.size > 0 && s && !filters.states.has(s)) return false;
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase();
        if (!n.name.toLowerCase().includes(q) && !n.code.toLowerCase().includes(q) && !n.id.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [state.sim, filters.categories, filters.states, debouncedSearch]);

  const visibleIds = useMemo(() => new Set(visibleNodes.map((n) => n.id)), [visibleNodes]);

  // Highlight set based on selection + mode.
  const highlightSet = useMemo(() => {
    const s = new Set<string>();
    if (!selectedId || filters.highlightMode === 'none') return s;
    if (filters.highlightMode === 'direct') {
      for (const c of state.sim.graph.connections) {
        if (c.from === selectedId) s.add(c.to);
        if (c.to === selectedId) s.add(c.from);
      }
    } else if (filters.highlightMode === 'upstream') {
      upstreamDependencies(state.sim.graph, selectedId).forEach((id) => s.add(id));
    } else if (filters.highlightMode === 'downstream') {
      downstreamDependents(state.sim.graph, selectedId).forEach((id) => s.add(id));
    }
    return s;
  }, [selectedId, filters.highlightMode, state.sim.graph]);

  // Pan/zoom helpers.
  const clampPan = useCallback((p: { x: number; y: number }) => {
    const maxX = (W * (zoom - 1)) / 2 + 120;
    const maxY = (H * (zoom - 1)) / 2 + 120;
    return {
      x: Math.max(-maxX, Math.min(maxX, p.x)),
      y: Math.max(-maxY, Math.min(maxY, p.y)),
    };
  }, [zoom]);

  const fit = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const zoomBy = useCallback((factor: number, cx = W / 2, cy = H / 2) => {
    setZoom((z) => {
      const nz = Math.max(0.5, Math.min(3, z * factor));
      void cx; void cy;
      return nz;
    });
  }, []);

  // Wheel zoom.
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    zoomBy(factor);
  }, [zoomBy]);

  // Mouse drag pan.
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setDrag({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  }, [pan]);
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!drag) return;
    setPan(clampPan({ x: e.clientX - drag.x, y: e.clientY - drag.y }));
  }, [drag, clampPan]);
  const onMouseUp = useCallback(() => setDrag(null), []);

  // Keyboard pan when focused.
  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    const step = 40;
    if (e.key === 'ArrowUp') { setPan((p) => clampPan({ ...p, y: p.y + step })); e.preventDefault(); }
    if (e.key === 'ArrowDown') { setPan((p) => clampPan({ ...p, y: p.y - step })); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { setPan((p) => clampPan({ ...p, x: p.x + step })); e.preventDefault(); }
    if (e.key === 'ArrowRight') { setPan((p) => clampPan({ ...p, x: p.x - step })); e.preventDefault(); }
    if (e.key === '+' || e.key === '=') { zoomBy(1.12); e.preventDefault(); }
    if (e.key === '-' || e.key === '_') { zoomBy(0.89); e.preventDefault(); }
    if (e.key === '0') { fit(); e.preventDefault(); }
  }, [clampPan, zoomBy, fit]);

  // Node select.
  const selectNode = useCallback((id: string) => {
    dispatch({ type: 'SELECT_NODE', id });
  }, [dispatch]);

  // Connection select.
  const selectConnection = useCallback((id: string) => {
    dispatch({ type: 'SELECT_CONNECTION', id });
  }, [dispatch]);

  // Render helpers.
  const transform = `translate(${W / 2 + pan.x} ${H / 2 + pan.y}) scale(${zoom}) translate(${-W / 2} ${-H / 2})`;

  return (
    <div className={`relative bg-ink-900 rounded-xl border border-ink-500/30 overflow-hidden ${className}`} style={{ height }}>
      {/* Top control bar */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between gap-2 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-1.5 bg-ink-800/80 backdrop-blur border border-ink-500/30 rounded-lg px-2 py-1">
          <input
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            placeholder="Search nodes…"
            aria-label="Search infrastructure nodes"
            className="bg-transparent text-xs text-text placeholder:text-text-faint w-32 sm:w-44 outline-none"
          />
          {filters.search && (
            <button onClick={() => onFiltersChange({ ...filters, search: '' })} aria-label="Clear search" className="text-text-faint hover:text-text">×</button>
          )}
        </div>
        <div className="pointer-events-auto flex items-center gap-1">
          <MapButton title="Zoom out" onClick={() => zoomBy(0.85)}><Minus className="w-3.5 h-3.5" /></MapButton>
          <MapButton title="Reset view" onClick={fit}><Maximize className="w-3.5 h-3.5" /></MapButton>
          <MapButton title="Zoom in" onClick={() => zoomBy(1.18)}><Plus className="w-3.5 h-3.5" /></MapButton>
        </div>
      </div>

      {/* SVG */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-full bg-grid-fine cursor-grab active:cursor-grabbing select-none"
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onKeyDown={onKeyDown}
        tabIndex={0}
        role="application"
        aria-label="Meridian city dependency map"
        style={{ outline: 'none' }}
      >
        <g transform={transform}>
          {/* Districts as subtle labels */}
          <DistrictLabels />

          {/* Connections */}
          <g>
            {state.sim.graph.connections.map((c) => {
              const a = nodeById(state.sim.graph, c.from);
              const b = nodeById(state.sim.graph, c.to);
              if (!a || !b) return null;
              const cs = state.sim.connections[c.id];
              const meta = connectionStateMeta[cs?.state ?? 'active'];
              const isSelected = selectedConn === c.id;
              const isFocused = selectedId && (c.from === selectedId || c.to === selectedId);
              const bothVisible = visibleIds.has(c.from) && visibleIds.has(c.to);
              if (!bothVisible) return null;
              const isHighlight = isFocused || isSelected;
              return (
                <g key={c.id} className="cursor-pointer" onClick={(e) => { e.stopPropagation(); selectConnection(c.id); }}>
                  <line
                    x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                    stroke={isSelected ? '#F4B942' : meta.color}
                    strokeWidth={isHighlight ? 2.2 : 1.1}
                    strokeDasharray={meta.dash === 'none' ? undefined : meta.dash}
                    opacity={isHighlight ? 0.95 : 0.55}
                    markerEnd={c.directed ? `url(#arrow-${cs?.state ?? 'active'})` : undefined}
                  />
                  {/* invisible hit area */}
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="transparent" strokeWidth={10} />
                </g>
              );
            })}
          </g>

          {/* Nodes */}
          <g>
            {visibleNodes.map((n) => (
              <NodeShape
                key={n.id}
                node={n}
                state={state.sim.nodes[n.id]?.state ?? 'operational'}
                selected={selectedId === n.id}
                highlighted={highlightSet.has(n.id)}
                showLabel={filters.showLabels}
                hovered={hoverId === n.id}
                onSelect={selectNode}
                onHover={setHoverId}
              />
            ))}
          </g>
        </g>

        {/* Arrow markers */}
        <defs>
          {(['active', 'degraded', 'severed', 'disabled'] as const).map((s) => (
            <marker key={s} id={`arrow-${s}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill={connectionStateMeta[s].color} opacity={0.9} />
            </marker>
          ))}
        </defs>
      </svg>

      {/* Hover tooltip */}
      {hoverId && (
        <HoverTooltip nodeId={hoverId} />
      )}

      {/* Filter chips */}
      <div className="absolute bottom-3 left-3 right-3 z-20 flex flex-wrap items-center gap-1.5 pointer-events-auto">
        <div className="flex flex-wrap items-center gap-1 bg-ink-800/80 backdrop-blur border border-ink-500/30 rounded-lg px-2 py-1">
          <span className="text-[10px] uppercase tracking-wider text-text-faint mr-1">Type</span>
          {allCategories.map((c) => {
            const active = filters.categories.has(c);
            return (
              <button
                key={c}
                onClick={() => {
                  const next = new Set(filters.categories);
                  if (active) next.delete(c); else next.add(c);
                  onFiltersChange({ ...filters, categories: next });
                }}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border transition-colors ${
                  active ? 'border-signal-amber/40 text-signal-amber bg-signal-amber/10' : 'border-ink-500/30 text-text-faint hover:text-text-dim'
                }`}
              >
                {categoryMeta[c].label}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-1 bg-ink-800/80 backdrop-blur border border-ink-500/30 rounded-lg px-2 py-1">
          <span className="text-[10px] uppercase tracking-wider text-text-faint mr-1">State</span>
          {allStates.map((s) => {
            const active = filters.states.has(s);
            const meta = stateMeta[s];
            return (
              <button
                key={s}
                onClick={() => {
                  const next = new Set(filters.states);
                  if (active) next.delete(s); else next.add(s);
                  onFiltersChange({ ...filters, states: next });
                }}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border transition-colors ${
                  active ? 'text-text' : 'text-text-faint hover:text-text-dim'
                }`}
                style={active ? { borderColor: meta.border, color: meta.color, background: meta.bg } : { borderColor: 'rgba(91,108,125,0.3)' }}
              >
                <span style={{ color: meta.color }}>{meta.glyph}</span>
                {meta.label}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => onFiltersChange({ ...filters, showLabels: !filters.showLabels })}
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] border bg-ink-800/80 backdrop-blur ${
            filters.showLabels ? 'border-signal-amber/40 text-signal-amber' : 'border-ink-500/30 text-text-faint hover:text-text-dim'
          }`}
        >
          {filters.showLabels ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          Labels
        </button>
      </div>
    </div>
  );
}

function MapButton({ children, title, onClick }: { children: React.ReactNode; title: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-ink-800/80 backdrop-blur border border-ink-500/30 text-text-dim hover:text-text hover:border-ink-400/40 transition-colors"
    >
      {children}
    </button>
  );
}

function DistrictLabels() {
  const labels = [
    { name: 'CENTRAL', x: 520, y: 340 },
    { name: 'MEDICAL', x: 660, y: 130 },
    { name: 'INDUSTRIAL', x: 220, y: 470 },
    { name: 'RESIDENTIAL E', x: 800, y: 420 },
    { name: 'TRANSIT', x: 420, y: 150 },
    { name: 'WATERWORKS', x: 200, y: 590 },
  ];
  return (
    <g pointerEvents="none" opacity={0.4}>
      {labels.map((l) => (
        <text key={l.name} x={l.x} y={l.y} textAnchor="middle" className="font-mono" fontSize={11} letterSpacing={2} fill="#5C6E7D">
          {l.name}
        </text>
      ))}
    </g>
  );
}

function NodeShape({
  node, state, selected, highlighted, showLabel, hovered, onSelect, onHover,
}: {
  node: InfrastructureNode;
  state: NodeState;
  selected: boolean;
  highlighted: boolean;
  showLabel: boolean;
  hovered: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  const meta = stateMeta[state];
  const cat = categoryMeta[node.category];
  const Icon = (Lucide as any)[categoryIconName[node.category]] as React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  const r = NODE_R + (node.criticality >= 4 ? 1.5 : 0) + (node.essential ? 1 : 0);
  const cx = node.x;
  const cy = node.y;
  const ringRadius = r + (state === 'failed' ? 6 : 0);
  const labelY = cy + r + 11;

  return (
    <g
      className="cursor-pointer transition-opacity"
      onClick={(e) => { e.stopPropagation(); onSelect(node.id); }}
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={() => onHover(null)}
      tabIndex={0}
      role="button"
      aria-label={`${node.name} — ${meta.label}`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(node.id); } }}
      style={{ opacity: (highlighted || selected) ? 1 : 0.82, outline: 'none' }}
      transform={hovered && !selected ? `translate(0 -2)` : undefined}
    >
      {/* selection ring */}
      {selected && (
        <circle cx={cx} cy={cy} r={r + 5} fill="none" stroke="#F4B942" strokeWidth={1.4} opacity={0.8} className="animate-pulse-ring" />
      )}
      {/* highlight ring */}
      {highlighted && !selected && (
        <circle cx={cx} cy={cy} r={r + 4} fill="none" stroke={meta.color} strokeWidth={1} opacity={0.5} />
      )}
      {/* failed pulse */}
      {state === 'failed' && (
        <circle cx={cx} cy={cy} r={ringRadius} fill="none" stroke="#F06A61" strokeWidth={1} opacity={0.4} className="animate-pulse-ring" />
      )}
      {/* essential dot indicator */}
      {node.essential && (
        <circle cx={cx + r - 2} cy={cy - r + 2} r={2} fill="#F4B942" opacity={0.9} />
      )}
      <Shape kind={cat.shape} cx={cx} cy={cy} r={r} fill={meta.bg} stroke={selected ? '#F4B942' : meta.border} strokeWidth={selected ? 2.2 : 1.5} />
      {/* Icon (small lucide glyph) */}
      {Icon && (
        <g transform={`translate(${cx - 5} ${cy - 5})`}>
          <foreignObject width={10} height={10} style={{ pointerEvents: 'none' }}>
            <Icon className="w-2.5 h-2.5" style={{ color: meta.color, display: 'block', margin: '0 auto' }} />
          </foreignObject>
        </g>
      )}
      {/* Label */}
      {showLabel && (
        <text x={cx} y={labelY} textAnchor="middle" fontSize={8.5} className="font-mono" fill={selected ? '#E8EDF0' : '#91A0AC'} fontWeight={selected ? 600 : 400}>
          {node.code}
        </text>
      )}
      {/* state glyph for accessibility (text) */}
      <title>{`${node.name} — ${meta.label}${node.essential ? ' (essential)' : ''}`}</title>
    </g>
  );
}

function Shape({ kind, cx, cy, r, fill, stroke, strokeWidth }: {
  kind: 'circle' | 'square' | 'diamond' | 'hex' | 'triangle' | 'octagon';
  cx: number; cy: number; r: number;
  fill: string; stroke: string; strokeWidth: number;
}) {
  const props = { fill, stroke, strokeWidth };
  switch (kind) {
    case 'circle': return <circle cx={cx} cy={cy} r={r} {...props} />;
    case 'square': return <rect x={cx - r} y={cy - r} width={r * 2} height={r * 2} rx={2} {...props} />;
    case 'diamond': return <polygon points={`${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`} {...props} />;
    case 'triangle': return <polygon points={`${cx},${cy - r} ${cx + r},${cy + r} ${cx - r},${cy + r}`} {...props} />;
    case 'hex': {
      const pts = Array.from({ length: 6 }, (_, i) => {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
      }).join(' ');
      return <polygon points={pts} {...props} />;
    }
    case 'octagon': {
      const pts = Array.from({ length: 8 }, (_, i) => {
        const a = (Math.PI / 4) * i - Math.PI / 8;
        return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
      }).join(' ');
      return <polygon points={pts} {...props} />;
    }
  }
}

function HoverTooltip({ nodeId }: { nodeId: string }) {
  const { state } = useStore();
  const node = nodeById(state.sim.graph, nodeId);
  if (!node) return null;
  const s = state.sim.nodes[nodeId];
  const meta = stateMeta[s?.state ?? 'operational'];
  return (
    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
      <div className="bg-ink-900/95 backdrop-blur border border-ink-500/40 rounded-lg px-3 py-2 shadow-xl min-w-44">
        <div className="flex items-center gap-2">
          <span style={{ color: meta.color }}>{meta.glyph}</span>
          <span className="text-xs font-semibold text-text">{node.name}</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="font-mono text-[10px] text-text-faint">{node.code}</span>
          <span className="text-[10px]" style={{ color: meta.color }}>{meta.label}</span>
          {node.essential && <span className="text-[9px] text-signal-amber uppercase tracking-wider">Essential</span>}
        </div>
        <p className="text-[10px] text-text-dim mt-1 leading-snug">{node.role}</p>
        {s && <p className="text-[10px] text-text-faint mt-1 italic">{s.reason}</p>}
      </div>
    </div>
  );
}
