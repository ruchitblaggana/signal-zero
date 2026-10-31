// Visual coding helpers for node states & categories — used by map and panels.
// Color is never the sole indicator: every state has a label and an icon glyph.

import type { NodeCategory, NodeState, ConnectionState } from '@/types';

export const stateMeta: Record<NodeState, { label: string; color: string; bg: string; border: string; glyph: string }> = {
  operational: { label: 'Operational', color: '#4BC6B0', bg: 'rgba(75,198,176,0.12)', border: '#4BC6B0', glyph: '●' },
  degraded:   { label: 'Degraded',     color: '#F4B942', bg: 'rgba(244,185,66,0.12)', border: '#F4B942', glyph: '◐' },
  failed:     { label: 'Failed',       color: '#F06A61', bg: 'rgba(240,106,97,0.14)', border: '#F06A61', glyph: '✕' },
  under_repair:{ label: 'Under Repair',color: '#91A0AC', bg: 'rgba(145,160,172,0.12)', border: '#91A0AC', glyph: '⟳' },
  restored:   { label: 'Restored',     color: '#4BC6B0', bg: 'rgba(75,198,176,0.10)', border: '#4BC6B0', glyph: '✓' },
  isolated:   { label: 'Isolated',     color: '#6B7785', bg: 'rgba(107,119,133,0.14)', border: '#6B7785', glyph: '⊘' },
};

export const connectionStateMeta: Record<ConnectionState, { label: string; color: string; dash: string }> = {
  active:   { label: 'Active',   color: 'rgba(75,198,176,0.35)', dash: 'none' },
  degraded: { label: 'Degraded', color: 'rgba(244,185,66,0.5)',  dash: '6 4' },
  severed:  { label: 'Severed',  color: 'rgba(240,106,97,0.55)', dash: '2 4' },
  disabled: { label: 'Disabled', color: 'rgba(107,119,133,0.3)', dash: '1 3' },
};

export const categoryMeta: Record<NodeCategory, { label: string; shape: 'circle' | 'square' | 'diamond' | 'hex' | 'triangle' | 'octagon'; icon: string }> = {
  power:   { label: 'Power',         shape: 'hex',      icon: '⚡' },
  traffic: { label: 'Traffic',       shape: 'diamond',  icon: '⊞' },
  medical: { label: 'Medical',       shape: 'square',    icon: '✚' },
  comms:   { label: 'Comms',         shape: 'triangle',  icon: '📡' },
  water:   { label: 'Water',         shape: 'circle',    icon: '◐' },
  shelter: { label: 'Shelter',       shape: 'octagon',   icon: '⌂' },
  road:    { label: 'Road',          shape: 'square',     icon: '≡' },
};

// lucide icon names by category for the icon system (used in panels).
export const categoryIconName: Record<NodeCategory, string> = {
  power: 'Zap',
  traffic: 'TrafficCone',
  medical: 'PlusSquare',
  comms: 'Radio',
  water: 'Droplet',
  shelter: 'Home',
  road: 'Route',
};

export function stateTone(state: NodeState): 'default' | 'amber' | 'coral' | 'teal' | 'dim' {
  switch (state) {
    case 'operational':
    case 'restored': return 'teal';
    case 'degraded': return 'amber';
    case 'failed': return 'coral';
    case 'under_repair': return 'default';
    case 'isolated': return 'dim';
  }
}

export const districtColors: Record<string, string> = {
  'Central District':   'rgba(244,185,66,0.06)',
  'Medical Quarter':     'rgba(75,198,176,0.06)',
  'Industrial Zone':     'rgba(145,160,172,0.06)',
  'Residential East':    'rgba(240,106,97,0.05)',
  'Transit Corridor':    'rgba(75,198,176,0.05)',
  'Waterworks District': 'rgba(244,185,66,0.05)',
};
