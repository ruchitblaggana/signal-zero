// Shared small UI primitives for the Signal Zero instrument-panel aesthetic.

import type { ReactNode } from 'react';
import { useEffect, useRef, useState, useCallback } from 'react';

export function Panel({
  title,
  subtitle,
  right,
  children,
  className = '',
  bodyClass = '',
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClass?: string;
}) {
  return (
    <section className={`bg-ink-800/70 border border-ink-500/30 rounded-xl shadow-inset ${className}`}>
      {title && (
        <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-ink-500/20">
          <div className="min-w-0">
            <h3 className="text-[13px] font-semibold text-text tracking-wide uppercase">{title}</h3>
            {subtitle && <p className="text-[11px] text-text-dim mt-0.5 truncate">{subtitle}</p>}
          </div>
          {right}
        </header>
      )}
      <div className={`px-4 py-3 ${bodyClass}`}>{children}</div>
    </section>
  );
}

export function Stat({
  label, value, sub, tone = 'default', mono = true,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: 'default' | 'amber' | 'coral' | 'teal' | 'dim';
  mono?: boolean;
}) {
  const toneCls = {
    default: 'text-text',
    amber: 'text-signal-amber',
    coral: 'text-signal-coral',
    teal: 'text-signal-teal',
    dim: 'text-text-dim',
  }[tone];
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wider text-text-faint">{label}</span>
      <span className={`text-base font-semibold ${mono ? 'font-mono tnum' : ''} ${toneCls}`}>{value}</span>
      {sub && <span className="text-[10px] text-text-faint">{sub}</span>}
    </div>
  );
}

export function Badge({
  children, tone = 'default', className = '',
}: {
  children: ReactNode;
  tone?: 'default' | 'amber' | 'coral' | 'teal' | 'dim';
  className?: string;
}) {
  const tones = {
    default: 'bg-ink-700/60 text-text-dim border-ink-500/40',
    amber: 'bg-signal-amber/10 text-signal-amber border-signal-amber/30',
    coral: 'bg-signal-coral/10 text-signal-coral border-signal-coral/30',
    teal: 'bg-signal-teal/10 text-signal-teal border-signal-teal/30',
    dim: 'bg-ink-700/40 text-text-faint border-ink-500/30',
  }[tone];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-mono uppercase tracking-wider ${tones} ${className}`}>
      {children}
    </span>
  );
}

export function Button({
  children, onClick, variant = 'default', size = 'md', disabled, className = '', title, type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'primary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  title?: string;
  type?: 'button' | 'submit';
}) {
  const variants = {
    default: 'bg-ink-700/60 hover:bg-ink-600/70 text-text border border-ink-500/40',
    primary: 'bg-signal-amber/15 hover:bg-signal-amber/25 text-signal-amber border border-signal-amber/40',
    ghost: 'hover:bg-ink-700/40 text-text-dim hover:text-text',
    danger: 'bg-signal-coral/15 hover:bg-signal-coral/25 text-signal-coral border border-signal-coral/40',
    outline: 'border border-ink-500/40 hover:border-signal-amber/50 hover:text-signal-amber text-text-dim',
  }[variant];
  const sizes = { sm: 'text-[11px] px-2 py-1', md: 'text-xs px-3 py-1.5', lg: 'text-sm px-4 py-2' }[size];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed ${variants} ${sizes} ${className}`}
    >
      {children}
    </button>
  );
}

export function IconButton({
  children, onClick, active, title, disabled, className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  active?: boolean;
  title?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed
        ${active
          ? 'bg-signal-amber/15 border-signal-amber/40 text-signal-amber'
          : 'bg-ink-800/60 border-ink-500/30 text-text-dim hover:text-text hover:border-ink-400/40'}
        ${className}`}
    >
      {children}
    </button>
  );
}

export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  return (
    <span
      ref={ref}
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      {children}
      {show && (
        <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 whitespace-nowrap rounded-md border border-ink-500/40 bg-ink-900 px-2 py-1 text-[10px] text-text shadow-lg">
          {label}
        </span>
      )}
    </span>
  );
}

export function EmptyState({ title, hint, children }: { title: string; hint?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-6 text-text-faint">
      <p className="text-sm font-medium text-text-dim">{title}</p>
      {hint && <p className="text-xs mt-1">{hint}</p>}
      {children}
    </div>
  );
}

export function useDebounced<T>(value: T, delay = 200): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export function Modal({
  open, onClose, title, children, wide,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  const onKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);
  useEffect(() => {
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onKey]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      <div className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${wide ? 'max-w-4xl' : 'max-w-lg'} bg-ink-800 border border-ink-500/40 rounded-2xl shadow-2xl animate-slide-up max-h-[90vh] flex flex-col`}>
        <header className="flex items-center justify-between px-5 py-3.5 border-b border-ink-500/20 shrink-0">
          <h2 className="text-sm font-semibold text-text tracking-wide">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="text-text-faint hover:text-text text-lg leading-none">×</button>
        </header>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider text-text-faint">{label}</span>
      <div className="mt-1">{children}</div>
      {hint && <span className="text-[10px] text-text-faint mt-1 block">{hint}</span>}
    </label>
  );
}

export function Select({ value, onChange, children, className = '' }: {
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full bg-ink-900 border border-ink-500/30 rounded-lg px-3 py-2 text-sm text-text focus:border-signal-amber/50 ${className}`}
    >
      {children}
    </select>
  );
}

export function Input({ value, onChange, placeholder, type = 'text', className = '' }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full bg-ink-900 border border-ink-500/30 rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-faint focus:border-signal-amber/50 ${className}`}
    />
  );
}
